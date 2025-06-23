import { useState, useEffect } from "react";
import { useAuth } from "../context/authContext";
import { useAlert } from "../context/AlertContext";
import { useSucursal } from "../context/sucursalContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, Typography, TextField, Button, Box, Alert, MenuItem, Select, InputLabel, FormControl, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { registerSchema } from "../schemas/auth";
import { z } from "zod";
import RegisterSucursal from "../components/Surcursales/RegisterSurcursal";
import { gapi } from 'gapi-script';
import { handleAuthClick } from '../googleCalendarConfig';

export function RegisterPage() {
  const { signup, errors: registerErrors, isAuthenticated, updatePerfil } = useAuth();
  const { getSucursales, updateSucursal } = useSucursal();
  const showAlert = useAlert();
  const navigate = useNavigate();
  const location = useLocation(); // Get the current location

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    especialidad: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [registerType, setRegisterType] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const type = queryParams.get("type");
    if (type === "admin") {
      setRegisterType("admin");
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const validateForm = () => {
    try {
      registerSchema.parse(formData);
      setFormErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.reduce((acc, curr) => {
          acc[curr.path[0]] = curr.message;
          return acc;
        }, {});
        setFormErrors(errors);
      }
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      if(registerType === 'admin') {
        const response = await getSucursales();
        if (response.length === 0) {
          showAlert("error", "Debe registrar una empresa primero");
        } else {
          const lastSucursal = response[response.length - 1];
          formData.sucursal = lastSucursal._id || lastSucursal.id;
          const user = await signup(formData);
          await updateSucursal(lastSucursal._id || lastSucursal.id, { administrador: user._id || user.id });
          showAlert("success", "Usuario registrado y asignado como administrador");
        }
      } else {
        await signup(formData);
      } 
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const profile = await handleAuthClick();
      const response = await fetch('/api/auth/google-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().id_token }),
      });
      const data = await response.json();
      if (data.id) {
        if(registerType === 'admin') {
          const sucursales = await getSucursales();
          if (sucursales.length === 0) {
            showAlert("error", "Debe registrar una empresa primero");
          } else {
            const lastSucursal = sucursales[sucursales.length - 1];
            await updatePerfil(data.id, { sucursal: lastSucursal._id || lastSucursal.id });
            await updateSucursal(lastSucursal._id || lastSucursal.id, { administrador: data.id, empleado: [data.id] });
            showAlert("success", "Usuario registrado y asignado como administrador");
          }
        }else{
          showAlert("success", "Usuario registrado correctamente");
        }
        window.location.reload();
      }
    } catch (error) {
      console.log(error);
      showAlert("error", "Ocurrió un error al registrar el usuario");
    }
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleConfirm = () => {
    handleClose();
    handleGoogleRegister();
  };

  useEffect(() => {
    if (isAuthenticated) navigate("/calendario");
  }, [isAuthenticated]);

  if (!registerType) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Card sx={{ maxWidth: 400, width: '100%', padding: 2 }}>
          <CardContent>
            <Typography variant="h5" component="div" gutterBottom>
              Seleccione el tipo de registro
            </Typography>
            <Button variant="contained" color="primary" fullWidth sx={{ mt: 2 }} onClick={() => setRegisterType('usuario')}>
              Registrar Usuario
            </Button>
            <Button variant="contained" color="secondary" fullWidth sx={{ mt: 2 }} onClick={() => setRegisterType('empresa')}>
              Registrar Empresa
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (registerType === 'empresa') {
    return <RegisterSucursal />;
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
      <Card sx={{ maxWidth: 400, width: '100%', padding: 2 }}>
        <CardContent>
          {registerErrors.map((error, i) => (
            <Alert severity="error" key={i}>{error}</Alert>
          ))}
          <Typography variant="h5" component="div" gutterBottom>
            {registerType === 'admin' ? 'Registro del Administrador' : 'Registro'}
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Nombre de usuario"
              type="text"
              name="username"
              fullWidth
              margin="normal"
              value={formData.username}
              onChange={handleChange}
              error={!!formErrors.username}
              helperText={formErrors.username}
              autoFocus
            />
            <TextField
              label="Correo electrónico"
              type="email"
              name="email"
              fullWidth
              margin="normal"
              value={formData.email}
              onChange={handleChange}
              error={!!formErrors.email}
              helperText={formErrors.email}
            />
            <TextField
              label="Contraseña"
              type="password"
              name="password"
              fullWidth
              margin="normal"
              value={formData.password}
              onChange={handleChange}
              error={!!formErrors.password}
              helperText={formErrors.password}
            />
            <TextField
              label="Confirmar contraseña"
              type="password"
              name="confirmPassword"
              fullWidth
              margin="normal"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!formErrors.confirmPassword}
              helperText={formErrors.confirmPassword}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="especialidad-label">Especialidad</InputLabel>
              <Select
                labelId="especialidad-label"
                id="especialidad"
                name="especialidad"
                value={formData.especialidad}
                onChange={handleChange}
                error={!!formErrors.especialidad}
              >
                <MenuItem value="Kinesiólogo">Kinesiólogo</MenuItem>
                <MenuItem value="Nutricionista">Nutricionista</MenuItem>
                <MenuItem value="Terapeuta Ocupacional">Terapeuta Ocupacional</MenuItem>
              </Select>
              {formErrors.especialidad && <Typography color="error">{formErrors.especialidad}</Typography>}
            </FormControl>
            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
              Registrarse
            </Button>
          </form>
          <Button variant="contained" color="secondary" fullWidth sx={{ mt: 2 }} onClick={handleClickOpen}>
            Registrarse con Google
          </Button>
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            ¿Ya tienes una cuenta? <Link to="/login" style={{ color: '#1976d2' }}>Iniciar sesión</Link>
          </Typography>
        </CardContent>
      </Card>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Confirmación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Al conectarte a Google, se sincronizará con Google Calendar, ¿estás seguro de continuar?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} sx={{ backgroundColor:'secondary.main', color: 'white' }}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} sx={{ backgroundColor:'primary.main', color: 'white' }}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RegisterPage;