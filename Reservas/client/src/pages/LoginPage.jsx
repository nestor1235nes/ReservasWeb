import { useAuth } from "../context/authContext";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, Typography, TextField, Button, Box, Alert } from "@mui/material";
import { loginSchema } from "../schemas/auth";

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

  const onSubmit = (data) => signin(data);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/tasks");
    }
  }, [isAuthenticated]);

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
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            ¿No tienes una cuenta? <Link to="/register" style={{ color: '#1976d2' }}>Regístrate</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}