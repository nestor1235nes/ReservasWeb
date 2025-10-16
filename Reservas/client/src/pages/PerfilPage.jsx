import React, { useState, useRef } from "react";
import {
  Modal, Box, Card, CardContent, CardHeader, Typography, Tabs, Tab, Button, Stack, TextField, Select, MenuItem, InputLabel, FormControl, Checkbox, FormControlLabel, Paper, Divider, Chip, Switch as MuiSwitch, IconButton
} from "@mui/material";
import { useAuth } from "../context/authContext";
import { useSucursal } from "../context/sucursalContext";
import FotoPerfil from "../components/FotoPerfil";
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import PlaceIcon from '@mui/icons-material/Place';
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ScheduleIcon from "@mui/icons-material/Schedule";
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Tooltip from '@mui/material/Tooltip';
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import ModalPerfilProfesional from '../components/Surcursales/ModalPerfilProfesional';
import PreviewIcon from '@mui/icons-material/Preview';
import SincronizacionCalendarios from '../components/Modales/SincronizacionCalendarios';
import ModalServicio from '../components/Modales/ModalServicio';
import MensajesAutomaticos from "../components/MensajesAutomaticos";

const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const intervals = [10, 15, 30, 60];
const especialidades = [
  "Medicina General", "Cardiología", "Dermatología", "Neurología", "Pediatría"
];

// Normaliza los bloques de horario para asegurar que todos los campos existen
const normalizeTimetable = (timetable) =>
  (timetable || []).map(t => ({
    days: t.days || [],
    times: t.times || [],
    fromTime: t.fromTime || "",
    toTime: t.toTime || "",
    interval: t.interval || 30,
    breakFrom: t.breakFrom || "",
    breakTo: t.breakTo || ""
  }));

