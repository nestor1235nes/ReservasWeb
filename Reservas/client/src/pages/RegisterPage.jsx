import { useEffect } from "react";
import { useAuth } from "../context/authContext";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, Typography, TextField, Button, Box, Alert } from "@mui/material";
import { registerSchema } from "../schemas/auth";

function RegisterPage() {
  const { signup, errors: registerErrors, isAuthenticated } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });
  const navigate = useNavigate();

  const onSubmit = async (value) => {
    await signup(value);
  };

  useEffect(() => {
    if (isAuthenticated) navigate("/tasks");
  }, [isAuthenticated]);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
      <Card sx={{ maxWidth: 400, width: '100%', padding: 2 }}>
        <CardContent>
          {registerErrors.map((error, i) => (
            <Alert severity="error" key={i}>{error}</Alert>
          ))}
          <Typography variant="h5" component="div" gutterBottom>
            Registro
          </Typography>
          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              label="Nombre de usuario"
              type="text"
              name="username"
              fullWidth
              margin="normal"
              {...register("username")}
              error={!!errors.username}
              helperText={errors.username?.message}
              autoFocus
            />
            <TextField
              label="Correo electrónico"
              type="email"
              name="email"
              fullWidth
              margin="normal"
              {...register("email")}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <TextField
              label="Contraseña"
              type="password"
              name="password"
              fullWidth
              margin="normal"
              {...register("password")}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <TextField
              label="Confirmar contraseña"
              type="password"
              name="confirmPassword"
              fullWidth
              margin="normal"
              {...register("confirmPassword")}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
            />
            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
              Registrarse
            </Button>
          </form>
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            ¿Ya tienes una cuenta? <Link to="/login" style={{ color: '#1976d2' }}>Iniciar sesión</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

export default RegisterPage;