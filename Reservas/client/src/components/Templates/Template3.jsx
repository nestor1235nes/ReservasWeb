import React from 'react';
import { AppBar, Toolbar, Box, Button, Container, Grid, Typography, Stack, Card, CardContent, Avatar, Chip, Divider, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { ASSETS_BASE } from '../../config';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonPinCircleIcon from '@mui/icons-material/PersonPinCircle';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import Logo from '../../assets/LOGO.png';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export default function Template3({ prof, seleccion, onFechaChange, onHoraSelect, onModalidadSelect, onReservar, shouldDisableDate, minDate, brand }) {
  const BRAND = {
    primary: brand?.primary || '#2596be',
    secondary: brand?.secondary || '#21cbe6',
  };
  const isReady = Boolean(seleccion.fecha && seleccion.horaSeleccionada && seleccion.modalidad);
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
                  src={`${ASSETS_BASE}${prof.sucursal.logo}`}
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
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 }, px: { xs: 2, md: 3 } }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card elevation={0} sx={{ border: '1px solid #e3f2fd', borderRadius: 3, mb: 3, overflow: 'hidden', boxShadow: '0 8px 24px rgba(37,150,190,0.06)' }}>
              <Box sx={{ height: 110, background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})` }} />
              <CardContent sx={{ pt: 0 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: -6 }}>
                  <Avatar src={prof.fotoPerfil ? `${ASSETS_BASE}${prof.fotoPerfil}` : undefined} sx={{ width: 88, height: 88, boxShadow: '0 0 0 4px #fff' }} />
                  <Box>
                    <Typography variant="h6" fontWeight={900}>{prof.username}</Typography>
                    <Typography color="text.secondary">{prof.especialidad}</Typography>
                    <Chip size="small" label={prof.sucursal?.nombre || 'Independiente'} sx={{ mt: 1, bgcolor: 'rgba(37,150,190,0.12)', color: '#2596be', fontWeight: 700 }} />
                  </Box>
                </Stack>
                {prof.descripcion && (
                  <Typography sx={{ mt: 2 }} color="text.secondary">{prof.descripcion}</Typography>
                )}
              </CardContent>
            </Card>
            {Array.isArray(prof.servicios) && prof.servicios.length > 0 && (
              <Card elevation={0} sx={{ border: '1px solid #e3f2fd', borderRadius: 3 }}>
                <CardContent>
                  <Typography fontWeight={900} mb={1}>Servicios</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {prof.servicios.map((s, i) => (
                      <Chip key={i} label={`${s.tipo || 'Servicio'} · ${s.duracion || ''} · ${s.precio || ''}`} sx={{ bgcolor: '#f8fbff', border: '1px solid #e3f2fd' }} />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Grid>
          <Grid item xs={12} md={5}>
            <Card elevation={0} sx={{ border: '1px solid #e3f2fd', borderRadius: 3, position: { md: 'sticky' }, top: { md: 24 }, boxShadow: '0 8px 24px rgba(37,150,190,0.08)' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={900} sx={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})`, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Reserva tu cita
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Accordion elevation={0} sx={{ mb: 1, border: '1px solid #e3f2fd', borderRadius: 2, boxShadow: '0 8px 16px rgba(37,150,190,0.06)' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})`, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} fontWeight={800}>
                      ¿Cómo agendar?
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <CalendarMonthIcon sx={{ color: BRAND.primary }} />
                        </ListItemIcon>
                        <ListItemText primary="Selecciona la fecha de tu cita" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <AccessTimeIcon sx={{ color: BRAND.primary }} />
                        </ListItemIcon>
                        <ListItemText primary="Elige una hora disponible" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <VideoCameraFrontIcon sx={{ color: BRAND.primary }} />
                        </ListItemIcon>
                        <ListItemText primary="Selecciona la modalidad: Presencial o Telemedicina" />
                      </ListItem>
                      <Divider sx={{ my: 0.5 }} />
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircleOutlineIcon sx={{ color: BRAND.secondary }} />
                        </ListItemIcon>
                        <ListItemText primary="Presiona 'Reservar cita' para confirmar" />
                      </ListItem>
                    </List>
                  </AccordionDetails>
                </Accordion>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fbff', border: '1px dashed #d7ebf5' }}>
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
                  </Box>
                </LocalizationProvider>
                <Box mt={2}>
                  <Typography fontWeight={700} mb={1}>Horas disponibles</Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {(seleccion.horasDisponibles || []).length === 0 && (<Typography color="text.secondary" fontSize={14}>Selecciona una fecha</Typography>)}
                    {(seleccion.horasDisponibles || []).map(hora => (
                      <Button key={hora} variant={seleccion.horaSeleccionada === hora ? 'contained' : 'outlined'} size="small" startIcon={<AccessTimeIcon />} sx={{ borderRadius: 999, px: 1.5, color: seleccion.horaSeleccionada === hora ? 'white' : BRAND.primary, bgcolor: seleccion.horaSeleccionada === hora ? BRAND.primary : 'transparent', borderColor: BRAND.primary, transition: 'all .2s', '&:hover': { boxShadow: 2 }, flexBasis: { xs: 'calc(50% - 8px)', sm: 'auto' }, flexGrow: { xs: 1, sm: 0 }, minWidth: { xs: 'unset', sm: 'auto' } }} onClick={() => onHoraSelect(hora)}>{hora}</Button>
                    ))}
                  </Box>
                </Box>
                <Box mt={2}>
                  <Typography fontWeight={700} mb={1}>Modalidad</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch">
                    <Button startIcon={<PersonPinCircleIcon />} variant={seleccion.modalidad === 'Presencial' ? 'contained' : 'outlined'} size="small" sx={{ borderRadius: 999, px: 1.5, width: { xs: '100%', sm: 'auto' }, color: seleccion.modalidad === 'Presencial' ? 'white' : (prof.cita_presencial ? BRAND.primary : 'grey.500'), bgcolor: seleccion.modalidad === 'Presencial' ? BRAND.primary : 'transparent', borderColor: prof.cita_presencial ? BRAND.primary : 'grey.300', opacity: prof.cita_presencial ? 1 : 0.5, pointerEvents: prof.cita_presencial ? 'auto' : 'none' }} onClick={() => { if (prof.cita_presencial) onModalidadSelect('Presencial'); }}>Presencial</Button>
                    <Button startIcon={<VideoCameraFrontIcon />} variant={seleccion.modalidad === 'Telemedicina' ? 'contained' : 'outlined'} size="small" sx={{ borderRadius: 999, px: 1.5, width: { xs: '100%', sm: 'auto' }, color: seleccion.modalidad === 'Telemedicina' ? 'white' : (prof.cita_virtual ? BRAND.secondary : 'grey.500'), bgcolor: seleccion.modalidad === 'Telemedicina' ? BRAND.secondary : 'transparent', borderColor: prof.cita_virtual ? BRAND.secondary : 'grey.300', opacity: prof.cita_virtual ? 1 : 0.5, pointerEvents: prof.cita_virtual ? 'auto' : 'none' }} onClick={() => { if (prof.cita_virtual) onModalidadSelect('Telemedicina'); }}>Telemedicina</Button>
                    <Button startIcon={<HomeWorkIcon />} variant={seleccion.modalidad === 'Domicilio' ? 'contained' : 'outlined'} size="small" sx={{ borderRadius: 999, px: 1.5, width: { xs: '100%', sm: 'auto' }, color: seleccion.modalidad === 'Domicilio' ? 'white' : (prof.cita_domicilio ? BRAND.primary : 'grey.500'), bgcolor: seleccion.modalidad === 'Domicilio' ? BRAND.primary : 'transparent', borderColor: prof.cita_domicilio ? BRAND.primary : 'grey.300', opacity: prof.cita_domicilio ? 1 : 0.5, pointerEvents: prof.cita_domicilio ? 'auto' : 'none' }} onClick={() => { if (prof.cita_domicilio) onModalidadSelect('Domicilio'); }}>Domicilio</Button>
                  </Stack>
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
                    boxShadow: isReady ? '0 8px 24px rgba(37,150,190,0.08)' : 'none',
                    '&:hover': {
                      background: isReady
                        ? `linear-gradient(135deg, ${BRAND.secondary}, ${BRAND.primary})`
                        : 'grey.400',
                    },
                    '&.Mui-disabled': {
                      background: 'grey.400',
                      color: 'white',
                      opacity: 0.7,
                    },
                  }}
                  fullWidth
                  disabled={!isReady}
                  onClick={onReservar}
                >
                  Reservar cita
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
