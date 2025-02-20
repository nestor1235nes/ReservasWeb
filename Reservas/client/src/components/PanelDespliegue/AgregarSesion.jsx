import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button, MobileStepper } from '@mui/material';
import { useReserva } from '../../context/reservaContext';
import { useAlert } from '../../context/AlertContext';
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
  const { addHistorial } = useReserva();
  const showAlert = useAlert();

  const handleSesionChange = (value) => {
    setSesionData(value);
  };

  const handleFechaChange = (e) => {
    setFecha(e.target.value);
  };

  const handleHoraChange = (e) => {
    setHora(e.target.value);
  };

  const handleUltimaFechaChange = (e) => {
    setUltimaFecha(e.target.value);
  }

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

  const modalClass = window.innerWidth < 600 ? (closing ? 'modal-slide-out-down' : 'modal-slide-in-up') : (closing ? 'modal-slide-out-right' : 'modal-slide-in-right');

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        p={3}
        bgcolor="white"
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
            <Typography variant="h6" gutterBottom>Agregar Sesión</Typography>
            <Typography variant="body1"><strong>Nombre:</strong> {paciente.nombre}</Typography>
            <Typography variant="body1"><strong>Rut:</strong> {paciente.rut}</Typography>
            <Typography variant="body1"><strong>Celular:</strong> {paciente.telefono}</Typography>
            <Typography variant="body1"><strong>Email:</strong> {paciente.email}</Typography>
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
          </>
        ) : (
          <>
            <Typography variant="h6" gutterBottom>Agendar Nueva Cita</Typography>
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
            <TextField
              label="Fecha Nueva Cita"
              type="date"
              value={fecha}
              onChange={handleFechaChange}
              fullWidth
              margin="normal"
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              label="Hora"
              type="time"
              value={hora}
              onChange={handleHoraChange}
              fullWidth
              margin="normal"
              InputLabelProps={{
                shrink: true,
              }}
            />
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