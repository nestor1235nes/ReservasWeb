import React, { useEffect, useState } from 'react';
import {
  Stack,
  Button,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Typography,
  Box,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  TextField,
  Modal,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import { CalendarToday, AccessTime, Search, Map as MapIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useAuth } from '../context/authContext';
import { useReserva } from '../context/reservaContext';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import ApartmentIcon from '@mui/icons-material/Apartment';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import PersonPinCircleIcon from '@mui/icons-material/PersonPinCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ModalPerfilProfesional from '../components/Surcursales/ModalPerfilProfesional';
import ModalReservarCita from '../components/Surcursales/ModalReservarCita';
import { getCalendarsSync } from '../api/calendarsync';
import { gapi } from 'gapi-script';
import DescargarICSModal from '../components/Modales/DescargarICSModal';
import { generateICS } from '../utils/icalendar';
import { usePaciente } from '../context/pacienteContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { ASSETS_BASE } from '../config';


dayjs.locale('es');

export default function HomePage() {
  const { getAllUsers, obtenerHorasDisponibles } = useAuth();
  const { getFeriados, updateReserva } = useReserva();
  const [profesionales, setProfesionales] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [filtro, setFiltro] = useState({ nombre: '', especialidad: '', ubicacion: '' });
  const [feriados, setFeriados] = useState([]);
  const [seleccion, setSeleccion] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState(null);
  const [modalReservaOpen, setModalReservaOpen] = useState(false);
  const [datosPreseleccionados, setDatosPreseleccionados] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [icsModalOpen, setIcsModalOpen] = useState(false);
  const [icsData, setIcsData] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  useEffect(() => {
    // If navigated here with payment result (from PaymentConfirmPage), show modal
    if (location?.state?.paymentResult) {
      setPaymentResult(location.state.paymentResult);
      setPaymentDialogOpen(true);
      // remove the state so refresh or back doesn't show it again
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      const users = await getAllUsers();
      setProfesionales(users);
      setEspecialidades([...new Set(users.map(u => u.especialidad).filter(Boolean))]);
      const feriadosRes = await getFeriados();
      setFeriados(feriadosRes.data || []);
    };
    fetchData();
  }, [getAllUsers, getFeriados]);

  const profesionalesFiltrados = profesionales.filter(prof => {
    const nombreOk = prof.username.toLowerCase().includes(filtro.nombre.toLowerCase());
    const espOk = filtro.especialidad ? prof.especialidad === filtro.especialidad : true;
    return nombreOk && espOk;
  });

  const getDiasDisponibles = (timetable) => {
    return [...new Set((timetable || []).flatMap(b => b.days || []))];
  };

  const esFeriado = (fecha) => {
    return feriados.some(f => f.date && dayjs(f.date).isSame(fecha, 'day'));
  };

  const handleFechaChange = async (profId, fecha, timetable) => {
    setSeleccion(prev => ({
      ...prev,
      [profId]: { ...prev[profId], fecha, horasDisponibles: [], horaSeleccionada: undefined }
    }));
    if (fecha) {
      const res = await obtenerHorasDisponibles(profId, dayjs(fecha).format('YYYY-MM-DD'));
      setSeleccion(prev => ({
        ...prev,
        [profId]: { ...prev[profId], fecha, horasDisponibles: res.times || [], horaSeleccionada: undefined }
      }));
    }
  };

  const handleOpenPerfil = (profesional) => {
    setProfesionalSeleccionado(profesional);
    setModalOpen(true);
  };

  

  const handleAbrirReserva = (prof, seleccion) => {
    console.log('Abriendo modal de reserva con datos:', { prof, seleccion });
    setDatosPreseleccionados({
      profesional: prof,
      fecha: seleccion[prof._id]?.fecha,
      hora: seleccion[prof._id]?.horaSeleccionada,
      modalidad: seleccion[prof._id]?.modalidad
    });
    setModalReservaOpen(true);
  };

  const handleReservaFinalizada = async (paciente, error = null) => {
    setModalReservaOpen(false);
    console.log('Reset seleccion after reserva:', seleccion);
    setSeleccion(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[key] = { fecha: null, horasDisponibles: [], horaSeleccionada: undefined, modalidad: undefined };
      });
      return updated;
    });
    setSnackbar({
      open: true,
      message: error ? 'No se pudo crear la reserva. Intenta nuevamente.' : '¡Reserva realizada con éxito!',
      severity: error ? 'error' : 'success'
    });
    // --- SINCRONIZACIÓN GOOGLE CALENDAR ---
    if (!error) {
      /*try {
        // 1. Consulta si el profesional tiene Google Calendar sincronizado
        const sync = await getCalendarsSync(datosPreseleccionados.profesional._id);
        if (sync.google) {
          // 2. Verifica si el usuario actual está autenticado con Google
          if (gapi.auth2 && gapi.auth2.getAuthInstance().isSignedIn.get()) {
            // 3. Crea el evento en Google Calendar
            const fechaStr = dayjs(datosPreseleccionados.fecha).format('YYYY-MM-DD');
            const horaInicio = datosPreseleccionados.hora;
            const [hora, minuto] = horaInicio.split(':');
            const horaFin = `${String(parseInt(hora) + 1).padStart(2, '0')}:${minuto}`;

            const event = {
              summary: `Cita con ${paciente.nombre}`,
              description: `Reserva médica`,
              start: {
                dateTime: `${fechaStr}T${horaInicio}:00`,
                timeZone: 'America/Santiago',
              },
              end: {
                dateTime: `${fechaStr}T${horaFin}:00`,
                timeZone: 'America/Santiago',
              },
            };
            const request = gapi.client.calendar.events.insert({
              calendarId: 'primary',
              resource: event,
            });
            request.execute(async (createdEvent) => {
              if (createdEvent && createdEvent.id) {
                // Llama a tu backend para guardar el eventId junto con la reserva
                const reservaData = {
                  paciente: paciente.rut,
                  profesional: datosPreseleccionados.profesional._id,
                  fecha: datosPreseleccionados.fecha,
                  hora: datosPreseleccionados.hora,
                  modalidad: datosPreseleccionados.modalidad,
                  eventId: createdEvent.id,
                };
                console.log('Reserva data:', reservaData);
                await updateReserva(paciente.rut, reservaData);

              }
            });
          }
        }
      } catch (err) {
        console.error('Error al sincronizar con Google Calendar:', err);
      }*/
      // --- FLUJO ICALENDAR PARA PACIENTE ---
      // Prepara los datos SOLO de la cita recién agendada
      const profesional = datosPreseleccionados.profesional;
      const fechaStr = dayjs(datosPreseleccionados.fecha).format('YYYY-MM-DD');
      const horaInicio = datosPreseleccionados.hora;
      const [hora, minuto] = horaInicio.split(':');
      const horaFin = `${String(parseInt(hora) + 1).padStart(2, '0')}:${minuto}`;
      const start = new Date(`${fechaStr}T${horaInicio}:00-04:00`);
      const end = new Date(`${fechaStr}T${horaFin}:00-04:00`);
      setIcsData({
        summary: `Cita médica`,
        description: `Cita con ${profesional?.username || "profesional"}`,
        start,
        end,
        location: profesional?.sucursal?.nombre || "",
        attendees: [paciente.email]
      });
      setIcsModalOpen(true);
    }
  };

  const handleDescargarICS = () => {
    if (!icsData) return;
    const icsContent = generateICS(icsData);
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cita-${dayjs(icsData.start).format('YYYYMMDD-HHmm')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIcsModalOpen(false);
  };

  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        p={2}
        borderRadius={1}
        sx={{
          background: "linear-gradient(45deg, #2596be 30%, #21cbe6 90%)",
          display: 'flex',
          gap: 1
        }}
      >
        <Box display="flex" alignItems="center">
          <CalendarToday sx={{ color: 'white', mr: 1 }} />
          <Typography variant={{ xs: 'h6', sm: 'h5' }} fontWeight={700} color="white">
            Reservas de Citas Médicas
          </Typography>
        </Box>
      </Stack>
      {/* Main Content */}
      <Box flex={1} py={2}>
        <Box maxWidth={1200} mx="auto" px={2}>
          <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={4}>
            {/* Filtros */}
            <Box flex={{ xs: 'unset', md: '0 0 33.333%' }}>
              <Card
                sx={{
                  border: "2px solid #e3f2fd",
                  "&:hover": {
                    boxShadow: 3,
                    borderColor: "#2596be",
                  },
                }}
              >
                <CardHeader title="Buscar profesional" subheader="Filtra por especialidad, ubicación o nombre" />
                <CardContent>
                  <Box mb={2}>
                    <TextField
                      label="Nombre del profesional"
                      value={filtro.nombre}
                      onChange={e => setFiltro({ ...filtro, nombre: e.target.value })}
                      InputProps={{ startAdornment: <Search sx={{ mr: 1 }} /> }}
                      fullWidth
                      size="small"
                    />
                  </Box>
                  <Box mb={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Especialidad</InputLabel>
                      <Select
                        value={filtro.especialidad}
                        label="Especialidad"
                        onChange={e => setFiltro({ ...filtro, especialidad: e.target.value })}
                      >
                        <MenuItem value="">Todas</MenuItem>
                        {especialidades.map(esp => (
                          <MenuItem key={esp} value={esp}>{esp}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Typography variant="h6" fontWeight={700} mb={2} color="#2596be" textAlign="center">
                    Resultados ({profesionalesFiltrados.length})
                  </Typography>
                  {/* Ubicación (descomentar si tienes ubicaciones) */}
                  {/* <Box mb={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Ubicación</InputLabel>
                      <Select
                        value={filtro.ubicacion}
                        label="Ubicación"
                        onChange={e => setFiltro({ ...filtro, ubicacion: e.target.value })}
                      >
                        <MenuItem value="">Todas</MenuItem>
                        <MenuItem value="santiago">Santiago Centro</MenuItem>
                        <MenuItem value="providencia">Providencia</MenuItem>
                        <MenuItem value="lascondes">Las Condes</MenuItem>
                        <MenuItem value="nunoa">Ñuñoa</MenuItem>
                        <MenuItem value="vitacura">Vitacura</MenuItem>
                      </Select>
                    </FormControl>
                  </Box> */}
                </CardContent>
              </Card>
            </Box>
            {/* Resultados */}
            <Box flex={1}>
              <Box display="flex" flexDirection="column" gap={3}>
                {profesionalesFiltrados.map(prof => (
                  <Card
                    key={prof._id}
                    sx={{
                      border: "2px solid #e3f2fd",
                      "&:hover": {
                        boxShadow: 3,
                        borderColor: "#2596be",
                      },
                    }}
                  >
                    <CardContent sx={{}}>
                      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }}>
                        {/* Info profesional */}
                        <Box
                          flex={{ xs: 'unset', md: '0 0 33.333%' }}
                          borderRight={{ md: '1px solid #eee' }}
                          p={2}
                          display="flex"
                          flexDirection="column"
                          alignItems="center"
                          borderRadius={1}
                          sx={{ Maxheight:'100%' ,background: "linear-gradient(90deg, #2596be 60%, #21cbe6 100%)" }}
                        >
                          <Avatar src={prof.fotoPerfil ? `${ASSETS_BASE}${prof.fotoPerfil}` : undefined} sx={{ width: 80, height: 80, mb: 1 }} />
                          <Typography fontWeight={600} color='white'>{prof.username}</Typography>
                          <Typography color="white" fontSize={14}>{prof.especialidad}</Typography>
                          <Box display="flex" alignItems="center" mt={1} color="text.secondary" fontSize={13}>
                            <ApartmentIcon sx={{ fontSize: 16, mr: 0.5, color:'white' }} />
                            <Typography color="white">{prof.sucursal?.nombre || "Independiente"}</Typography>
                          </Box>
                          <Box display="flex" alignItems="center" mt={1} color="text.secondary" fontSize={13}>
                            <PhoneIphoneIcon sx={{ fontSize: 16, mr: 0.5, color:'white' }} />
                            <Typography color="white">{prof.celular || "Sin datos"}</Typography>
                          </Box>
                          <Button sx={{ mt: 2, bgcolor: 'white', color: 'black' }} fullWidth onClick={() => handleOpenPerfil(prof)}>
                            Ver perfil completo
                          </Button>
                        </Box>
                        {/* Horarios y acciones */}
                        <Box flex={1} p={2}>
                          <Typography fontWeight={500} mb={1}>Selecciona fecha</Typography>
                          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                            <DatePicker
                              label="Fecha"
                              value={seleccion[prof._id]?.fecha || null}
                              onChange={fecha => handleFechaChange(prof._id, fecha, prof.timetable)}
                              shouldDisableDate={date => {
                                const dia = diasSemana[date.day()];
                                const diasDisponibles = getDiasDisponibles(prof.timetable);
                                return !diasDisponibles.includes(dia) || esFeriado(date);
                              }}
                              slotProps={{ textField: { size: 'small', fullWidth: true } }}
                            />
                          </LocalizationProvider>
                          <Box mt={2}>
                            <Typography fontWeight={500} mb={1} ><strong>Horas disponibles para la fecha seleccionada</strong></Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                              {(seleccion[prof._id]?.horasDisponibles || []).length === 0 && (
                                <Typography color="text.secondary" fontSize={14}>Selecciona una fecha</Typography>
                              )}
                              {(seleccion[prof._id]?.horasDisponibles || []).map(hora => (
                                <Button
                                  key={hora}
                                  variant={seleccion[prof._id]?.horaSeleccionada === hora ? "contained" : "outlined"}
                                  size="small"
                                  startIcon={<AccessTime />}
                                  sx={{
                                    color: seleccion[prof._id]?.horaSeleccionada === hora ? 'white' : '#2596be',
                                    bgcolor: seleccion[prof._id]?.horaSeleccionada === hora ? '#2596be' : 'transparent',
                                    borderColor: '#2596be',
                                    fontWeight: seleccion[prof._id]?.horaSeleccionada === hora ? 700 : 400,
                                    boxShadow: seleccion[prof._id]?.horaSeleccionada === hora ? 2 : 0
                                  }}
                                  onClick={() => {
                                    setSeleccion(prev => ({
                                      ...prev,
                                      [prof._id]: {
                                        ...prev[prof._id],
                                        horaSeleccionada: hora
                                      }
                                    }));
                                  }}
                                >
                                  {hora}
                                </Button>
                              ))}
                            </Box>
                          </Box>
                          <Box mt={2} display="flex" gap={1} alignItems="center" flexWrap="wrap">
                            <Typography fontWeight={500} mb={1}><strong>Modalidad de atención: </strong></Typography>
                            <Button
                              startIcon={<PersonPinCircleIcon />}
                              variant={seleccion[prof._id]?.modalidad === "Presencial" ? "contained" : "outlined"}
                              size="small"
                              sx={{
                                color: seleccion[prof._id]?.modalidad === "Presencial" ? 'white' : (prof.cita_presencial ? '#2596be' : 'grey.500'),
                                bgcolor: seleccion[prof._id]?.modalidad === "Presencial" ? '#2596be' : 'transparent',
                                borderColor: prof.cita_presencial ? '#2596be' : 'grey.400',
                                opacity: prof.cita_presencial ? 1 : 0.5,
                                pointerEvents: prof.cita_presencial ? 'auto' : 'none',
                                fontWeight: seleccion[prof._id]?.modalidad === "Presencial" ? 700 : 400
                              }}
                              onClick={() => {
                                if (prof.cita_presencial) {
                                  setSeleccion(prev => ({
                                    ...prev,
                                    [prof._id]: { ...prev[prof._id], modalidad: "Presencial" }
                                  }));
                                }
                              }}
                            >
                              Presencial
                            </Button>
                            <Button
                              startIcon={<VideoCallIcon />}
                              variant={seleccion[prof._id]?.modalidad === "Telemedicina" ? "contained" : "outlined"}
                              size="small"
                              sx={{
                                color: seleccion[prof._id]?.modalidad === "Telemedicina" ? 'white' : (prof.cita_virtual ? '#21cbe6' : 'grey.500'),
                                bgcolor: seleccion[prof._id]?.modalidad === "Telemedicina" ? '#21cbe6' : 'transparent',
                                borderColor: prof.cita_virtual ? '#21cbe6' : 'grey.400',
                                opacity: prof.cita_virtual ? 1 : 0.5,
                                pointerEvents: prof.cita_virtual ? 'auto' : 'none',
                                fontWeight: seleccion[prof._id]?.modalidad === "Telemedicina" ? 700 : 400
                              }}
                              onClick={() => {
                                if (prof.cita_virtual) {
                                  setSeleccion(prev => ({
                                    ...prev,
                                    [prof._id]: { ...prev[prof._id], modalidad: "Telemedicina" }
                                  }));
                                }
                              }}
                            >
                              Telemedicina
                            </Button>
                          </Box>
                          <Button
                            sx={{
                              mt: 2,
                              bgcolor:
                                seleccion[prof._id]?.fecha &&
                                seleccion[prof._id]?.horaSeleccionada &&
                                seleccion[prof._id]?.modalidad
                                  ? '#2596be'
                                  : 'grey.400',
                              color: 'white',
                              opacity:
                                seleccion[prof._id]?.fecha &&
                                seleccion[prof._id]?.horaSeleccionada &&
                                seleccion[prof._id]?.modalidad
                                  ? 1
                                  : 0.6,
                              pointerEvents:
                                seleccion[prof._id]?.fecha &&
                                seleccion[prof._id]?.horaSeleccionada &&
                                seleccion[prof._id]?.modalidad
                                  ? 'auto'
                                  : 'none',
                              width: { xs: '100%', md: 'auto' }
                            }}
                            onClick={() => handleAbrirReserva(prof, seleccion)}
                          >
                            Reservar cita
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        aria-labelledby="modal-perfil-profesional"
        aria-describedby="modal-detalle-profesional"
      >
        <Box>
          <ModalPerfilProfesional
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            profesional={profesionalSeleccionado}
          />
        </Box>
      </Modal>

      <ModalReservarCita
        open={modalReservaOpen}
        onClose={() => setModalReservaOpen(false)}
        onReserva={handleReservaFinalizada}
        datosPreseleccionados={datosPreseleccionados}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ color: 'white' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{
            width: '100%',
            color: 'white',
            backgroundColor: snackbar.severity === 'error' ? '#f44336' : '#4caf50',
            '& .MuiAlert-icon': {
              color: 'white'
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      <DescargarICSModal
        open={icsModalOpen}
        onClose={() => setIcsModalOpen(false)}
        onDescargar={handleDescargarICS}
      />
      {/* Payment result dialog (shown after returning from Webpay) */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {paymentResult?.success ? 'Pago Exitoso' : (paymentResult ? 'Pago Fallido' : 'Estado de Pago')}
        </DialogTitle>
        <DialogContent dividers>
          {paymentResult ? (
            paymentResult.success ? (
              <Box textAlign="center">
                <CheckCircleOutlineIcon color="success" sx={{ fontSize: 64 }} />
                <Typography mt={2}>{paymentResult.message || 'El pago fue procesado correctamente.'}</Typography>
                {paymentResult.transaction && (
                  <Box mt={2} textAlign="left">
                    <Typography variant="subtitle2">Detalles:</Typography>
                    <Typography variant="body2">Código autorización: {paymentResult.transaction.authorization_code}</Typography>
                    <Typography variant="body2">Monto: ${paymentResult.transaction.amount?.toLocaleString()}</Typography>
                    <Typography variant="body2">Fecha: {new Date(paymentResult.transaction.transaction_date).toLocaleString()}</Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Box textAlign="center">
                <ErrorOutlineIcon color="error" sx={{ fontSize: 64 }} />
                <Typography mt={2}>{paymentResult.message || 'Hubo un problema procesando el pago.'}</Typography>
              </Box>
            )
          ) : (
            <Box display="flex" alignItems="center" justifyContent="center" p={3}><CircularProgress /></Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)} variant="contained">Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}