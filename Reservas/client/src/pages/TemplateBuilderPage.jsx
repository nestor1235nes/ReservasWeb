import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  TextField,
  Button,
  Alert,
  Snackbar,
  Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import { useAuth } from '../context/authContext';
import PageHeader from '../components/ui/PageHeader';
import PageLayout from '../components/ui/PageLayout';

const isHexColor = (value) => {
  if (!value) return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
};

export default function TemplateBuilderPage() {
  const { user, updatePerfil } = useAuth();

  const initial = useMemo(() => {
    const primary = user?.bookingBrand?.primary || '#2596be';
    const secondary = user?.bookingBrand?.secondary || '#21cbe6';
    return { primary, secondary };
  }, [user]);

  const [primary, setPrimary] = useState(initial.primary);
  const [secondary, setSecondary] = useState(initial.secondary);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const previewGradient = useMemo(() => {
    const p = isHexColor(primary) ? primary.trim() : '#2596be';
    const s = isHexColor(secondary) ? secondary.trim() : '#21cbe6';
    return `linear-gradient(135deg, ${p}, ${s})`;
  }, [primary, secondary]);

  const handleSave = async () => {
    if (!isHexColor(primary) || !isHexColor(secondary)) {
      setSnackbar({ open: true, message: 'Usa colores en formato HEX: #RRGGBB o #RGB.', severity: 'error' });
      return;
    }

    try {
      setSaving(true);
      const id = user?.id || user?._id;
      if (!id) throw new Error('User id missing');

      await updatePerfil(id, {
        bookingTemplate: 'custom',
        bookingBrand: { primary: primary.trim(), secondary: secondary.trim() },
      });

      setSnackbar({ open: true, message: 'Plantilla personalizada guardada.', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: 'No se pudo guardar. Intenta nuevamente.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout>
      <PageHeader
        icon={<DashboardCustomizeIcon />}
        title="Editor de plantilla"
        subtitle="Diseña la página pública de tu perfil"
      />

      <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Color primario (HEX)"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                fullWidth
                placeholder="#2596be"
                error={primary.length > 0 && !isHexColor(primary)}
                helperText="Ej: #2596be"
              />
              <TextField
                label="Color secundario (HEX)"
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
                fullWidth
                placeholder="#21cbe6"
                error={secondary.length > 0 && !isHexColor(secondary)}
                helperText="Ej: #21cbe6"
              />
            </Stack>

            <Divider />

            <Box>
              <Typography fontWeight={700} mb={1}>Vista previa</Typography>
              <Box
                sx={{
                  height: 120,
                  borderRadius: 2,
                  border: '1px solid #e3f2fd',
                  background: previewGradient,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Estos colores se usarán en tu página pública cuando elijas “Personalizada”.
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{ alignSelf: 'flex-start', backgroundColor: '#2596be', '&:hover': { backgroundColor: '#1e7fa0' } }}
            >
              {saving ? 'Guardando…' : 'Guardar y activar'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageLayout>
  );
}
