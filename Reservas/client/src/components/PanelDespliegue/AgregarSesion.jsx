import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Stepper,
  Step,
  StepLabel,
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormControlLabel, 
  Switch,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Chip,
  Paper,
  Stack,
  IconButton,
  Fade,
  Slide,
  MobileStepper,
  Avatar,
  Grid,
  Alert,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import localeData from 'dayjs/plugin/localeData';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useReserva } from '../../context/reservaContext';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/authContext';
import '../ui/AgregarSesionCSS.css';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SaveIcon from '@mui/icons-material/Save';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import NotesIcon from '@mui/icons-material/Notes';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

dayjs.extend(localeData);
dayjs.locale('es');

const AgregarSesion = ({ open, close, onClose, paciente, fetchReservas, gapi, eventId }) => {
  const theme = useTheme();
  const [sesionData, setSesionData] = useState('');
  const [fecha, setFecha] = useState('');
  const [ultimaFecha, setUltimaFecha] = useState(dayjs().format('YYYY-MM-DD')); // Por defecto hoy
  const [hora, setHora] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const [horasDisponibles, setHorasDisponibles] = useState([]);
  const [agendarNuevaCita, setAgendarNuevaCita] = useState(false); // Toggle para nueva cita
  const { addHistorial, getFeriados, createReserva } = useReserva();
  const showAlert = useAlert();
  const { user, obtenerHorasDisponibles } = useAuth();
  const [diasDeTrabajo, setDiasDeTrabajo] = useState([]);
  const [feriados, setFeriados] = useState([]);

  useEffect(() => {
    if (open) {
      // Resetear estados cuando se abre el modal
      setSesionData('');
      setFecha('');
      setHora('');
      setUltimaFecha(dayjs().format('YYYY-MM-DD'));
      setAgendarNuevaCita(false);
      setActiveStep(0);
    }
  }, [open]);

  useEffect(() => {
    const fetchHorasDisponibles = async () => {
      if (fecha) {
        const response = await obtenerHorasDisponibles(user.id || user._id, fecha);
        const horas = response.times || [];
        setHorasDisponibles(horas);
      }
      const feriadosData = await getFeriados();
      setFeriados(feriadosData.data);
    };
    fetchHorasDisponibles();
  }, [fecha, user.id || user._id, obtenerHorasDisponibles]);


  const handleSesionChange = (value) => {
    setSesionData(value);
  };

  const handleFechaChange = (newValue) => {
    setFecha(newValue ? newValue.format('YYYY-MM-DD') : '');
  };

  const handleHoraChange = (e) => {
    setHora(e.target.value);
  };

  const handleUltimaFechaChange = (e) => {
    setUltimaFecha(e.target.value);
  };

  const handleNext = () => {
    console.log('handleNext ejecutado, activeStep actual:', activeStep);
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleToggleAgendarCita = (event) => {
    setAgendarNuevaCita(event.target.checked);
    // Si se desactiva el toggle, limpiar los datos de la cita
    if (!event.target.checked) {
      setFecha('');
      setHora('');
    }
  };

  const handleSave = async () => {
    console.log('handleSave ejecutado, agendarNuevaCita:', agendarNuevaCita);
    try {
      // Validar que hay datos de sesión
      if (!sesionData.trim()) {
        showAlert('warning', 'Por favor ingrese los detalles de la sesión');
        return;
      }

      // Si se quiere agendar nueva cita, validar campos requeridos
      if (agendarNuevaCita && (!fecha || !hora)) {
        showAlert('warning', 'Por favor complete la fecha y hora para la nueva cita');
        return;
      }

      // Preparar datos de la sesión (siempre se guarda)
      const sessionData = {
        fecha: ultimaFecha ? new Date(ultimaFecha) : new Date(), // Asegurar formato Date
        notas: sesionData,
        siguienteCita: agendarNuevaCita && fecha ? new Date(fecha) : null, // Solo si se agenda nueva cita
        hora: agendarNuevaCita ? hora : null,
      };
  
      console.log('Datos a enviar al historial:', sessionData); // Debug
      await addHistorial(paciente.rut, sessionData);
  
      // Si se quiere agendar nueva cita, crear la reserva
      if (agendarNuevaCita && fecha && hora) {
        const reservaData = {
          nombre: paciente.nombre,
          celular: paciente.telefono,
          rut: paciente.rut,
          email: paciente.email || '',
          fecha: fecha,
          hora: hora,
          profesional: user.id || user._id,
          sucursal: user.sucursal,
          isNewPatient: false, // Es un paciente existente
        };

        console.log('Creando nueva reserva:', reservaData); // Debug
        const nuevaReserva = await createReserva(paciente.rut, reservaData);

        // Crear evento en Google Calendar para la nueva cita
        if (gapi?.auth2?.getAuthInstance?.()?.isSignedIn.get()) {
          try {
            console.log('Creando evento en Google Calendar para nueva cita');
            
            const [horaInicio, minuto] = hora.split(':');
            const horaFin = `${String(parseInt(horaInicio) + 1).padStart(2, '0')}:${minuto}`;
            
            const newEvent = {
              summary: `Cita con ${paciente.nombre}`,
              description: `Nueva cita agendada desde sesión`,
              start: {
                dateTime: `${fecha}T${hora}:00`,
                timeZone: 'America/Santiago',
              },
              end: {
                dateTime: `${fecha}T${horaFin}:00`,
                timeZone: 'America/Santiago',
              },
            };

            const response = await gapi.client.calendar.events.insert({
              calendarId: 'primary',
              resource: newEvent,
            });

            if (response.error) {
              console.error('Error creating Google Calendar event:', response.error);
              showAlert('warning', 'Sesión y cita creadas, pero hubo un error al sincronizar con Google Calendar');
            } else {
              console.log('Google Calendar event created successfully:', response);
              showAlert('success', 'Sesión agregada y nueva cita creada correctamente, sincronizada con Google Calendar');
            }
          } catch (error) {
            console.error('Error al crear evento en Google Calendar:', error);
            showAlert('warning', 'Sesión y cita creadas, pero hubo un error al sincronizar con Google Calendar');
          }
        } else {
          console.log('Usuario no autenticado con Google Calendar');
          showAlert('success', 'Sesión agregada y nueva cita creada correctamente');
        }
      } else {
        // Solo se guardó la sesión
        showAlert('success', 'Sesión agregada correctamente');
      }

      // Verificar si hay eventId y actualizar Google Calendar para la sesión actual
      if (eventId && gapi?.auth2?.getAuthInstance?.()?.isSignedIn.get()) {
        try {
          console.log('Actualizando sesión en Google Calendar con ID:', eventId);
          
          const eventToUpdate = {
            summary: `Sesión completada con ${paciente.nombre}`,
            description: `Sesión realizada el ${ultimaFecha}. ${sesionData}`,
          };

          const response = await gapi.client.calendar.events.patch({
            calendarId: 'primary',
            eventId: eventId,
            resource: eventToUpdate,
          });

          if (response.error) {
            console.error('Error updating Google Calendar event:', response.error);
          } else {
            console.log('Google Calendar event updated successfully:', response);
          }
        } catch (error) {
          console.error('Error al actualizar evento en Google Calendar:', error);
        }
      }

    } catch (error) {
      console.error(error);
      showAlert('error', 'Error al procesar la sesión');
    }
    
    // Limpiar estados
    setSesionData('');
    setFecha('');
    setHora('');
    setUltimaFecha(dayjs().format('YYYY-MM-DD'));
    setAgendarNuevaCita(false);
    setActiveStep(0);
    handleClose();
    close();
    fetchReservas();
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 500); // Duración de la animación
  };

  useEffect(() => {
    if (user && user.timetable) {
      // Unifica todos los días de todos los bloques de horario
      const dias = Array.from(
        new Set(
          user.timetable.flatMap(bloque => bloque.days)
        )
      );
      setDiasDeTrabajo(dias);
    }
  }, [user]);

  const modalClass = window.innerWidth < 600 ? (closing ? 'modal-slide-out-down' : 'modal-slide-in-up') : (closing ? 'modal-slide-out-right' : 'modal-slide-in-right');

  const diasSemana = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
  ];

  const steps = ['Detalles de la Sesión', 'Configuración y Confirmación'];

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Fade in timeout={300}>
            <Box>
              {/* Información del Paciente */}
              <Card 
                elevation={0}                  sx={{
                    border: `1px solid ${alpha('#2596be', 0.2)}`,
                    borderRadius: 2
                  }}
                >
                  <CardHeader
                    avatar={
                      <Avatar sx={{ bgcolor: '#2596be' }}>
                        <PersonIcon />
                      </Avatar>
                    }
                    title={
                      <Typography variant="h6" color="#2596be" fontWeight="bold">
                        Información del Paciente
                      </Typography>
                    }
                  sx={{ pb: 1 }}
                />
                <CardContent sx={{ pt: 0 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Nombre Completo
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {paciente.nombre}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <BadgeIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            RUT
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {paciente.rut}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Teléfono
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {paciente.telefono}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Email
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {paciente.email || "Sin información"}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Editor de Sesión */}
              <Card 
                elevation={0} 
                sx={{ 
                  border: `1px solid ${alpha('#21cbe6', 0.2)}`,
                  borderRadius: 2
                }}
              >
                <CardHeader
                  avatar={
                    <Avatar sx={{ bgcolor: '#21cbe6' }}>
                      <NotesIcon />
                    </Avatar>
                  }
                  title={
                    <Typography variant="h6" color="#21cbe6" fontWeight="bold">
                      Detalles de la Sesión
                    </Typography>
                  }
                  subheader={
                    <Typography variant="body2" color="text.secondary">
                      Registre las observaciones y detalles de la sesión realizada
                    </Typography>
                  }
                />
                <CardContent>
                  <Box sx={{ 
                    '& .ql-editor': { 
                      minHeight: '200px',
                      fontSize: '14px',
                      fontFamily: theme.typography.fontFamily
                    },
                    '& .ql-toolbar': {
                      borderTopLeftRadius: '8px',
                      borderTopRightRadius: '8px',
                      bgcolor: alpha(theme.palette.grey[100], 0.5)
                    },
                    '& .ql-container': {
                      borderBottomLeftRadius: '8px',
                      borderBottomRightRadius: '8px'
                    }
                  }}>
                    <ReactQuill
                      value={sesionData}
                      onChange={handleSesionChange}
                      theme="snow"
                      placeholder="Escriba aquí los detalles de la sesión..."
                      modules={{
                        toolbar: [
                          [{ 'header': [1, 2, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                          [{ 'indent': '-1'}, { 'indent': '+1' }],
                          ['link'],
                          ['clean']
                        ],
                      }}
                      formats={[
                        'header', 'bold', 'italic', 'underline', 'strike',
                        'list', 'bullet', 'indent', 'link'
                      ]}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Fade>
        );
      case 1:
        return (
          <Fade in timeout={300}>
            <Box>
              {/* Fecha de la Sesión */}
              <Card 
                elevation={0} 
                sx={{ 
                  mb: 3,
                  border: `1px solid ${alpha('#2596be', 0.2)}`,
                  borderRadius: 2
                }}
              >
                <CardHeader
                  avatar={
                    <Avatar sx={{ bgcolor: '#2596be' }}>
                      <CalendarTodayIcon />
                    </Avatar>
                  }
                  title={
                    <Typography variant="h6" color="#2596be" fontWeight="bold">
                      Fecha de la Sesión
                    </Typography>
                  }
                  subheader={
                    <Typography variant="body2" color="text.secondary">
                      Seleccione la fecha en que se realizó la sesión
                    </Typography>
                  }
                />
                <CardContent>
                  <DatePicker
                    label="Fecha de la Sesión"
                    value={ultimaFecha ? dayjs(ultimaFecha) : dayjs()}
                    onChange={(newValue) => setUltimaFecha(newValue ? newValue.format('YYYY-MM-DD') : '')}
                    sx={{ width: '100%' }}
                    slotProps={{
                      textField: {
                        variant: 'outlined',
                        fullWidth: true,
                        InputProps: {
                          startAdornment: <CalendarTodayIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        }
                      }
                    }}
                  />
                </CardContent>
              </Card>

              {/* Nueva Cita */}
              <Card 
                elevation={0} 
                sx={{ 
                  border: `1px solid ${alpha('#21cbe6', 0.2)}`,
                  borderRadius: 2
                }}
              >
                <CardHeader
                  avatar={
                    <Avatar sx={{ bgcolor: '#21cbe6' }}>
                      <EventAvailableIcon />
                    </Avatar>
                  }
                  title={
                    <Typography variant="h6" color="#21cbe6" fontWeight="bold">
                      Nueva Cita
                    </Typography>
                  }
                  action={
                    <Tooltip title="Active esta opción si desea agendar una nueva cita">
                      <FormControlLabel
                        control={
                          <Switch
                            checked={agendarNuevaCita}
                            onChange={handleToggleAgendarCita}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: '#21cbe6',
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: '#21cbe6',
                              },
                            }}
                          />
                        }
                        label=""
                      />
                    </Tooltip>
                  }
                />
                <CardContent>
                  {!agendarNuevaCita ? (
                    <Alert 
                      severity="info" 
                      icon={<CheckCircleIcon />}
                      sx={{ 
                        bgcolor: alpha('#2596be', 0.1),
                        border: `1px solid ${alpha('#2596be', 0.2)}`
                      }}
                    >
                      <Typography variant="body2">
                        Solo se guardará la sesión del día seleccionado.
                      </Typography>
                    </Alert>
                  ) : (
                    <Box>
                      <Alert 
                        severity="success" 
                        sx={{ 
                          mb: 3,
                          bgcolor: alpha('#21cbe6', 0.1),
                          border: `1px solid ${alpha('#21cbe6', 0.2)}`
                        }}
                      >
                        <Typography variant="body2">
                          Se agendará una nueva cita además de guardar la sesión.
                        </Typography>
                      </Alert>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <DatePicker
                            label="Fecha de la Nueva Cita"
                            value={fecha ? dayjs(fecha) : null}
                            onChange={handleFechaChange}
                            shouldDisableDate={(date) => {
                              const dayName = diasSemana[date.day()];
                              const noTrabaja = !diasDeTrabajo.includes(dayName);
                              const esFeriado = feriados.some(f => f.date && dayjs(f.date).isSame(date, 'day'));
                              return noTrabaja || esFeriado;
                            }}
                            sx={{ width: '100%' }}
                            slotProps={{
                              textField: {
                                variant: 'outlined',
                                fullWidth: true,
                                InputProps: {
                                  startAdornment: <CalendarTodayIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                }
                              }
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth variant="outlined">
                            <InputLabel>Hora de la Cita</InputLabel>
                            <Select
                              value={hora}
                              onChange={handleHoraChange}
                              label="Hora de la Cita"
                              startAdornment={<ScheduleIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                            >
                              {horasDisponibles.map((horaItem) => (
                                <MenuItem key={horaItem} value={horaItem}>
                                  <Box display="flex" alignItems="center">
                                    <ScheduleIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                                    {horaItem}
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Fade>
        );
      default:
        return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <Modal 
        open={open} 
        onClose={handleClose} 
        className="modal-over-drawer"
        closeAfterTransition
      >
        <Fade in={open} timeout={300}>
          <Paper
            elevation={24}
            sx={{
              position: 'fixed',
              top: '10%',
              left: window.innerWidth < 600 ? '2.5%' : '25%',
              width: window.innerWidth < 600 ? '95%' : 600,
              height: '85vh',
              overflow: 'hidden',
              borderRadius: 3,
              bgcolor: 'background.paper',
              zIndex: 1300,
              display: 'flex',
              flexDirection: 'column'
            }}
            className={modalClass}
          >
            {/* Header */}
            <Box
              sx={{
                background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
                color: 'white',
                p: 3,
                position: 'relative'
              }}
            >
              <IconButton
                onClick={handleClose}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  color: 'white',
                  '&:hover': {
                    bgcolor: alpha('#ffffff', 0.1)
                  }
                }}
              >
                <CloseIcon />
              </IconButton>
              
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar 
                  sx={{ 
                    bgcolor: alpha('#ffffff', 0.2), 
                    color: 'white',
                    mr: 2,
                    width: 48,
                    height: 48
                  }}
                >
                  <EventNoteIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    Agregar Sesión
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Registre los detalles de la sesión médica
                  </Typography>
                </Box>
              </Box>

              {/* Stepper */}
              <Stepper 
                activeStep={activeStep} 
                alternativeLabel
                sx={{
                  '& .MuiStepLabel-root .Mui-completed': { color: 'white' },
                  '& .MuiStepLabel-root .Mui-active': { color: 'white' },
                  '& .MuiStepLabel-root': { color: alpha('#ffffff', 0.7) },
                  '& .MuiStepConnector-line': { borderColor: alpha('#ffffff', 0.3) },
                  '& .MuiStepIcon-root': { color: alpha('#ffffff', 0.3) },
                  '& .MuiStepIcon-root.Mui-active': { color: 'white' },
                  '& .MuiStepIcon-root.Mui-completed': { color: 'white' }
                }}
              >
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>
                      <Typography variant="body2" color="inherit">
                        {label}
                      </Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {/* Content */}
            <Box
              sx={{
                p: 3,
                flex: 1,
                overflow: 'auto',
                bgcolor: alpha(theme.palette.grey[50], 0.5)
              }}
            >
              {renderStepContent(activeStep)}
            </Box>

            {/* Footer */}
            <Box
              sx={{
                p: 1,
                bgcolor: 'background.paper',
                borderTop: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Button
                onClick={handleBack}
                disabled={activeStep === 0}
                startIcon={<KeyboardArrowLeft />}
                sx={{ visibility: activeStep === 0 ? 'hidden' : 'visible' }}
              >
                Anterior
              </Button>

              <Chip
                label={`${activeStep + 1} de ${steps.length}`}
                variant="outlined"
                size="small"
                sx={{
                  borderColor: '#2596be',
                  color: '#2596be',
                  '&:hover': {
                    backgroundColor: alpha('#2596be', 0.1)
                  }
                }}
              />

              <Button
                onClick={activeStep === steps.length - 1 ? handleSave : handleNext}
                variant="contained"
                endIcon={activeStep === steps.length - 1 ? <SaveIcon /> : <KeyboardArrowRight />}
                sx={{
                  background: activeStep === steps.length - 1 
                    ? 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)'
                    : 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
                  '&:hover': {
                    background: activeStep === steps.length - 1 
                      ? 'linear-gradient(45deg, #1e7a9b 30%, #1ba6c6 90%)'
                      : 'linear-gradient(45deg, #1e7a9b 30%, #1ba6c6 90%)'
                  }
                }}
              >
                {activeStep === steps.length - 1 ? 'Guardar Sesión' : 'Siguiente'}
              </Button>
            </Box>
          </Paper>
        </Fade>
      </Modal>
    </LocalizationProvider>
  );
};

export default AgregarSesion;