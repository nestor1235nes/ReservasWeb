import React, { useState } from "react";
import {
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert
} from "@mui/material";
import { useSucursal } from "../../context/sucursalContext";
import { useAuth } from "../../context/authContext";

export default function RegisterProfesional({ open, onClose, sucursalId, onSuccess }) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    especialidad: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [error, setError] = useState("");
  const { registerUserOnly } = useAuth();
  const { agregarProfesional } = useSucursal();

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors = {};
    if (!form.username) errors.username = "Nombre requerido";
    if (!form.email) errors.email = "Correo requerido";
    if (!form.password) errors.password = "Contraseña requerida";
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Las contraseñas no coinciden";
    }
    if (!form.confirmPassword) errors.confirmPassword = "Confirmar contraseña requerida";
    if (!form.especialidad) errors.especialidad = "Especialidad requerida";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;
    setLoading(true);
    try {
        const user = {
            username: form.username,
            email: form.email,
            password: form.password,
            especialidad: form.especialidad
        };
        const newUser = await registerUserOnly(user);
        if (newUser) {
            await agregarProfesional(sucursalId, newUser.id);
            onSuccess();
            onClose();
        }
    } catch (err) {
      setError("Error al registrar profesional. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Nombre de usuario"
          name="username"
          fullWidth
          margin="normal"
          value={form.username}
          onChange={handleChange}
          error={!!formErrors.username}
          helperText={formErrors.username}
          autoFocus
        />
        <TextField
          label="Correo electrónico"
          name="email"
          type="email"
          fullWidth
          margin="normal"
          value={form.email}
          onChange={handleChange}
          error={!!formErrors.email}
          helperText={formErrors.email}
        />
        <TextField
          label="Contraseña"
          name="password"
          type="password"
          fullWidth
          margin="normal"
          value={form.password}
          onChange={handleChange}
          error={!!formErrors.password}
          helperText={formErrors.password}
        />
        <TextField
           label="Confirmar contraseña"
           name="confirmPassword"
           type="password"
           fullWidth
           margin="normal"
           value={form.confirmPassword}
           onChange={handleChange}
           error={!!formErrors.confirmPassword}
           helperText={formErrors.confirmPassword}
        /> 
        <TextField
          label="Especialidad"
          name="especialidad"
          fullWidth
          margin="normal"
          value={form.especialidad}
          onChange={handleChange}
          error={!!formErrors.especialidad}
          helperText={formErrors.especialidad}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" variant="contained" sx={{ background: "#2596be" }} disabled={loading}>
          Registrar
        </Button>
      </DialogActions>
    </form>
  );
}