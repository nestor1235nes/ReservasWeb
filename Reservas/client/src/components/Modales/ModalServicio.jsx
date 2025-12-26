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
import { useAlert } from '../../context/AlertContext';

const MODALIDADES_ALL = [
  'Presencial',
  'Telemedicina',
  'Domicilio',
  'Presencial y Telemedicina',
  'Presencial y Domicilio',
  'Telemedicina y Domicilio',
  'Presencial, Telemedicina y Domicilio'
];

const computeAllowedModalidades = ({ allowPresencial, allowVirtual, allowDomicilio }) => {
  const enabled = [];
  if (allowPresencial) enabled.push('Presencial');
  if (allowVirtual) enabled.push('Telemedicina');
  if (allowDomicilio) enabled.push('Domicilio');

  if (enabled.length === 0) return [];
  if (enabled.length === 1) return enabled;

  const combos = [];
  // pares
  for (let i = 0; i < enabled.length; i++) {
    for (let j = i + 1; j < enabled.length; j++) {
      combos.push(`${enabled[i]} y ${enabled[j]}`);
    }
  }
  // triple
  if (enabled.length === 3) combos.push('Presencial, Telemedicina y Domicilio');

  // Respetar el set de strings conocidos (compatibilidad)
  const all = [...enabled, ...combos].filter((m) => MODALIDADES_ALL.includes(m));
  return all;
};

// Duraciones base (se complementarán dinámicamente con el intervalo del horario si falta)
const DURACIONES_BASE = [
  '15 minutos',
  '20 minutos',
  '25 minutos',
  '30 minutos',
  '35 minutos',
  '40 minutos',
  '45 minutos',
  '50 minutos',
  '55 minutos',
  '60 minutos',
  '75 minutos',
  '90 minutos',
  '105 minutos',
  '120 minutos'
];

export default function ModalServicio({ open, onClose, servicio, index, isEditing }) {
  const { addServicio, updateServicio, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipo: '',
    duracion: '60 minutos',
    precio: '',
    modalidad: 'Presencial',
    descripcion: ''
  });
  const [duracionesDisponibles, setDuracionesDisponibles] = useState(DURACIONES_BASE);
  const showAlert = useAlert();

  // Detectar si existe un único bloque de horario y tomar su intervalo como duración fija
  const timetable = user?.timetable || [];
  const singleSchedule = timetable.length === 1 && timetable[0];
  const singleInterval = singleSchedule?.interval; // número de minutos
  // Modalidades permitidas según perfil del usuario
  const allowPresencial = !!user?.cita_presencial;
  const allowVirtual = !!user?.cita_virtual;
  const allowDomicilio = !!user?.cita_domicilio;
  const allowedModalidades = computeAllowedModalidades({ allowPresencial, allowVirtual, allowDomicilio });

  // Cuando abre el modal, preparar duraciones y autoseleccionar duración vinculada al intervalo si aplica
  useEffect(() => {
    if (!open) return;
    // Construir lista de duraciones incluyendo el intervalo si no está
    let lista = [...DURACIONES_BASE];
    if (singleInterval) {
      const label = `${singleInterval} minutos`;
      if (!lista.includes(label)) lista = [label, ...lista];
    }
    setDuracionesDisponibles(lista);

    if (!isEditing) {
      if (singleInterval) {
        setFormData(prev => ({ ...prev, duracion: `${singleInterval} minutos` }));
      } else {
        // Mantener valor por defecto si no hay un solo horario
        setFormData(prev => ({ ...prev }));
      }
    } else if (isEditing && servicio?.duracion) {
      // Asegurar que la duración existente esté en la lista
      const label = servicio.duracion;
      setDuracionesDisponibles(prev => (prev.includes(label) ? prev : [label, ...prev]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, singleInterval, isEditing, servicio?.duracion]);

  useEffect(() => {
    if (isEditing && servicio) {
      setFormData({
        tipo: servicio.tipo || '',
        duracion: servicio.duracion || (singleInterval ? `${singleInterval} minutos` : '60 minutos'),
        precio: servicio.precio || '',
        modalidad: servicio.modalidad || (allowedModalidades[0] || ''),
        descripcion: servicio.descripcion || ''
      });
    } else {
      setFormData({
        tipo: '',
        duracion: singleInterval ? `${singleInterval} minutos` : '60 minutos',
        precio: '',
        modalidad: allowedModalidades[0] || '',
        descripcion: ''
      });
    }
  }, [isEditing, servicio, open, singleInterval, allowPresencial, allowVirtual, allowDomicilio]);

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
        showAlert('success', 'Servicio actualizado correctamente.');
      } else {
        await addServicio(formData);
        showAlert('success', 'Servicio agregado correctamente.');
      }
      onClose();
    } catch (error) {
      console.error('Error al guardar servicio:', error);
      const message = error?.response?.data?.message || 'No se pudo guardar el servicio.';
      showAlert('error', message);
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
                  disabled={!!singleInterval && !isEditing}
                >
                  {duracionesDisponibles.map((duracion) => (
                    <MenuItem key={duracion} value={duracion}>
                      {duracion}
                    </MenuItem>
                  ))}
                </Select>
                {singleInterval && !isEditing && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    Duración fijada por tu intervalo de agenda ({singleInterval} min). Agrega otro bloque de horario para habilitar más duraciones.
                  </Typography>
                )}
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

            <FormControl fullWidth disabled={allowedModalidades.length === 0}>
              <InputLabel>Modalidad de Atención</InputLabel>
              <Select
                name="modalidad"
                value={formData.modalidad}
                onChange={handleChange}
                label="Modalidad de Atención"
                disabled={allowedModalidades.length <= 1}
              >
                {allowedModalidades.map((modalidad) => (
                  <MenuItem key={modalidad} value={modalidad}>
                    {modalidad}
                  </MenuItem>
                ))}
              </Select>
              {allowedModalidades.length === 0 && (
                <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                  No tienes modalidades habilitadas en tu perfil. Activa Presencial, Telemedicina y/o Domicilio en "Información Profesional".
                </Typography>
              )}
              {allowedModalidades.length === 1 && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  Modalidad fijada por tu configuración de perfil.
                </Typography>
              )}
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
            disabled={loading || !formData.tipo || !formData.precio || allowedModalidades.length === 0}
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
