import React, { useState, useEffect } from 'react';
import {
  Box, Typography, IconButton, Slide, Button, TextField, Card, CardContent, CardHeader,
  FormControl, InputLabel, Select, MenuItem, Divider, Chip, Stack, Tooltip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { usePaciente } from '../../context/pacienteContext';
import { useAuth } from '../../context/authContext';
import { useReserva } from '../../context/reservaContext';
import { useAlert } from '../../context/AlertContext';
import AgregarPaciente from '../Modales/AgregarPaciente';
import AgregarSesion from './AgregarSesion';
import VerHistorial from './VerHistorial';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import sendWhatsAppMessage from '../../sendWhatsAppMessage';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ListAltIcon from '@mui/icons-material/ListAlt';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/es';
import ReactQuill from 'react-quill';
import '../ui/AgregarSesionCSS.css';
import MostrarImagenes from '../MostrarImagenes';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('es');

function getInitialDate(event) {
  // Si viene de PatientsPage, puede que event.start sea null o string
  if (event?.start instanceof Date) return dayjs(event.start).format('YYYY-MM-DD');
  if (event?.start) return dayjs(event.start).format('YYYY-MM-DD');
  if (event?.paciente?.siguienteCita) return dayjs(event.paciente.siguienteCita).format('YYYY-MM-DD');
  return '';
}
function getInitialHour(event) {
  if (event?.hora) return event.hora;
  if (event?.start instanceof Date) return dayjs(event.start).format('HH:mm');
  if (event?.paciente?.hora) return event.paciente.hora;
  return '';
}

const DespliegueEventos = ({ event, onClose, fetchReservas, gapi }) => {
  const { updatePaciente } = usePaciente();
  const { updateReserva } = useReserva();
  const showAlert = useAlert();
  const { user, obtenerHorasDisponibles } = useAuth();


  // Inicialización robusta de fecha y hora
  const [editSection, setEditSection] = useState(null);
  const [editableFields, setEditableFields] = useState({
    email: event?.paciente?.email || '',
    telefono: event?.paciente?.telefono || '',
    fecha: getInitialDate(event),
    hora: getInitialHour(event),
    profesional: event?.profesional || ''
  });

  const [openModal, setOpenModal] = useState(false);
  const [openSesionModal, setOpenSesionModal] = useState(false);
  const [openHistorialModal, setOpenHistorialModal] = useState(false);
  const [diasDeTrabajo, setDiasDeTrabajo] = useState([]);
  const [horasDisponibles, setHorasDisponibles] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [mensajePaciente, setMensajePaciente] = useState('');

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

  useEffect(() => {
    const fetchHorasDisponibles = async () => {
      if (user && editableFields.fecha) {
        const response = await obtenerHorasDisponibles(user.id || user._id, editableFields.fecha);
        const horas = response.times || [];
        setHorasDisponibles(horas);
      }
    };
    fetchHorasDisponibles();
  }, [user, editableFields.fecha, obtenerHorasDisponibles]);

  useEffect(() => {
    // Si cambia el evento (por ejemplo, desde PatientsPage), actualiza los campos editables
    setEditableFields({
      email: event?.paciente?.email || '',
      telefono: event?.paciente?.telefono || '',
      fecha: getInitialDate(event),
      hora: getInitialHour(event),
      profesional: event?.profesional || ''
    });
  }, [event]);

  if (!event) return null;

  const handleEditClick = (section) => setEditSection(section);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setEditableFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveClick = () => {
    if (editSection === 'cita' && user.idInstance) {
      setOpenDialog(true);
    } else {
      handleDialogClose(true);
    }
  };

  const handleDialogClose = async (confirm) => {
    if (confirm) {
      try {
        if (editSection === 'paciente') {
          if (editableFields.telefono) {
            if (editableFields.telefono[0] !== '9') {
              showAlert('error', 'El número de teléfono debe comenzar con 9');
              return;
            }
            if (editableFields.telefono.length !== 9) {
              showAlert('error', 'El número de teléfono debe tener 9 dígitos');
              return;
            }
            editableFields.telefono = '56' + editableFields.telefono;
          }
          await updatePaciente(event.paciente._id || event.paciente.id, {
            email: editableFields.email,
            telefono: editableFields.telefono,
          });
          event.paciente.email = editableFields.email;
          event.paciente.telefono = editableFields.telefono;
        } else if (editSection === 'cita') {
          await updateReserva(event.paciente.rut, {
            siguienteCita: new Date(editableFields.fecha),
            hora: editableFields.hora,
            profesional: editableFields.profesional,
            mensaje: mensajePaciente,
          });
          event.diaPrimeraCita = new Date(editableFields.fecha);
          event.hora = editableFields.hora;
          event.profesional = editableFields.profesional;

          if (mensajePaciente) {
            sendWhatsAppMessage([event], mensajePaciente, user);
          }

          if (gapi?.auth2?.getAuthInstance?.()?.isSignedIn.get()) {
            const calendar = gapi.client.calendar;
            const eventToUpdate = {
              start: {
                dateTime: new Date(editableFields.fecha + 'T' + editableFields.hora + ':00').toISOString(),
                timeZone: 'America/Santiago',
              },
              end: {
                dateTime: new Date(editableFields.fecha + 'T' + (parseInt(editableFields.hora.split(':')[0]) + 1) + ':' + editableFields.hora.split(':')[1] + ':00').toISOString(),
                timeZone: 'America/Santiago',
              },
              summary: `Cita con ${event.paciente.nombre}`,
              description: event.diagnostico,
            };
            calendar.events.update({
              calendarId: 'primary',
              eventId: event.paciente.eventId,
              resource: eventToUpdate,
            }).execute((response) => {
              if (response.error) {
                console.error('Error updating event: ', response.error);
              } else {
                console.log('Event updated: ', response);
              }
            });
          }
        }
        setEditSection(null);
        fetchReservas();
        showAlert('success', 'Cambios guardados correctamente');
      } catch (error) {
        console.error(error);
        showAlert('error', 'Error al guardar los cambios');
      }
    }
    setOpenDialog(false);
  };

  const handleCancelClick = () => {
    setEditableFields({
      email: event.paciente.email,
      telefono: event.paciente.telefono,
      fecha: getInitialDate(event),
      hora: getInitialHour(event),
      profesional: event.profesional
    });
    setEditSection(null);
  };

  // Modal handlers
  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);
  const handleOpenSesionModal = () => setOpenSesionModal(true);
  const handleCloseSesionModal = () => setOpenSesionModal(false);
  const handleOpenHistorialModal = () => setOpenHistorialModal(true);
  const handleCloseHistorialModal = () => setOpenHistorialModal(false);

  return (
    <Slide direction={window.innerWidth < 600 ? 'up' : 'right'} in={Boolean(event)} mountOnEnter unmountOnExit timeout={500}>
      <Box
        p={2}
        width={window.innerWidth < 600 ? '100%' : 500}
        maxHeight={window.innerWidth < 600 ? 800 : '100%'}
        sx={{
          overflowY: 'auto',
          background: 'linear-gradient(135deg, #f1f7fa 60%, #e3f2fd 100%)',
          borderRadius: 3,
          boxShadow: 4,
          position: 'relative'
        }}
      >
        {/* Encabezado */}
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          sx={{
            background: 'linear-gradient(90deg, #2596be 60%, #21cbe6 100%)',
            color: 'white',
            borderRadius: 2,
            px: 2,
            py: 1,
            mb: 2,
            boxShadow: 2
          }}
        >
          <CalendarTodayIcon sx={{ mr: 1 }} />
          <Typography variant="h6" fontWeight={700} flex={1}>
            Detalles de la Cita
          </Typography>
          <Tooltip title="Cerrar">
            <IconButton onClick={onClose} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Imágenes asociadas */}
        <Box mb={2}>
          <MostrarImagenes imagenes={event.imagenes} />
        </Box>

        {/* Modal mensaje paciente */}
        <Dialog open={openDialog} onClose={() => handleDialogClose(false)}>
          <DialogTitle>Mensaje para el Paciente</DialogTitle>
          <DialogContent>
            <TextField
              label="Escribe un mensaje"
              rows={4}
              fullWidth
              margin="normal"
              multiline
              name="mensajePaciente"
              value={mensajePaciente}
              onChange={(e) => setMensajePaciente(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => handleDialogClose(true)} variant="contained" color="primary">
              Confirmar
            </Button>
            <Button onClick={() => handleDialogClose(false)} variant="outlined" color="secondary">
              Cancelar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Datos del paciente */}
        <Card sx={{ mb: 2, border: '2px solid #e3f2fd', boxShadow: 1 }}>
          <CardHeader
            avatar={<PersonIcon sx={{color:'#2596be'}} />}
            title={<Typography variant="h6" fontWeight={600}>Datos del paciente</Typography>}
            action={
              editSection === 'paciente' ? (
                <Box display="flex" gap={1}>
                  <Tooltip title="Guardar">
                    <IconButton onClick={handleSaveClick} sx={{ bgcolor: '#82e0aa', color: 'black' }}>
                      <CheckIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cancelar">
                    <IconButton onClick={handleCancelClick} sx={{ bgcolor: '#f1948a', color: 'black' }}>
                      <CloseIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              ) : (
                <Tooltip title="Editar datos del paciente">
                  <IconButton onClick={() => handleEditClick('paciente')}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              )
            }
            sx={{ pb: 0 }}
          />
          <CardContent sx={{ pt: 1 }}>
            <Stack spacing={1}>
              <Typography variant="body1"><strong>Nombre:</strong> {event.paciente.nombre}</Typography>
              <Box display="flex" gap={2}>
                <Typography variant="body1"><strong>Rut:</strong> {event.paciente.rut}</Typography>
                <Typography variant="body1"><strong>Celular:</strong> {event.paciente.telefono}</Typography>
              </Box>
              {editSection === 'paciente' ? (
                <>
                  <TextField
                    label="Celular (Ej: 912345678)"
                    name="telefono"
                    value={editableFields.telefono}
                    onChange={handleFieldChange}
                    fullWidth
                    margin="dense"
                  />
                  <TextField
                    label="E-mail"
                    name="email"
                    value={editableFields.email}
                    onChange={handleFieldChange}
                    fullWidth
                    margin="dense"
                  />
                </>
              ) : (
                <Typography variant="body1"><strong>E-mail:</strong> {event.paciente.email}</Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Detalles de la cita */}
        <Card sx={{ mb: 2, border: '2px solid #e3f2fd', boxShadow: 1 }}>
          <CardHeader
            avatar={<ManageAccountsIcon sx={{color:'#2596be'}} />}
            title={<Typography variant="h6" fontWeight={600}>Detalles de la cita</Typography>}
            action={
              editSection === 'cita' ? (
                <Box display="flex" gap={1}>
                  <Tooltip title="Guardar">
                    <IconButton onClick={handleSaveClick} sx={{ bgcolor: '#82e0aa', color: 'black' }}>
                      <CheckIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cancelar">
                    <IconButton onClick={handleCancelClick} sx={{ bgcolor: '#f1948a', color: 'black' }}>
                      <CloseIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              ) : (
                <Tooltip title="Editar cita">
                  <IconButton onClick={() => handleEditClick('cita')}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              )
            }
            sx={{ pb: 0 }}
          />
          <CardContent sx={{ pt: 1 }}>
            {editSection === 'cita' ? (
              <Stack spacing={2}>
                <DatePicker
                  label="Fecha de Cita"
                  value={editableFields.fecha ? dayjs(editableFields.fecha) : null}
                  onChange={(newValue) => {
                    setEditableFields({ ...editableFields, fecha: newValue ? newValue.format('YYYY-MM-DD') : '' });
                  }}
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
                  renderInput={(params) => <TextField {...params} fullWidth margin="dense" required />}
                />
                <FormControl fullWidth margin="dense">
                  <InputLabel>Hora de Cita</InputLabel>
                  <Select
                    name="hora"
                    value={editableFields.hora}
                    onChange={handleFieldChange}
                  >
                    {horasDisponibles.map((hora) => (
                      <MenuItem key={hora} value={hora}>{hora}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            ) : (
              <Stack spacing={1}>
                <Box display="flex" gap={2}>
                  <Typography variant="body1"><strong>Fecha:</strong> {event.start ? dayjs(event.start).format('DD/MM/YYYY') : ''}</Typography>
                  <Typography variant="body1"><strong>Hora:</strong> {getInitialHour(event)} hrs.</Typography>
                </Box>
                <Typography variant="body1"><strong>Profesional:</strong> {event.profesional.username}</Typography>
              </Stack>
            )}
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip icon={<HistoryEduIcon />} label={`N° Sesiones: ${event.historial.length}`} color="primary" variant="outlined" />
              <Chip label={event.diagnostico || "Primera cita del paciente"} color={event.diagnostico ? "success" : "warning"} variant="outlined" />
            </Stack>
          </CardContent>
        </Card>

        {/* Anamnesis */}
        <Card sx={{ mb: 2, border: '2px solid #e3f2fd', boxShadow: 1 }}>
          <CardHeader
            avatar={<ListAltIcon sx={{color:'#2596be'}} />}
            title={<Typography variant="h6" fontWeight={600}>Anamnesis</Typography>}
            sx={{ pb: 0 }}
          />
          <CardContent sx={{ pt: 1 }}>
            <Box
              sx={{
                background: '#f8fafd',
                borderRadius: 2,
                minHeight: 120,
                boxShadow: '0 0 5px 0 rgba(0,0,0,0.05)',
                p: 1
              }}
            >
              <ReactQuill value={event.anamnesis} readOnly theme="bubble" />
            </Box>
          </CardContent>
        </Card>

        {/* Acciones flotantes */}
        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            width: '100%',
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 2,
            boxShadow: 3,
            mt: 2,
            p: 2,
            zIndex: 10
          }}
        >
          {event.historial.length === 0 && !event.diagnostico ? (
            <Stack spacing={1} alignItems="center">
              <Typography variant="body2" color="textSecondary">
                Nota: Es la primera cita con este paciente
              </Typography>
              <Button
                variant="contained"
                fullWidth
                startIcon={<AddCircleOutlineIcon />}
                onClick={handleOpenModal}
                sx={{ fontWeight: 600, backgroundColor: '#2596be', color: 'white' }}
              >
                Registrar Ficha
              </Button>
            </Stack>
          ) : (
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<AddCircleOutlineIcon />}
                onClick={handleOpenSesionModal}
                sx={{ fontWeight: 600, backgroundColor: '#2596be', color: 'white'  }}
              >
                Agregar Sesión
              </Button>
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                startIcon={<HistoryEduIcon />}
                onClick={handleOpenHistorialModal}
                sx={{ fontWeight: 600 }}
              >
                Ver historial
              </Button>
            </Stack>
          )}
        </Box>

        {/* Modales */}
        <AgregarPaciente open={openModal} onClose={handleCloseModal} data={event.paciente} fetchReservas={fetchReservas} />
        <AgregarSesion open={openSesionModal} close={onClose} onClose={handleCloseSesionModal} paciente={event.paciente} fetchReservas={fetchReservas} gapi={gapi} />
        <VerHistorial open={openHistorialModal} onClose={handleCloseHistorialModal} paciente={event.paciente} />
      </Box>
    </Slide>
  );
};

export default DespliegueEventos;