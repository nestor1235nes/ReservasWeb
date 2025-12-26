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
import { ensureGoogleToken } from '../../googleCalendarConfig';
// Iconos para el diseño profesional
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import ScheduleIcon from '@mui/icons-material/Schedule';
import NotesIcon from '@mui/icons-material/Notes';
import SaveIcon from '@mui/icons-material/Save';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';

const steps = ['Datos del paciente', 'Datos clínicos', 'Datos de la consulta', 'Fecha y hora de la cita'];

const AgregarPaciente = ({ open, onClose, data, fetchReservas = () => {} , gapi}) => {
  const theme = useTheme();
  const { createPaciente, updatePaciente, getPacientePorRut } = usePaciente();
  const { createReserva, updateReserva, getReserva, getReservasPorRut } = useReserva();
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
    motivoConsulta: '',
    antecedentesPersonales: '',
    antecedentesFamiliares: '',
    alergias: '',
    medicamentosActuales: '',
    examenFisico: '',
    planTratamiento: '',
    indicaciones: '',
    presionArterial: '',
    frecuenciaCardiaca: '',
    pesoKg: '',
    tallaCm: '',
    temperaturaC: '',
    saturacionO2: '',
    imagenes: []
  });
  const [pacienteExistente, setPacienteExistente] = useState(false);
  const [files, setFiles] = useState([]);
  const [agendarNuevaCita, setAgendarNuevaCita] = useState(false); // Switch para nueva cita
  const [cobrarNuevaCita, setCobrarNuevaCita] = useState(true); // Si se agenda, decidir si se cobrará
  // Control independiente para "Primer día de consulta"
  const [cambiarDiaPrimera, setCambiarDiaPrimera] = useState(false);
  const [diaPrimeraCitaOverride, setDiaPrimeraCitaOverride] = useState(dayjs().format('YYYY-MM-DD'));
  const [reservaExistente, setReservaExistente] = useState(null);

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
        // Buscar todas las reservas del paciente por RUT y quedarnos con la del profesional actual (si existe)
        const todas = await getReservasPorRut(patientData.rut);
        const propia = Array.isArray(todas) ? todas.find(r => (r.profesional?._id || r.profesional) === (user.id || user._id)) : null;
        if (propia) {
          setPatientData({
            ...patientData,
            nombre: propia.paciente.nombre,
            telefono: propia.paciente.telefono,
            email: propia.paciente.email,
            profesional: propia.profesional?._id || propia.profesional,
          });
          setPacienteExistente(true);
          setReservaExistente(propia);
          const basePrimera = (propia.diaPrimeraCita
            ? dayjs(propia.diaPrimeraCita).format('YYYY-MM-DD')
            : (propia.siguienteCita ? dayjs(propia.siguienteCita).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')));
          setDiaPrimeraCitaOverride(basePrimera);
        } else {
          setPacienteExistente(false);
          setPatientData({ ...patientData, profesional: user.id });
          setReservaExistente(null);
          setDiaPrimeraCitaOverride(dayjs().format('YYYY-MM-DD'));
        }
      } catch (error) {
        setPacienteExistente(false);
        setReservaExistente(null);
        setDiaPrimeraCitaOverride(dayjs().format('YYYY-MM-DD'));
      }
    }
    if (validateStep()) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    } else {
      showAlert('error', 'Por favor, complete los campos requeridos antes de continuar.');
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
      setCobrarNuevaCita(true);
    }
  };

  const handleToggleCobrarNuevaCita = (event) => {
    setCobrarNuevaCita(event.target.checked);
  };

  const handleToggleCambiarDiaPrimera = (event) => {
    setCambiarDiaPrimera(event.target.checked);
    if (!event.target.checked) {
      // Al apagar, volver al valor por defecto calculado
      const basePrimera = reservaExistente
        ? (reservaExistente.diaPrimeraCita
            ? dayjs(reservaExistente.diaPrimeraCita).format('YYYY-MM-DD')
            : (reservaExistente.siguienteCita ? dayjs(reservaExistente.siguienteCita).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')))
        : dayjs().format('YYYY-MM-DD');
      setDiaPrimeraCitaOverride(basePrimera);
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
        // Actualizar reserva existente sin perder campos no modificados
        const updatePayload = {};

        // Diagnóstico/Anamnesis si se agregan
        if (patientData.diagnostico) updatePayload.diagnostico = patientData.diagnostico;
        if (patientData.anamnesis) updatePayload.anamnesis = patientData.anamnesis;

        // Datos clínicos opcionales
        if (patientData.motivoConsulta) updatePayload.motivoConsulta = patientData.motivoConsulta;
        if (patientData.antecedentesPersonales) updatePayload.antecedentesPersonales = patientData.antecedentesPersonales;
        if (patientData.antecedentesFamiliares) updatePayload.antecedentesFamiliares = patientData.antecedentesFamiliares;
        if (patientData.alergias) updatePayload.alergias = patientData.alergias;
        if (patientData.medicamentosActuales) updatePayload.medicamentosActuales = patientData.medicamentosActuales;
        if (patientData.examenFisico) updatePayload.examenFisico = patientData.examenFisico;
        if (patientData.planTratamiento) updatePayload.planTratamiento = patientData.planTratamiento;
        if (patientData.indicaciones) updatePayload.indicaciones = patientData.indicaciones;

        // Signos vitales (opcionales)
        if (patientData.presionArterial) updatePayload.presionArterial = patientData.presionArterial;
        if (patientData.frecuenciaCardiaca) updatePayload.frecuenciaCardiaca = patientData.frecuenciaCardiaca;
        if (patientData.pesoKg) updatePayload.pesoKg = patientData.pesoKg;
        if (patientData.tallaCm) updatePayload.tallaCm = patientData.tallaCm;
        if (patientData.temperaturaC) updatePayload.temperaturaC = patientData.temperaturaC;
        if (patientData.saturacionO2) updatePayload.saturacionO2 = patientData.saturacionO2;

        // Primer día de consulta: solo si se quiere cambiar o si no existe aún
        if (cambiarDiaPrimera) {
          updatePayload.diaPrimeraCita = diaPrimeraCitaOverride;
        } else if (!reservaExistente?.diaPrimeraCita) {
          // Autodefinir si no existía
          updatePayload.diaPrimeraCita = reservaExistente?.siguienteCita
            ? dayjs(reservaExistente.siguienteCita).format('YYYY-MM-DD')
            : dayjs().format('YYYY-MM-DD');
        }

        // Próxima cita: solo si se activa el agendamiento
        if (agendarNuevaCita && patientData.diaPrimeraCita && patientData.hora) {
          updatePayload.siguienteCita = patientData.diaPrimeraCita;
          updatePayload.hora = patientData.hora;

          // NUEVO: al agendar una nueva cita (cita aparte), resetear pago y decidir si se cobra
          updatePayload.resetPaymentForNextAppointment = true;
          updatePayload.requiresPayment = Boolean(cobrarNuevaCita);
        }

        // Evitar enviar payload vacío
        if (Object.keys(updatePayload).length > 0) {
          await updateReserva(patientData.rut, updatePayload);
        }
        pacienteId = data._id;
      } else {
        // Intentar detectar paciente existente por RUT para evitar error 400 de duplicado
        const existente = patientData.rut ? await getPacientePorRut(patientData.rut) : null;
        if (existente && existente._id) {
          // Ya existe el paciente: invocar createPaciente igualmente para asociarlo al profesional/sucursal (idempotente en backend)
          try {
            const resp = await createPaciente(patientData);
            pacienteId = (resp && resp._id) || (resp && resp.data && resp.data._id) || existente._id;
            console.log('Paciente existente asociado correctamente. ID:', pacienteId);
          } catch (e) {
            // Si por alguna razón falla la asociación idempotente, al menos mantener el ID existente
            pacienteId = existente._id;
            console.warn('Fallo al asociar paciente existente, usando ID existente:', e?.message || e);
          }
        } else {
          // Crear nuevo paciente con fallback si ya existe
          console.log('Creando nuevo paciente:', patientData);
          try {
            const pacienteResponse = await createPaciente(patientData);
            console.log('Respuesta de createPaciente:', pacienteResponse);

            if (pacienteResponse && pacienteResponse._id) {
              pacienteId = pacienteResponse._id;
            } else if (pacienteResponse && pacienteResponse.data && pacienteResponse.data._id) {
              pacienteId = pacienteResponse.data._id;
            } else {
              console.warn('No se pudo obtener _id del paciente creado');
            }
          } catch (e) {
            const msg = e?.response?.data?.message || '';
            if (e?.response?.status === 400 && /ya existe/i.test(msg)) {
              console.warn('Paciente ya existía al crear; usando existente por RUT');
              const existente2 = await getPacientePorRut(patientData.rut);
              if (existente2?._id) pacienteId = existente2._id;
            } else {
              throw e;
            }
          }
        }

        // Determinar si necesitamos crear/actualizar una reserva
        const tieneInformacionMedica = patientData.diagnostico || patientData.anamnesis;
        const tieneDatosClinicos = Boolean(
          patientData.motivoConsulta ||
          patientData.antecedentesPersonales ||
          patientData.antecedentesFamiliares ||
          patientData.alergias ||
          patientData.medicamentosActuales ||
          patientData.examenFisico ||
          patientData.planTratamiento ||
          patientData.indicaciones ||
          patientData.presionArterial ||
          patientData.frecuenciaCardiaca ||
          patientData.pesoKg ||
          patientData.tallaCm ||
          patientData.temperaturaC ||
          patientData.saturacionO2
        );
        const necesitaReserva = agendarNuevaCita || tieneInformacionMedica || tieneDatosClinicos;

        if (necesitaReserva) {
          // Debug: Imprimir valores antes de crear la reserva
          console.log('agendarNuevaCita:', agendarNuevaCita);
          console.log('patientData.diaPrimeraCita:', patientData.diaPrimeraCita);
          console.log('patientData.hora:', patientData.hora);

          // Reglas:
          // - Primer día de consulta independiente: si usuario lo cambia, usar override; si no, usar HOY
          const hoyYmd = dayjs().format('YYYY-MM-DD');
          const diaPrimeraCitaValue = cambiarDiaPrimera ? (diaPrimeraCitaOverride || hoyYmd) : hoyYmd;

          const reservaData = {
            ...dataToSave,
            diaPrimeraCita: diaPrimeraCitaValue,
            siguienteCita: agendarNuevaCita ? (patientData.diaPrimeraCita || '') : '',
            hora: agendarNuevaCita ? patientData.hora : null,

            // NUEVO: si se agenda cita desde aquí, decidir si se cobra.
            ...(agendarNuevaCita ? { requiresPayment: Boolean(cobrarNuevaCita) } : {})
          };
          console.log('Creando/actualizando reserva con datos:', reservaData);
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
        const tieneDatosClinicos = Boolean(
          patientData.motivoConsulta ||
          patientData.antecedentesPersonales ||
          patientData.antecedentesFamiliares ||
          patientData.alergias ||
          patientData.medicamentosActuales ||
          patientData.examenFisico ||
          patientData.planTratamiento ||
          patientData.indicaciones ||
          patientData.presionArterial ||
          patientData.frecuenciaCardiaca ||
          patientData.pesoKg ||
          patientData.tallaCm ||
          patientData.temperaturaC ||
          patientData.saturacionO2
        );
        const necesitaReserva = agendarNuevaCita || tieneInformacionMedica || tieneDatosClinicos;
        
        if (necesitaReserva) {
          await updateReserva(patientData.rut, { imagenes: response.data.urls, profesional: patientData.profesional });
        }
      }
  
      // 3. Agregar evento a Google Calendar solo si se agenda nueva cita
      if (agendarNuevaCita) {
        try {
          // Verifica si el usuario actual está autenticado con Google
          if (gapi && gapi.auth2) {
            // Intentar adquirir token silencioso (si ya consintió en Perfil)
            if (user?.googleEmail) {
              try { await ensureGoogleToken(user.googleEmail, { silent: true }); } catch (e) { /* ignore */ }
            }
            if (gapi.auth2.getAuthInstance().isSignedIn.get()) {
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
                    await updateReserva(patientData.rut, { ...reservaData, profesional: patientData.profesional });
                    console.log('EventId guardado correctamente en la reserva');
                  } catch (error) {
                    console.error('Error al guardar eventId en la reserva:', error);
                  }
                }
              });
            } else {
              // No autenticado en Google: continuar sin sincronizar
              console.log('Usuario no autenticado con Google Calendar');
            }
          }
        } catch (error) {
          console.error('Error al sincronizar con Google Calendar:', error);
        }
      }
  
      // 4. Mostrar mensaje de éxito (estilo global) y resetear el formulario
      const tieneInformacionMedica = !!(patientData.diagnostico || patientData.anamnesis);
      const tieneDatosClinicos = !!(
        patientData.motivoConsulta ||
        patientData.antecedentesPersonales ||
        patientData.antecedentesFamiliares ||
        patientData.alergias ||
        patientData.medicamentosActuales ||
        patientData.examenFisico ||
        patientData.planTratamiento ||
        patientData.indicaciones ||
        patientData.presionArterial ||
        patientData.frecuenciaCardiaca ||
        patientData.pesoKg ||
        patientData.tallaCm ||
        patientData.temperaturaC ||
        patientData.saturacionO2
      );
      let mensaje;
      if (data) {
        if (agendarNuevaCita) {
          mensaje = 'Paciente actualizado y cita agendada correctamente.';
        } else if (tieneInformacionMedica || tieneDatosClinicos) {
          mensaje = 'Paciente actualizado con información médica guardada.';
        } else {
          mensaje = 'Paciente actualizado correctamente.';
        }
      } else {
        if (agendarNuevaCita) {
          mensaje = 'Paciente registrado y cita agendada correctamente.';
        } else if (tieneInformacionMedica || tieneDatosClinicos) {
          mensaje = 'Paciente registrado con información médica guardada.';
        } else {
          mensaje = 'Paciente registrado correctamente.';
        }
      }
      showAlert('success', mensaje);
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
        motivoConsulta: '',
        antecedentesPersonales: '',
        antecedentesFamiliares: '',
        alergias: '',
        medicamentosActuales: '',
        examenFisico: '',
        planTratamiento: '',
        indicaciones: '',
        presionArterial: '',
        frecuenciaCardiaca: '',
        pesoKg: '',
        tallaCm: '',
        temperaturaC: '',
        saturacionO2: '',
        imagenes: [],
      });
      setFiles([]); // Limpiar las imágenes seleccionadas
      setAgendarNuevaCita(false); // Resetear el switch
      setCobrarNuevaCita(true);
      setActiveStep(0);
      fetchReservas();
      onClose();
    } catch (error) {
      console.error('Error al guardar el paciente o subir imágenes:', error);
      const mensajeBackend = error?.response?.data?.message || error?.response?.data?.error;
      showAlert('error', mensajeBackend ? `Error: ${mensajeBackend}` : 'Hubo un error al guardar el paciente o subir las imágenes');
    }
  };

  const validateStep = () => {
    if (activeStep === 0) {
      return patientData.nombre && patientData.rut && patientData.telefono;
    } else if (activeStep === 1) {
      return true; // Datos de consulta son opcionales
    } else if (activeStep === 2) {
      return true; // Datos de consulta son opcionales
    } else if (activeStep === 3) {
      // Si se quiere agendar nueva cita, validar que tenga fecha y hora
      if (agendarNuevaCita) {
        return patientData.diaPrimeraCita && patientData.hora;
      }
      return true; // Si no se agenda cita, el paso es válido
    }
    return true;
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

            {activeStep === 3 && (
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

                        {/* NUEVO: decidir si se cobrará esta cita */}
                        <Box sx={{ mb: 2 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={cobrarNuevaCita}
                                onChange={handleToggleCobrarNuevaCita}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: '#2596be',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#2596be',
                                  },
                                }}
                              />
                            }
                            label="Cobrar esta cita"
                          />
                          <Typography variant="caption" color="text.secondary" display="block">
                            Si desactivas esta opción, la cita quedará exenta (sin pago).
                          </Typography>
                        </Box>

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
                      Datos Clínicos (Opcional)
                    </Typography>
                  }
                  subheader="Motivo, antecedentes y signos vitales"
                />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                      label="Motivo de consulta"
                      name="motivoConsulta"
                      value={patientData.motivoConsulta}
                      onChange={handleChange}
                      fullWidth
                      multiline
                      rows={2}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': { borderColor: '#2596be' },
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#2596be' },
                      }}
                    />

                    <TextField
                      label="Antecedentes personales"
                      name="antecedentesPersonales"
                      value={patientData.antecedentesPersonales}
                      onChange={handleChange}
                      fullWidth
                      multiline
                      rows={2}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': { borderColor: '#2596be' },
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#2596be' },
                      }}
                    />

                    <TextField
                      label="Antecedentes familiares"
                      name="antecedentesFamiliares"
                      value={patientData.antecedentesFamiliares}
                      onChange={handleChange}
                      fullWidth
                      multiline
                      rows={2}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': { borderColor: '#2596be' },
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#2596be' },
                      }}
                    />

                    <TextField
                      label="Alergias"
                      name="alergias"
                      value={patientData.alergias}
                      onChange={handleChange}
                      fullWidth
                      multiline
                      rows={2}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': { borderColor: '#2596be' },
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#2596be' },
                      }}
                    />

                    <TextField
                      label="Medicamentos actuales"
                      name="medicamentosActuales"
                      value={patientData.medicamentosActuales}
                      onChange={handleChange}
                      fullWidth
                      multiline
                      rows={2}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': { borderColor: '#2596be' },
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#2596be' },
                      }}
                    />

                    <TextField
                      label="Examen físico"
                      name="examenFisico"
                      value={patientData.examenFisico}
                      onChange={handleChange}
                      fullWidth
                      multiline
                      rows={3}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': { borderColor: '#2596be' },
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#2596be' },
                      }}
                    />

                    <TextField
                      label="Plan de tratamiento"
                      name="planTratamiento"
                      value={patientData.planTratamiento}
                      onChange={handleChange}
                      fullWidth
                      multiline
                      rows={3}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': { borderColor: '#2596be' },
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#2596be' },
                      }}
                    />

                    <TextField
                      label="Indicaciones"
                      name="indicaciones"
                      value={patientData.indicaciones}
                      onChange={handleChange}
                      fullWidth
                      multiline
                      rows={3}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': { borderColor: '#2596be' },
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#2596be' },
                      }}
                    />

                    <Box>
                      <Typography variant="subtitle1" color="#2596be" fontWeight="bold" mb={1}>
                        Signos vitales (opcional)
                      </Typography>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: window.innerWidth < 600 ? '1fr' : '1fr 1fr',
                          gap: 2
                        }}
                      >
                        <TextField
                          label="Presión arterial (ej: 120/80)"
                          name="presionArterial"
                          value={patientData.presionArterial}
                          onChange={handleChange}
                          fullWidth
                        />
                        <TextField
                          label="Frecuencia cardíaca"
                          name="frecuenciaCardiaca"
                          value={patientData.frecuenciaCardiaca}
                          onChange={handleChange}
                          fullWidth
                        />
                        <TextField
                          label="Peso (kg)"
                          name="pesoKg"
                          value={patientData.pesoKg}
                          onChange={handleChange}
                          fullWidth
                        />
                        <TextField
                          label="Talla (cm)"
                          name="tallaCm"
                          value={patientData.tallaCm}
                          onChange={handleChange}
                          fullWidth
                        />
                        <TextField
                          label="Temperatura (°C)"
                          name="temperaturaC"
                          value={patientData.temperaturaC}
                          onChange={handleChange}
                          fullWidth
                        />
                        <TextField
                          label="Saturación O2 (%)"
                          name="saturacionO2"
                          value={patientData.saturacionO2}
                          onChange={handleChange}
                          fullWidth
                        />
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            {activeStep === 2 && (
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
                      Datos de la Consulta
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