// Componente visual para cada bloque de horario
const ScheduleBlock = ({ schedule, index, isEditing, onEdit, onDelete }) => {
  const formatDays = (days) => {
    if (!days || days.length === 0) return "Sin días configurados";
    return days.join(", ");
  };
  const formatTimeRange = (fromTime, toTime, breakFrom, breakTo) => {
    let timeStr = `${fromTime || "--:--"} - ${toTime || "--:--"}`;
    if (breakFrom && breakTo) {
      timeStr += ` (Descanso: ${breakFrom} - ${breakTo})`;
    }
    return timeStr;
  };
  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        border: "2px solid #e3f2fd",
        "&:hover": {
          boxShadow: 3,
          borderColor: "#2596be",
        },
        transition: "all 0.3s ease",
      }}
    >
      <CardContent sx={{ pb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <ScheduleIcon sx={{color:'#2596be'}} />
            <Typography variant="h6" fontWeight={600}>
              Bloque de Horario {index + 1}
            </Typography>
          </Box>
          {!isEditing && (
            <Box display="flex" gap={1}>
              <IconButton size="small" onClick={() => onEdit(index)} sx={{ color: "#1976d2" }}>
                <EditIcon />
              </IconButton>
              <IconButton size="small" onClick={() => onDelete(index)} sx={{ color: "#d32f2f" }}>
                <DeleteIcon />
              </IconButton>
            </Box>
          )}
        </Box>
        <Box display="flex" flexWrap="wrap" gap={3}>
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <CalendarTodayIcon fontSize="small" color="action" />
              <Typography variant="body2" color="textSecondary">
                Días de atención:
              </Typography>
            </Box>
            <Typography variant="body1" fontWeight={500}>
              {formatDays(schedule.days)}
            </Typography>
          </Box>
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <AccessTimeIcon fontSize="small" color="action" />
              <Typography variant="body2" color="textSecondary">
                Horario:
              </Typography>
            </Box>
            <Typography variant="body1" fontWeight={500}>
              {formatTimeRange(schedule.fromTime, schedule.toTime, schedule.breakFrom, schedule.breakTo)}
            </Typography>
          </Box>
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <ScheduleIcon fontSize="small" color="action" />
              <Typography variant="body2" color="textSecondary">
                Intervalo entre citas:
              </Typography>
            </Box>
            <Chip label={`${schedule.interval || 30} minutos`} size="small" color="primary" variant="outlined" />
          </Box>
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="body2" color="textSecondary">
                Citas disponibles:
              </Typography>
            </Box>
            <Chip
              label={`${schedule.times ? schedule.times.length : 0} horarios`}
              size="small"
              color="success"
              variant="outlined"
            />
          </Box>
        </Box>
        {schedule.times && schedule.times.length > 0 && (
          <Box mt={2}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Horarios específicos disponibles:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {schedule.times.slice(0, 20).map((time, idx) => (
                <Chip key={idx} label={time} size="small" variant="outlined" />
              ))}
              {schedule.times.length > 20 && (
                <Chip label={`+${schedule.times.length - 20} más`} size="small" color="primary" />
              )}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Editor visual para cada bloque de horario
const ScheduleEditor = ({ schedule, index, onChange, onSave, onCancel }) => {
  const handleChange = (field, value) => {
    onChange(index, field, value);
  };
  const handleDayToggle = (day) => {
    const currentDays = schedule.days || [];
    const newDays = currentDays.includes(day) ? currentDays.filter((d) => d !== day) : [...currentDays, day];
    handleChange("days", newDays);
  };
  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        border: "2px solid #4caf50",
        backgroundColor: "#f8fff8",
      }}
    >
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <EditIcon color="primary" />
            <Typography variant="h6">Editando Bloque {index + 1}</Typography>
          </Box>
        }
        action={
          <Box display="flex" gap={1}>
            <Button variant="contained" color="primary" size="small" startIcon={<SaveIcon />} onClick={onSave}>
              Guardar
            </Button>
            <Button variant="outlined" color="secondary" size="small" startIcon={<CancelIcon />} onClick={onCancel}>
              Cancelar
            </Button>
          </Box>
        }
      />
      <CardContent>
        <Stack direction="row" spacing={3} flexWrap="wrap">
          <Box minWidth={220} flex={1}>
            <Typography variant="subtitle1" gutterBottom fontWeight={600}>
              Horarios de Atención
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Hora de inicio"
                name="fromTime"
                type="time"
                value={schedule.fromTime || ""}
                onChange={(e) => handleChange("fromTime", e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Hora de fin"
                name="toTime"
                type="time"
                value={schedule.toTime || ""}
                onChange={(e) => handleChange("toTime", e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <FormControl fullWidth>
                <InputLabel>Intervalo entre citas</InputLabel>
                <Select value={schedule.interval || 30} onChange={(e) => handleChange("interval", e.target.value)}>
                  {intervals.map((interval) => (
                    <MenuItem key={interval} value={interval}>
                      {interval} minutos
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Box>
          <Box minWidth={220} flex={1}>
            <Typography variant="subtitle1" gutterBottom fontWeight={600}>
              Horario de Descanso (Opcional)
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Inicio del descanso"
                name="breakFrom"
                type="time"
                value={schedule.breakFrom || ""}
                onChange={(e) => handleChange("breakFrom", e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Fin del descanso"
                name="breakTo"
                type="time"
                value={schedule.breakTo || ""}
                onChange={(e) => handleChange("breakTo", e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </Box>
          <Box minWidth={220} flex={2}>
            <Typography variant="subtitle1" gutterBottom fontWeight={600}>
              Días de Atención
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {daysOfWeek.map((day) => (
                <FormControlLabel
                  key={day}
                  control={
                    <Checkbox
                      checked={(schedule.days || []).includes(day)}
                      onChange={() => handleDayToggle(day)}
                      color="primary"
                    />
                  }
                  label={day}
                  sx={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 1,
                    px: 1,
                    mr: 0,
                    backgroundColor: (schedule.days || []).includes(day) ? "#e3f2fd" : "white",
                  }}
                />
              ))}
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export function PerfilPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user, updatePerfil, deleteBloqueHorario, esAdminSucursal, esAsistente, deleteServicio } = useAuth();
  const [tab, setTab] = useState(0);
  const [editProfileMode, setEditProfileMode] = useState(false);
  const [editingScheduleIndex, setEditingScheduleIndex] = useState(null);
  const { agregarProfesional, quitarProfesional } = useSucursal();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSyncOpen, setModalSyncOpen] = useState(false);
  const [modalServicioOpen, setModalServicioOpen] = useState(false);
  const [servicioEditing, setServicioEditing] = useState(null);
  const [servicioEditingIndex, setServicioEditingIndex] = useState(null);
  const fotoPerfilRef = useRef(null);


  const handleOpenPerfil = (profesional) => {
    setProfesionalSeleccionado(profesional);
    setModalOpen(true);
  };


  // Estado inicial normalizado
  const [formData, setFormData] = useState({
    username: user.username || "",
    celular: user.celular || "",
    descripcion: user.descripcion || "",
    especialidad: user.especialidad || "",
    especialidad_principal: user.especialidad_principal || "",
    experiencia: user.experiencia || "",
    cita_presencial: user.cita_presencial || false,
    cita_virtual: user.cita_virtual || false,
    email: user.email || "",
    timetable: normalizeTimetable(user.timetable),
    adminAtiendePersonas: user.adminAtiendePersonas || false,
    // Campos WhatsApp / Green API
    idInstance: user.idInstance || "",
    apiTokenInstance: user.apiTokenInstance || "",
    defaultMessage: user.defaultMessage || "",
    reminderMessage: user.reminderMessage || ""
  });

  // Handlers
  const handleEditProfileClick = () => setEditProfileMode(true);
  const handleSaveProfileClick = async () => {
    // Detecta si cambió el valor del switch
    const prevValue = user.adminAtiendePersonas || false;
    const newValue = formData.adminAtiendePersonas || false;

    // Nota: Se eliminó la validación que exigía idInstance/apiTokenInstance para permitir guardar sin credenciales

    await updatePerfil(user.id || user._id, formData);

    // Solo si es admin y cambió el valor, actualiza la sucursal
    if (esAdminSucursal && user.sucursal && user.id && prevValue !== newValue) {
      if (newValue) {
        await agregarProfesional(user.sucursal._id, user.id);
      } else {
        await quitarProfesional(user.sucursal._id, user.id);
      }
    }

    setEditProfileMode(false);
  };
  const handleCancelProfileClick = () => {
    setFormData({
      username: user.username || "",
      celular: user.celular || "",
      descripcion: user.descripcion || "",
      especialidad: user.especialidad || "",
      especialidad_principal: user.especialidad_principal || "",
      experiencia: user.experiencia || "",
      cita_presencial: user.cita_presencial || false,
      cita_virtual: user.cita_virtual || false,
      email: user.email || "",
      timetable: normalizeTimetable(user.timetable),
      adminAtiendePersonas: user.adminAtiendePersonas || false,
      idInstance: user.idInstance || "",
      apiTokenInstance: user.apiTokenInstance || "",
      defaultMessage: user.defaultMessage || "",
      reminderMessage: user.reminderMessage || ""
    });
    setEditProfileMode(false);
  };

  // Horarios
  const handleAddSchedule = () => {
    setFormData({
      ...formData,
      timetable: [
        ...formData.timetable,
        { fromTime: "", toTime: "", days: [], interval: 30, breakFrom: "", breakTo: "", times: [] }
      ]
    });
    setEditingScheduleIndex(formData.timetable.length);
  };

  // Servicios
  const handleAddServicio = () => {
    setServicioEditing(null);
    setServicioEditingIndex(null);
    setModalServicioOpen(true);
  };

  const handleEditServicio = (servicio, index) => {
    setServicioEditing(servicio);
    setServicioEditingIndex(index);
    setModalServicioOpen(true);
  };

  const handleDeleteServicio = async (index) => {
    try {
      await deleteServicio(index);
    } catch (error) {
      console.error('Error al eliminar servicio:', error);
    }
  };

  const handleCloseModalServicio = () => {
    setModalServicioOpen(false);
    setServicioEditing(null);
    setServicioEditingIndex(null);
  };

  // Horarios
  const handleEditSchedule = (index) => setEditingScheduleIndex(index);
  const handleDeleteSchedule = async (index) => {
    await deleteBloqueHorario(user.id || user._id, index);
    setFormData((prev) => ({
      ...prev,
      timetable: prev.timetable.filter((_, i) => i !== index)
    }));
  };
  const handleScheduleChange = (index, field, value) => {
      const newTimetable = [...formData.timetable];
      newTimetable[index][field] = value;
      setFormData({ ...formData, timetable: newTimetable });
    };
    const handleSaveSchedule = async () => {
    const updatedTimetable = formData.timetable.map((time) => {
      // Solo genera times si todos los campos requeridos están presentes
      const {
        fromTime = "",
        toTime = "",
        breakFrom = "",
        breakTo = "",
        interval = 30,
        days = [],
      } = time;

      
      let times = [];
      if (fromTime && toTime && interval && fromTime !== toTime) {
        
        times = generateTimes(fromTime, toTime, breakFrom, breakTo, interval);
      }

      return { ...time, fromTime, toTime, breakFrom, breakTo, interval, days, times };
    });
    setFormData({
      ...formData,
      timetable: updatedTimetable,
    });

    await updatePerfil(user.id || user._id, { ...formData, timetable: updatedTimetable });
    setEditingScheduleIndex(null);
  };
  const handleCancelScheduleEdit = () => {
    setEditingScheduleIndex(null);
    setFormData({
      ...formData,
      timetable: normalizeTimetable(user.timetable)
    });
  };

  const generateTimes = (fromTime, toTime, breakFrom, breakTo, interval) => {
    if (!fromTime || !toTime || !interval) return [];
    const times = [];
    let currentTime = fromTime;
    while (currentTime < toTime) {
      if (breakFrom && breakTo && currentTime >= breakFrom && currentTime < breakTo) {
        currentTime = breakTo;
      } else {
        times.push(currentTime);
        currentTime = addMinutes(currentTime, interval);
      }
    }
    return times;
  };
  const addMinutes = (time, minutes) => {
    const [hours, mins] = time.split(":").map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
    const newMinutes = (totalMinutes % 60).toString().padStart(2, "0");
    return `${newHours}:${newMinutes}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  if (!user) return <Typography>Cargando perfil...</Typography>;

  return (
    <Box
      maxWidth={"100%"}
      px={{ xs: 1, sm: 2 }}
      py={{ xs: 1, sm: 2 }}
      sx={{
        overflowX: "hidden",
        maxWidth: '100vw',
        boxSizing: 'border-box',
      }}
    >
      <Stack
        direction={isMobile ? "column" : "row"}
        justifyContent="space-between"
        alignItems={isMobile ? "stretch" : "center"}
        spacing={2}
        p={2}
        borderRadius={1}
        mb={2}
        sx={{
          background: "linear-gradient(45deg, #2596be 30%, #21cbe6 90%)",
          color: "white",
          boxShadow: 3,
        }}
      >
        <Typography variant={isMobile ? "h6" : "h5"} fontWeight={700} color="white">
          {esAsistente ? "Mi Perfil Personal" : "Mi Perfil Profesional"}
        </Typography>
  <Box display="flex" gap={1} flexWrap="wrap" sx={{ '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } } }}>
          {!esAsistente && (
            <Button startIcon={<PreviewIcon />} variant="contained" sx={{ background: 'white', color: '#2596be' }} onClick={() => setModalOpen(true)}>
              Vista previa
            </Button>
          )}
          {editProfileMode ? (
            <>
              <Button
                variant="contained"
                color="success"
                onClick={handleSaveProfileClick}
                sx={{ mr: 1, background: "#2ecc71", color: "white" }}
              >
                Guardar cambios
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleCancelProfileClick}
                sx={{ background: "#e74c3c", color: "white" }}
              >
                Cancelar
              </Button>
            </>
          ) : (
            (esAsistente ? tab === 0 : (tab === 0 || tab === 1)) && (
              <Button
                variant="contained"
                startIcon={<ManageAccountsIcon />}
                onClick={handleEditProfileClick}
                sx={{ background: "white", color: "#2596be" }}
              >
                Configurar perfil
              </Button>
            )
          )}
        </Box>
      </Stack>
      <Box
        sx={{
          minWidth: isMobile ? "100%" : "100%",
          display: 'flex',
          justifyContent: 'center',
          mt: -2,
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #e0e0e0',
          mb: 0,
          overflowX: 'auto'
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : false}
          aria-label="tabs"
          sx={{ width: '100%', maxWidth: '100%' }}
        >
          <Tab label="Información Personal" />
          {!esAsistente && <Tab label="Información Profesional" />}
          {!esAsistente && <Tab label="Horarios" />}
          {!esAsistente && <Tab label="Servicios" />}
          <Tab label="Mensajes" />
        </Tabs>
      </Box>

      {/* Información Personal */}
      {tab === 0 && (
  <Box display="flex" flexDirection={isMobile ? "column" : "row"} gap={2} flexWrap="wrap" mt={2}>
          <Card 
            sx={{ 
              flex: 1, 
              width: isMobile ? "100%" : 400, 
              mb: isMobile ? 2 : 0,
              border: "2px solid #e3f2fd",
              "&:hover": {
                boxShadow: 3,
                borderColor: "#2596be",
              }, }}>
            <CardHeader title="Foto de Perfil" subheader={esAsistente ? "Tu imagen de perfil personal" : "Esta imagen será visible para tus pacientes"} />
            <CardContent sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Box mb={2}>
                <FotoPerfil ref={fotoPerfilRef} size={isMobile ? 120 : 160} />
              </Box>
              <Button variant="outlined" fullWidth onClick={() => fotoPerfilRef.current?.openFileDialog?.()}>
                Cambiar foto
              </Button>
            </CardContent>
          </Card>
          <Card 
            sx={{ 
              flex: 2,
              width: '100%',
              border: "2px solid #e3f2fd",
              "&:hover": {
                boxShadow: 3,
                borderColor: "#2596be",
              },
            }}>
            <CardHeader title="Datos Personales" subheader="Información básica de contacto" />
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  label="Nombre"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  fullWidth
                  disabled={!editProfileMode}
                />
                <TextField
                  label="Celular"
                  name="celular"
                  value={formData.celular}
                  onChange={handleChange}
                  fullWidth
                  disabled={!editProfileMode}
                />
                <TextField
                  label="Correo electrónico"
                  name="email"
                  value={user.email}
                  onChange={handleChange}
                  fullWidth
                  disabled
                />
              </Stack>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Información Profesional */}
      {!esAsistente && tab === 1 && (
  <Box display="flex" flexDirection={isMobile ? "column" : "row"} gap={2} flexWrap="wrap" mt={2}>
          <Card 
          sx={{ flex: 1,
           width: isMobile ? "100%" : "auto", 
           mb: isMobile ? 2 : 0,
           border: "2px solid #e3f2fd",
            "&:hover": {
              boxShadow: 3,
              borderColor: "#2596be",
            },
           }}>
            <CardHeader title="Información Profesional" subheader="Detalles sobre tu especialidad y experiencia" />
            <CardContent>
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <TextField
                    label="Título Profesional"
                    name="especialidad"
                    value={formData.especialidad}
                    onChange={handleChange}
                    disabled={!editProfileMode}
                  >
                    {especialidades.map((esp) => (
                      <MenuItem key={esp} value={esp}>{esp}</MenuItem>
                    ))}
                  </TextField>
                </FormControl>
                <FormControl fullWidth>
                  <TextField
                    label="Especialidad"
                    name="especialidad_principal"
                    value={formData.especialidad_principal}
                    onChange={handleChange}
                    disabled={!editProfileMode}
                  >
                    {especialidades.map((esp) => (
                      <MenuItem key={esp} value={esp}>{esp}</MenuItem>
                    ))}
                  </TextField>
                </FormControl>
                <FormControl fullWidth>
                  <TextField
                    label="Años de experiencia"
                    name="experiencia"
                    value={formData.experiencia}
                    onChange={handleChange}
                    type="number"
                    disabled={!editProfileMode}
                  />
                </FormControl>
              </Stack>
              {esAdminSucursal && (
                <FormControlLabel
                  control={
                    <MuiSwitch
                      checked={!!formData.adminAtiendePersonas}
                      onChange={e =>
                        setFormData({ ...formData, adminAtiendePersonas: e.target.checked })
                      }
                      disabled={!editProfileMode}
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center">
                      Como administrador atenderé personas
                      <Tooltip title="Se sugiere actualizar la página si cambias este parámetro y necesitas volver a cambiarlo" arrow>
                        <HelpOutlineIcon fontSize="small" sx={{ ml: 1, color: 'grey.600', cursor: 'pointer' }} />
                      </Tooltip>
                    </Box>
                  }
                />
              )}
            </CardContent>
          </Card>
          <Card 
          sx={{ flex: 1, 
            width: '100%',
            border: "2px solid #e3f2fd",
            "&:hover": {
              boxShadow: 3,
              borderColor: "#2596be",
            }, }}>
            <CardHeader title="Biografía Profesional" subheader="Esta información será visible en tu perfil público" />
            <CardContent>
              <TextField
                label="Biografía"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                fullWidth
                multiline
                minRows={6}
                disabled={!editProfileMode}
              />
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>Modalidades de atención</Typography>
              <FormControlLabel
                control={
                  <MuiSwitch
                    checked={!!formData.cita_presencial}
                    onChange={e =>
                      setFormData({ ...formData, cita_presencial: e.target.checked })
                    }
                    disabled={!editProfileMode}
                  />
                }
                label={<><PlaceIcon sx={{ mr: 1 }} />Presencial</>}
              />
              <FormControlLabel
                control={
                  <MuiSwitch
                    checked={!!formData.cita_virtual}
                    onChange={e =>
                      setFormData({ ...formData, cita_virtual: e.target.checked })
                    }
                    disabled={!editProfileMode}
                  />
                }
                label={<><VideoCameraFrontIcon sx={{ mr: 1 }} />Telemedicina</>}
              />
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Horarios */}
      {/* Horarios */}
      {!esAsistente && tab === 2 && (
        <Box mt={2}>
          <Card sx={{ mb: 3 }}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <EditCalendarIcon sx={{color:'#2596be'}} />
                  <Typography variant="h5" fontWeight={600}>
                    Gestión de Horarios de Atención
                  </Typography>
                </Box>
              }
              subheader="Configura tus bloques de horarios de atención. Puedes tener múltiples bloques con diferentes configuraciones."
              action={
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddSchedule}
                  sx={{
                    background: "#2596be",
                    color: "white",
                  }}
                >
                  Agregar Horario
                </Button>
              }
            />
          </Card>
          {formData.timetable.length === 0 ? (
            <Card sx={{ textAlign: "center", py: 6 }}>
              <CardContent>
                <EditCalendarIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No tienes horarios configurados
                </Typography>
                <Typography variant="body2" color="textSecondary" mb={3}>
                  Agrega tu primer bloque de horarios para que los pacientes puedan agendar citas contigo.
                </Typography>
                <Button variant="contained" sx={{backgroundColor:'#2596be', color:'white'}} startIcon={<AddIcon />} onClick={handleAddSchedule} size="large">
                  Crear Primer Horario
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Box>
              {formData.timetable.map((schedule, index) => (
                <Box key={index}>
                  {editingScheduleIndex === index ? (
                    <ScheduleEditor
                      schedule={schedule}
                      index={index}
                      onChange={handleScheduleChange}
                      onSave={handleSaveSchedule}
                      onCancel={handleCancelScheduleEdit}
                    />
                  ) : (
                    <ScheduleBlock
                      schedule={schedule}
                      index={index}
                      isEditing={editingScheduleIndex !== null}
                      onEdit={handleEditSchedule}
                      onDelete={handleDeleteSchedule}
                    />
                  )}
                </Box>
              ))}
            </Box>
          )}
          {/* Resumen de horarios */}
          {formData.timetable.length > 0 && (
            <Card sx={{ mt: 3, background: "linear-gradient(45deg, #2596be 30%, #21cbe6 90%)", overflow: 'hidden' }}>
              <CardContent>
                <Typography variant="h6" color="white" gutterBottom>
                  📊 Resumen de Disponibilidad
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={{ xs: 2, sm: 4 }}>
                  <Box textAlign="center" flex={1} sx={{ minWidth: 0 }}>
                    <Typography variant="h4" color="white" fontWeight="bold">
                      {formData.timetable.length}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Bloques de horario
                    </Typography>
                  </Box>
                  <Box textAlign="center" flex={1} sx={{ minWidth: 0 }}>
                    <Typography variant="h4" color="white" fontWeight="bold">
                      {formData.timetable.reduce(
                        (total, schedule) => total + (schedule.times ? schedule.times.length : 0),
                        0,
                      )}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Total de horas disponibles
                    </Typography>
                  </Box>
                  <Box textAlign="center" flex={1} sx={{ minWidth: 0 }}>
                    <Typography variant="h4" color="white" fontWeight="bold">
                      {[...new Set(formData.timetable.flatMap((s) => s.days || []))].length}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Días únicos de atención
                    </Typography>
                  </Box>
                  <Box textAlign="center" flex={1} sx={{ minWidth: 0 }}>
                    <Typography variant="h4" color="white" fontWeight="bold">
                      {formData.timetable.length > 0
                        ? Math.min(...formData.timetable.map((s) => s.interval || 30))
                        : 0}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Min. intervalo (min)
                    </Typography>
                  </Box>
                </Box>
                <Tooltip title="Sincroniza tu calendario con calendarios externos como Google Calendar o ICalendar" arrow>
                  <Box mt={3} display="flex" justifyContent="center" gap={2}>
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<CalendarTodayIcon />}
                        onClick={() => setModalSyncOpen(true)}
                      >
                        Sincronizar con calendarios externos
                      </Button>
                  </Box>
                </Tooltip>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Servicios */}
      {!esAsistente && tab === 3 && (
        <Box mt={2}>
          <Card sx={{ mb: 3 }}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <EditIcon sx={{color:'#2596be'}} />
                  <Typography variant="h5" fontWeight={600}>
                    Gestión de Servicios y Tarifas
                  </Typography>
                </Box>
              }
              subheader="Define los servicios que ofreces, sus precios y modalidades de atención para que los pacientes conozcan tu oferta."
              action={
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  onClick={handleAddServicio}
                  sx={{
                    background: "#2596be",
                    color: "white",
                  }}
                >
                  Agregar Servicio
                </Button>
              }
            />
          </Card>
          
          {user.servicios && user.servicios.length === 0 ? (
            <Card sx={{ textAlign: "center", py: 6 }}>
              <CardContent>
                <EditIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No tienes servicios configurados
                </Typography>
                <Typography variant="body2" color="textSecondary" mb={3}>
                  Agrega los servicios que ofreces para que los pacientes puedan conocer tus tarifas y modalidades de atención.
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />} 
                  onClick={handleAddServicio} 
                  size="large"
                  sx={{backgroundColor:'#2596be', color:'white'}}
                >
                  Crear Primer Servicio
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Box>
              {user.servicios.map((servicio, index) => (
                <Card 
                  key={index} 
                  variant="outlined" 
                  sx={{ 
                    mb: 2,
                    border: "2px solid #e3f2fd",
                    "&:hover": {
                      boxShadow: 3,
                      borderColor: "#2596be",
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  <CardContent sx={{ pb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <EditIcon sx={{color:'#2596be'}} />
                        <Typography variant="h6" fontWeight={600}>
                          {servicio.tipo}
                        </Typography>
                      </Box>
                      <Box display="flex" gap={1}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditServicio(servicio, index)} 
                          sx={{ color: "#1976d2" }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteServicio(index)} 
                          sx={{ color: "#d32f2f" }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    {servicio.descripcion && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {servicio.descripcion}
                      </Typography>
                    )}
                    
                    <Box display="flex" flexWrap="wrap" gap={3}>
                      <Box>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <AccessTimeIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="textSecondary">
                            Duración:
                          </Typography>
                        </Box>
                        <Chip label={servicio.duracion} size="small" color="primary" variant="outlined" />
                      </Box>
                      
                      <Box>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="body2" color="textSecondary">
                            💰 Precio:
                          </Typography>
                        </Box>
                        <Chip label={`$${servicio.precio}`} size="small" color="success" variant="outlined" />
                      </Box>
                      
                      <Box>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="body2" color="textSecondary">
                            Modalidad:
                          </Typography>
                        </Box>
                        <Chip 
                          icon={
                            servicio.modalidad.includes('Presencial') && servicio.modalidad.includes('Telemedicina') 
                              ? <EditIcon /> 
                              : servicio.modalidad.includes('Presencial') 
                                ? <PlaceIcon /> 
                                : <VideoCameraFrontIcon />
                          } 
                          label={servicio.modalidad} 
                          size="small" 
                          color="secondary" 
                          variant="outlined" 
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
          
          {/* Resumen de servicios */}
          {user.servicios && user.servicios.length > 0 && (
            <Card sx={{ mt: 3, background: "linear-gradient(45deg, #2596be 30%, #21cbe6 90%)", overflow: 'hidden' }}>
              <CardContent>
                <Typography variant="h6" color="white" gutterBottom>
                  📋 Resumen de Servicios
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={{ xs: 2, sm: 4 }}>
                  <Box textAlign="center" flex={1} sx={{ minWidth: 0 }}>
                    <Typography variant="h4" color="white" fontWeight="bold">
                      {user.servicios.length}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Servicios disponibles
                    </Typography>
                  </Box>
                  <Box textAlign="center" flex={1} sx={{ minWidth: 0 }}>
                    <Typography variant="h4" color="white" fontWeight="bold">
                      ${Math.min(...user.servicios.map(s => parseInt(s.precio) || 0)).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Precio mínimo
                    </Typography>
                  </Box>
                  <Box textAlign="center" flex={1} sx={{ minWidth: 0 }}>
                    <Typography variant="h4" color="white" fontWeight="bold">
                      {[...new Set(user.servicios.map(s => s.modalidad))].length}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Modalidades únicas
                    </Typography>
                  </Box>
                  <Box textAlign="center" flex={1} sx={{ minWidth: 0 }}>
                    <Typography variant="h4" color="white" fontWeight="bold">
                      {Math.round(user.servicios.reduce((acc, s) => {
                        const minutes = parseInt(s.duracion.match(/\d+/)?.[0]) || 60;
                        return acc + minutes;
                      }, 0) / user.servicios.length)}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Duración promedio (min)
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {!esAsistente && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          aria-labelledby="modal-perfil-profesional"
          aria-describedby="modal-detalle-profesional"
        >
          <Box>
            <ModalPerfilProfesional
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              profesional={user}
            />
          </Box>
        </Modal>
      )}

      {!esAsistente && (
        <SincronizacionCalendarios
          open={modalSyncOpen}
          onClose={() => setModalSyncOpen(false)}
          user={user}
        />
      )}

      {/* Mensajes Automáticos */}
      {!esAsistente && tab === 4 && (
        <MensajesAutomaticos
          formData={formData}
          onChange={handleChange}
          editProfileMode={editProfileMode}
          isMobile={isMobile}
        />
      )}

      {/* Modal de Servicios */}
      <ModalServicio
        open={modalServicioOpen}
        onClose={handleCloseModalServicio}
        servicio={servicioEditing}
        index={servicioEditingIndex}
        isEditing={servicioEditing !== null}
      />
    </Box>
  );
}

export default PerfilPage;