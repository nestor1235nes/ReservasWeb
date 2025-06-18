import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button, MobileStepper, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
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
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

dayjs.extend(localeData);
dayjs.locale('es');

const AgregarSesion = ({ open, close, onClose, paciente, fetchReservas, gapi }) => {
  const [sesionData, setSesionData] = useState('');
  const [fecha, setFecha] = useState('');
  const [ultimaFecha, setUltimaFecha] = useState('');
  const [hora, setHora] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const [horasDisponibles, setHorasDisponibles] = useState([]);
  const { addHistorial, getFeriados } = useReserva();
  const showAlert = useAlert();
  const { user, obtenerHorasDisponibles } = useAuth();
  const [diasDeTrabajo, setDiasDeTrabajo] = useState([]);
  const [feriados, setFeriados] = useState([]);

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
  
      if (gapi.auth2.getAuthInstance().isSignedIn.get()) {
        const event = {
          summary: 'Sesión con ' + paciente.nombre,
          description: sesionData,
          start: {
            dateTime: dayjs(fecha + 'T' + hora).toISOString(),
            timeZone: 'America/Santiago',
          },
          end: {
            dateTime: dayjs(fecha + 'T' + (parseInt(hora.split(':')[0]) + 1) + ':' + hora.split(':')[1]).toISOString(),
            timeZone: 'America/Santiago',
          },
        };
  
        const request = gapi.client.calendar.events.update({
          calendarId: 'primary',
          eventId: paciente.eventId, // Assuming you have the eventId stored in paciente object
          resource: event,
        });
  
        request.execute((event) => {
          if (event.error) {
            console.error('Error updating event: ', event.error);
            showAlert('error', 'Error al actualizar la sesión en Google Calendar');
          } else {
            showAlert('success', 'Sesión actualizada correctamente en Google Calendar');
          }
        });
      }
  
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

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <Modal open={open} onClose={handleClose} className="modal-over-drawer">
        <Box
          p={3}
          bgcolor="#e3f2fd"
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
              <Box borderRadius={'5px'} p={0.5} mb={0} sx={{ background:'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)', color:'white'}}>
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
              <Box borderRadius={'5px'} p={0.5} mb={0} sx={{ background:'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)', color:'white'}}>
                <Typography variant="h6" textAlign={'center'} gutterBottom>Agendar Nueva Cita</Typography>
              </Box>
              <Box backgroundColor="white" borderRadius={'5px'} p={1} mb={0}>
                <DatePicker
                  label="Fecha Última Sesión"
                  value={ultimaFecha ? dayjs(ultimaFecha) : dayjs()} // Por defecto hoy
                  onChange={(newValue) => setUltimaFecha(newValue ? newValue.format('YYYY-MM-DD') : '')}
                  renderInput={(params) => <TextField {...params} fullWidth margin="normal" required />}
                  sx={{ width: '100%', marginBottom: '15px' }}
                />
                <DatePicker
                  label="Fecha Nueva Cita"
                  value={fecha ? dayjs(fecha) : null}
                  onChange={handleFechaChange}
                  shouldDisableDate={(date) => {
                    const dayName = diasSemana[date.day()];
                    // Verifica si el día no es de trabajo
                    const noTrabaja = !diasDeTrabajo.includes(dayName);
                    // Verifica si la fecha está en feriados (usando f.date)
                    const esFeriado = feriados.some(f => f.date && dayjs(f.date).isSame(date, 'day'));
                    return noTrabaja || esFeriado;
                  }}
                  sx={{ width: '100%' }}
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
    </LocalizationProvider>
  );
};

export default AgregarSesion;