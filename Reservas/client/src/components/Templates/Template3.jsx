import React from 'react';
import { AppBar, Toolbar, Box, Button, Container, Grid, Typography, Stack, Card, CardContent, Avatar, Chip, Divider, Tabs, Tab } from '@mui/material';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import Logo from '../../assets/LOGO.png';
import LocationSection from './LocationSection';
import ExpandableText from './ExpandableText';

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

const toArray = (v) => (Array.isArray(v) ? v : (typeof v === 'string' ? v.split(/[,/|]+/g) : [])).map(s => String(s).trim()).filter(Boolean);

export default function Template3({ prof, seleccion, onFechaChange, onHoraSelect, onReservar, shouldDisableDate, minDate, brand }) {
  const BRAND = {
    primary: brand?.primary || '#2596be',
    secondary: brand?.secondary || '#21cbe6',
  };
  const services = Array.isArray(prof?.servicios) ? prof.servicios : [];
  const isReady = Boolean(seleccion.fecha && seleccion.horaSeleccionada);
  const [tab, setTab] = React.useState(0);

  const professionalBadges = [
    prof?.sucursal?.nombre ? String(prof.sucursal.nombre) : null,
    prof?.cita_presencial ? 'Presencial' : null,
    prof?.cita_virtual ? 'Telemedicina' : null,
    prof?.cita_domicilio ? 'Domicilio' : null,
  ].filter(Boolean);

  return (
    <Box sx={{ bgcolor: '#f7fbfd', minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={0} sx={{ background: 'transparent', color: 'inherit', borderBottom: '1px solid #e3f2fd', backdropFilter: 'blur(8px)' }}>
        <Toolbar sx={{ py: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <img src={Logo} alt="Sessionly Logo" style={{ width: 150, height: 40 }} />
            {prof?.sucursal?.logo && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800, opacity: 0.75 }}>
                  →
                </Typography>
                <Avatar
                  variant="rounded"
                  src={resolveAssetUrl(prof.sucursal.logo)}
                  alt={prof?.sucursal?.nombre ? `Logo ${prof.sucursal.nombre}` : 'Logo sucursal'}
                  sx={{ width: 40, height: 40, bgcolor: 'white', border: '1px solid #e3f2fd' }}
                  imgProps={{ style: { objectFit: 'contain' } }}
                />
              </>
            )}
          </Stack>
          <Box sx={{ flex: 1 }} />
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
        {/* Encabezado tipo ficha (inspiración directorio/Doctoralia) */}
        <Card elevation={0} sx={{ border: '1px solid #e3f2fd', borderRadius: 3, boxShadow: '0 8px 24px rgba(37,150,190,0.06)' }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'center', sm: 'center' }}>
              <Avatar
                src={prof.fotoPerfil ? resolveAssetUrl(prof.fotoPerfil) : undefined}
                sx={{ width: 84, height: 84, border: '3px solid #fff', boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}
              />
              <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.1 }}>{prof.username}</Typography>
                <Typography color="text.secondary">{prof.especialidad || 'Profesional'}</Typography>
                <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: 'center', sm: 'flex-start' }}>
                  {professionalBadges.slice(0, 4).map((b) => (
                    <Chip key={b} size="small" label={b} sx={{ bgcolor: '#f8fbff', border: '1px solid #e3f2fd', fontWeight: 700 }} />
                  ))}
                  {services.length > 0 && (
                    <Chip size="small" label={`${services.length} servicio${services.length === 1 ? '' : 's'}`} sx={{ bgcolor: 'rgba(37,150,190,0.12)', color: BRAND.primary, fontWeight: 800 }} />
                  )}
                </Stack>
              </Box>
              <Box>
                <Chip
                  label="Agenda online"
                  sx={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})`, color: 'white', fontWeight: 900 }}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={2.5} sx={{ mt: 2 }}>
          {/* Contenido con tabs */}
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ border: '1px solid #e3f2fd', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ px: 2, pt: 1.5, bgcolor: '#fff' }}>
                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  variant="scrollable"
                  allowScrollButtonsMobile
                  textColor="primary"
                  indicatorColor="primary"
                  sx={{
                    '& .MuiTab-root': { fontWeight: 900, textTransform: 'none' },
                    '& .MuiTabs-indicator': { backgroundColor: BRAND.primary },
                  }}
                >
                  <Tab label="Sobre mí" />
                  <Tab label="Servicios" />
                  <Tab label="Ubicación" />
                </Tabs>
              </Box>
              <Divider />
              <CardContent>
                <TabPanel value={tab} index={0}>
                  <Typography fontWeight={900} sx={{ color: BRAND.primary }}>Presentación</Typography>
                  <Divider sx={{ my: 1 }} />
                  <ExpandableText
                    text={prof?.descripcion || 'Sin descripción.'}
                    lines={4}
                    minCharsForToggle={240}
                    typographyProps={{ color: 'text.secondary' }}
                  />
                  {prof?.experiencia && (
                    <Box sx={{ mt: 1 }}>
                      <ExpandableText
                        text={prof.experiencia}
                        lines={3}
                        minCharsForToggle={220}
                        typographyProps={{ color: 'text.secondary' }}
                      />
                    </Box>
                  )}
                  {professionalBadges.length > 0 && (
                    <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
                      {professionalBadges.map((b) => (
                        <Chip key={b} size="small" label={b} sx={{ bgcolor: '#f8fbff', border: '1px solid #e3f2fd' }} />
                      ))}
                    </Stack>
                  )}
                </TabPanel>

                <TabPanel value={tab} index={1}>
                  <Typography fontWeight={900} sx={{ color: BRAND.primary }}>Servicios</Typography>
                  <Divider sx={{ my: 1 }} />
                  {services.length === 0 ? (
                    <Typography color="text.secondary">Aún no hay servicios publicados.</Typography>
                  ) : (
                    <Stack spacing={1.25}>
                      {services.map((s, idx) => {
                        const modalidades = toArray(s?.modalidad);
                        return (
                          <Card key={`${s?.tipo || 'servicio'}-${idx}`} elevation={0} sx={{ border: '1px solid #e3f2fd', borderRadius: 2, bgcolor: '#fff' }}>
                            <CardContent sx={{ py: 1.5 }}>
                              <Stack spacing={0.75}>
                                <Stack direction="row" justifyContent="space-between" gap={1} alignItems="baseline" flexWrap="wrap">
                                  <Typography fontWeight={900}>{s?.tipo || 'Servicio'}</Typography>
                                  {s?.precio && (
                                    <Typography fontWeight={900} sx={{ color: BRAND.primary }}>
                                      ${Number(s.precio).toLocaleString()}
                                    </Typography>
                                  )}
                                </Stack>
                                {s?.descripcion && (
                                  <ExpandableText
                                    text={s.descripcion}
                                    lines={2}
                                    minCharsForToggle={160}
                                    typographyProps={{ color: 'text.secondary', fontSize: 14 }}
                                  />
                                )}
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                  {s?.duracion && (
                                    <Chip size="small" label={`Duración: ${s.duracion}`} sx={{ bgcolor: '#f8fbff', border: '1px solid #e3f2fd' }} />
                                  )}
                                  {modalidades.slice(0, 3).map((m) => (
                                    <Chip key={`${idx}-${m}`} size="small" label={m} sx={{ bgcolor: 'rgba(37,150,190,0.12)', color: BRAND.primary, fontWeight: 800 }} />
                                  ))}
                                </Stack>
                              </Stack>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Stack>
                  )}
                </TabPanel>

                <TabPanel value={tab} index={2}>
                  <LocationSection prof={prof} brand={BRAND} showMap={false} />
                </TabPanel>
              </CardContent>
            </Card>
          </Grid>

          {/* Sidebar de agendamiento */}
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid #e3f2fd', borderRadius: 3, position: { md: 'sticky' }, top: { md: 24 }, boxShadow: '0 8px 24px rgba(37,150,190,0.08)' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={900} sx={{ color: BRAND.primary }}>Agendar online</Typography>
                <Typography variant="body2" color="text.secondary">
                  Selecciona fecha y hora. La modalidad se elige al seleccionar el servicio.
                </Typography>
                <Divider sx={{ my: 1.5 }} />

                <Typography fontWeight={800} mb={1}>1) Fecha</Typography>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                  <DatePicker
                    label="Fecha"
                    value={seleccion.fecha || null}
                    onChange={(v) => {
                      const valid = v && typeof v.isValid === 'function' && v.isValid();
                      onFechaChange(valid ? v.startOf('day') : null);
                    }}
                    shouldDisableDate={shouldDisableDate}
                    minDate={minDate}
                    slotProps={{ textField: { size: 'small', fullWidth: true, inputProps: { readOnly: true } } }}
                  />
                </LocalizationProvider>

                <Box mt={2}>
                  <Typography fontWeight={800} mb={1}>2) Hora</Typography>
                  <Stack spacing={1}>
                    {(seleccion.horasDisponibles || []).length === 0 && (
                      <Typography color="text.secondary" fontSize={14}>
                        {seleccion.fecha ? 'No hay horas para este día.' : 'Selecciona una fecha.'}
                      </Typography>
                    )}
                    {(seleccion.horasDisponibles || []).slice(0, 10).map((hora) => (
                      <Button
                        key={hora}
                        variant={seleccion.horaSeleccionada === hora ? 'contained' : 'outlined'}
                        size="small"
                        startIcon={<AccessTimeIcon />}
                        sx={{
                          borderRadius: 2,
                          justifyContent: 'flex-start',
                          color: seleccion.horaSeleccionada === hora ? 'white' : BRAND.primary,
                          bgcolor: seleccion.horaSeleccionada === hora ? BRAND.primary : 'transparent',
                          borderColor: BRAND.primary,
                        }}
                        onClick={() => onHoraSelect(hora)}
                        fullWidth
                      >
                        {hora}
                      </Button>
                    ))}
                  </Stack>
                  {(seleccion.horasDisponibles || []).length > 10 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Mostrando 10 horas. Selecciona otra fecha para ver más.
                    </Typography>
                  )}
                </Box>

                <Button
                  sx={{
                    mt: 2,
                    py: 1.2,
                    background: isReady
                      ? `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})`
                      : 'grey.400',
                    color: 'white',
                    borderRadius: 2,
                    fontWeight: 900,
                    textTransform: 'none',
                    '&:hover': {
                      background: isReady
                        ? `linear-gradient(135deg, ${BRAND.secondary}, ${BRAND.primary})`
                        : 'grey.400',
                    },
                    '&.Mui-disabled': {
                      background: 'grey.400',
                      color: 'white',
                      opacity: 0.75,
                    },
                  }}
                  fullWidth
                  disabled={!isReady}
                  onClick={onReservar}
                >
                  Continuar
                </Button>

                {/* Mapa visible en el sidebar (sin depender de la pestaña Ubicación) */}
                <LocationSection prof={prof} brand={BRAND} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
