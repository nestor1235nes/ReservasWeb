import React from 'react';
import { AppBar, Toolbar, Box, Button, Container, Typography, Stack, Card, CardContent, Avatar, Chip, Divider, Grid } from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import Logo from '../../assets/LOGO.png';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';
import LocationSection from './LocationSection';
import ExpandableText from './ExpandableText';

const formatSelectedDate = (dayjsDate) => {
  if (!dayjsDate || typeof dayjsDate.format !== 'function') return '';
  return dayjsDate.locale('es').format('dddd D [de] MMMM');
};

export default function Template2({ prof, seleccion, onFechaChange, onHoraSelect, onReservar, shouldDisableDate, minDate, brand }) {
  const BRAND = {
    primary: brand?.primary || '#2596be',
    secondary: brand?.secondary || '#21cbe6',
  };
  const services = Array.isArray(prof?.servicios) ? prof.servicios : [];
  const isReady = Boolean(seleccion.fecha && seleccion.horaSeleccionada);
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
      {/* Estilo "Calendly": una tarjeta de agenda central con panel de perfil + selector de fecha/horas */}
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
        <Card elevation={0} sx={{ border: '1px solid #e3f2fd', borderRadius: 3, overflow: 'hidden', boxShadow: '0 10px 30px rgba(37,150,190,0.08)' }}>
          <Grid container>
            {/* Panel perfil */}
            <Grid item xs={12} md={4} sx={{ bgcolor: '#fff', borderRight: { md: '1px solid #e3f2fd' } }}>
              <CardContent>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    src={prof.fotoPerfil ? resolveAssetUrl(prof.fotoPerfil) : undefined}
                    sx={{ width: 56, height: 56, border: '2px solid #fff', boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}
                  />
                  <Box>
                    <Typography fontWeight={900} sx={{ lineHeight: 1.15 }}>{prof.username}</Typography>
                    <Typography variant="body2" color="text.secondary">{prof.especialidad || 'Profesional'}</Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                  {prof?.sucursal?.nombre && (
                    <Chip size="small" label={prof.sucursal.nombre} sx={{ bgcolor: '#f8fbff', border: '1px solid #e3f2fd', fontWeight: 700 }} />
                  )}
                  {services.length > 0 && (
                    <Chip size="small" label={`${services.length} servicio${services.length === 1 ? '' : 's'}`} sx={{ bgcolor: '#f8fbff', border: '1px solid #e3f2fd', fontWeight: 700 }} />
                  )}
                  <Chip size="small" label="Agenda online" sx={{ bgcolor: 'rgba(37,150,190,0.12)', color: BRAND.primary, fontWeight: 800 }} />
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Typography fontWeight={900} sx={{ color: BRAND.primary }}>
                  Detalles
                </Typography>
                <Box sx={{ mt: 0.75 }}>
                  <ExpandableText
                    text={prof?.descripcion || 'Selecciona una fecha y una hora para comenzar.'}
                    lines={4}
                    minCharsForToggle={240}
                    typographyProps={{ color: 'text.secondary' }}
                  />
                </Box>

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

                {services.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography fontWeight={900} sx={{ color: BRAND.primary }}>
                      Servicios
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                      {services.slice(0, 10).map((s, idx) => (
                        <Chip
                          key={`${s.tipo || 'servicio'}-${idx}`}
                          size="small"
                          label={`${s.tipo || 'Servicio'}${s.precio ? ` · $${Number(s.precio).toLocaleString()}` : ''}`}
                          sx={{ bgcolor: '#f8fbff', border: '1px solid #e3f2fd', fontWeight: 700 }}
                        />
                      ))}
                    </Stack>
                    {services.length > 10 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Mostrando 10 de {services.length}.
                      </Typography>
                    )}
                  </>
                )}

                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  La modalidad se elige dentro del modal, cuando selecciones el servicio.
                </Typography>
              </CardContent>
            </Grid>

            {/* Scheduler */}
            <Grid item xs={12} md={8} sx={{ bgcolor: '#fbfdff' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={900} sx={{ color: BRAND.primary }}>
                  Agenda una cita
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {seleccion?.fecha ? `Disponibilidad para ${formatSelectedDate(seleccion.fecha)}` : 'Elige una fecha para ver horas disponibles.'}
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography fontWeight={800} mb={1}>Fecha</Typography>
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
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography fontWeight={800} mb={1}>Horas</Typography>
                    <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
                      {(seleccion.horasDisponibles || []).length === 0 && (
                        <Typography color="text.secondary" fontSize={14}>
                          {seleccion.fecha ? 'No hay horas para este día.' : 'Selecciona una fecha.'}
                        </Typography>
                      )}

                      <Stack spacing={1}>
                        {(seleccion.horasDisponibles || []).map((hora) => {
                          const selected = seleccion.horaSeleccionada === hora;
                          return (
                            <Button
                              key={hora}
                              variant={selected ? 'contained' : 'outlined'}
                              startIcon={<AccessTimeIcon />}
                              onClick={() => onHoraSelect(hora)}
                              sx={{
                                justifyContent: 'flex-start',
                                borderRadius: 2,
                                py: 1.1,
                                color: selected ? 'white' : BRAND.primary,
                                bgcolor: selected ? BRAND.primary : 'transparent',
                                borderColor: BRAND.primary,
                              }}
                              fullWidth
                            >
                              {hora}
                            </Button>
                          );
                        })}
                      </Stack>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary">Tu selección</Typography>
                    <Typography fontWeight={900}>
                      {seleccion?.fecha ? formatSelectedDate(seleccion.fecha) : '—'}{seleccion?.horaSeleccionada ? ` · ${seleccion.horaSeleccionada}` : ''}
                    </Typography>
                  </Box>
                  <Button
                    disabled={!isReady}
                    onClick={onReservar}
                    sx={{
                      px: 2.5,
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
                  >
                    Continuar
                  </Button>
                </Stack>
              </CardContent>
            </Grid>
          </Grid>
        </Card>

        <Box sx={{ mt: 2 }}>
          <LocationSection prof={prof} brand={BRAND} />
        </Box>
      </Container>
    </Box>
  );
}
