import { useState, useEffect } from "react";
import { useAuth } from "../context/authContext";
import { useAlert } from "../context/AlertContext";
import { useSucursal } from "../context/sucursalContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, Typography, TextField, Button, Box, Alert, Stack, Avatar, Container } from "@mui/material";
import { registerSchema } from "../schemas/auth";
import { z } from "zod";
import RegisterSucursal from "../components/Surcursales/RegisterSurcursal";
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import logo_simple from '../assets/logo_simple.png';
//import { handleAuthClick } from '../googleCalendarConfig';

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

  /*const handleGoogleRegister = async () => {
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
  };*/

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
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #ffffff 0%, #f0fbff 100%)' }}>
        <Box sx={{ borderBottom: '1px solid #e3f2fd', py: 2, position: 'sticky', top: 0, bgcolor: 'transparent', backdropFilter: 'blur(6px)' }}>
          <Container maxWidth="sm">
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar sx={{ bgcolor: 'white', width: 36, height: 36 }}>
                <img src={logo_simple} alt="Logo" style={{ width: '70%', height: '65%' }} />
              </Avatar>
              <Typography variant="h6" fontWeight={800} sx={{ background: 'linear-gradient(135deg, #2596be, #21cbe6)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>VITALINK</Typography>
            </Stack>
          </Container>
        </Box>
        <Container maxWidth="sm" sx={{ flex: 1, display: 'grid', placeItems: 'center', py: 6 }}>
          <Card elevation={0} sx={{ width: '100%', border: '1px solid #e3f2fd', borderRadius: 3, boxShadow: '0 8px 24px rgba(37,150,190,0.08)' }}>
            <CardContent>
              <Stack spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <Avatar sx={{ bgcolor: '#2596be', width: 56, height: 56 }}>
                  <PersonAddIcon />
                </Avatar>
                <Typography variant="h5" fontWeight={900}>Crear cuenta</Typography>
                <Typography color="text.secondary" align="center">Elige qué quieres registrar</Typography>
              </Stack>
              <Stack spacing={1.5}>
                <Button variant="contained" size="large" onClick={() => setRegisterType('usuario')} sx={{ background: 'linear-gradient(135deg, #2596be, #21cbe6)' }}>
                  Registrar Usuario
                </Button>
                <Button variant="outlined" size="large" onClick={() => setRegisterType('empresa')}>
                  Registrar Empresa
                </Button>
                <Stack direction="row" justifyContent="center" spacing={1} sx={{ mt: 1 }}>
                  <Typography variant="body2">¿Ya tienes una cuenta?</Typography>
                  <Link to="/login" style={{ color: '#1976d2', fontWeight: 600 }}>Iniciar sesión</Link>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  if (registerType === 'empresa') {
    return <RegisterSucursal />;
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #ffffff 0%, #f0fbff 100%)' }}>
      <Box sx={{ borderBottom: '1px solid #e3f2fd', py: 2, position: 'sticky', top: 0, bgcolor: 'transparent', backdropFilter: 'blur(6px)' }}>
        <Container maxWidth="sm">
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar sx={{ bgcolor: 'white', width: 36, height: 36 }}>
                <img src={logo_simple} alt="Logo" style={{ width: '70%', height: '65%' }} />
              </Avatar>
              <Typography variant="h6" fontWeight={800} sx={{ background: 'linear-gradient(135deg, #2596be, #21cbe6)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>VITALINK</Typography>
            </Stack>
            <Button component={Link} to="/login" startIcon={<LoginIcon />} variant="outlined">Iniciar sesión</Button>
          </Stack>
        </Container>
      </Box>
      <Container maxWidth="sm" sx={{ flex: 1, display: 'grid', placeItems: 'center', py: 6 }}>
        <Card elevation={0} sx={{ width: '100%', border: '1px solid #e3f2fd', borderRadius: 3, boxShadow: '0 8px 24px rgba(37,150,190,0.08)' }}>
          <CardContent>
            {registerErrors.map((error, i) => (
              <Alert severity="error" key={i} sx={{ mb: 1 }}>{error}</Alert>
            ))}
            <Stack spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <Avatar sx={{ bgcolor: '#2596be', width: 56, height: 56 }}>
                <PersonAddIcon />
              </Avatar>
              <Typography variant="h5" fontWeight={900}>
                {registerType === 'admin' ? 'Registro del Administrador' : 'Crear tu cuenta'}
              </Typography>
              <Typography color="text.secondary" align="center" sx={{ maxWidth: 420 }}>
                Completa los datos para comenzar. Podrás configurar tu especialidad y otros detalles más adelante.
              </Typography>
            </Stack>
            <form onSubmit={handleSubmit}>
              <Stack spacing={1.5}>
                <TextField label="Nombre" type="text" name="username" fullWidth value={formData.username} onChange={handleChange} error={!!formErrors.username} helperText={formErrors.username} autoFocus />
                <TextField label="Correo electrónico" type="email" name="email" fullWidth value={formData.email} onChange={handleChange} error={!!formErrors.email} helperText={formErrors.email} />
                <TextField label="Contraseña" type="password" name="password" fullWidth value={formData.password} onChange={handleChange} error={!!formErrors.password} helperText={formErrors.password} />
                <TextField label="Confirmar contraseña" type="password" name="confirmPassword" fullWidth value={formData.confirmPassword} onChange={handleChange} error={!!formErrors.confirmPassword} helperText={formErrors.confirmPassword} />
                <Button type="submit" variant="contained" size="large" sx={{ mt: 1, background: 'linear-gradient(135deg, #2596be, #21cbe6)' }}>
                  Registrarse
                </Button>
              </Stack>
            </form>
            <Stack direction="row" justifyContent="center" spacing={1} sx={{ mt: 2 }}>
              <Typography variant="body2">¿Ya tienes una cuenta?</Typography>
              <Link to="/login" style={{ color: '#1976d2', fontWeight: 600 }}>Iniciar sesión</Link>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default RegisterPage;