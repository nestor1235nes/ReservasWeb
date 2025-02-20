import React, { useState } from 'react';
import { Box, Typography, IconButton, Slide, Button, TextField } from '@mui/material';
import { usePaciente } from '../../context/pacienteContext';
import { useReserva } from '../../context/reservaContext';
import AgregarPaciente from '../Modales/AgregarPaciente';
import AgregarSesion from './AgregarSesion';
import VerHistorial from './VerHistorial';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/es';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('es');

const DespliegueEventos = ({ event, onClose, fetchReservas }) => {
  const { updatePaciente } = usePaciente();
  const { updateReserva } = useReserva();
  const [editSection, setEditSection] = useState(null);
  const [editableFields, setEditableFields] = useState({
    email: event?.paciente?.email || '',
    telefono: event?.paciente?.telefono || '',
    fecha: event?.start ? dayjs(event.start).format("YYYY-MM-DD") : '',
    hora: event?.start ? dayjs(event.start).format("HH:mm") : '',
    profesional: event?.profesional || ''
  });
  const [openModal, setOpenModal] = useState(false); // Estado para controlar la apertura del modal
  const [openSesionModal, setOpenSesionModal] = useState(false); // Estado para controlar la apertura del modal de sesión
  const [openHistorialModal, setOpenHistorialModal] = useState(false); // Estado para controlar la apertura del modal de historial

  if (!event) return null;

  const handleEditClick = (section) => {
    setEditSection(section);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setEditableFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveClick = async () => {
    try {
      if (editSection === 'paciente') {
        await updatePaciente(event.paciente._id, {
          email: editableFields.email,
          telefono: editableFields.telefono,
        });
        event.paciente.email = editableFields.email;
        event.paciente.telefono = editableFields.telefono;
      } else if (editSection === 'cita') {
        await updateReserva(event.paciente.rut, {
          diaPrimeraCita: new Date(editableFields.fecha),
          hora: editableFields.hora,
          profesional: editableFields.profesional,
        });
        event.diaPrimeraCita = new Date(editableFields.fecha);
        event.hora = editableFields.hora;
        event.profesional = editableFields.profesional;
      }
      setEditSection(null);
      fetchReservas();
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const handleCancelClick = () => {
    setEditableFields({
      email: event.paciente.email,
      telefono: event.paciente.telefono,
      fecha: event.start.toISOString().split('T')[0],
      hora: event.start.toTimeString().split(' ')[0],
      profesional: event.profesional
    });
    setEditSection(null);
  };

  const handleOpenModal = () => {
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  const handleOpenSesionModal = () => {
    setOpenSesionModal(true);
  };

  const handleCloseSesionModal = () => {
    setOpenSesionModal(false);
  };

  const handleOpenHistorialModal = () => {
    setOpenHistorialModal(true);
  };

  const handleCloseHistorialModal = () => {
    setOpenHistorialModal(false);
  };

  return (
    <Slide direction={window.innerWidth < 600 ? 'up' : 'right'} in={Boolean(event)} mountOnEnter unmountOnExit timeout={500}>
      <Box p={2} width={window.innerWidth < 600 ? '100%' : 500} height={window.innerWidth < 600 ? 600 : '100%'}>
        <Box display="flex" justifyContent="space-between" style={{ justifyContent: 'center' }}>
          <Typography variant="h6" style={{ textAlign: 'center' }}>Detalles de la Cita</Typography>
        </Box>
        <Box display="flex" justifyContent="center" alignItems="center" my={2}>
          {event.imagenes && event.imagenes.length > 0 ? (
            <img src={event.imagenes[0]} alt="Imagen del paciente" style={{ maxWidth: '100%', maxHeight: '200px' }} />
          ) : (
            <Box display="flex" flexDirection="column" alignItems="center">
              <BrokenImageIcon style={{ fontSize: 50, opacity:'0.2' }} />
              <Typography variant="body1">No hay imágenes</Typography>
            </Box>
          )}
        </Box>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6"><strong>Datos del paciente</strong></Typography>
          {editSection === 'paciente' ? (
            <Box display="flex" alignItems="center">
              <IconButton onClick={handleSaveClick} style={{ boxShadow: '0 0 5px 0 rgba(0,0,0,0.2)', marginRight: '4px', backgroundColor: '#82e0aa', color: 'black' }}>
                <CheckIcon />
              </IconButton>
              <IconButton onClick={handleCancelClick} style={{ boxShadow: '0 0 5px 0 rgba(0,0,0,0.2)', backgroundColor: '#f1948a', color: 'black' }}>
                <CloseIcon />
              </IconButton>
            </Box>
          ) : (
            <IconButton onClick={() => handleEditClick('paciente')} style={{ boxShadow: '0 0 5px 0 rgba(0,0,0,0.2)' }}>
              <EditIcon />
            </IconButton>
          )}
        </Box>
        <Typography variant="body1"><strong>Paciente:</strong> {event.paciente.nombre}</Typography>
        <Typography variant="body1"><strong>Rut:</strong> {event.paciente.rut}</Typography>
        {editSection === 'paciente' ? (
          <>
            <TextField
              label="Celular"
              name="telefono"
              value={editableFields.telefono}
              onChange={handleFieldChange}
              fullWidth
              margin="normal"
            />
            <TextField
              label="E-mail"
              name="email"
              value={editableFields.email}
              onChange={handleFieldChange}
              fullWidth
              margin="normal"
            />
          </>
        ) : (
          <>
            <Typography variant="body1"><strong>Celular:</strong> {event.paciente.telefono}</Typography>
            <Typography variant="body1"><strong>E-mail:</strong> {event.paciente.email}</Typography>
          </>
        )}
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
          <Typography variant="h6"><strong>Detalles de la cita</strong></Typography>
          {editSection === 'cita' ? (
            <Box display="flex" alignItems="center">
              <IconButton onClick={handleSaveClick} style={{ boxShadow: '0 0 5px 0 rgba(0,0,0,0.2)', marginRight: '4px', backgroundColor: '#82e0aa', color: 'black' }}>
                <CheckIcon />
              </IconButton>
              <IconButton onClick={handleCancelClick} style={{ boxShadow: '0 0 5px 0 rgba(0,0,0,0.2)', backgroundColor: '#f1948a', color: 'black' }}>
                <CloseIcon />
              </IconButton>
            </Box>
          ) : (
            <IconButton onClick={() => handleEditClick('cita')} style={{ boxShadow: '0 0 5px 0 rgba(0,0,0,0.2)' }}>
              <EditIcon />
            </IconButton>
          )}
        </Box>
        {editSection === 'cita' ? (
          <>
            <TextField
              label="Fecha"
              name="fecha"
              type="date"
              value={editableFields.fecha}
              onChange={handleFieldChange}
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Hora"
              name="hora"
              type="time"
              value={editableFields.hora}
              onChange={handleFieldChange}
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Profesional"
              name="profesional"
              value={editableFields.profesional}
              onChange={handleFieldChange}
              fullWidth
              margin="normal"
            />
          </>
        ) : (
          <>
            <Typography variant="body1"><strong>Fecha:</strong> {event.start.toLocaleDateString()}</Typography>
            <Typography variant="body1"><strong>Hora:</strong> {event.hora} hrs.</Typography>
            <Typography variant="body1"><strong>Profesional:</strong> {event.profesional}</Typography>
          </>
        )}
        <Typography variant="body1"><strong>Diagnóstico:</strong> {event.diagnostico}</Typography>
        <Typography variant="body1"><strong>N° Sesiones:</strong> {event.historial.length} </Typography>
        
        <Box position="fixed" bottom={0} right={0} width={window.innerWidth < 600 ? '100%' : 500} p={3}>
            {event.historial.length === 0 && !event.diagnostico ?  (
                <>
                    <Typography variant="body2" color="textSecondary" textAlign={'center'}>
                        Nota: Es la primera cita con este paciente
                    </Typography>
                    <Button variant="contained" color="primary" fullWidth onClick={handleOpenModal}>
                        Registrar Ficha
                    </Button>
                </>
            ) : (
                <Box display="flex" justifyContent="space-between">
                    <Button variant="contained" color="primary" fullWidth style={{ marginRight: '8px' }} onClick={handleOpenSesionModal}>
                        Agregar Sesión
                    </Button>
                    <Button variant="contained" color="secondary" fullWidth onClick={handleOpenHistorialModal}>
                        Ver historial
                    </Button>
                </Box>
            )}
        </Box>
        <AgregarPaciente open={openModal} onClose={handleCloseModal} data={event.paciente} fetchReservas={fetchReservas} />
        <AgregarSesion open={openSesionModal} close={onClose} onClose={handleCloseSesionModal} paciente={event.paciente} fetchReservas={fetchReservas} />
        <VerHistorial open={openHistorialModal} onClose={handleCloseHistorialModal} paciente={event.paciente} />
      </Box>
    </Slide>
  );
};

export default DespliegueEventos;