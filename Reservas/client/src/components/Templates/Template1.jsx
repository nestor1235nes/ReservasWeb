import React, { useMemo } from 'react';
import { AppBar, Toolbar, Box, Button, Container, Grid, Typography, Stack, Card, CardContent, Avatar, Divider, Chip } from '@mui/material';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import BusinessIcon from '@mui/icons-material/Business';
import Logo from '../../assets/LOGO.png';
import LocationSection from './LocationSection';
import ExpandableText from './ExpandableText';

import { buildWhatsAppHref, formatDaysShort, getExperienceLabel, getSpecialtyLabel, getTimetableSummary } from './templateMeta';

const DAYS_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const getUniqueDays = (timetable) => {
  const set = new Set();
  (timetable || []).forEach((b) => (b?.days || []).forEach((d) => d && set.add(d)));
  return [...set].sort((a, b) => DAYS_ORDER.indexOf(a) - DAYS_ORDER.indexOf(b));
};

const getModalidades = (prof) => {
  const items = [];
  if (prof?.cita_presencial) items.push({ key: 'Presencial', icon: <PersonPinCircleIcon fontSize="small" /> });
  if (prof?.cita_virtual) items.push({ key: 'Telemedicina', icon: <VideoCameraFrontIcon fontSize="small" /> });
  if (prof?.cita_domicilio) items.push({ key: 'Domicilio', icon: <HomeWorkIcon fontSize="small" /> });
  return items;
};

const formatBlockTime = (block) => {
  const from = block?.fromTime;
  const to = block?.toTime;
  if (from && to) {
    const bf = block?.breakFrom;
    const bt = block?.breakTo;
    const hasBreak = bf && bt;
    return hasBreak ? `${from}–${to} (colación ${bf}–${bt})` : `${from}–${to}`;
  }
  const times = Array.isArray(block?.times) ? block.times : [];
  if (times.length > 0) return `${times[0]}–${times[times.length - 1]}`;
  return '';
};

