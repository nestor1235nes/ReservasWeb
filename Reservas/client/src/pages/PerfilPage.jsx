import React, { useState, useEffect } from "react";
import { Tooltip, Avatar, Box, Card, CardContent, Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Stack, AppBar, Toolbar, Button, IconButton, TextField, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { useAuth } from "../context/authContext";
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import MasksIcon from '@mui/icons-material/Masks';
import LocalPhoneIcon from '@mui/icons-material/LocalPhone';
import { Link, useNavigate } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
  perfilCard: {
    padding: "20px",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
    minHeight: "90vh",
    minWidth:"111%",
    marginLeft:"-5.5%"
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

const PerfilPage = () => {
  const classes = useStyles();
  const { user, logout, updatePerfil } = useAuth();
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: user.username,
    celular: user.celular,
    descripcion: user.descripcion,
    timetable: user.timetable || [{ fromTime: "", toTime: "" }]
  });

  const handleProfileClick = () => {
    navigate('/calendario');
  };

  const handleLogoutClick = async () => {
    await logout();
    navigate('/login');
  };

  const handleEditClick = () => {
    setEditMode(true);
  };

  const handleSaveClick = async () => {
    await updatePerfil(user.id, formData);
    setEditMode(false);
  };

  const handleCancelClick = () => {
    setFormData({
      username: user.username,
      celular: user.celular,
      descripcion: user.descripcion,
      timetable: user.timetable || [{ fromTime: "", toTime: "" }]
    });
    setEditMode(false);
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
            {/* Sección de la imagen y datos principales */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
                <Box className={classes.perfilAvatarContainer}>
                    <Avatar
                        src={user.fotoPerfil || ""}
                        alt={user.username}
                        className={classes.perfilAvatar}
                    >
                        <Tooltip title="Agregar foto de perfil" arrow>
                            {!user.fotoPerfil && <AddPhotoAlternateIcon className={classes.perfilIcon} />}
                        </Tooltip>
                    </Avatar>
                </Box>
                <Box>
                    {editMode ? (
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
                      </>
                    )}
                </Box>
            </Stack>

            {/* Horario */}
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.timetable.map((time, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {editMode ? (
                            <TextField
                              name="fromTime"
                              type="time"
                              value={time.fromTime}
                              onChange={(e) => handleTimetableChange(index, e)}
                              fullWidth
                            />
                          ) : (
                            time.fromTime || "No especificado"
                          )}
                        </TableCell>
                        <TableCell>
                          {editMode ? (
                            <TextField
                              name="toTime"
                              type="time"
                              value={time.toTime}
                              onChange={(e) => handleTimetableChange(index, e)}
                              fullWidth
                            />
                          ) : (
                            time.toTime || "No especificado"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Descripción */}
            <Box mt={3}>
              <Typography variant="body1" className={classes.perfilDescripcion}>
                {user.descripcion || "Sin descripción."}
              </Typography>
            </Box>

            {/* Botones de edición */}
            <Box mt={3} display="flex" justifyContent="flex-end">
              {editMode ? (
                <>
                  <Button variant="contained" color="primary" onClick={handleSaveClick}>
                    Guardar
                  </Button>
                  <Button variant="contained" color="secondary" onClick={handleCancelClick} style={{ marginLeft: '10px' }}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button variant="contained" color="primary" onClick={handleEditClick}>
                  Editar
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