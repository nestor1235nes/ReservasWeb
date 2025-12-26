import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSucursal } from '../../context/sucursalContext';
import { useAuth } from '../../context/authContext';
import { useAlert } from '../../context/AlertContext';
import FullPageLoader from '../../components/ui/FullPageLoader';

const splitCsv = (value) => {
  if (!value) return [];
  return value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
};

const joinCsv = (arr) => {
  if (!Array.isArray(arr)) return '';
  return arr.filter(Boolean).join(', ');
};

export default function ConfiguracionSucursal() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { user, esAdminSucursal } = useAuth();
  const { getSucursal, updateSucursal } = useSucursal();
  const showAlert = useAlert();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sucursal, setSucursal] = useState(null);

  const [form, setForm] = useState({
    nombre: '',
    direccion: '',
    descripcion: '',
    contactoEmail: '',
    contactoCelulares: '',
    contactoTelefonos: '',
    contactoInstagram: '',
    contactoFacebook: '',
    contactoTwitter: '',
    contactoLinkedin: '',
    idInstance: '',
    apiTokenInstance: '',
    defaultMessage: '',
    reminderMessage: '',
  });

  const canEdit = useMemo(() => {
    return !!user?.sucursal && !!esAdminSucursal;
  }, [user?.sucursal, esAdminSucursal]);

  const hydrateForm = (s) => {
    setForm({
      nombre: s?.nombre || '',
      direccion: s?.direccion || '',
      descripcion: s?.descripcion || '',
      contactoEmail: s?.contacto?.email || '',
      contactoCelulares: joinCsv(s?.contacto?.celulares || []),
      contactoTelefonos: joinCsv(s?.contacto?.telefonos || []),
      contactoInstagram: s?.contacto?.instagram || '',
      contactoFacebook: s?.contacto?.facebook || '',
      contactoTwitter: s?.contacto?.twitter || '',
      contactoLinkedin: s?.contacto?.linkedin || '',
      idInstance: s?.idInstance || '',
      apiTokenInstance: s?.apiTokenInstance || '',
      defaultMessage: s?.defaultMessage || '',
      reminderMessage: s?.reminderMessage || '',
    });
  };

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const s = await getSucursal();
        setSucursal(s);
        hydrateForm(s);
      } catch (e) {
        showAlert('error', 'No se pudo cargar la sucursal.');
      } finally {
        setLoading(false);
      }
    };

    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSucursal]);

  const onChange = (key) => (e) => {
    const next = e?.target?.value ?? '';
    setForm((prev) => ({ ...prev, [key]: next }));
  };

  const buildPayload = () => {
    return {
      nombre: form.nombre,
      direccion: form.direccion,
      descripcion: form.descripcion,
      contacto: {
        email: form.contactoEmail,
        celulares: splitCsv(form.contactoCelulares),
        telefonos: splitCsv(form.contactoTelefonos),
        instagram: form.contactoInstagram,
        facebook: form.contactoFacebook,
        twitter: form.contactoTwitter,
        linkedin: form.contactoLinkedin,
      },
      idInstance: form.idInstance,
      apiTokenInstance: form.apiTokenInstance,
      defaultMessage: form.defaultMessage,
      reminderMessage: form.reminderMessage,
    };
  };

  const handleGuardar = async () => {
    if (!canEdit) {
      showAlert('error', 'No tienes permisos para editar esta sucursal.');
      return;
    }
    if (!sucursal?._id) {
      showAlert('error', 'No se encontró el ID de la sucursal.');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      await updateSucursal(sucursal._id, payload);
      const refreshed = await getSucursal();
      setSucursal(refreshed);
      hydrateForm(refreshed);
      showAlert('success', 'Sucursal actualizada correctamente.');
    } catch (e) {
      showAlert('error', 'No se pudo actualizar la sucursal.');
    } finally {
      setSaving(false);
    }
  };

  const handleRestablecer = () => {
    hydrateForm(sucursal);
  };

  return (
    <Box
      maxWidth={isMobile ? '100%' : '100%'}
      width="100%"
      mx="auto"
      minHeight="100%"
      bgcolor="#f5f7fa"
      position="relative"
    >
      <FullPageLoader open={loading || saving} withinContainer message={saving ? 'Guardando cambios…' : 'Cargando sucursal…'} />

      <Stack
        direction={isMobile ? 'column' : 'row'}
        justifyContent="space-between"
        alignItems={isMobile ? 'stretch' : 'center'}
        spacing={2}
        p={2}
        borderRadius={1}
        sx={{ background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)' }}
        mb={0}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} color="white">
            Configuración de team
          </Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.9)">
            {sucursal?.nombre || '—'}
          </Typography>
        </Box>
        <Stack direction={isMobile ? 'column' : 'row'} spacing={1.5}>
          <Button
            variant="contained"
            onClick={handleRestablecer}
            sx={{ background: 'white', color: '#2596be', borderRadius: 2 }}
            disabled={loading || saving}
          >
            Restablecer
          </Button>
          <Button
            variant="contained"
            onClick={handleGuardar}
            sx={{ background: 'white', color: '#2596be', borderRadius: 2 }}
            disabled={loading || saving || !canEdit}
          >
            Guardar cambios
          </Button>
        </Stack>
      </Stack>

      <Box
        sx={{
          width: '100%',
          mx: 'auto',
          background: 'white',
          borderRadius: 3,
          boxShadow: 4,
          p: isMobile ? 2 : 3,
        }}
      >
        {!canEdit && (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Solo el administrador de la sucursal puede editar esta configuración.
          </Typography>
        )}

        <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
          <CardContent>
            <Typography fontWeight={700} sx={{ mb: 1, color:"#2596be" }}>
              Datos generales
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nombre"
                  value={form.nombre}
                  onChange={onChange('nombre')}
                  disabled={!canEdit || loading || saving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Dirección"
                  value={form.direccion}
                  onChange={onChange('direccion')}
                  disabled={!canEdit || loading || saving}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Descripción"
                  value={form.descripcion}
                  onChange={onChange('descripcion')}
                  disabled={!canEdit || loading || saving}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
          <CardContent>
            <Typography fontWeight={700} sx={{ mb: 1, color:"#2596be" }}>
              Contacto
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={form.contactoEmail}
                  onChange={onChange('contactoEmail')}
                  disabled={!canEdit || loading || saving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Celulares (separados por coma)"
                  value={form.contactoCelulares}
                  onChange={onChange('contactoCelulares')}
                  disabled={!canEdit || loading || saving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Teléfonos (separados por coma)"
                  value={form.contactoTelefonos}
                  onChange={onChange('contactoTelefonos')}
                  disabled={!canEdit || loading || saving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Instagram"
                  value={form.contactoInstagram}
                  onChange={onChange('contactoInstagram')}
                  disabled={!canEdit || loading || saving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Facebook"
                  value={form.contactoFacebook}
                  onChange={onChange('contactoFacebook')}
                  disabled={!canEdit || loading || saving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Twitter"
                  value={form.contactoTwitter}
                  onChange={onChange('contactoTwitter')}
                  disabled={!canEdit || loading || saving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="LinkedIn"
                  value={form.contactoLinkedin}
                  onChange={onChange('contactoLinkedin')}
                  disabled={!canEdit || loading || saving}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography fontWeight={700} sx={{ mb: 1, color:"#2596be" }}>
              WhatsApp
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="ID Instance"
                  value={form.idInstance}
                  onChange={onChange('idInstance')}
                  disabled={!canEdit || loading || saving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="API Token Instance"
                  value={form.apiTokenInstance}
                  onChange={onChange('apiTokenInstance')}
                  disabled={!canEdit || loading || saving}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Mensaje por defecto"
                  value={form.defaultMessage}
                  onChange={onChange('defaultMessage')}
                  disabled={!canEdit || loading || saving}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Mensaje de recordatorio"
                  value={form.reminderMessage}
                  onChange={onChange('reminderMessage')}
                  disabled={!canEdit || loading || saving}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