export default function Template1({ prof, seleccion, onFechaChange, onHoraSelect, onReservar, shouldDisableDate, minDate, brand }) {
  const BRAND = {
    primary: brand?.primary || '#2596be',
    secondary: brand?.secondary || '#21cbe6',
  };
  const { days: timetableDays, hours: timetableHours } = useMemo(() => getTimetableSummary(prof?.timetable), [prof]);
  const diasShort = useMemo(() => formatDaysShort(timetableDays), [timetableDays]);
  const services = Array.isArray(prof?.servicios) ? prof.servicios : [];
  const isReady = Boolean(seleccion.fecha && seleccion.horaSeleccionada);

  const specialtyLabel = useMemo(() => getSpecialtyLabel(prof), [prof]);
  const experienceLabel = useMemo(() => getExperienceLabel(prof), [prof]);
  const hoursLabel = useMemo(() => {
    const list = (timetableHours || []).filter(Boolean);
    if (list.length === 0) return '';
    const shown = list.slice(0, 2).join(' · ');
    return list.length > 2 ? `${shown} +${list.length - 2}` : shown;
  }, [timetableHours]);

  const waHref = useMemo(() => {
    if (!prof?.celular || !prof?.celularEsWhatsApp) return '';
    return buildWhatsAppHref({
      phone: prof.celular,
      message: `Hola ${prof?.username || ''}, vengo desde tu enlace de reservas.`,
    });
  }, [prof?.celular, prof?.celularEsWhatsApp, prof?.username]);

  const metaChips = useMemo(() => {
    const out = [];
    if (specialtyLabel) out.push({ label: `Especialidad: ${specialtyLabel}`, icon: <LocalHospitalIcon fontSize="small" /> });
    if (experienceLabel) out.push({ label: experienceLabel, icon: <WorkspacePremiumIcon fontSize="small" /> });
    if (diasShort) out.push({ label: `Días: ${diasShort}`, icon: <CalendarMonthIcon fontSize="small" /> });
    if (hoursLabel) out.push({ label: `Horario: ${hoursLabel}`, icon: <AccessTimeIcon fontSize="small" /> });
    if (prof?.sucursal?.nombre) out.push({ label: String(prof.sucursal.nombre), icon: <BusinessIcon fontSize="small" /> });
    return out;
  }, [diasShort, hoursLabel, specialtyLabel, experienceLabel, prof?.sucursal?.nombre]);
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
        <Card
          elevation={0}
          sx={{
            border: '1px solid #dff1ff',
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 18px 50px rgba(37,150,190,0.10)',
            bgcolor: 'white',
          }}
        >

          {/* Cover + Avatar centrado */}
          <Box
            sx={{
              position: 'relative',
              height: { xs: 150, sm: 190 },
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})`,
            }}
          >
            <Avatar
              src={prof.fotoPerfil ? resolveAssetUrl(prof.fotoPerfil) : undefined}
              sx={{
                position: 'absolute',
                left: '50%',
                bottom: { xs: -52, sm: -58 },
                transform: 'translateX(-50%)',
                width: { xs: 104, sm: 116 },
                height: { xs: 104, sm: 116 },
                border: '5px solid #fff',
                boxShadow: '0 10px 28px rgba(0,0,0,0.16)',
                bgcolor: 'white',
              }}
            />
          </Box>

          {/* Info + acciones */}
          <CardContent sx={{ pt: { xs: 7.5, sm: 8.5 }, pb: 2.25 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                  <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.15 }}>
                    {prof.username}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.25 }}>
                    {prof.especialidad || 'Profesional'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={1} justifyContent={{ xs: 'center', md: 'flex-end' }} flexWrap="wrap" useFlexGap>
                  {metaChips.slice(0, 5).map((s, i) => (
                    <Chip
                      key={i}
                      size="small"
                      label={s.label}
                      icon={s.icon}
                      sx={{
                        bgcolor: '#f1fbff',
                        border: '1px solid #dff1ff',
                        fontWeight: 800,
                        px: 0.5,
                      }}
                    />
                  ))}
                </Stack>
              </Grid>

              <Grid item xs={12}>
                <Stack direction="row" spacing={1} justifyContent={{ xs: 'center', md: 'flex-start' }} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                  <Button
                    variant="contained"
                    onClick={() => {
                      const el = document.getElementById('booking-card');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    sx={{
                      background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})`,
                      fontWeight: 900,
                      textTransform: 'none',
                      borderRadius: 999,
                      px: 3,
                      boxShadow: '0 10px 22px rgba(37,150,190,0.22)',
                      '&:hover': { background: `linear-gradient(135deg, ${BRAND.secondary}, ${BRAND.primary})` },
                    }}
                  >
                    Reservar
                  </Button>
                  {waHref ? (
                    <Button
                      variant="outlined"
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      startIcon={<WhatsAppIcon />}
                      sx={{
                        borderColor: '#25D366',
                        color: '#128C7E',
                        fontWeight: 900,
                        textTransform: 'none',
                        borderRadius: 999,
                        px: 3,
                        bgcolor: 'rgba(255,255,255,0.9)',
                        '&:hover': {
                          borderColor: '#25D366',
                          bgcolor: 'rgba(37,211,102,0.08)',
                        },
                      }}
                    >
                      Hablar por WhatsApp
                    </Button>
                  ) : null}
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Grid container spacing={2.5} sx={{ mt: 2 }}>
          <Grid item xs={12} md={5}>
            <Stack spacing={2}>
              <Card elevation={0} sx={{ border: '1px solid #dff1ff', borderRadius: 4, boxShadow: '0 14px 34px rgba(37,150,190,0.08)' }}>
                <CardContent>
                  <Typography fontWeight={900} sx={{ color: BRAND.primary }}>
                    Introducción
                  </Typography>
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
                  {diasShort && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Atención: {diasShort}
                    </Typography>
                  )}
                </CardContent>
              </Card>

              {services.length > 0 && (
                <Card elevation={0} sx={{ border: '1px solid #dff1ff', borderRadius: 4, boxShadow: '0 14px 34px rgba(37,150,190,0.08)' }}>
                  <CardContent>
                    <Typography fontWeight={900} sx={{ color: BRAND.primary }}>
                      Servicios
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {services.slice(0, 10).map((s, idx) => (
                        <Chip
                          key={`${s.tipo || 'servicio'}-${idx}`}
                          label={`${s.tipo || 'Servicio'}${s.precio ? ` · $${Number(s.precio).toLocaleString()}` : ''}`}
                          sx={{ bgcolor: '#f1fbff', border: '1px solid #dff1ff', fontWeight: 700 }}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              <LocationSection prof={prof} brand={BRAND} />
            </Stack>
          </Grid>

          <Grid item xs={12} md={7}>
            <Stack spacing={2}>
              <Card
                id="booking-card"
                elevation={0}
                sx={{ border: '1px solid #dff1ff', borderRadius: 4, boxShadow: '0 18px 50px rgba(37,150,190,0.12)' }}
              >
                <CardContent>
                  <Typography variant="h6" fontWeight={900} sx={{ color: BRAND.primary }}>
                    Agendar cita
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Selecciona fecha y hora. La modalidad se elige al seleccionar el servicio.
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />

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

                  <Box mt={2}>
                    <Typography fontWeight={800} mb={1}>Horas</Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {(seleccion.horasDisponibles || []).length === 0 && (
                        <Typography color="text.secondary" fontSize={14}>Selecciona una fecha</Typography>
                      )}
                      {(seleccion.horasDisponibles || []).map((hora) => (
                        <Button
                          key={hora}
                          variant={seleccion.horaSeleccionada === hora ? 'contained' : 'outlined'}
                          size="small"
                          startIcon={<AccessTimeIcon />}
                          sx={{
                            borderRadius: 999,
                            color: seleccion.horaSeleccionada === hora ? 'white' : BRAND.primary,
                            bgcolor: seleccion.horaSeleccionada === hora ? BRAND.primary : 'rgba(241,251,255,0.8)',
                            borderColor: 'rgba(37,150,190,0.45)',
                            flexBasis: { xs: 'calc(50% - 8px)', sm: 'auto' },
                            flexGrow: { xs: 1, sm: 0 },
                            minWidth: { xs: 'unset', sm: 'auto' },
                            '&:hover': {
                              bgcolor: seleccion.horaSeleccionada === hora ? BRAND.primary : 'rgba(223,241,255,0.95)',
                              borderColor: BRAND.primary,
                            },
                          }}
                          onClick={() => onHoraSelect(hora)}
                        >
                          {hora}
                        </Button>
                      ))}
                    </Box>
                  </Box>

                  <Button
                    sx={{
                      mt: 2,
                      py: 1.2,
                      background: isReady
                        ? `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})`
                        : 'grey.400',
                      color: 'white',
                      borderRadius: 999,
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
                </CardContent>
              </Card>

              {/* “Publicaciones” (cards tipo timeline) */}
              <Card elevation={0} sx={{ border: '1px solid #dff1ff', borderRadius: 4, boxShadow: '0 14px 34px rgba(37,150,190,0.08)' }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <CalendarMonthIcon sx={{ color: BRAND.primary }} />
                    <Typography fontWeight={900} sx={{ color: BRAND.primary }}>
                      Cómo funciona
                    </Typography>
                  </Stack>
                  <Typography color="text.secondary">
                    1) Elige fecha y hora · 2) Selecciona el servicio · 3) Si el servicio tiene más de una modalidad, podrás elegirla · 4) Confirma.
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
