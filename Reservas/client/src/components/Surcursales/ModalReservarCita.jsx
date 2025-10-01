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
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
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
import { createReservaRequest, updateReservaRequest } from '../../api/reservas';
import axios from '../../api/axios';
import { createPaymentRequest } from '../../api/payment';
import { getReservasPorRutRequest } from '../../api/reservas';
import dayjs from 'dayjs';


const steps = ['Identificación', 'Datos de contacto', 'Servicios & Pago', 'Confirmar'];

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
  const [paciente, setPaciente] = useState({ nombre: '', rut: '', telefono: '', email: '', _id: '' });
  const [error, setError] = useState('');
  const [proximaCita, setProximaCita] = useState(null); // Estado para la próxima cita
  const [selectedService, setSelectedService] = useState(null);
  const [selectedServiceIndex, setSelectedServiceIndex] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('presencial'); // 'presencial' | 'webpay'

  // Paso 1: Rutificador
  const handleRutValidated = async (rutIngresado) => {
    setRut(rutIngresado);
    setRutValido(true);
    setLoading(true);
    setError('');
    setPaciente({ nombre: '', rut: rutIngresado, telefono: '', email: '', _id: '' });
    setProximaCita(null);
    try {
      // Buscar próximas reservas del paciente
      const res = await getReservasPorRutRequest(rutIngresado);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        // Buscar la próxima cita (la más cercana en el futuro)
        const ahora = new Date();
        // Combina fecha y hora para comparar correctamente
        const futuras = res.data.filter(r => {
          if (!r.siguienteCita || !r.hora) return false;
          const [h, m] = r.hora.split(':');
          const citaDate = new Date(r.siguienteCita);
          citaDate.setHours(Number(h), Number(m), 0, 0);
          return citaDate > ahora;
        });
        if (futuras.length > 0) {
          futuras.sort((a, b) => {
            const [ha, ma] = a.hora.split(':');
            const [hb, mb] = b.hora.split(':');
            const da = new Date(a.siguienteCita);
            da.setHours(Number(ha), Number(ma), 0, 0);
            const db = new Date(b.siguienteCita);
            db.setHours(Number(hb), Number(mb), 0, 0);
            return da - db;
          });
          setProximaCita(futuras[0]);
        } else {
          setProximaCita(null);
        }
      } else {
        setProximaCita(null);
      }
    } catch (e) {
      setProximaCita(null);
      // No hacer nada si falla
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
    // Si es el paso de datos de contacto y aún no existe paciente, crearlo
    if (activeStep === 1 && !paciente._id) {
      setLoading(true);
      try {
        if (datosPreseleccionados?.publicFlow) {
          // Usar axios instance con baseURL http://localhost:4000/api -> no anteponer "/api" ni "/"
          const { data } = await axios.post('public/ficha', { ...paciente, profesional: datosPreseleccionados?.profesional?._id });
          if (data && (data._id || data.id)) {
            setPaciente(prev => ({ ...prev, _id: data._id || data.id }));
          }
        } else {
          const { data } = await createPacienteRequest(paciente);
          if (data && (data._id || data.id)) {
            setPaciente(prev => ({ ...prev, _id: data._id || data.id }));
          }
        }
      } catch (e) {
        setError('Error al crear paciente');
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    // Si vamos al paso de servicios, requerir selección si el profesional tiene servicios
    if (activeStep === 2) {
      // validated in UI when pressing next from services step; but keep default flow
    }
    // If moving from services step and webpay is selected, require a service selection
    if (activeStep === 2 && paymentMethod === 'webpay' && (!selectedService)) {
      setError('Seleccione un servicio para poder pagar con Webpay');
      return;
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
        servicio: selectedService ? (selectedService._id || selectedService.id || selectedService.tipo || selectedService.nombre) : '',
        // Puedes agregar más campos si tu backend lo requiere
      };

      // 2. Flujo público vs autenticado
      let pacienteId = paciente._id;
      if (!datosPreseleccionados?.publicFlow) {
        // Flujo autenticado: mantener lógica existente
        const res = await getPacientePorRutRequest(paciente.rut);
        if (res.data && res.data._id) {
          pacienteId = res.data._id;
          // Paciente existe: actualizar reserva por rut (mantener comportamiento previo si necesario)
          await updateReservaRequest(res.data.rut, reserva);
          const pacienteActualizado = { ...paciente, _id: res.data._id };
          setPaciente(pacienteActualizado);
        } else {
          // Paciente no existe: crear paciente
          const response = await createPacienteRequest(paciente);
          pacienteId = response.data._id;
          setPaciente({ ...paciente, _id: pacienteId });
        }
      }

      // 3. Dependiendo método de pago: presencial -> guardar reserva y cerrar;
      //    webpay -> crear reserva primero, luego solicitar transacción y redirigir a Webpay
      if (paymentMethod === 'presencial') {
        // Crear reserva normalmente
        if (datosPreseleccionados?.publicFlow) {
          await axios.post('public/reserva', { ...reserva, rut: paciente.rut });
          onReserva({ ...paciente, _id: pacienteId || '' });
        } else {
          await createReservaRequest(paciente.rut, reserva);
          onReserva({ ...paciente, _id: pacienteId });
        }
      } else if (paymentMethod === 'webpay') {
        // Asegurarse que hay servicio seleccionado y precio
        if (!selectedService) {
          setError('Seleccione un servicio antes de proceder al pago');
          setLoading(false);
          return;
        }

        // Crear la reserva en estado pendiente en el backend
        const createRes = datosPreseleccionados?.publicFlow
          ? await axios.post('public/reserva', { ...reserva, rut: paciente.rut })
          : await createReservaRequest(paciente.rut, reserva);
        const reservaCreada = createRes.data; // asume que el endpoint devuelve la reserva creada
        const reservaId = reservaCreada._id || reservaCreada.id;

        // Iniciar transacción con backend
  const amount = Number(selectedService.precio || selectedService.price || selectedService.monto || 0);
        const paymentResp = await createPaymentRequest(reservaId, amount, paciente.rut);

        // Redirigir a Webpay (form POST)
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = paymentResp.data.url;
        const tokenInput = document.createElement('input');
        tokenInput.type = 'hidden';
        tokenInput.name = 'token_ws';
        tokenInput.value = paymentResp.data.token;
        form.appendChild(tokenInput);
        document.body.appendChild(form);
        form.submit();
        // No cerrar modal: la redirección llevará al frontend de vuelta a /payment/confirm
      }

      // 4. Si se guardó en presencial, limpiar y cerrar
      if (paymentMethod === 'presencial') {
        setActiveStep(0);
        setPaciente({ nombre: '', rut: '', telefono: '', email: '', _id: '' });
        setRut('');
        setRutValido(false);
        onClose();
      }
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
                {proximaCita && (
                  <Paper elevation={1} sx={{ width: '100%', p: 1.5, mt: 1, background: '#e3f7fa' }}>
                    <Typography variant="subtitle2" color="#2596be" fontWeight={600}>
                      Se ha encontrado una cita previa la cual se sustituirá por la nueva reserva. Cita previa:
                    </Typography>
                    <Typography variant="body2">
                      Fecha: {dayjs(proximaCita.siguienteCita).utc().format('DD/MM/YYYY')}<br />
                      Hora: {proximaCita.hora}
                    </Typography>
                  </Paper>
                )}
                {error && <Typography color="error">{error}</Typography>}
              </Stack>
            )}
            {activeStep === 2 && (
              <Stack spacing={2} alignItems="stretch" justifyContent="center" minHeight={200}>
                <Typography fontWeight={600} color="#2596be">Servicios disponibles</Typography>
                <Paper elevation={1} sx={{ p: 1, borderRadius: 2, background: '#fff' }}>
                  <List>
                    {(datosPreseleccionados.profesional?.servicios || []).length === 0 && (
                      <ListItem>
                        <ListItemText primary="Este profesional no tiene servicios definidos" />
                      </ListItem>
                    )}
                    {(datosPreseleccionados.profesional?.servicios || []).map((s, idx) => (
                      <ListItem key={s._id || idx} sx={{ borderRadius: 1, p: 0 }}>
                        <ListItemButton
                          selected={selectedServiceIndex === idx}
                          onClick={() => { setSelectedService(s); setSelectedServiceIndex(idx); }}
                          sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2 }}
                        >
                          <ListItemText
                            primary={s.tipo || s.nombre || `Servicio ${idx + 1}`}
                            secondary={s.descripcion}
                          />
                          <Typography fontWeight={600}>{s.precio ? `$${Number(s.precio).toLocaleString()}` : (s.price ? `$${Number(s.price).toLocaleString()}` : '-')}</Typography>
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
                <Paper elevation={1} sx={{ p: 2, borderRadius: 2, background: '#f7fbfc' }}>
                  <Typography fontWeight={600} mb={1}>Método de pago</Typography>
                  <RadioGroup
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <FormControlLabel value="presencial" control={<Radio />} label="Pagar presencialmente (en consulta)" />
                    <FormControlLabel value="webpay" control={<Radio />} label="Pagar ahora con Webpay" />
                  </RadioGroup>
                  {paymentMethod === 'webpay' && (
                    <Typography variant="caption" color="text.secondary">Serás redirigido a Webpay para completar el pago seguro.</Typography>
                  )}
                </Paper>
              </Stack>
            )}
            {activeStep === 3 && (
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
                      {selectedService && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Stack spacing={1}>
                            <Typography variant="subtitle2" fontWeight={600} color="#2596be">Servicio seleccionado</Typography>
                            <Typography variant="body2">{selectedService.tipo || selectedService.nombre}</Typography>
                            <Typography variant="body2" color="text.secondary">{selectedService.descripcion}</Typography>
                            <Typography variant="body2" fontWeight={700}>Monto: {selectedService.precio ? `$${Number(selectedService.precio).toLocaleString()}` : '-'}</Typography>
                            <Typography variant="body2">Método de pago: {paymentMethod === 'webpay' ? 'Webpay' : 'Presencial'}</Typography>
                          </Stack>
                        </>
                      )}
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