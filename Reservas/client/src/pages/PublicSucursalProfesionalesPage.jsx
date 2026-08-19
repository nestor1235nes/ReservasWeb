import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import XIcon from '@mui/icons-material/X';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import { useNavigate, useParams } from 'react-router-dom';
import { getProfesionalesSucursalRequest, getSucursalesRequest } from '../api/sucursales';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import TopAppBar from '../components/ui/TopAppBar';

const buildMapboxStaticUrl = ({ token, lat, lng, width = 980, height = 520, zoom = 14, pinColor = '111111' }) => {
  if (!token) return '';
  if (lat == null || lng == null) return '';

  const overlay = `pin-s+${pinColor}(${lng},${lat})`;
  const center = `${lng},${lat},${zoom}`;
  const size = `${width}x${height}`;
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${overlay}/${center}/${size}@2x?access_token=${encodeURIComponent(token)}`;
};

export default function PublicSucursalProfesionalesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { sucursalKey } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sucursal, setSucursal] = useState(null);
  const [profesionales, setProfesionales] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedPro, setSelectedPro] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!sucursalKey) return;
      setLoading(true);
      setError('');

      try {
        const [proRes, sucRes] = await Promise.all([
          getProfesionalesSucursalRequest(sucursalKey),
          getSucursalesRequest(),
        ]);

        if (!mounted) return;

        const sucursales = Array.isArray(sucRes?.data) ? sucRes.data : [];
        const foundSucursal =
          sucursales.find((s) => String(s?._id) === String(sucursalKey) || String(s?.slug) === String(sucursalKey)) || null;

        setSucursal(foundSucursal);
        setProfesionales(Array.isArray(proRes?.data) ? proRes.data : []);
      } catch (e) {
        if (!mounted) return;
        setError('No se pudo cargar la información de la sucursal.');
        setSucursal(null);
        setProfesionales([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [sucursalKey]);

  const filteredProfesionales = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return profesionales;

    return (profesionales || []).filter((p) => {
      const haystack = [
        p?.username,
        p?.especialidad,
        p?.especialidad_principal,
        p?.email,
        p?.celular,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [profesionales, query]);

  const brand = useMemo(() => {
    const primary = sucursal?.publicBrand?.primary || '#2596be';
    const secondary = sucursal?.publicBrand?.secondary || '#21cbe6';
    return { primary, secondary };
  }, [sucursal?.publicBrand?.primary, sucursal?.publicBrand?.secondary]);

  const handleIrAReserva = (slug) => {
    if (!slug) return;
    navigate(`/p/${encodeURIComponent(slug)}`);
  };

  const isLongDescription = (desc) => {
    const text = (desc || '').trim();
    return text.length >= 160;
  };

  const shouldShowVerMas = (p) => {
    return (
      isLongDescription(p?.descripcion) ||
      Boolean(p?.experiencia) ||
      Boolean(p?.especialidad_principal) ||
      Boolean(p?.email) ||
      Boolean(p?.celular)
    );
  };

  const openProModal = (p) => setSelectedPro(p || null);
  const closeProModal = () => setSelectedPro(null);

  const normalizeUrl = (value) => {
    const raw = (value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
  };

  const locationData = useMemo(() => {
    const formattedAddress =
      sucursal?.maps?.formattedAddress ||
      sucursal?.direccion ||
      '';
    const lat = sucursal?.maps?.lat ?? null;
    const lng = sucursal?.maps?.lng ?? null;
    const mapsUrl = sucursal?.maps?.url || '';
    return { formattedAddress, lat, lng, mapsUrl };
  }, [sucursal]);

  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN;
  const mapImg = buildMapboxStaticUrl({ token: mapboxToken, lat: locationData.lat, lng: locationData.lng, pinColor: '111111' });

  return (
    <Box sx={{ bgcolor: '#f7fbfd', minHeight: '100vh' }}>
      <TopAppBar hideProLink />

      <Dialog
        open={Boolean(selectedPro)}
        onClose={closeProModal}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: '1px solid #e3f2fd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: `linear-gradient(90deg, ${brand.primary} 60%, ${brand.secondary} 100%)`,
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar
              src={selectedPro?.fotoPerfil ? resolveAssetUrl(selectedPro.fotoPerfil) : undefined}
              sx={{ width: 44, height: 44, bgcolor: 'white', color: brand.primary }}
            >
              {!selectedPro?.fotoPerfil && <PersonIcon />}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={900} color="white" noWrap>
                {selectedPro?.username || 'Profesional'}
              </Typography>
              <Typography variant="body2" color="rgba(255,255,255,0.95)" noWrap>
                {selectedPro?.especialidad || selectedPro?.especialidad_principal || 'Sin especialidad'}
              </Typography>
            </Box>
          </Stack>

          <IconButton onClick={closeProModal} sx={{ color: 'white' }} aria-label="Cerrar">
            <CloseIcon />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 2.5 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {selectedPro?.especialidad && <Chip size="small" label={selectedPro.especialidad} />}
              {selectedPro?.cita_presencial && <Chip size="small" label="Presencial" />}
              {selectedPro?.cita_virtual && <Chip size="small" label="Online" />}
              {selectedPro?.cita_domicilio && <Chip size="small" label="Domicilio" />}
            </Stack>

            {selectedPro?.descripcion && (
              <Typography variant="body2" color="text.secondary">
                {selectedPro.descripcion}
              </Typography>
            )}

            <Stack spacing={0.5}>
              {selectedPro?.experiencia && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Experiencia:</strong> {selectedPro.experiencia}
                </Typography>
              )}
              {selectedPro?.especialidad_principal && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Especialidad principal:</strong> {selectedPro.especialidad_principal}
                </Typography>
              )}
              {selectedPro?.email && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Email:</strong> {selectedPro.email}
                </Typography>
              )}
              {selectedPro?.celular && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Teléfono:</strong> {selectedPro.celular}
                </Typography>
              )}
            </Stack>

            <Button
              variant="contained"
              endIcon={<OpenInNewIcon />}
              disabled={!selectedPro?.slug}
              onClick={() => handleIrAReserva(selectedPro.slug)}
              sx={{ mt: 0.5, backgroundColor: brand.primary, '&:hover': { backgroundColor: brand.primary } }}
            >
              {selectedPro?.slug ? 'Reservar con este profesional' : 'Enlace no disponible'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
        {/* Perfil de sucursal */}
        <Card sx={{ overflow: 'hidden' }}>
          <Box
            sx={{
              height: 120,
              background: `linear-gradient(90deg, ${brand.primary} 60%, ${brand.secondary} 100%)`,
            }}
          />

          <CardContent sx={{ pt: 0, p: isMobile ? 2 : 3 }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'center', sm: 'flex-start' }}>
                <Avatar
                  src={sucursal?.logo ? resolveAssetUrl(sucursal.logo) : undefined}
                  sx={{
                    width: isMobile ? 112 : 140,
                    height: isMobile ? 112 : 140,
                    mt: -7,
                    bgcolor: '#ffffff',
                    border: '4px solid #ffffff',
                    boxShadow: 3,
                  }}
                />

                <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: 'center', sm: 'left' } }}>
                  <Typography variant="h5" fontWeight={900} sx={{ mt: { xs: 0, sm: 1 } }}>
                    {sucursal?.nombre || 'Sucursal'}
                  </Typography>
                  {sucursal?.direccion && (
                    <Typography variant="body2" color="text.secondary">
                      {sucursal.direccion}
                    </Typography>
                  )}
                  {sucursal?.descripcion && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {sucursal.descripcion}
                    </Typography>
                  )}

                  <Stack direction="row" spacing={1} justifyContent={{ xs: 'center', sm: 'flex-start' }} flexWrap="wrap" sx={{ mt: 1.5 }}>
                    {sucursal?.contacto?.email && <Chip size="small" label={sucursal.contacto.email} />}
                    {(sucursal?.contacto?.celulares || []).map((c) => (
                      <Chip key={c} size="small" label={c} />
                    ))}
                    {(sucursal?.contacto?.telefonos || []).map((t) => (
                      <Chip key={t} size="small" label={t} />
                    ))}
                  </Stack>

                  {/* Redes sociales (solo si existen) */}
                  {(sucursal?.contacto?.instagram || sucursal?.contacto?.facebook || sucursal?.contacto?.twitter || sucursal?.contacto?.linkedin) && (
                    <Stack direction="row" spacing={0.5} justifyContent={{ xs: 'center', sm: 'flex-start' }} sx={{ mt: 1 }}>
                      {sucursal?.contacto?.instagram && (
                        <IconButton
                          aria-label="Instagram"
                          size="small"
                          component="a"
                          href={normalizeUrl(sucursal.contacto.instagram)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <InstagramIcon fontSize="small" />
                        </IconButton>
                      )}
                      {sucursal?.contacto?.facebook && (
                        <IconButton
                          aria-label="Facebook"
                          size="small"
                          component="a"
                          href={normalizeUrl(sucursal.contacto.facebook)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FacebookIcon fontSize="small" />
                        </IconButton>
                      )}
                      {sucursal?.contacto?.twitter && (
                        <IconButton
                          aria-label="X"
                          size="small"
                          component="a"
                          href={normalizeUrl(sucursal.contacto.twitter)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <XIcon fontSize="small" />
                        </IconButton>
                      )}
                      {sucursal?.contacto?.linkedin && (
                        <IconButton
                          aria-label="LinkedIn"
                          size="small"
                          component="a"
                          href={normalizeUrl(sucursal.contacto.linkedin)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <LinkedInIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  )}
                </Box>
              </Stack>

              {loading && (
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    Cargando sucursal…
                  </Typography>
                </Stack>
              )}
              {!!error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </CardContent>
        </Card>

        {/* Buscador + lista */}
        <Card sx={{ mt: 2 }}>
          <CardContent sx={{ p: isMobile ? 2 : 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={900}>
                Buscar profesionales
              </Typography>

              <TextField
                label="Buscar profesional"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nombre, especialidad, email…"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              {!loading && !error && (
                <Typography variant="body2" color="text.secondary">
                  {filteredProfesionales.length} profesional{filteredProfesionales.length === 1 ? '' : 'es'}
                </Typography>
              )}

              {!loading && !error && filteredProfesionales.length === 0 && (
                <Alert severity="info">No hay profesionales para mostrar.</Alert>
              )}

              <Grid container spacing={2}>
                {filteredProfesionales.map((p) => (
                  <Grid key={p?._id || p?.email} item xs={12} sm={6} md={4}>
                    <Card
                      variant="outlined"
                      sx={{
                        overflow: 'hidden',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        // Tamaño consistente; se expande si se presiona "Ver más"
                        minHeight: 430,
                        transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
                        '&:hover': {
                          borderColor: brand.primary,
                          boxShadow: 4,
                          transform: 'translateY(-3px)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          background: `linear-gradient(90deg, ${brand.primary} 60%, ${brand.secondary} 100%)`,
                          py: 2.5,
                          px: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                        }}
                      >
                        <Avatar
                          src={p?.fotoPerfil ? resolveAssetUrl(p.fotoPerfil) : undefined}
                          sx={{
                            bgcolor: p?.fotoPerfil ? 'white' : '#2596be',
                            color: p?.fotoPerfil ? '#2596be' : 'white',
                            width: 56,
                            height: 56,
                          }}
                        >
                          {!p?.fotoPerfil && <PersonIcon />}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={800} color="white" noWrap>
                            {p?.username || 'Profesional'}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                            <MedicalInformationIcon sx={{ color: 'rgba(255,255,255,0.95)', fontSize: 18 }} />
                            <Typography variant="body2" color="rgba(255,255,255,0.95)" noWrap>
                              {p?.especialidad || p?.especialidad_principal || 'Sin especialidad'}
                            </Typography>
                          </Stack>
                        </Box>
                      </Box>

                      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {p?.especialidad && <Chip size="small" label={p.especialidad} />}
                          {p?.cita_presencial && <Chip size="small" label="Presencial" />}
                          {p?.cita_virtual && <Chip size="small" label="Online" />}
                          {p?.cita_domicilio && <Chip size="small" label="Domicilio" />}
                        </Stack>

                        {p?.descripcion && (
                          <Box sx={{ flex: 1, minHeight: 0 }}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {p.descripcion}
                            </Typography>

                            {shouldShowVerMas(p) && (
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => openProModal(p)}
                                sx={{ px: 0, mt: 0.5, color: brand.primary, fontWeight: 800, textTransform: 'none' }}
                              >
                                Ver más
                              </Button>
                            )}
                          </Box>
                        )}

                        {!p?.descripcion && shouldShowVerMas(p) && (
                          <Button
                            variant="text"
                            size="small"
                            onClick={() => openProModal(p)}
                            sx={{ px: 0, color: brand.primary, fontWeight: 800, textTransform: 'none' }}
                          >
                            Ver más
                          </Button>
                        )}

                        <Button
                          variant="contained"
                          endIcon={<OpenInNewIcon />}
                          disabled={!p?.slug}
                          onClick={() => handleIrAReserva(p.slug)}
                          sx={{ mt: 'auto', backgroundColor: brand.primary, '&:hover': { backgroundColor: brand.primary } }}
                        >
                          {p?.slug ? 'Reservar con este profesional' : 'Enlace no disponible'}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </CardContent>
        </Card>

        {/* Mapa al final */}
        {Boolean(locationData.formattedAddress) && Boolean(mapImg) && (
          <Card sx={{ mt: 2, overflow: 'hidden' }}>
            <Box
              component="img"
              alt="Mapa"
              src={mapImg}
              sx={{ width: '100%', height: { xs: 240, sm: 320 }, objectFit: 'cover', display: 'block', bgcolor: '#f8fbff' }}
            />
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Stack spacing={1}>
                <Typography fontWeight={900}>¿Cómo llegar?</Typography>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary">{locationData.formattedAddress}</Typography>
                  {locationData.mapsUrl && (
                    <Link
                      href={locationData.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      underline="hover"
                      sx={{ color: brand.primary, fontWeight: 800, whiteSpace: 'nowrap' }}
                    >
                      Cómo llegar
                    </Link>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Container>
    </Box>
  );
}
