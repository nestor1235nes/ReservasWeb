import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
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
import axios from '../../api/axios';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';

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
  const [logoUploading, setLogoUploading] = useState(false);
  const [sucursal, setSucursal] = useState(null);
  const [brandOpen, setBrandOpen] = useState(false);

  const DEFAULT_PUBLIC_BRAND = useMemo(() => {
    return { primary: '#2596be', secondary: '#21cbe6' };
  }, []);

  const [form, setForm] = useState({
    nombre: '',
    logo: '',
    brandPrimary: '#2596be',
    brandSecondary: '#21cbe6',
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
      logo: s?.logo || '',
      brandPrimary: s?.publicBrand?.primary || '#2596be',
      brandSecondary: s?.publicBrand?.secondary || '#21cbe6',
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
      logo: form.logo,
      publicBrand: {
        primary: form.brandPrimary,
        secondary: form.brandSecondary,
      },
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

  const handleLogoFileChange = async (e) => {
    const file = e?.target?.files?.[0];
    // Permitir volver a seleccionar el mismo archivo
    if (e?.target) e.target.value = '';
    if (!file) return;
    if (!canEdit) {
      showAlert('error', 'No tienes permisos para editar esta sucursal.');
      return;
    }

    setLogoUploading(true);
    try {
      const init = await axios.post('/upload/signed-upload', {
        kind: 'logo',
        name: file?.name || 'logo',
        type: file?.type || 'application/octet-stream',
        size: file?.size || 0,
      });

      const uploadUrl = init?.data?.uploadUrl;
      const newUrl = init?.data?.url;
      if (!newUrl) throw new Error('No se recibió la URL del logo');

      if (!uploadUrl) throw new Error('No se recibió URL de subida');
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file?.type || 'application/octet-stream' },
        body: file,
      });
      if (!put.ok) throw new Error('No se pudo subir el logo');

      // Limpieza best-effort del logo anterior (solo si era un upload local)
      const oldLogo = sucursal?.logo;
      if (oldLogo && oldLogo !== newUrl) {
        try {
          if (String(oldLogo).startsWith('/uploads/')) {
            await axios.delete('/delete', { data: { filePath: oldLogo } });
          }
        } catch {
          // noop
        }
      }

      setForm((prev) => ({ ...prev, logo: newUrl }));
      showAlert('success', 'Logo subido. Recuerda guardar cambios.');
    } catch (err) {
      showAlert('error', 'No se pudo subir el logo.');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleEliminarLogo = async () => {
    if (!canEdit) {
      showAlert('error', 'No tienes permisos para editar esta sucursal.');
      return;
    }
    if (!form.logo) {
      setForm((prev) => ({ ...prev, logo: '' }));
      return;
    }

    setLogoUploading(true);
    try {
      // Elimina archivo (best-effort) y limpia el campo del form
      if (String(form.logo || '').startsWith('/uploads/')) {
        await axios.delete('/delete', { data: { filePath: form.logo } });
      }
      setForm((prev) => ({ ...prev, logo: '' }));
      showAlert('success', 'Logo eliminado. Recuerda guardar cambios.');
    } catch {
      // Aunque falle la eliminación de archivo, permitimos limpiar la referencia
      setForm((prev) => ({ ...prev, logo: '' }));
      showAlert('success', 'Logo eliminado. Recuerda guardar cambios.');
    } finally {
      setLogoUploading(false);
    }
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

  const handleRestablecerBrand = () => {
    setForm((prev) => ({
      ...prev,
      brandPrimary: DEFAULT_PUBLIC_BRAND.primary,
      brandSecondary: DEFAULT_PUBLIC_BRAND.secondary,
    }));
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
      <FullPageLoader
        open={loading || saving || logoUploading}
        withinContainer
        message={saving ? 'Guardando cambios…' : (logoUploading ? 'Subiendo logo…' : 'Cargando sucursal…')}
      />

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
              <Grid item xs={12}>
                <Typography fontWeight={600} sx={{ mb: 1 }}>
                  Logo de la sucursal
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <Avatar
                    src={form.logo ? resolveAssetUrl(form.logo) : undefined}
                    sx={{
                      width: 96,
                      height: 96,
                      bgcolor: '#e3f2fd',
                      border: '2px solid #e0e0e0',
                      boxShadow: 2,
                    }}
                  />
                  <Stack spacing={1} sx={{ flex: 1, alignSelf: { xs: 'stretch', sm: 'center' } }}>
                    <Button
                      variant="outlined"
                      component="label"
                      disabled={!canEdit || loading || saving || logoUploading}
                      sx={{ borderColor: '#2596be', color: '#2596be', alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
                    >
                      Subir logo
                      <input hidden type="file" accept="image/*" onChange={handleLogoFileChange} />
                    </Button>
                    <Button
                      variant="text"
                      color="error"
                      disabled={!canEdit || loading || saving || logoUploading || !form.logo}
                      onClick={handleEliminarLogo}
                      sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
                    >
                      Quitar logo
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      Se mostrará en la página pública de la sucursal.
                    </Typography>
                  </Stack>
                </Stack>
              </Grid>
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
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setBrandOpen((v) => !v)}
                    disabled={!canEdit || loading || saving || logoUploading}
                    sx={{ borderColor: '#2596be', color: '#2596be', borderRadius: 2, alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
                  >
                    Cambiar colores página pública
                  </Button>
                  <Box
                    sx={{
                      width: 96,
                      height: 36,
                      borderRadius: 2,
                      border: '1px solid #e0e0e0',
                      background: `linear-gradient(90deg, ${form.brandPrimary} 60%, ${form.brandSecondary} 100%)`,
                    }}
                  />
                </Stack>
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
                <Collapse in={brandOpen} timeout="auto" unmountOnExit>
                  <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent>
                      <Typography fontWeight={700} sx={{ mb: 1, color: '#2596be' }}>
                        Colores de la página pública
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Color principal"
                            type="color"
                            value={form.brandPrimary}
                            onChange={onChange('brandPrimary')}
                            disabled={!canEdit || loading || saving}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Color secundario"
                            type="color"
                            value={form.brandSecondary}
                            onChange={onChange('brandSecondary')}
                            disabled={!canEdit || loading || saving}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                            <Button
                              variant="outlined"
                              onClick={handleRestablecerBrand}
                              disabled={!canEdit || loading || saving}
                              sx={{ borderColor: '#2596be', color: '#2596be', borderRadius: 2, alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
                            >
                              Restablecer a colores por defecto
                            </Button>
                            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                              Vuelve a los colores base de la aplicación.
                            </Typography>
                          </Stack>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            Estos colores se usarán en el perfil público de la sucursal.
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Collapse>
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
