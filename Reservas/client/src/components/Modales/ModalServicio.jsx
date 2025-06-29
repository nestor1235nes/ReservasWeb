import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  InputAdornment,
  Typography,
  Box,
  IconButton,
  Divider
} from '@mui/material';
import { 
  Close as CloseIcon, 
  Save as SaveIcon, 
  Cancel as CancelIcon,
  Edit as EditIcon,
  Add as AddIcon 
} from '@mui/icons-material';
import { useAuth } from '../../context/authContext';

const modalidades = [
  'Presencial',
  'Telemedicina',
  'Presencial y Telemedicina'
];

const duraciones = [
  '30 minutos',
  '45 minutos',
  '60 minutos',
  '90 minutos',
  '120 minutos'
];

export default function ModalServicio({ open, onClose, servicio, index, isEditing }) {
  const { addServicio, updateServicio } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipo: '',
    duracion: '60 minutos',
    precio: '',
    modalidad: 'Presencial',
    descripcion: ''
  });

  useEffect(() => {
    if (isEditing && servicio) {
      setFormData({
        tipo: servicio.tipo || '',
        duracion: servicio.duracion || '60 minutos',
        precio: servicio.precio || '',
        modalidad: servicio.modalidad || 'Presencial',
        descripcion: servicio.descripcion || ''
      });
    } else {
      setFormData({
        tipo: '',
        duracion: '60 minutos',
        precio: '',
        modalidad: 'Presencial',
        descripcion: ''
      });
    }
  }, [isEditing, servicio, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        await updateServicio(index, formData);
      } else {
        await addServicio(formData);
      }
      onClose();
    } catch (error) {
      console.error('Error al guardar servicio:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      tipo: '',
      duracion: '60 minutos',
      precio: '',
      modalidad: 'Presencial',
      descripcion: ''
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          background: "linear-gradient(45deg, #2596be 30%, #21cbe6 90%)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          {isEditing ? <EditIcon /> : <AddIcon />}
          <Typography variant="h6" fontWeight={600}>
            {isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          sx={{ 
            color: "white",
            "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {isEditing 
              ? 'Modifica la información de tu servicio'
              : 'Completa la información del nuevo servicio que ofreces'
            }
          </Typography>
          
          <Stack spacing={3}>
            <TextField
              name="tipo"
              label="Tipo de Servicio"
              value={formData.tipo}
              onChange={handleChange}
              fullWidth
              required
              placeholder="Ej: Consulta General, Terapia Psicológica, Evaluación Médica..."
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&.Mui-focused fieldset": {
                    borderColor: "#2596be",
                  },
                },
              }}
            />

            <Box display="flex" gap={2}>
              <FormControl fullWidth>
                <InputLabel>Duración</InputLabel>
                <Select
                  name="duracion"
                  value={formData.duracion}
                  onChange={handleChange}
                  label="Duración"
                >
                  {duraciones.map((duracion) => (
                    <MenuItem key={duracion} value={duracion}>
                      {duracion}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                name="precio"
                label="Precio"
                value={formData.precio}
                onChange={handleChange}
                fullWidth
                required
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                placeholder="30000"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&.Mui-focused fieldset": {
                      borderColor: "#2596be",
                    },
                  },
                }}
              />
            </Box>

            <FormControl fullWidth>
              <InputLabel>Modalidad de Atención</InputLabel>
              <Select
                name="modalidad"
                value={formData.modalidad}
                onChange={handleChange}
                label="Modalidad de Atención"
              >
                {modalidades.map((modalidad) => (
                  <MenuItem key={modalidad} value={modalidad}>
                    {modalidad}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider />

            <TextField
              name="descripcion"
              label="Descripción del Servicio (Opcional)"
              value={formData.descripcion}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              placeholder="Describe detalladamente qué incluye este servicio, para qué tipo de pacientes está dirigido, etc..."
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&.Mui-focused fieldset": {
                    borderColor: "#2596be",
                  },
                },
              }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, backgroundColor: "#f8f9fa" }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            color="secondary"
            startIcon={<CancelIcon />}
            sx={{ minWidth: 120 }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={loading || !formData.tipo || !formData.precio}
            sx={{ 
              minWidth: 140,
              background: "#2596be",
              "&:hover": { background: "#1e7a9b" }
            }}
          >
            {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Servicio'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
