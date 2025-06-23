import { useState } from "react";
import { TextField, Button, Box, Alert, DialogActions, DialogContent } from "@mui/material";
import { useAuth } from "../../context/authContext";
import { useSucursal } from "../../context/sucursalContext";

export default function RegisterAsistente({ open, onClose, sucursalId, onSuccess }) {
  const { registerUserOnly, errors: registerErrors } = useAuth();
  const { agregarAsistente } = useSucursal();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.username) errors.username = "Nombre requerido";
    if (!formData.email) errors.email = "Correo requerido";
    if (!formData.password) errors.password = "Contraseña requerida";
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = "Las contraseñas no coinciden";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
        const user = {
            username: formData.username,
            email: formData.email,
            password: formData.password,
        };
        const newUser = await registerUserOnly(user);
        if (newUser) {
            await agregarAsistente(sucursalId, newUser.id);
            onSuccess();
            onClose();
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogContent>
        {registerErrors.map((error, i) => (
          <Alert severity="error" key={i}>{error}</Alert>
        ))}
        <TextField
          label="Nombre de usuario"
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
          name="email"
          type="email"
          fullWidth
          margin="normal"
          value={formData.email}
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
          value={formData.password}
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
          value={formData.confirmPassword}
          onChange={handleChange}
          error={!!formErrors.confirmPassword}
          helperText={formErrors.confirmPassword}
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