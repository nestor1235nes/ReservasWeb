import React, { useState } from "react";
import { Tooltip, Box, Card, CardContent, Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Stack, AppBar, Toolbar, Button, IconButton, TextField, Checkbox, FormControlLabel, MenuItem, Select, InputLabel, FormControl } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { useAuth } from "../context/authContext";
import FotoPerfil from "../components/FotoPerfil";
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import MasksIcon from '@mui/icons-material/Masks';
import LocalPhoneIcon from '@mui/icons-material/LocalPhone';
import { useNavigate } from "react-router-dom";
import PerfilMensajesAutomatizados from "../components/PerfilMensajesAutomatizados";
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';

const useStyles = makeStyles((theme) => ({
  perfilCard: {
    padding: "20px",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
    minHeight: "90vh",
    minWidth: "111%",
    marginLeft: "-5.5%"
  },
  perfilAvatarContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    border: "1px solid #ddd",
    borderRadius: "50%",
    minWidth: 200,
    minHeight: 200,
  },
  perfilDescripcion: {
    fontSize: "1rem",
    color: "#555",
    lineHeight: "1.5",
  },
  perfilAvatar: {
    width: 120,
    height: 120,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
  },
  perfilIcon: {
    fontSize: 60,
    color: "black",
  },
}));

const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const intervals = [10, 15, 30, 60];

