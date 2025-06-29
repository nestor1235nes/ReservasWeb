import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Box, 
  Stepper, 
  Step, 
  StepLabel, 
  Button, 
  TextField, 
  Typography, 
  Snackbar, 
  Alert,
  Paper,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Fade,
  IconButton,
  Chip,
  useTheme,
  alpha,
  Switch,
  FormControlLabel
} from '@mui/material';
import dayjs from 'dayjs';
import { useReserva } from '../../context/reservaContext';
import { usePaciente } from '../../context/pacienteContext';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/authContext';
import Rutificador from '../Rutificador';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ProfesionalBusquedaHoras from '../ProfesionalBusquedaHoras';
import ArrastraSeleccionaImagenes from '../ArratraSeleccionaImagenes';
import axios from 'axios';
// Iconos para el diseño profesional
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import ScheduleIcon from '@mui/icons-material/Schedule';
import NotesIcon from '@mui/icons-material/Notes';
import SaveIcon from '@mui/icons-material/Save';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';

const steps = ['Datos del paciente', 'Datos de la consulta', 'Fecha y hora de la cita'];

const AgregarPaciente = ({ open, onClose, data, fetchReservas = () => {} , gapi}) => {
  const theme = useTheme();
  const { createPaciente, updatePaciente } = usePaciente();
  const { createReserva, updateReserva, getReserva } = useReserva();
  const { user, obtenerHorasDisponibles } = useAuth();
  const showAlert = useAlert();
  const [activeStep, setActiveStep] = useState(0);
  const [patientData, setPatientData] = useState({
    nombre: '',
    rut: '',
    telefono: '',
    email: '',
    diaPrimeraCita: dayjs().format('YYYY-MM-DD'),
    siguienteCita: '',
    profesional: '', // Inicializa vacío
    hora: '',
    diagnostico: '',
    anamnesis: '',
    imagenes: []
  });
  const [pacienteExistente, setPacienteExistente] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [files, setFiles] = useState([]);
  const [agendarNuevaCita, setAgendarNuevaCita] = useState(false); // Switch para nueva cita

  useEffect(() => {
    if (user && user.id) {
      setPatientData(prev => ({ ...prev, profesional: user.id }));
    }
  }, [user]);

  useEffect(() => {
    if (data) {
      setPatientData({
        ...patientData,
        nombre: data.nombre,
        rut: data.rut,
        telefono: data.telefono,
        email: data.email
      });
    }
  }, [data]);

  const handleNext = async () => {
    if (activeStep === 0) {
      try {
        const response = await getReserva(patientData.rut);
        if (response) {
          setPatientData({
            ...patientData,
            nombre: response.paciente.nombre,
            telefono: response.paciente.telefono,
            email: response.paciente.email,
            profesional: response.profesional,
          });
          setPacienteExistente(true);
        }
        else {
          setPacienteExistente(false);
          setPatientData({ ...patientData, profesional: user.id });
        }
      } catch (error) {
        setPacienteExistente(false);
      }
    }
    if (validateStep()) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    } else {
      setAlert({ type: 'error', message: 'Por favor, complete todos los campos obligatorios' });
      setOpenSnackbar(true);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPatientData({ ...patientData, [name]: value });
  };

  const handleQuillChange = (value) => {
    setPatientData({ ...patientData, anamnesis: value });
  };

  const handleImagesSelected = (acceptedFiles) => {
    setFiles(acceptedFiles); // Almacena las imágenes seleccionadas
  };

  const handleToggleAgendarCita = (event) => {
    setAgendarNuevaCita(event.target.checked);
    // Si se desactiva el toggle, limpiar los datos de la cita
    if (!event.target.checked) {
      setPatientData({
        ...patientData,
        diaPrimeraCita: dayjs().format('YYYY-MM-DD'),
        hora: ''
      });
    }
  };

  const handleSubmit = async () => {
    try {
      // Preparar los datos
      const dataToSave = {
        ...patientData,
      };

      let pacienteId = null;

      // 1. Crear o actualizar paciente
      if (data) {
        await updateReserva(patientData.rut, dataToSave);
        pacienteId = data._id;
      } else {
        // Crear nuevo paciente
        const pacienteResponse = await createPaciente(patientData);
        console.log('Respuesta de createPaciente:', pacienteResponse);
        
        if (pacienteResponse && pacienteResponse._id) {
          pacienteId = pacienteResponse._id;
        } else if (pacienteResponse && pacienteResponse.data && pacienteResponse.data._id) {
          pacienteId = pacienteResponse.data._id;
        } else {
          console.warn('No se pudo obtener _id del paciente creado');
        }
        
        // Determinar si necesitamos crear una reserva
        const tieneInformacionMedica = patientData.diagnostico || patientData.anamnesis;
        const necesitaReserva = agendarNuevaCita || tieneInformacionMedica;
        
        if (necesitaReserva) {
          // Preparar datos de la reserva
          const reservaData = {
            ...dataToSave,
            // Si agenda cita, usar la fecha seleccionada; si no, usar fecha actual como diaPrimeraCita
            diaPrimeraCita: new Date().toISOString().split('T')[0],
            siguienteCita: agendarNuevaCita ? patientData.siguienteCita : null,
            hora: agendarNuevaCita ? patientData.hora : null
          };
          
          await createReserva(patientData.rut, reservaData);
        }
      }
  
      // 2. Subir las imágenes solo si hay archivos seleccionados
      if (files.length > 0) {
        const formData = new FormData();
        formData.append('rut', patientData.rut);
        files.forEach((file) => {
          formData.append('files', file);
        });
  
        const response = await axios.post('/api/imagenesPacientes', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        // Solo actualizar reserva si existe una (si se creó por información médica o cita)
        const tieneInformacionMedica = patientData.diagnostico || patientData.anamnesis;
        const necesitaReserva = agendarNuevaCita || tieneInformacionMedica;
        
        if (necesitaReserva) {
          await updateReserva(patientData.rut, { imagenes: response.data.urls });
        }
      }
  
      // 3. Agregar evento a Google Calendar solo si se agenda nueva cita
      if (agendarNuevaCita) {
        try {
          // Verifica si el usuario actual está autenticado con Google
          if (gapi && gapi.auth2 && gapi.auth2.getAuthInstance().isSignedIn.get()) {
            // Crea el evento en Google Calendar
            const fechaStr = dayjs(patientData.diaPrimeraCita).format('YYYY-MM-DD');
            const horaInicio = patientData.hora;
            const [hora, minuto] = horaInicio.split(':');
            const horaFin = `${String(parseInt(hora) + 1).padStart(2, '0')}:${minuto}`;

            const event = {
              summary: `Cita con ${patientData.nombre}`,
              description: `Diagnóstico: ${patientData.diagnostico}\nAnamnesis: ${patientData.anamnesis}`,
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
                console.log('Evento creado: ', createdEvent.htmlLink);
                console.log('Event ID:', createdEvent.id);
                console.log('Paciente ID:', pacienteId);
                
                // Actualizar la reserva con el eventId
                try {
                  const reservaData = {
                    eventId: createdEvent.id,
                  };
                  await updateReserva(patientData.rut, reservaData);
                  console.log('EventId guardado correctamente en la reserva');
                } catch (error) {
                  console.error('Error al guardar eventId en la reserva:', error);
                }
              }
            });
          }
        } catch (error) {
          console.error('Error al sincronizar con Google Calendar:', error);
        }
      }
  
      // 4. Mostrar mensaje de éxito y resetear el formulario
      let mensaje = 'Paciente registrado correctamente';
      if (agendarNuevaCita) {
        mensaje = 'Paciente registrado y cita agendada correctamente';
      } else if (patientData.diagnostico || patientData.anamnesis) {
        mensaje = 'Paciente registrado con información médica guardada';
      }
      
      setAlert({ type: 'success', message: mensaje });
      setOpenSnackbar(true);
      setPatientData({
        nombre: '',
        rut: '',
        telefono: '',
        email: '',
        diaPrimeraCita: dayjs().format('YYYY-MM-DD'),
        siguienteCita: '',
        hora: '',
        diagnostico: '',
        anamnesis: '',
        imagenes: [],
      });
      setFiles([]); // Limpiar las imágenes seleccionadas
      setAgendarNuevaCita(false); // Resetear el switch
      setActiveStep(0);
      fetchReservas();
      onClose();
    } catch (error) {
      console.error('Error al guardar el paciente o subir imágenes:', error);
      showAlert('error', 'Hubo un error al guardar el paciente o subir las imágenes');
    }
  };

  const validateStep = () => {
    if (activeStep === 0) {
      return patientData.nombre && patientData.rut && patientData.telefono;
    } else if (activeStep === 1) {
      return true; // Datos de consulta son opcionales
    } else if (activeStep === 2) {
      // Si se quiere agendar nueva cita, validar que tenga fecha y hora
      if (agendarNuevaCita) {
        return patientData.diaPrimeraCita && patientData.hora;
      }
      return true; // Si no se agenda cita, el paso es válido
    }
    return true;
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  return (
    <Modal 
      open={open} 
      onClose={onClose}
      closeAfterTransition
    >
      <Fade in={open} timeout={300}>
        <Paper
          elevation={24}
          sx={{
            position: 'fixed',
            top: '5%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: window.innerWidth < 600 ? '95%' : 700,
            height: '90vh',
            overflow: 'hidden',
            borderRadius: 3,
            bgcolor: 'background.paper',
            zIndex: 1300,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Snackbar */}
          <Snackbar
            open={openSnackbar}
            autoHideDuration={4000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            sx={{ zIndex: 1400 }}
          >
            <Alert
              onClose={handleCloseSnackbar}
              severity={alert.type}
              variant="filled"
              sx={{ width: '100%' }}
            >
              {alert.message}
            </Alert>
          </Snackbar>

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
              onClick={onClose}
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
                <PersonAddIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {data ? 'Editar Paciente' : 'Nuevo Paciente'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Complete la información del paciente
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
            {activeStep === 0 && (
              <Card 
                elevation={0} 
                sx={{ 
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
                      Información Personal
                    </Typography>
                  }
                  subheader="Datos básicos del paciente"
                />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {data ? (
                      <TextField
                        label="RUT"
                        name="rut"
                        value={patientData.rut}
                        fullWidth
                        required
                        InputProps={{ readOnly: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '&.Mui-focused fieldset': {
                              borderColor: '#2596be',
                            },
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: '#2596be',
                          },
                        }}
                      />
                    ) : (
                      <Rutificador onRutValidated={(validatedRut) => setPatientData({ ...patientData, rut: validatedRut })} />
                    )}
                    <TextField 
                      label="Nombre Completo" 
                      name="nombre" 
                      value={patientData.nombre} 
                      onChange={handleChange} 
                      fullWidth 
                      required 
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': {
                            borderColor: '#2596be',
                          },
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: '#2596be',
                        },
                      }}
                    />
                    <TextField 
                      label="Teléfono Celular" 
                      name="telefono" 
                      value={patientData.telefono} 
                      onChange={handleChange} 
                      fullWidth 
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': {
                            borderColor: '#2596be',
                          },
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: '#2596be',
                        },
                      }}
                    />
                    <TextField 
                      label="Correo Electrónico" 
                      name="email" 
                      value={patientData.email} 
                      onChange={handleChange} 
                      fullWidth
                      type="email"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': {
                            borderColor: '#2596be',
                          },
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: '#2596be',
                        },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            )}

            {activeStep === 2 && (
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
                      <ScheduleIcon />
                    </Avatar>
                  }
                  title={
                    <Typography variant="h6" color="#21cbe6" fontWeight="bold">
                      Programación de Cita
                    </Typography>
                  }
                  subheader="¿Desea agendar una cita para este paciente?"
                />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Switch para agendar nueva cita */}
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha('#21cbe6', 0.1),
                        border: `1px solid ${alpha('#21cbe6', 0.2)}`
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography variant="h6" color="#21cbe6" fontWeight="bold">
                            Agendar Nueva Cita
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Active esta opción si desea programar una cita para el paciente
                          </Typography>
                        </Box>
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
                      </Box>
                    </Box>

                    {/* Mostrar ProfesionalBusquedaHoras solo si el switch está activado */}
                    {agendarNuevaCita && (
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: alpha('#21cbe6', 0.05),
                          border: `1px solid ${alpha('#21cbe6', 0.1)}`
                        }}
                      >
                        <Typography variant="subtitle1" color="#21cbe6" fontWeight="bold" mb={2}>
                          Seleccionar Fecha y Hora
                        </Typography>
                        <ProfesionalBusquedaHoras
                          formData={patientData}
                          setFormData={setPatientData}
                          obtenerHorasDisponibles={obtenerHorasDisponibles}
                        />
                      </Box>
                    )}

                    {/* Mensaje cuando no se agenda cita */}
                    {!agendarNuevaCita && (
                      <Box
                        sx={{
                          p: 3,
                          borderRadius: 2,
                          bgcolor: alpha('#2596be', 0.1),
                          border: `1px solid ${alpha('#2596be', 0.2)}`,
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="body1" color="#2596be">
                          El paciente será registrado sin cita programada.
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mt={1}>
                          Podrá agendar una cita posteriormente desde el calendario.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            )}

            {activeStep === 1 && (
              <Card 
                elevation={0} 
                sx={{ 
                  border: `1px solid ${alpha('#2596be', 0.2)}`,
                  borderRadius: 2
                }}
              >
                <CardHeader
                  avatar={
                    <Avatar sx={{ bgcolor: '#2596be' }}>
                      <NotesIcon />
                    </Avatar>
                  }
                  title={
                    <Typography variant="h6" color="#2596be" fontWeight="bold">
                      Información Médica
                    </Typography>
                  }
                  subheader="Diagnóstico, anamnesis e imágenes (opcional)"
                />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                      label="Diagnóstico"
                      name="diagnostico"
                      value={patientData.diagnostico}
                      onChange={handleChange}
                      fullWidth
                      multiline
                      rows={2}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': {
                            borderColor: '#2596be',
                          },
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: '#2596be',
                        },
                      }}
                    />
                    
                    <Box>
                      <Typography variant="h6" gutterBottom color="#2596be" fontWeight="bold">
                        Anamnesis
                      </Typography>
                      <Box
                        sx={{
                          border: `1px solid ${alpha('#2596be', 0.2)}`,
                          borderRadius: 1,
                          '& .ql-toolbar': {
                            borderBottom: `1px solid ${alpha('#2596be', 0.2)}`,
                          },
                          '& .ql-container': {
                            borderTop: 'none',
                          }
                        }}
                      >
                        <ReactQuill
                          value={patientData.anamnesis}
                          onChange={handleQuillChange}
                          theme="snow"
                          modules={{
                            toolbar: [
                              [{ 'header': '1'}, {'header': '2'}, { 'font': [] }],
                              [{size: []}],
                              ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                              [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
                              ['link', 'image', 'video'],
                              ['clean']
                            ],
                          }}
                          formats={[
                            'header', 'font', 'size',
                            'bold', 'italic', 'underline', 'strike', 'blockquote',
                            'list', 'bullet', 'indent',
                            'link', 'image', 'video'
                          ]}
                        />
                      </Box>
                    </Box>
                    
                    <Box>
                      <Typography variant="h6" gutterBottom color="#2596be" fontWeight="bold">
                        Imágenes del Paciente
                      </Typography>
                      <ArrastraSeleccionaImagenes 
                        onImagesSelected={handleImagesSelected} 
                        pacienteRut={patientData.rut} 
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>

          {/* Footer */}
          <Box
            sx={{
              p: 2,
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

            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                endIcon={<SaveIcon />}
                sx={{
                  background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1e7a9b 30%, #1ba6c6 90%)'
                  }
                }}
              >
                Finalizar
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<KeyboardArrowRight />}
                sx={{
                  background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1e7a9b 30%, #1ba6c6 90%)'
                  }
                }}
              >
                Siguiente
              </Button>
            )}
          </Box>
        </Paper>
      </Fade>
    </Modal>
  );
};

export default AgregarPaciente;