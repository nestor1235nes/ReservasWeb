import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddLinkIcon from '@mui/icons-material/AddLink';
import LinkIcon from '@mui/icons-material/Link';
import QRCode from 'qrcode';
import { useSucursal } from '../../context/sucursalContext';
import PageHeader from '../../components/ui/PageHeader';
import PageLayout from '../../components/ui/PageLayout';

export default function EnlaceSucursal() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { getSucursal } = useSucursal();

  const [sucursal, setSucursal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const s = await getSucursal();
        if (!mounted) return;
        setSucursal(s || null);
      } catch (e) {
        if (!mounted) return;
        setSucursal(null);
        setError('No se pudo cargar tu sucursal.');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [getSucursal]);

  const enlaceSucursal = useMemo(() => {
    if (!sucursal?._id) return '';
    const origin = window.location.origin;
    const key = sucursal.slug || sucursal._id;
    return `${origin}/${key}`;
  }, [sucursal?._id, sucursal?.slug]);

  const handleCopy = async () => {
    try {
      if (!enlaceSucursal) return;
      await navigator.clipboard.writeText(enlaceSucursal);
      setCopied(true);
    } catch (e) {
      // noop
    }
  };

  useEffect(() => {
    const generateQR = async () => {
      try {
        if (!enlaceSucursal) {
          setQrDataUrl('');
          return;
        }
        const dataUrl = await QRCode.toDataURL(enlaceSucursal, {
          width: 512,
          margin: 2,
          color: { dark: '#000000', light: '#ffffffff' },
        });
        setQrDataUrl(dataUrl);
      } catch (e) {
        setQrDataUrl('');
      }
    };

    generateQR();
  }, [enlaceSucursal]);

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'enlace-sucursal-qr.png';
    a.click();
  };

  return (
    <PageLayout>
      <PageHeader
        icon={<AddLinkIcon />}
        title="Enlace de sucursal"
        subtitle="Comparte el enlace público de tu sucursal"
      />

      <Card sx={{ mt: isMobile ? 1 : 0, borderRadius: isMobile ? 0 : 2, boxShadow: isMobile ? 0 : 2 }}>
        <CardContent sx={{ p: isMobile ? 2 : 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)',
                  boxShadow: 2,
                }}
              >
                <LinkIcon />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  Comparte el enlace de tu sucursal
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Este link muestra todos los profesionales de la sucursal.
                </Typography>
              </Box>
            </Stack>

            {loading && <Typography variant="body2" color="text.secondary">Cargando…</Typography>}
            {!!error && <Alert severity="error">{error}</Alert>}

            {!loading && !error && !enlaceSucursal && (
              <Alert severity="warning">
                No se pudo generar el enlace. Verifica que tu usuario tenga una sucursal asociada.
              </Alert>
            )}

            {!loading && !error && enlaceSucursal && (
              <TextField
                label="Enlace público"
                value={enlaceSucursal}
                fullWidth
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton aria-label="Copiar enlace" onClick={handleCopy} sx={{ color: '#2596be' }}>
                        <ContentCopyIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}

            <Button
              variant="outlined"
              startIcon={<AddLinkIcon />}
              disabled={!enlaceSucursal}
              onClick={handleCopy}
              sx={{ alignSelf: 'flex-start', borderColor: '#2596be', color: '#2596be' }}
            >
              Copiar enlace
            </Button>

            <Divider sx={{ my: 1 }} />

            {enlaceSucursal && (
              <Box>
                <Typography fontWeight={700} mb={1}>
                  Código QR del enlace
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <Box
                    sx={{
                      p: 1,
                      border: '1px solid #e3f2fd',
                      borderRadius: 2,
                      bgcolor: '#fff',
                      width: { xs: 200, sm: 220 },
                      height: { xs: 200, sm: 220 },
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="QR enlace sucursal"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Generando QR…
                      </Typography>
                    )}
                  </Box>

                  <Stack spacing={1} sx={{ flex: 1, alignSelf: 'stretch' }}>
                    <Typography variant="body2" color="text.secondary">
                      Comparte este QR para que las personas vean los profesionales de la sucursal.
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={handleDownloadQR}
                      disabled={!qrDataUrl}
                      sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' }, borderColor: '#2596be', color: '#2596be' }}
                    >
                      Descargar PNG
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setCopied(false)}>
          Enlace copiado
        </Alert>
      </Snackbar>
    </PageLayout>
  );
}
