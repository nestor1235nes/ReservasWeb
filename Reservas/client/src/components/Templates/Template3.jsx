import React from 'react';
import { AppBar, Toolbar, Box, Button, Container, Grid, Typography, Stack, Card, CardContent, Avatar, Chip, Divider } from '@mui/material';
import { ASSETS_BASE } from '../../config';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonPinCircleIcon from '@mui/icons-material/PersonPinCircle';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import Logo from '../../assets/LOGO.png';

export default function Template3({ prof, seleccion, onFechaChange, onHoraSelect, onModalidadSelect, onReservar, shouldDisableDate, minDate }) {
  return (
    <Box sx={{ bgcolor: '#f7fbfd', minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={0} sx={{ background: 'transparent', color: 'inherit', borderBottom: '1px solid #e3f2fd', backdropFilter: 'blur(8px)' }}>
        <Toolbar sx={{ py: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <img src={Logo} alt="Sessionly Logo" style={{ width: 150, height: 40 }} />
          </Stack>
          <Box sx={{ flex: 1 }} />
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card elevation={0} sx={{ border: '1px solid #e3f2fd', borderRadius: 3, mb: 3, overflow: 'hidden', boxShadow: '0 8px 24px rgba(37,150,190,0.06)' }}>
              <Box sx={{ height: 110, background: 'linear-gradient(135deg, #2596be, #21cbe6)' }} />
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
                <Typography variant="h6" fontWeight={900} sx={{ background: 'linear-gradient(135deg, #2596be, #21cbe6)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Reserva tu cita
                </Typography>
                <Divider sx={{ my: 1 }} />
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
                      <Button key={hora} variant={seleccion.horaSeleccionada === hora ? 'contained' : 'outlined'} size="small" startIcon={<AccessTimeIcon />} sx={{ borderRadius: 999, px: 1.5, color: seleccion.horaSeleccionada === hora ? 'white' : '#2596be', bgcolor: seleccion.horaSeleccionada === hora ? '#2596be' : 'transparent', borderColor: '#2596be', transition: 'all .2s', '&:hover': { boxShadow: 2 } }} onClick={() => onHoraSelect(hora)}>{hora}</Button>
                    ))}
                  </Box>
                </Box>
                <Box mt={2}>
                  <Typography fontWeight={700} mb={1}>Modalidad</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button startIcon={<PersonPinCircleIcon />} variant={seleccion.modalidad === 'Presencial' ? 'contained' : 'outlined'} size="small" sx={{ borderRadius: 999, px: 1.5, color: seleccion.modalidad === 'Presencial' ? 'white' : (prof.cita_presencial ? '#2596be' : 'grey.500'), bgcolor: seleccion.modalidad === 'Presencial' ? '#2596be' : 'transparent', borderColor: prof.cita_presencial ? '#2596be' : 'grey.300', opacity: prof.cita_presencial ? 1 : 0.5, pointerEvents: prof.cita_presencial ? 'auto' : 'none' }} onClick={() => { if (prof.cita_presencial) onModalidadSelect('Presencial'); }}>Presencial</Button>
                    <Button startIcon={<VideoCameraFrontIcon />} variant={seleccion.modalidad === 'Telemedicina' ? 'contained' : 'outlined'} size="small" sx={{ borderRadius: 999, px: 1.5, color: seleccion.modalidad === 'Telemedicina' ? 'white' : (prof.cita_virtual ? '#21cbe6' : 'grey.500'), bgcolor: seleccion.modalidad === 'Telemedicina' ? '#21cbe6' : 'transparent', borderColor: prof.cita_virtual ? '#21cbe6' : 'grey.300', opacity: prof.cita_virtual ? 1 : 0.5, pointerEvents: prof.cita_virtual ? 'auto' : 'none' }} onClick={() => { if (prof.cita_virtual) onModalidadSelect('Telemedicina'); }}>Telemedicina</Button>
                  </Stack>
                </Box>
                <Button sx={{ mt: 2, py: 1.2, background: seleccion.fecha && seleccion.horaSeleccionada && seleccion.modalidad ? 'linear-gradient(135deg, #2596be, #21cbe6)' : 'grey.400', color: 'white', opacity: seleccion.fecha && seleccion.horaSeleccionada && seleccion.modalidad ? 1 : 0.6, pointerEvents: seleccion.fecha && seleccion.horaSeleccionada && seleccion.modalidad ? 'auto' : 'none', borderRadius: 2, boxShadow: seleccion.fecha && seleccion.horaSeleccionada && seleccion.modalidad ? '0 8px 24px rgba(37,150,190,0.08)' : 'none' }} fullWidth onClick={onReservar}>Reservar cita</Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
