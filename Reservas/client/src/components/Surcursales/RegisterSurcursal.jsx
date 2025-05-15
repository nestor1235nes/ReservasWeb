import { useState } from "react";
import { useAlert } from "../../context/AlertContext";
import { useSucursal } from "../../context/sucursalContext";
import { Card, CardContent, Typography, TextField, Button, Box, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom"; 

function RegisterEmpresa() {
  const [formData, setFormData] = useState({
    nombre: "",
    direccion: "",
    telefono: "",
    email: "",
    descripcion: "",
    celular: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [registerErrors, setRegisterErrors] = useState([]);
  const showAlert = useAlert();
  const { createSucursal } = useSucursal();
  const navigate = useNavigate();
  const validateForm = () => {
    const errors = {};
    if (!formData.nombre) errors.nombre = "El nombre es requerido";
    if (!formData.direccion) errors.direccion = "La dirección es requerida";
    if (!formData.email) errors.email = "El correo electrónico es requerido";
    if (!formData.celular) errors.celular = "El celular es requerido";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
        if(formData.celular.length !== 9){
            setRegisterErrors(["El celular debe tener 9 dígitos"]);
        } else {
            try {
                formData.celular = "56" + formData.celular;
                await createSucursal(formData);
                showAlert("success", "Empresa registrada correctamente");
                navigate("/register?type=admin");
            } catch (error) {
                setRegisterErrors(["Error al registrar la empresa"]);
                showAlert("error", "Error al registrar la empresa");
            }
        }
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
      <Card sx={{ maxWidth: 400, width: '100%', padding: 2 }}>
        <CardContent>
          {registerErrors.map((error, i) => (
            <Alert severity="error" key={i}>{error}</Alert>
          ))}
          <Typography variant="h5" component="div" gutterBottom>
            Registro de Empresa
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Nombre"
              type="text"
              name="nombre"
              fullWidth
              margin="normal"
              value={formData.nombre}
              onChange={handleChange}
              error={!!formErrors.nombre}
              helperText={formErrors.nombre}
              autoFocus
            />
            <TextField
              label="Dirección"
              type="text"
              name="direccion"
              fullWidth
              margin="normal"
              value={formData.direccion}
              onChange={handleChange}
              error={!!formErrors.direccion}
              helperText={formErrors.direccion}
            />
            <TextField
              label="Teléfono fijo"
              type="text"
              name="telefono"
              fullWidth
              margin="normal"
              value={formData.telefono}
              onChange={handleChange}
              error={!!formErrors.telefono}
              helperText={formErrors.telefono}
            />
            <TextField
              label="Número de celular (Ej -> 912345678)"
              type="text"
              name="celular"
              fullWidth
              margin="normal"
              value={formData.celular}
              onChange={handleChange}
              error={!!formErrors.celular}
              helperText={formErrors.celular}
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
              label="Descripción"
              type="text"
              name="descripcion"
              fullWidth
              margin="normal"
              value={formData.descripcion}
              onChange={handleChange}
              error={!!formErrors.descripcion}
              helperText={formErrors.descripcion}
            />
            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
              Registrar Empresa
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

export default RegisterEmpresa;