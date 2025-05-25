import React, { useState, useEffect } from 'react';
import { Modal, Box, Stepper, Step, StepLabel, Button, TextField, Typography, Snackbar, Alert } from '@mui/material';
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

const steps = ['Datos del paciente', 'Fecha y hora de la cita', 'Datos de la consulta'];

const AgregarPaciente = ({ open, onClose, data, fetchReservas = () => {} , gapi}) => {
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

  const handleSubmit = async () => {
    try {
      // 1. Actualizar los datos del paciente (crear o actualizar)
      if (data) {
        await updateReserva(patientData.rut, patientData);
      } else {
        await createPaciente(patientData);
        await createReserva(patientData.rut, patientData);
      }
  
      // 2. Subir las imágenes solo si hay archivos seleccionados
      if (files.length > 0) {
        const formData = new FormData();
        formData.append('rut', patientData.rut); // Agrega el rut al FormData
        files.forEach((file) => {
          formData.append('files', file); // Agrega cada archivo al FormData
        });
  
        const response = await axios.post('/api/imagenesPacientes', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        await updateReserva(patientData.rut, { imagenes: response.data.urls });
      }
  
      // 3. Agregar evento a Google Calendar si el usuario está autenticado con Google
      if (gapi.auth2.getAuthInstance().isSignedIn.get()) {
        const event = {
          summary: `Cita con ${patientData.nombre}`,
          description: `Diagnóstico: ${patientData.diagnostico}\nAnamnesis: ${patientData.anamnesis}`,
          start: {
            dateTime: `${patientData.siguienteCita}T${patientData.hora}:00`,
            timeZone: 'America/Santiago',
          },
          end: {
            dateTime: `${patientData.siguienteCita}T${parseInt(patientData.hora.split(':')[0]) + 1}:${patientData.hora.split(':')[1]}:00`,
            timeZone: 'America/Santiago',
          },
        };
  
        const request = gapi.client.calendar.events.insert({
          calendarId: 'primary',
          resource: event,
        });
  
        request.execute(async (event) => {
          console.log('Evento creado: ', event.htmlLink);
          // Almacenar el eventId en la base de datos
          console.log(event.id);
          await updatePaciente(patientData.rut, { eventId: event.id });
        });
      }
  
      // 4. Mostrar mensaje de éxito y resetear el formulario
      showAlert('success', 'Paciente registrado correctamente');
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
      return patientData.diaPrimeraCita && patientData.hora;
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
    <Modal open={open} onClose={onClose}>
      <Box sx={{ width: '50%', margin: 'auto', marginTop: '5%', padding: '2rem', backgroundColor: 'white', minHeight: '80vh', maxHeight: '80vh', overflowY: 'auto' }}>
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
          {steps.map((label, index) => (
            <Step key={index}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {activeStep === 0 && (
          <Box>
            {data ? (
              <TextField
                label="RUT"
                name="rut"
                value={patientData.rut}
                fullWidth
                margin="normal"
                required
                InputProps={{ readOnly: true }}
              />
            ) : (
              <Rutificador onRutValidated={(validatedRut) => setPatientData({ ...patientData, rut: validatedRut })} />
            )}
            <TextField label="Nombre" name="nombre" value={patientData.nombre} onChange={handleChange} fullWidth margin="normal" required />
            <TextField label="Celular" name="telefono" value={patientData.telefono} onChange={handleChange} fullWidth margin="normal" required />
            <TextField label="Email" name="email" value={patientData.email} onChange={handleChange} fullWidth margin="normal" />
          </Box>
        )}
        {activeStep === 1 && (
          <ProfesionalBusquedaHoras
            formData={patientData}
            setFormData={setPatientData}
            obtenerHorasDisponibles={obtenerHorasDisponibles}
          />
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
            <Typography variant="h6" gutterBottom>
              Anamnesis
            </Typography>
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
            <ArrastraSeleccionaImagenes onImagesSelected={handleImagesSelected} pacienteRut={patientData.rut} />
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