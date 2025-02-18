import React, { useState, useEffect } from 'react';
import { Modal, Box, Stepper, Step, StepLabel, Button, TextField, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useReserva } from '../../context/reservaContext';
import { usePaciente } from '../../context/pacienteContext';
import { set } from 'mongoose';

const steps = ['Datos del paciente', 'Fecha y hora de la cita', 'Datos de la consulta'];

const AgregarPaciente = ({ open, onClose, data, fetchReservas }) => {
  const { createPaciente, getPacientePorRut } = usePaciente();
  const { createReserva, updateReserva } = useReserva();
  const [activeStep, setActiveStep] = useState(0);
  const [patientData, setPatientData] = useState({
    nombre: '',
    rut: '',
    telefono: '',
    email: '',
    diaPrimeraCita: dayjs().format('YYYY-MM-DD'),
    siguienteCita: '',
    hora: '',
    diagnostico: '',
    anamnesis: ''
  });

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

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPatientData({ ...patientData, [name]: value });
  };

  const handleSubmit = async () => {
    try {

      if (data) {
        await updateReserva(patientData.rut, patientData);
      } else {
        await createPaciente(patientData);
        await createReserva(patientData.rut, patientData);
      }
      setPatientData({
        nombre: '',
        rut: '',
        telefono: '',
        email: '',
        diaPrimeraCita: dayjs().format('YYYY-MM-DD'),
        siguienteCita: '',
        hora: '',
        diagnostico: '',
        anamnesis: ''
      });
      
    } catch (error) {
      console.log(error);
    }
    setActiveStep(0);
    fetchReservas();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{ width: '50%', margin: 'auto', marginTop: '5%', padding: '2rem', backgroundColor: 'white' }}>
        <Stepper activeStep={activeStep}>
          {steps.map((label, index) => (
            <Step key={index}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {activeStep === 0 && (
          <Box>
            <TextField label="Nombre" name="nombre" value={patientData.nombre} onChange={handleChange} fullWidth margin="normal" required />
            <TextField label="RUT" name="rut" value={patientData.rut} onChange={handleChange} fullWidth margin="normal" required />
            <TextField label="Celular" name="telefono" value={patientData.telefono} onChange={handleChange} fullWidth margin="normal" required />
            <TextField label="Email" name="email" value={patientData.email} onChange={handleChange} fullWidth margin="normal" />
          </Box>
        )}
        {activeStep === 1 && (
          <Box>
            <TextField
              label="Fecha de registro"
              name="diaPrimeraCita"
              type="date"
              value={new Date().toISOString().split('T')[0]}
              fullWidth
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Fecha siguiente Cita"
              name="siguienteCita"
              type="date"
              value={patientData.siguienteCita}
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
              value={patientData.hora}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        )}
        {activeStep === 2 && (
          <Box>
            <TextField
              label="Diagnóstico"
              name="diagnostico"
              value={patientData.diagnostico}
              onChange={handleChange}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Anamnesis"
              name="anamnesis"
              value={patientData.anamnesis}
              onChange={handleChange}
              fullWidth
              margin="normal"
              multiline
              rows={4}
            />
            <Button variant="contained" component="label">
              Añadir imágenes
              <input type="file" hidden />
            </Button>
          </Box>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
          <Button disabled={activeStep === 0} onClick={handleBack}>
            Atrás
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button variant="contained" color="primary" onClick={handleSubmit}>
              Finalizar
            </Button>
          ) : (
            <Button variant="contained" color="primary" onClick={handleNext}>
              Siguiente
            </Button>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

export default AgregarPaciente;