import React, { useState, useEffect } from 'react';
import { Stepper, Step, StepLabel, Button, TextField, Typography, Box, Snackbar, Alert } from '@mui/material';
import { usePaciente } from '../context/pacienteContext';
import { useReserva } from '../context/reservaContext';
import '../components/ui/HomePageCSS.css';
import Rutificador from '../components/Rutificador';

function HomePage() {
  const [activeStep, setActiveStep] = useState(0);
  const { getPacientePorRut, createPaciente } = usePaciente();
  const { createReserva, updateReserva } = useReserva();
  const [formData, setFormData] = useState({
    rut: '',
    nombre: '',
    telefono: '',
    email: '',
    diaPrimeraCita: '',
    siguienteCita: '',
    hora: '',
    profesional: '',
    mensajePaciente: ''
  });
  const [pacienteExistente, setPacienteExistente] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const steps = ['Ingresar RUT', 'Datos del Paciente', 'Confirmar Reserva'];

  const handleNext = async () => {
    if (activeStep === 0) {
      try {
        const response = await getPacientePorRut(formData.rut);
        if (response) {
          setFormData({
            ...formData,
            nombre: response.nombre,
            telefono: response.telefono,
            email: response.email
          });
          setPacienteExistente(true);
        }
      } catch (error) {
        setPacienteExistente(false);
      }
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      if (pacienteExistente) {
        await updateReserva(formData.rut, formData);
        setAlert({ type: 'success', message: 'Reserva actualizada con éxito' });
      } else {
        const newData = {
          rut: formData.rut,
          nombre: formData.nombre,
          telefono: formData.telefono,
          email: formData.email,
          diaPrimeraCita: formData.diaPrimeraCita,
          siguienteCita: formData.diaPrimeraCita,
          hora: formData.hora,
          profesional: formData.profesional,
          mensajePaciente: formData.mensajePaciente
        }
        await createPaciente(newData);
        await createReserva(newData.rut, newData);
        setAlert({ type: 'success', message: 'Nueva Reserva Guardada' });
      }
      setFormData({
        rut: '',
        nombre: '',
        telefono: '',
        email: '',
        diaPrimeraCita: '',
        hora: '',
        profesional: '',
        mensajePaciente: ''
      });
      setPacienteExistente(false);
      setActiveStep(0);
    } catch (error) {
      setAlert({ type: 'error', message: 'Ha ocurrido un error inesperado, inténtelo más tarde' });
    }
    setOpenSnackbar(true);
  };

  const handleRutValidated = (validatedRut) => {
    setFormData({ ...formData, rut: validatedRut });
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  return (
    <Box className="stepper-container">
      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
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
      <Stepper activeStep={activeStep}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      {activeStep === steps.length ? (
        <Typography variant="h5" className="stepper-completed">
          Reserva completada con éxito
        </Typography>
      ) : (
        <Box>
          {activeStep === 0 && (
            <Rutificador onRutValidated={handleRutValidated} />
          )}
          {activeStep === 1 && (
            <Box>
              <TextField
                label="RUT"
                name="rut"
                value={formData.rut}
                onChange={handleChange}
                fullWidth
                margin="normal"
                disabled
              />
              <TextField
                label="Nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                fullWidth
                margin="normal"
                required
              />
              <TextField
                label="Teléfono"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                fullWidth
                margin="normal"
                required
              />
              <TextField
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                fullWidth
                margin="normal"
              />
            </Box>
          )}
          {activeStep === 2 && (
            <Box>
              <TextField
                label="Fecha de Cita"
                name="diaPrimeraCita"
                type="date"
                value={formData.diaPrimeraCita}
                onChange={handleChange}
                fullWidth
                margin="normal"
                required
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Hora de Cita"
                name="hora"
                type="time"
                value={formData.hora}
                onChange={handleChange}
                fullWidth
                margin="normal"
                required
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Profesional"
                name="profesional"
                value={formData.profesional}
                onChange={handleChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Mensaje"
                name="mensajePaciente"
                value={formData.mensajePaciente}
                onChange={handleChange}
                fullWidth
                margin="normal"
              />
            </Box>
          )}
          <Box className="stepper-box">
            <Button disabled={activeStep === 0} onClick={handleBack}>
              Atrás
            </Button>
            {activeStep === steps.length - 1 ? (
              <Button variant="contained" color="primary" onClick={handleSubmit}>
                Confirmar
              </Button>
            ) : (
              <Button variant="contained" color="primary" onClick={handleNext}>
                Siguiente
              </Button>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default HomePage;