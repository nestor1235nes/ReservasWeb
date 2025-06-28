import { useAuth } from "../context/authContext";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, Typography, TextField, Button, Box, Alert, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { loginSchema } from "../schemas/auth";
import { gapi } from 'gapi-script';
//import { handleAuthClick } from '../googleCalendarConfig';

export function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });
  const { signin, errors: loginErrors, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const onSubmit = (data) => signin(data);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/calendario");
    }
  }, [isAuthenticated]);

  /*const handleGoogleLogin = async () => {
    const profile = await handleAuthClick();
    const response = await fetch('/api/auth/google-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().id_token }),
    });
    const data = await response.json();
    console.log(data);
    if (data.id) {
      window.location.reload(); // Actualizar la página después de la autenticación
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
    handleGoogleLogin();
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
      <Card sx={{ maxWidth: 400, width: '100%', padding: 2 }}>
        <CardContent>
          {loginErrors.map((error, i) => (
            <Alert severity="error" key={i}>{error}</Alert>
          ))}
          <Typography variant="h5" component="div" gutterBottom>
            Iniciar sesión
          </Typography>
          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              label="Correo electrónico"
              type="email"
              name="email"
              fullWidth
              margin="normal"
              {...register("email", { required: true })}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <TextField
              label="Contraseña"
              type="password"
              name="password"
              fullWidth
              margin="normal"
              {...register("password", { required: true, minLength: 6 })}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
              Iniciar sesión
            </Button>
          </form>
          {/*<Button variant="contained" color="secondary" fullWidth sx={{ mt: 2 }} onClick={handleClickOpen}>
            Iniciar sesión con Google
          </Button>*/}
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            ¿No tienes una cuenta? <Link to="/register" style={{ color: '#1976d2' }}>Regístrate</Link>
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

export default LoginPage;