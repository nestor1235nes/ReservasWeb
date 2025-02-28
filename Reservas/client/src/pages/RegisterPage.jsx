import { useState, useEffect } from "react";
import { useAuth } from "../context/authContext";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, Typography, TextField, Button, Box, Alert, MenuItem, Select, InputLabel, FormControl } from "@mui/material";
import { registerSchema } from "../schemas/auth";
import { z } from "zod";

function RegisterPage() {
  const { signup, errors: registerErrors, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    especialidad: "",
  });

  const [formErrors, setFormErrors] = useState({});

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
      await signup(formData);
    }
  };

  useEffect(() => {
    if (isAuthenticated) navigate("/calendario");
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
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            ¿Ya tienes una cuenta? <Link to="/login" style={{ color: '#1976d2' }}>Iniciar sesión</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

export default RegisterPage;