const PerfilPage = () => {
  const classes = useStyles();
  const { user, logout, updatePerfil } = useAuth();
  const navigate = useNavigate();
  const [editProfileMode, setEditProfileMode] = useState(false);
  const [editTimetableMode, setEditTimetableMode] = useState(false);
  const [formData, setFormData] = useState({
    username: user.username || "",
    celular: user.celular || "",
    descripcion: user.descripcion || "",
    timetable: user.timetable.length > 0 ? user.timetable : [{ fromTime: "", toTime: "", days: [], interval: 30, breakFrom: "", breakTo: "" }]
  });

  const handleProfileClick = () => {
    navigate('/calendario');
  };

  const handleLogoutClick = async () => {
    await logout();
    navigate('/login');
  };

  const handleEditProfileClick = () => {
    setEditProfileMode(true);
  };

  const handleEditTimetableClick = () => {
    setEditTimetableMode(true);
  };

  const handleSaveProfileClick = async () => {
    await updatePerfil(user.id || user._id, formData);
    setEditProfileMode(false);
  };

  const handleSaveTimetableClick = async () => {
    const updatedTimetable = formData.timetable.map(time => {
      const { fromTime, toTime, breakFrom, breakTo, interval, days } = time;
      const times = generateTimes(fromTime, toTime, breakFrom, breakTo, interval);
      return { ...time, times };
    });
    await updatePerfil(user.id || user._id, { ...formData, timetable: updatedTimetable });
    setEditTimetableMode(false);
  };

  const handleCancelProfileClick = () => {
    setFormData({
      username: user.username || "",
      celular: user.celular || "",
      descripcion: user.descripcion || "",
      timetable: user.timetable.length > 0 ? user.timetable : [{ fromTime: "", toTime: "", days: [], interval: 30, breakFrom: "", breakTo: "" }]
    });
    setEditProfileMode(false);
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
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleTimetableChange = (index, e) => {
    const { name, value } = e.target;
    const newTimetable = [...formData.timetable];
    newTimetable[index][name] = value;
    setFormData({
      ...formData,
      timetable: newTimetable
    });
  };

  const handleDaysChange = (index, day) => {
    const newTimetable = [...formData.timetable];
    const days = newTimetable[index].days.includes(day)
      ? newTimetable[index].days.filter(d => d !== day)
      : [...newTimetable[index].days, day];
    newTimetable[index].days = days;
    setFormData({
      ...formData,
      timetable: newTimetable
    });
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
    <>
      <AppBar position="static" style={{ borderEndEndRadius: '5px', borderEndStartRadius: '5px' }}>
        <Toolbar>
          <Typography variant="h6" style={{ flexGrow: 1 }}>Perfil</Typography>
          <Tooltip title="Ver Calendario" arrow>
            <Button color="inherit" onClick={handleProfileClick} startIcon={<CalendarMonthIcon />}>
              Calendario
            </Button>
          </Tooltip>
          <Tooltip title="Cerrar sesión" arrow>
            <IconButton color="inherit" onClick={handleLogoutClick}>
              <ExitToAppIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Container style={{ border: "1px solid #ddd", borderRadius: "5px", boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.5)" }}>
        <Card className={classes.perfilCard}>
          <CardContent>
            {/* Botón de Configurar Perfil */}
            <Box display="flex" justifyContent="flex-end" mt={-3} mb={0}>
              {editProfileMode ? (
                <>
                  <Button variant="contained" color="primary" onClick={handleSaveProfileClick}>
                    Guardar
                  </Button>
                  <Button variant="contained" color="secondary" onClick={handleCancelProfileClick} style={{ marginLeft: '10px' }}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button startIcon={ < ManageAccountsIcon/>} variant="contained" color="primary" onClick={handleEditProfileClick}>
                  Configurar perfil
                </Button>
              )}
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
              <Box className={classes.perfilAvatarContainer}>
                <FotoPerfil />
              </Box>
              <Box width="100%">
                {editProfileMode ? (
                  <>
                    <TextField
                      label="Nombre"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      fullWidth
                      margin="normal"
                    />
                    <TextField
                      label="Celular"
                      name="celular"
                      value={formData.celular}
                      onChange={handleChange}
                      fullWidth
                      margin="normal"
                    />
                    <TextField
                      label="Descripción"
                      name="descripcion"
                      value={formData.descripcion}
                      onChange={handleChange}
                      fullWidth
                      margin="normal"
                      multiline
                      rows={4}
                    />
                  </>
                ) : (
                  <>
                    <Box display={'flex'} justifyContent={'space-between'} alignItems={{ xs: 'flex-start', sm: 'center' }} flexDirection={{ xs: 'column', sm: 'row' }}>
                      <Box>
                        <Typography variant="h4" gutterBottom>
                          {user.username}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="h6" color="textSecondary">
                            <MasksIcon />
                            {" " + user.especialidad || " Especialidad no especificada"}
                          </Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <MailOutlineIcon />
                          <Typography variant="h6" color="textSecondary">
                            {user.email}
                          </Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <LocalPhoneIcon />
                          <Typography variant="h6" color="textSecondary">
                            {user.celular || "Sin especificar"}
                          </Typography>
                        </Stack>
                      </Box>
                      <Box sx={{ boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.3)', borderRadius: 2, padding: 2, maxWidth: {xs: '100%', sm:'40%'},minWidth: { xs: '100%', sm: '40%' }, minHeight: '300px', maxHeight: '300px', top: 50, position: 'relative', overflow: 'auto', mt: { xs: 2, sm: 0 } }}>
                        <Typography variant="h6" gutterBottom>
                          Mi Descripción
                        </Typography>
                        <Typography variant="body1" className={classes.perfilDescripcion}>
                          {user.descripcion || "Sin descripción."}
                        </Typography>
                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            </Stack>
            <PerfilMensajesAutomatizados />
            {/* Horario */}
            {editTimetableMode && (
              <Box mt={4}>
                <Typography variant="h6" gutterBottom>
                  Horarios Disponibles:
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
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

            <Box mt={4}>
              <Typography variant="h6" gutterBottom>
                Horario de atención
              </Typography>
              <TableContainer component={Paper}>
                <Table>
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

            {/* Botón de Editar Horario */}
            <Box mt={3} display="flex" justifyContent="flex-end">
              {editTimetableMode ? (
                <>
                  <Button variant="contained" color="primary" onClick={handleSaveTimetableClick}>
                    Guardar
                  </Button>
                  <Button variant="contained" color="secondary" onClick={handleCancelTimetableClick} style={{ marginLeft: '10px' }}>
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
      </Container>
    </>
  );
};

export default PerfilPage;