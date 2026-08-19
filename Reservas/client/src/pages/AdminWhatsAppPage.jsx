import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ChatIcon from '@mui/icons-material/Chat';

import api from '../api/axios';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/authContext';
import PageHeader from '../components/ui/PageHeader';
import PageLayout from '../components/ui/PageLayout';

export default function AdminWhatsAppPage() {
  const showAlert = useAlert();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    idInstance: '',
    apiTokenInstance: '',
  });
  const [showToken, setShowToken] = useState(false);

  const [status, setStatus] = useState({
    configured: false,
    apiTokenInstanceMasked: '',
    updatedAt: null,
  });

  const updatedAtText = useMemo(() => {
    if (!status.updatedAt) return '';
    try {
      return new Date(status.updatedAt).toLocaleString();
    } catch {
      return String(status.updatedAt);
    }
  }, [status.updatedAt]);

  const load = async () => {
    setLoading(true);
    setError('');
    setForbidden(false);
    try {
      const resp = await api.get('/admin/whatsapp-credentials');
      const data = resp?.data || {};
      setStatus({
        configured: Boolean(data.configured),
        apiTokenInstanceMasked: data.apiTokenInstanceMasked || '',
        updatedAt: data.updatedAt || null,
      });
      setForm({
        idInstance: data.idInstance || '',
        apiTokenInstance: '',
      });
    } catch (e) {
      const code = e?.response?.status;
      if (code === 403) {
        setForbidden(true);
      } else {
        setError(e?.response?.data?.message || e?.message || 'No se pudo cargar la configuración.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (key) => (e) => {
    const value = e?.target?.value ?? '';
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const idInstance = String(form.idInstance || '').trim();
      const apiTokenInstance = String(form.apiTokenInstance || '').trim();
      if (!idInstance || !apiTokenInstance) {
        setError('Debes ingresar ID Instance y API Token Instance.');
        return;
      }

      const resp = await api.put('/admin/whatsapp-credentials', {
        idInstance,
        apiTokenInstance,
      });
      if (resp?.data?.ok) {
        showAlert('success', 'Credenciales de WhatsApp actualizadas.');
        await load();
      } else {
        setError(resp?.data?.message || 'No se pudo guardar.');
      }
    } catch (e) {
      const code = e?.response?.status;
      if (code === 403) {
        setForbidden(true);
        showAlert('error', 'No tienes permisos para administrar WhatsApp.');
      } else {
        setError(e?.response?.data?.message || e?.message || 'No se pudo guardar.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (forbidden) {
    return (
      <Box maxWidth={900} mx="auto">
        <Alert severity="error" sx={{ mb: 2 }}>
          No tienes permisos para ver esta sección.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Usuario actual: {user?.email || '—'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Si tu servidor está restringido, configura `PLATFORM_ADMIN_EMAILS` o `PLATFORM_ADMIN_USER_ID`.
        </Typography>
      </Box>
    );
  }

  return (
    <PageLayout maxWidth={900}>
      <PageHeader
        icon={<ChatIcon />}
        title="Admin · WhatsApp (GreenAPI)"
        subtitle="Configuración global de credenciales (un solo número para toda la plataforma)."
      />

      <Card>
        <CardContent>
          <Stack spacing={2}>
            {error ? <Alert severity="error">{error}</Alert> : null}

            <Alert severity={status.configured ? 'success' : 'warning'}>
              {status.configured
                ? 'WhatsApp está configurado.'
                : 'WhatsApp NO está configurado (faltan credenciales globales).'}
              {status.apiTokenInstanceMasked ? ` Token: ${status.apiTokenInstanceMasked}` : ''}
              {updatedAtText ? ` · Actualizado: ${updatedAtText}` : ''}
            </Alert>

            <Divider />

            <TextField
              label="ID Instance"
              value={form.idInstance}
              onChange={onChange('idInstance')}
              fullWidth
              disabled={saving}
            />

            <TextField
              label="API Token Instance"
              value={form.apiTokenInstance}
              onChange={onChange('apiTokenInstance')}
              fullWidth
              disabled={saving}
              type={showToken ? 'text' : 'password'}
              placeholder={status.apiTokenInstanceMasked ? `Actual: ${status.apiTokenInstanceMasked}` : ''}
              helperText="Por seguridad, el token actual no se muestra completo. Para cambiarlo, ingresa el nuevo token y guarda."
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle token visibility"
                      onClick={() => setShowToken((v) => !v)}
                      edge="end"
                    >
                      {showToken ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box display="flex" gap={1} flexWrap="wrap">
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                sx={{ background: 'linear-gradient(135deg, #2596be, #21cbe6)' }}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
              <Button variant="outlined" onClick={load} disabled={saving}>
                Recargar
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary">
              Nota: Los profesionales solo editan plantillas de mensajes. El envío se hace desde este número global.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
