import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button, MobileStepper, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { useReserva } from '../../context/reservaContext';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/authContext';
import '../ui/AgregarSesionCSS.css';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const AgregarSesion = ({ open, close, onClose, paciente, fetchReservas }) => {
  const [sesionData, setSesionData] = useState('');
  const [fecha, setFecha] = useState('');
  const [ultimaFecha, setUltimaFecha] = useState('');
  const [hora, setHora] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const [horasDisponibles, setHorasDisponibles] = useState([]);
  const { addHistorial } = useReserva();
  const showAlert = useAlert();
  const { user, obtenerHorasDisponibles } = useAuth();
  const [diasDeTrabajo, setDiasDeTrabajo] = useState([]);

  useEffect(() => {
    const fetchHorasDisponibles = async () => {
      if (fecha) {
        const response = await obtenerHorasDisponibles(user.id, fecha);
        const horas = response.times || [];
        setHorasDisponibles(horas);
      }
    };
    fetchHorasDisponibles();
  }, [fecha, user.id, obtenerHorasDisponibles]);

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
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSave = async () => {
    try {
      const data = {
        fecha: ultimaFecha,
        notas: sesionData,
        siguienteCita: fecha,
        hora: hora,
      };

      await addHistorial(paciente.rut, data);
      showAlert('success', 'Sesión agregada correctamente');
    }
    catch (error) {
      console.error(error);
      showAlert('error', 'Error al agregar la sesión');
    }
    setSesionData('');
    setFecha('');
    setHora('');
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
      const dias = user.timetable[0].days;
      setDiasDeTrabajo(dias);
    }
  }, [user]);

  const modalClass = window.innerWidth < 600 ? (closing ? 'modal-slide-out-down' : 'modal-slide-in-up') : (closing ? 'modal-slide-out-right' : 'modal-slide-in-right');

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        p={3}
        bgcolor="#eeee"
        borderRadius={2}
        boxShadow={3}
        width={window.innerWidth < 600 ? '90%' : 530}
        maxHeight={window.innerHeight < 600 ? '90%' : 500}
        minHeight={window.innerHeight < 600 ? '90%' : 500}
        overflow="auto"
        mx="auto"
        my="15%"
        className={modalClass}
      >
        {activeStep === 0 ? (
          <> 
            <Box backgroundColor="primary.main" borderRadius={'5px'} color={"white"} p={0.5} mb={0}>
              <Typography variant="h6" style={{textAlign:'center'}} gutterBottom>Agregar Sesión</Typography>
            </Box>
            <Box backgroundColor="white" borderRadius={'5px'} p={1} mb={0}>
              <Typography variant="body1"><strong>Nombre:</strong> {paciente.nombre}</Typography>
              <Box display="flex" justifyContent="space-between" >
                <Typography variant="body1"><strong>Rut:</strong> {paciente.rut}</Typography>
                <Typography variant="body1"><strong>Celular:</strong> {paciente.telefono}</Typography>
              </Box>
              <Typography variant="body1"><strong>Email:</strong> {paciente.email || "Sin Información"}</Typography>
              <Typography variant="body1"><strong>Detalles de la sesión</strong></Typography>
              <ReactQuill
                style={{ height: '210px' }}
                value={sesionData}
                onChange={handleSesionChange}
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
          </>
        ) : (
          <>
            <Box backgroundColor="primary.main" borderRadius={'5px'} color={"white"} p={0.5} mb={0}>
              <Typography variant="h6" textAlign={'center'} gutterBottom>Agendar Nueva Cita</Typography>
            </Box>
            <Box backgroundColor="white" borderRadius={'5px'} p={1} mb={0}>
              <TextField
                label="Fecha Última Sesión"
                type="date"
                value={ultimaFecha}
                onChange={handleUltimaFechaChange}
                fullWidth
                margin="normal"
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <DatePicker
                label="Fecha Nueva Cita"
                value={fecha ? dayjs(fecha) : null}
                onChange={handleFechaChange}
                shouldDisableDate={(date) => {
                  const dayName = date.format('dddd');
                  const translatedDays = {
                    Monday: "Lunes",
                    Tuesday: "Martes",
                    Wednesday: "Miércoles",
                    Thursday: "Jueves",
                    Friday: "Viernes",
                    Saturday: "Sábado",
                    Sunday: "Domingo",
                  };
                  const translatedDayName = translatedDays[dayName];
                  return !diasDeTrabajo.includes(translatedDayName);
                }}
                renderInput={(params) => <TextField {...params} fullWidth margin="normal" required />}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Hora</InputLabel>
                <Select
                  value={hora}
                  onChange={handleHoraChange}
                >
                  {horasDisponibles.map((hora) => (
                    <MenuItem key={hora} value={hora}>
                      {hora}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </>
        )}
        <MobileStepper
          variant="dots"
          steps={2}
          position="static"
          activeStep={activeStep}
          nextButton={
            <Button size="small" onClick={activeStep === 1 ? handleSave : handleNext}>
              {activeStep === 1 ? 'Guardar' : 'Siguiente'}
              {activeStep === 1 ? <KeyboardArrowRight /> : <KeyboardArrowRight />}
            </Button>
          }
          backButton={
            <Button size="small" onClick={handleBack} disabled={activeStep === 0}>
              <KeyboardArrowLeft />
              Anterior
            </Button>
          }
        />
      </Box>
    </Modal>
  );
};

export default AgregarSesion;