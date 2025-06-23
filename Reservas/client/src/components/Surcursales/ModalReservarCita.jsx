import React, { useState } from 'react';
import {
  Modal,
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Avatar,
  Divider,
  Stack,
  Paper,
  Fade,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import EmailIcon from '@mui/icons-material/Email';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import PersonPinCircleIcon from '@mui/icons-material/PersonPinCircle';
import Rutificador from '../Rutificador';
import { getPacientePorRutRequest, createPacienteRequest } from '../../api/pacientes';
import { createReservaRequest, updateReservaRequest } from '../../api/reservas'; // Asegúrate de importar esto


const steps = ['Identificación', 'Datos de contacto', 'Confirmar'];

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 420,
  maxWidth: '95vw',
  bgcolor: 'background.paper',
  boxShadow: 24,
  borderRadius: 3,
  p: 0,
  overflow: 'hidden'
};

export default function ModalReservarCita({ open, onClose, onReserva, datosPreseleccionados }) {
  const [activeStep, setActiveStep] = useState(0);
  const [rut, setRut] = useState('');
  const [rutValido, setRutValido] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paciente, setPaciente] = useState({ nombre: '', rut: '', telefono: '', email: '' });
  const [error, setError] = useState('');

  // Paso 1: Rutificador
  const handleRutValidated = async (rutIngresado) => {
    setRut(rutIngresado);
    setRutValido(true);
    setLoading(true);
    setError('');
    try {
      const res = await getPacientePorRutRequest(rutIngresado);
      if (res.data) {
        setPaciente({
          nombre: res.data.nombre || '',
          rut: res.data.rut || rutIngresado,
          telefono: res.data.telefono || '',
          email: res.data.email || ''
        });
      } else {
        setPaciente({ nombre: '', rut: rutIngresado, telefono: '', email: '' });
      }
    } catch (e) {
      setPaciente({ nombre: '', rut: rutIngresado, telefono: '', email: '' });
    }
    setLoading(false);
  };

  // Paso 2: Guardar datos si es nuevo
  const handleNext = async () => {
    if (activeStep === 0 && !rutValido) {
      setError('Debe ingresar un RUT válido.');
      return;
    }
    if (activeStep === 1 && (!paciente.nombre || !paciente.telefono)) {
      setError('Complete todos los campos obligatorios.');
      return;
    }
    setError('');
    if (activeStep === 1 && !paciente && !paciente._id) {
      setLoading(true);
      try {
        await createPacienteRequest(paciente);
      } catch (e) {
        setError('Error al crear paciente');
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleChange = (e) => setPaciente({ ...paciente, [e.target.name]: e.target.value });

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Construir el objeto reserva
      const reserva = {
        profesional: datosPreseleccionados.profesional?._id,
        siguienteCita: datosPreseleccionados.fecha
          ? (typeof datosPreseleccionados.fecha === 'string'
            ? datosPreseleccionados.fecha
            : datosPreseleccionados.fecha.format
              ? datosPreseleccionados.fecha.format('YYYY-MM-DD')
              : datosPreseleccionados.fecha.toString())
          : '',
        hora: datosPreseleccionados.hora,
        modalidad: datosPreseleccionados.modalidad,
        // Puedes agregar más campos si tu backend lo requiere
      };

      // 2. Verificar si el paciente existe
      const res = await getPacientePorRutRequest(paciente.rut);
      if (res.data && res.data._id) {
        // Paciente existe: actualizar reserva
        await updateReservaRequest(paciente.rut, reserva);
      } else {
        // Paciente no existe: crear paciente y luego reserva
        await createPacienteRequest(paciente);
        await createReservaRequest(paciente.rut, reserva);
      }

      // 3. Llamar callback, limpiar y cerrar
      onReserva(paciente);
      setActiveStep(0);
      setPaciente({ nombre: '', rut: '', telefono: '', email: '' });
      setRut('');
      setRutValido(false);
      onClose();
    } catch (e) {
      setError('Error al crear o actualizar la reserva');
    }
    setLoading(false);
  };

  // Header color
  const headerGradient = "linear-gradient(90deg, #2596be 60%, #21cbe6 100%)";

  return (
    <Modal open={open} onClose={onClose} closeAfterTransition>
      <Fade in={open}>
        <Box sx={style}>
          {/* Header */}
          <Box
            sx={{
              background: headerGradient,
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Typography variant="h6" color="white" fontWeight={700}>
              Reserva de Cita
            </Typography>
            <IconButton onClick={onClose} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>
          {/* Stepper */}
          <Box px={3} pt={2} pb={0}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map(label => (
                <Step key={label}>
                  <StepLabel
                    sx={{
                      '& .MuiStepLabel-label': { fontWeight: 600, color: '#2596be' }
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
          <Divider sx={{ my: 2 }} />
          {/* Content */}
          <Box px={3} pb={3} minHeight={260}>
            {activeStep === 0 && (
              <Stack spacing={2} alignItems="center" justifyContent="center" minHeight={200}>
                <Rutificador onRutValidated={handleRutValidated} />
                {loading && <CircularProgress size={28} sx={{ color: '#2596be' }} />}
                {error && <Typography color="error">{error}</Typography>}
              </Stack>
            )}
            {activeStep === 1 && (
              <Stack spacing={2} alignItems="center" justifyContent="center" minHeight={200}>
                <TextField
                  label="Nombre completo"
                  name="nombre"
                  value={paciente.nombre}
                  onChange={handleChange}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: '#2596be' }} />
                  }}
                />
                <TextField
                  label="Teléfono"
                  name="telefono"
                  value={paciente.telefono}
                  onChange={handleChange}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: <PhoneIphoneIcon sx={{ mr: 1, color: '#2596be' }} />
                  }}
                />
                <TextField
                  label="Email"
                  name="email"
                  value={paciente.email}
                  onChange={handleChange}
                  fullWidth
                  InputProps={{
                    startAdornment: <EmailIcon sx={{ mr: 1, color: '#2596be' }} />
                  }}
                />
                {error && <Typography color="error">{error}</Typography>}
              </Stack>
            )}
            {activeStep === 2 && (
              <Stack spacing={2} alignItems="center" justifyContent="center" minHeight={200}>
                <Paper elevation={2} sx={{ width: '100%', p: 2, borderRadius: 2, background: '#f7fbfc' }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <Avatar sx={{ bgcolor: '#2596be', width: 32, height: 32 }}>
                      {paciente.nombre?.[0] || <PersonIcon />}
                    </Avatar>
                    <Box>
                      <Typography fontWeight={600}>{paciente.nombre}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        RUT: {paciente.rut}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <PhoneIphoneIcon sx={{ color: '#2596be' }} />
                    <Typography variant="body2">{paciente.telefono}</Typography>
                  </Stack>
                  {paciente.email && (
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      <EmailIcon sx={{ color: '#2596be' }} />
                      <Typography variant="body2">{paciente.email}</Typography>
                    </Stack>
                  )}
                  <Divider sx={{ my: 1 }} />
                  {datosPreseleccionados && (
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" fontWeight={600} color="#2596be">
                        Datos de la cita
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <PersonIcon sx={{ color: '#2596be' }} />
                        <Typography variant="body2">
                          Profesional: {datosPreseleccionados.profesional?.username || 'No seleccionado'}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <CalendarMonthIcon sx={{ color: '#2596be' }} />
                        <Typography variant="body2">
                          Fecha: {datosPreseleccionados.fecha
                            ? (typeof datosPreseleccionados.fecha === 'string'
                              ? datosPreseleccionados.fecha
                              : datosPreseleccionados.fecha.format
                                ? datosPreseleccionados.fecha.format('DD/MM/YYYY')
                                : datosPreseleccionados.fecha.toString())
                            : 'No seleccionada'}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <AccessTimeIcon sx={{ color: '#2596be' }} />
                        <Typography variant="body2">
                          Hora: {datosPreseleccionados.hora || 'No seleccionada'}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {datosPreseleccionados.modalidad === 'Telemedicina'
                          ? <VideoCallIcon sx={{ color: '#21cbe6' }} />
                          : <PersonPinCircleIcon sx={{ color: '#2596be' }} />}
                        <Typography variant="body2">
                          Modalidad: {datosPreseleccionados.modalidad || 'No seleccionada'}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <PersonIcon sx={{ color: '#2596be' }} />
                        <Typography variant="body2">
                          Especialidad: {datosPreseleccionados.profesional?.especialidad || 'No seleccionado'}
                        </Typography>
                      </Stack>
                    </Stack>
                  )}
                </Paper>
              </Stack>
            )}
          </Box>
          {/* Footer */}
          <Divider sx={{ mt: 2, mb: 0 }} />
          <Box
            px={3}
            py={2}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            sx={{ background: '#f7fbfc' }}
          >
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              color="inherit"
              sx={{
                color: activeStep === 0 ? 'grey.400' : '#2596be',
                fontWeight: 600,
                textTransform: 'none'
              }}
            >
              Atrás
            </Button>
            {activeStep < steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={loading}
                sx={{
                  background: 'linear-gradient(90deg, #2596be 60%, #21cbe6 100%)',
                  color: 'white',
                  fontWeight: 700,
                  px: 4,
                  boxShadow: 2,
                  borderRadius: 2,
                  textTransform: 'none'
                }}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                variant="contained"
                sx={{
                  background: 'linear-gradient(90deg, #2596be 60%, #21cbe6 100%)',
                  color: 'white',
                  fontWeight: 700,
                  px: 4,
                  boxShadow: 2,
                  borderRadius: 2,
                  textTransform: 'none'
                }}
                onClick={handleFinish}
                endIcon={<CheckCircleRoundedIcon />}
              >
                Confirmar y reservar
              </Button>
            )}
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
}