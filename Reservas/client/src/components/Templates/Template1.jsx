import React from 'react';
import { AppBar, Toolbar, Box, Button, Container, Grid, Typography, Stack, Card, CardContent, Avatar } from '@mui/material';
import { ASSETS_BASE } from '../../config';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import PersonPinCircleIcon from '@mui/icons-material/PersonPinCircle';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import Logo from '../../assets/LOGO.png';

export default function Template1({ prof, seleccion, onFechaChange, onHoraSelect, onModalidadSelect, onReservar, shouldDisableDate }) {
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

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Card sx={{ border: '2px solid #e3f2fd', borderRadius: 3 }}>
          <CardContent>
            <Grid container>
              <Grid item xs={12} md={4} sx={{ borderRight: { md: '1px solid #eee' }, background: 'linear-gradient(90deg, #2596be 60%, #21cbe6 100%)' }}>
                <Box p={2} display="flex" flexDirection="column" alignItems="center">
                  <Avatar src={prof.fotoPerfil ? `${ASSETS_BASE}${prof.fotoPerfil}` : undefined} sx={{ width: 80, height: 80, mb: 1 }} />
                  <Typography fontWeight={600} color='white'>{prof.username}</Typography>
                  <Typography color="white" fontSize={14}>{prof.especialidad}</Typography>
                  <Box display="flex" alignItems="center" mt={1} fontSize={13}>
                    <Typography color="white">{prof.sucursal?.nombre || 'Independiente'}</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" mt={1} fontSize={13}>
                    <Typography color="white">{prof.celular || 'Sin datos'}</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={8}>
                <Box p={2}>
                  <Typography fontWeight={500} mb={1}>Selecciona fecha</Typography>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                    <DatePicker
                      label="Fecha"
                      value={seleccion.fecha || null}
                      onChange={onFechaChange}
                      shouldDisableDate={shouldDisableDate}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </LocalizationProvider>

                  <Box mt={2}>
                    <Typography fontWeight={500} mb={1}><strong>Horas disponibles para la fecha seleccionada</strong></Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {(seleccion.horasDisponibles || []).length === 0 && (
                        <Typography color="text.secondary" fontSize={14}>Selecciona una fecha</Typography>
                      )}
                      {(seleccion.horasDisponibles || []).map(hora => (
                        <Button
                          key={hora}
                          variant={seleccion.horaSeleccionada === hora ? 'contained' : 'outlined'}
                          size="small"
                          startIcon={<AccessTimeIcon />}
                          sx={{
                            color: seleccion.horaSeleccionada === hora ? 'white' : '#2596be',
                            bgcolor: seleccion.horaSeleccionada === hora ? '#2596be' : 'transparent',
                            borderColor: '#2596be',
                            fontWeight: seleccion.horaSeleccionada === hora ? 700 : 400,
                            boxShadow: seleccion.horaSeleccionada === hora ? 2 : 0,
                          }}
                          onClick={() => onHoraSelect(hora)}
                        >
                          {hora}
                        </Button>
                      ))}
                    </Box>
                  </Box>

                  <Box mt={2} display="flex" gap={1} alignItems="center">
                    <Typography fontWeight={500} mb={1}><strong>Modalidad de atención: </strong></Typography>
                    <Button
                      startIcon={<PersonPinCircleIcon />}
                      variant={seleccion.modalidad === 'Presencial' ? 'contained' : 'outlined'}
                      size="small"
                      sx={{
                        color: seleccion.modalidad === 'Presencial' ? 'white' : (prof.cita_presencial ? '#2596be' : 'grey.500'),
                        bgcolor: seleccion.modalidad === 'Presencial' ? '#2596be' : 'transparent',
                        borderColor: prof.cita_presencial ? '#2596be' : 'grey.400',
                        opacity: prof.cita_presencial ? 1 : 0.5,
                        pointerEvents: prof.cita_presencial ? 'auto' : 'none',
                        fontWeight: seleccion.modalidad === 'Presencial' ? 700 : 400,
                      }}
                      onClick={() => { if (prof.cita_presencial) onModalidadSelect('Presencial'); }}
                    >
                      Presencial
                    </Button>
                    <Button
                      startIcon={<VideoCameraFrontIcon />}
                      variant={seleccion.modalidad === 'Telemedicina' ? 'contained' : 'outlined'}
                      size="small"
                      sx={{
                        color: seleccion.modalidad === 'Telemedicina' ? 'white' : (prof.cita_virtual ? '#21cbe6' : 'grey.500'),
                        bgcolor: seleccion.modalidad === 'Telemedicina' ? '#21cbe6' : 'transparent',
                        borderColor: prof.cita_virtual ? '#21cbe6' : 'grey.400',
                        opacity: prof.cita_virtual ? 1 : 0.5,
                        pointerEvents: prof.cita_virtual ? 'auto' : 'none',
                        fontWeight: seleccion.modalidad === 'Telemedicina' ? 700 : 400,
                      }}
                      onClick={() => { if (prof.cita_virtual) onModalidadSelect('Telemedicina'); }}
                    >
                      Telemedicina
                    </Button>
                  </Box>

                  <Button
                    sx={{
                      mt: 2,
                      bgcolor:
                        seleccion.fecha && seleccion.horaSeleccionada && seleccion.modalidad
                          ? '#2596be'
                          : 'grey.400',
                      color: 'white',
                      opacity:
                        seleccion.fecha && seleccion.horaSeleccionada && seleccion.modalidad
                          ? 1
                          : 0.6,
                      pointerEvents:
                        seleccion.fecha && seleccion.horaSeleccionada && seleccion.modalidad
                          ? 'auto'
                          : 'none',
                    }}
                    fullWidth
                    onClick={onReservar}
                  >
                    Reservar cita
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
