import React from 'react';
import { AppBar, Toolbar, Box, Button, Container, Grid, Typography, Stack, Card, CardContent, Avatar, Accordion, AccordionSummary, AccordionDetails, Divider, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import PersonPinCircleIcon from '@mui/icons-material/PersonPinCircle';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Logo from '../../assets/LOGO.png';
import LocationSection from './LocationSection';

export default function Template1({ prof, seleccion, onFechaChange, onHoraSelect, onModalidadSelect, onReservar, shouldDisableDate, minDate, brand }) {
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

      <Container maxWidth="md" sx={{ py: { xs: 3, md: 6 }, px: { xs: 2, md: 3 } }}>
        <Card sx={{ border: '2px solid #e3f2fd', borderRadius: 3, overflow: 'hidden' }}>
          <CardContent>
            <Grid container>
              <Grid item xs={12} md={4} sx={{ borderRight: { md: '1px solid #eee' }, background: `linear-gradient(90deg, ${BRAND.primary} 60%, ${BRAND.secondary} 100%)` }}>
                <Box p={2} display="flex" flexDirection="column" alignItems="center">
                  <Avatar src={prof.fotoPerfil ? resolveAssetUrl(prof.fotoPerfil) : undefined} sx={{ width: 80, height: 80, mb: 1 }} />
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
                  <Accordion elevation={0} sx={{ mb: 1.5, border: '1px solid #e3f2fd', borderRadius: 2, boxShadow: '0 8px 16px rgba(37,150,190,0.06)' }}>
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
                          <ListItemText primary="Selecciona la modalidad: Presencial, Telemedicina o Domicilio" />
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

                  <Typography fontWeight={500} mb={1}>Selecciona fecha</Typography>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                    <DatePicker
                      label="Fecha"
                      value={seleccion.fecha || null}
                      onChange={(v) => {
                        const valid = v && typeof v.isValid === 'function' && v.isValid();
                        // Normalizar a fecha local YYYY-MM-DD para evitar desfases
                        onFechaChange(valid ? v.startOf('day') : null);
                      }}
                      shouldDisableDate={shouldDisableDate}
                      minDate={minDate}
                      slotProps={{ textField: { size: 'small', fullWidth: true, inputProps: { readOnly: true } } }}
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
                            color: seleccion.horaSeleccionada === hora ? 'white' : BRAND.primary,
                            bgcolor: seleccion.horaSeleccionada === hora ? BRAND.primary : 'transparent',
                            borderColor: BRAND.primary,
                            fontWeight: seleccion.horaSeleccionada === hora ? 700 : 400,
                            boxShadow: seleccion.horaSeleccionada === hora ? 2 : 0,
                            flexBasis: { xs: 'calc(50% - 8px)', sm: 'auto' },
                            flexGrow: { xs: 1, sm: 0 },
                            minWidth: { xs: 'unset', sm: 'auto' },
                          }}
                          onClick={() => onHoraSelect(hora)}
                        >
                          {hora}
                        </Button>
                      ))}
                    </Box>
                  </Box>

                  <Box mt={2} display="flex" gap={1} alignItems="stretch" flexDirection={{ xs: 'column', sm: 'row' }}>
                    <Typography fontWeight={500} mb={1} sx={{ mr: { sm: 1 } }}><strong>Modalidad de atención: </strong></Typography>
                    <Button
                      startIcon={<PersonPinCircleIcon />}
                      variant={seleccion.modalidad === 'Presencial' ? 'contained' : 'outlined'}
                      size="small"
                      sx={{
                        width: { xs: '100%', sm: 'auto' },
                        color: seleccion.modalidad === 'Presencial' ? 'white' : (prof.cita_presencial ? BRAND.primary : 'grey.500'),
                        bgcolor: seleccion.modalidad === 'Presencial' ? BRAND.primary : 'transparent',
                        borderColor: prof.cita_presencial ? BRAND.primary : 'grey.400',
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
                        width: { xs: '100%', sm: 'auto' },
                        color: seleccion.modalidad === 'Telemedicina' ? 'white' : (prof.cita_virtual ? BRAND.secondary : 'grey.500'),
                        bgcolor: seleccion.modalidad === 'Telemedicina' ? BRAND.secondary : 'transparent',
                        borderColor: prof.cita_virtual ? BRAND.secondary : 'grey.400',
                        opacity: prof.cita_virtual ? 1 : 0.5,
                        pointerEvents: prof.cita_virtual ? 'auto' : 'none',
                        fontWeight: seleccion.modalidad === 'Telemedicina' ? 700 : 400,
                      }}
                      onClick={() => { if (prof.cita_virtual) onModalidadSelect('Telemedicina'); }}
                    >
                      Telemedicina
                    </Button>
                    <Button
                      startIcon={<HomeWorkIcon />}
                      variant={seleccion.modalidad === 'Domicilio' ? 'contained' : 'outlined'}
                      size="small"
                      sx={{
                        width: { xs: '100%', sm: 'auto' },
                        color: seleccion.modalidad === 'Domicilio' ? 'white' : (prof.cita_domicilio ? BRAND.primary : 'grey.500'),
                        bgcolor: seleccion.modalidad === 'Domicilio' ? BRAND.primary : 'transparent',
                        borderColor: prof.cita_domicilio ? BRAND.primary : 'grey.400',
                        opacity: prof.cita_domicilio ? 1 : 0.5,
                        pointerEvents: prof.cita_domicilio ? 'auto' : 'none',
                        fontWeight: seleccion.modalidad === 'Domicilio' ? 700 : 400,
                      }}
                      onClick={() => { if (prof.cita_domicilio) onModalidadSelect('Domicilio'); }}
                    >
                      Domicilio
                    </Button>
                  </Box>

                  <Button
                    sx={{
                      mt: 2,
                      background: isReady
                        ? `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})`
                        : 'grey.400',
                      color: 'white',
                      boxShadow: isReady ? '0 8px 16px rgba(37,150,190,0.3)' : 'none',
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
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <LocationSection prof={prof} brand={BRAND} />
      </Container>
    </Box>
  );
}
