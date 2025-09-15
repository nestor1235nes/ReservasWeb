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

  const primary = '#2596be';

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
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" sx={{ background: 'linear-gradient(180deg, #ffffff 0%, #f7fbfd 100%)', p: 2 }}>
      <Card sx={{ maxWidth: 420, width: '100%', borderRadius: 2, boxShadow: 6 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h5" component="div" fontWeight={800}>
              Iniciar sesión
            </Typography>
            <img src="/vite.svg" alt="logo" style={{ width: 36, height: 36 }} />
          </Box>

          {loginErrors.map((error, i) => (
            <Alert severity="error" key={i} sx={{ mb: 2 }}>{error}</Alert>
          ))}

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
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
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
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />

            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2, backgroundColor: primary, '&:hover': { backgroundColor: '#1e7fa0' }, py: 1.5, fontWeight: 700 }}>
              Iniciar sesión
            </Button>
          </form>

          {/*
            Mantengo el código comentado tal cual lo pediste. No se eliminó nada de lo comentado.
            <Button variant="contained" color="secondary" fullWidth sx={{ mt: 2 }} onClick={handleClickOpen}>
              Iniciar sesión con Google
            </Button>
          */}

          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            ¿No tienes una cuenta? <Link to="/register" style={{ color: primary, fontWeight: 700 }}>Regístrate</Link>
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
          <Button onClick={handleClose} sx={{ backgroundColor: 'secondary.main', color: 'white' }}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} sx={{ backgroundColor: 'primary.main', color: 'white' }}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default LoginPage;