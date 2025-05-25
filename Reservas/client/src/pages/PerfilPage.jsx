import React, { useState } from "react";
import {
  Box, Card, CardContent, CardHeader, Typography, Tabs, Tab, Avatar, Button, Stack, TextField, Select, MenuItem, InputLabel, FormControl, Checkbox, FormControlLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Divider, Chip, Switch as MuiSwitch
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import { useAuth } from "../context/authContext";
import FotoPerfil from "../components/FotoPerfil";
import PerfilMensajesAutomatizados from "../components/PerfilMensajesAutomatizados";
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import PlaceIcon from '@mui/icons-material/Place';
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const intervals = [10, 15, 30, 60];
const especialidades = [
  "Medicina General", "Cardiología", "Dermatología", "Neurología", "Pediatría"
];

export function PerfilPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user, updatePerfil } = useAuth();
  const [tab, setTab] = useState(0);
  const [editProfileMode, setEditProfileMode] = useState(false);
  const [editTimetableMode, setEditTimetableMode] = useState(false);
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
    timetable: user.timetable.length > 0 ? user.timetable : [{ fromTime: "", toTime: "", days: [], interval: 30, breakFrom: "", breakTo: "" }]
  });

  // Handlers
  const handleEditProfileClick = () => setEditProfileMode(true);
  const handleSaveProfileClick = async () => {
    await updatePerfil(user.id || user._id, formData);
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
      timetable: user.timetable.length > 0 ? user.timetable : [{ fromTime: "", toTime: "", days: [], interval: 30, breakFrom: "", breakTo: "" }]
    });
    setEditProfileMode(false);
  };
  const handleEditTimetableClick = () => setEditTimetableMode(true);
  const handleSaveTimetableClick = async () => {
    const updatedTimetable = formData.timetable.map(time => {
      const { fromTime, toTime, breakFrom, breakTo, interval, days } = time;
      const times = generateTimes(fromTime, toTime, breakFrom, breakTo, interval);
      return { ...time, times };
    });
    await updatePerfil(user.id || user._id, { ...formData, timetable: updatedTimetable });
    setEditTimetableMode(false);
  };
  const handleCancelTimetableClick = () => {
    setFormData({
      ...formData,
      timetable: user.timetable.length > 0 ? user.timetable : [{ fromTime: "", toTime: "", days: [], interval: 30, breakFrom: "", breakTo: "" }]
    });
    setEditTimetableMode(false);
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  const handleTimetableChange = (index, e) => {
    const { name, value } = e.target;
    const newTimetable = [...formData.timetable];
    newTimetable[index][name] = value;
    setFormData({ ...formData, timetable: newTimetable });
  };
  const handleDaysChange = (index, day) => {
    const newTimetable = [...formData.timetable];
    const days = newTimetable[index].days.includes(day)
      ? newTimetable[index].days.filter(d => d !== day)
      : [...newTimetable[index].days, day];
    newTimetable[index].days = days;
    setFormData({ ...formData, timetable: newTimetable });
  };
  const generateTimes = (fromTime, toTime, breakFrom, breakTo, interval) => {
    const times = [];
    let currentTime = fromTime;
    while (currentTime < toTime) {
      if (currentTime >= breakFrom && currentTime < breakTo) {
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

  if (!user) return <Typography>Cargando perfil...</Typography>;

  return (
    <Box
      maxWidth={isMobile ? "80%" : "100%"}
      px={isMobile ? 0 : 2}
      py={isMobile ? 0 : 2}
      sx={{
        overflowX: "hidden",
        boxSizing: 'border-box',
      }}
    >
      <Stack
        direction={isMobile ? "column" : "row"}
        justifyContent="space-between"
        alignItems={isMobile ? "stretch" : "center"}
        spacing={2}
        bgcolor="#2596be"
        p={2}
        borderRadius={1}
        mb={2}
      >
        <Typography variant={isMobile ? "h6" : "h5"} fontWeight={700} color="white">
          Mi Perfil Profesional
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Button variant="contained" sx={{ background: 'white', color: 'black' }}>
            Vista previa
          </Button>
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
            <Button
              variant="contained"
              startIcon={<ManageAccountsIcon />}
              onClick={handleEditProfileClick}
              sx={{ background: "#1976d2", color: "white" }}
            >
              Configurar perfil
            </Button>
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
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : false}
          aria-label="tabs"
        >
          <Tab label="Información Personal" />
          <Tab label="Información Profesional" />
          <Tab label="Horarios" />
          <Tab label="Servicios" />
        </Tabs>
      </Box>

      {/* Información Personal */}
      {tab === 0 && (
        <Box
          display="flex"
          flexDirection={isMobile ? "column" : "row"}
          gap={3}
          flexWrap="wrap"
        >
          <Card
            sx={{
              flex: 1,
              width: isMobile ? "100%" : 400,
              mb: isMobile ? 2 : 0
            }}
          >
            <CardHeader title="Foto de Perfil" subheader="Esta imagen será visible para tus pacientes" />
            <CardContent sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Box mb={2}>
                <FotoPerfil />
              </Box>
              <Button variant="outlined" fullWidth>
                Cambiar foto
              </Button>
            </CardContent>
          </Card>
          <Card
            sx={{
              flex: 2,
              width: isMobile ? "100%" : "auto"
            }}
          >
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
      {tab === 1 && (
        <Box
          display="flex"
          flexDirection={isMobile ? "column" : "row"}
          gap={3}
          flexWrap="wrap"
          mt={2}
        >
          <Card sx={{ flex: 1, width: isMobile ? "100%" : "auto", mb: isMobile ? 2 : 0 }}>
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
            </CardContent>
          </Card>
          <Card sx={{ flex: 1, width: isMobile ? "100%" : "auto" }}>
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
      {tab === 2 && (
        <Card sx={{ mt: 2 }}>
          <CardHeader title="Horarios de Atención" subheader="Define tus días y horarios disponibles para atención" />
          <CardContent>
            {editTimetableMode && (
              <Box mb={3} sx={{ overflowX: isMobile ? 'auto' : 'visible' }}>
                <Typography variant="h6" gutterBottom>
                  Horarios Disponibles:
                </Typography>
                <TableContainer component={Paper} sx={{ minWidth: isMobile ? 700 : 'auto' }}>
                  <Table size={isMobile ? "small" : "medium"}>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Desde</strong></TableCell>
                        <TableCell><strong>Hasta</strong></TableCell>
                        <TableCell><strong>Días</strong></TableCell>
                        <TableCell><strong>Intervalo</strong></TableCell>
                        <TableCell><strong>Colación Desde</strong></TableCell>
                        <TableCell><strong>Colación Hasta</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.timetable.map((time, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <TextField
                              name="fromTime"
                              type="time"
                              value={time.fromTime}
                              onChange={(e) => handleTimetableChange(index, e)}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              name="toTime"
                              type="time"
                              value={time.toTime}
                              onChange={(e) => handleTimetableChange(index, e)}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell>
                            {daysOfWeek.map(day => (
                              <FormControlLabel
                                key={day}
                                control={
                                  <Checkbox
                                    checked={time.days.includes(day)}
                                    onChange={() => handleDaysChange(index, day)}
                                  />
                                }
                                label={day}
                              />
                            ))}
                          </TableCell>
                          <TableCell>
                            <FormControl fullWidth>
                              <InputLabel>Intervalo</InputLabel>
                              <Select
                                name="interval"
                                value={time.interval}
                                onChange={(e) => handleTimetableChange(index, e)}
                              >
                                {intervals.map(interval => (
                                  <MenuItem key={interval} value={interval}>
                                    {`Distribuir cada ${interval} min.`}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <TextField
                              name="breakFrom"
                              type="time"
                              value={time.breakFrom}
                              onChange={(e) => handleTimetableChange(index, e)}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              name="breakTo"
                              type="time"
                              value={time.breakTo}
                              onChange={(e) => handleTimetableChange(index, e)}
                              fullWidth
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            <Box sx={{ overflowX: isMobile ? 'auto' : 'visible' }}>
              <Typography variant="h6" gutterBottom>
                Horario de atención
              </Typography>
              <TableContainer component={Paper} sx={{ minWidth: isMobile ? 400 : 'auto' }}>
                <Table size={isMobile ? "small" : "medium"}>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Días</strong></TableCell>
                      <TableCell><strong>Horas</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.timetable.map((time, index) => (
                      <TableRow key={index}>
                        <TableCell>{(time.days && time.days.join(", ")) || "No especificado"}</TableCell>
                        <TableCell>{(time.times && time.times.join(", ")) || "No especificado"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Box mt={3} display="flex" flexDirection={isMobile ? "column" : "row"} justifyContent="flex-end" gap={2}>
              {editTimetableMode ? (
                <>
                  <Button variant="contained" color="primary" onClick={handleSaveTimetableClick}>
                    Guardar
                  </Button>
                  <Button variant="contained" color="secondary" onClick={handleCancelTimetableClick}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button startIcon={<EditCalendarIcon />} variant="contained" color="primary" onClick={handleEditTimetableClick}>
                  Modificar horario
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Servicios */}
      {tab === 3 && (
        <Card sx={{ mt: 2, minWidth: isMobile ? "100%" : 400 }}>
          <CardHeader
            title="Servicios y Tarifas"

            action={
              <Button variant="contained" startIcon={<AddIcon />}>
                Nuevo Servicio
              </Button>
            }
            subheader="Define los servicios que ofreces y sus precios"
          />
          <CardContent>
            <Stack spacing={2}>
              {/* Ejemplo de servicio, puedes mapear los de tu base de datos */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box display="flex" flexDirection={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} gap={2}>
                  <Typography fontWeight={600}>Primera consulta</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" startIcon={<EditIcon />}>Editar</Button>
                    <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />}>Eliminar</Button>
                  </Stack>
                </Box>
                <Stack direction={isMobile ? "column" : "row"} spacing={2} mt={1}>
                  <Chip label="30 minutos" />
                  <Chip label="$30.000" />
                  <Chip icon={<PlaceIcon />} label="Presencial" />
                  <Chip icon={<VideoCameraFrontIcon />} label="Telemedicina" />
                </Stack>
              </Paper>
              {/* Más servicios... */}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Box mt={4}>
        <PerfilMensajesAutomatizados />
      </Box>
    </Box>
  );
}

export default PerfilPage;