import { useState } from "react";
import { 
  TextField, 
  Button, 
  Box, 
  Alert, 
  DialogActions, 
  DialogContent,
  Paper,
  Card,
  CardHeader,
  CardContent,
  Avatar,
  Typography,
  Fade,
  LinearProgress,
  Chip,
  InputAdornment,
  IconButton
} from "@mui/material";
import { 
  PersonAdd, 
  Badge, 
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff 
} from "@mui/icons-material";
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <Box>
      {/* Card principal con header profesional */}
      <Card 
        elevation={0} 
        sx={{ 
          borderRadius: 2,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(37, 150, 190, 0.02) 0%, rgba(33, 203, 230, 0.02) 100%)'
        }}
      >
        {/* Header con gradiente */}
        <CardHeader
          avatar={
            <Avatar 
              sx={{ 
                bgcolor: 'transparent',
                background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)',
                width: 56,
                height: 56
              }}
            >
              <PersonAdd sx={{ fontSize: 28, color: 'white' }} />
            </Avatar>
          }
          title={
            <Typography variant="h6" fontWeight="600" color="#2596be">
              Registrar Asistente
            </Typography>
          }
          subheader={
            <Typography variant="body2" color="text.secondary">
              Complete la información para crear una nueva cuenta de asistente
            </Typography>
          }
          sx={{
            background: 'linear-gradient(135deg, rgba(37, 150, 190, 0.08) 0%, rgba(33, 203, 230, 0.08) 100%)',
            borderBottom: '1px solid rgba(37, 150, 190, 0.1)',
            pb: 2
          }}
        />

        <CardContent sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            {/* Barra de progreso durante carga */}
            {loading && (
              <Fade in={loading}>
                <Box sx={{ mb: 2 }}>
                  <LinearProgress 
                    sx={{
                      backgroundColor: 'rgba(37, 150, 190, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #2596be 0%, #21cbe6 100%)'
                      }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Registrando asistente...
                  </Typography>
                </Box>
              </Fade>
            )}

            {/* Alertas de error */}
            {registerErrors.map((error, i) => (
              <Fade in key={i}>
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 2,
                    borderRadius: 2,
                    '& .MuiAlert-icon': {
                      color: '#d32f2f'
                    }
                  }}
                >
                  {error}
                </Alert>
              </Fade>
            ))}

            {/* Campo nombre de usuario */}
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
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: '#2596be' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2596be',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2596be',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#2596be',
                },
              }}
            />

            {/* Campo email */}
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
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: '#2596be' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2596be',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2596be',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#2596be',
                },
              }}
            />

            {/* Campo contraseña */}
            <TextField
              label="Contraseña"
              name="password"
              type={showPassword ? "text" : "password"}
              fullWidth
              margin="normal"
              value={formData.password}
              onChange={handleChange}
              error={!!formErrors.password}
              helperText={formErrors.password}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: '#2596be' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={loading}
                      sx={{ color: '#2596be' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2596be',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2596be',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#2596be',
                },
              }}
            />

            {/* Campo confirmar contraseña */}
            <TextField
              label="Confirmar contraseña"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              fullWidth
              margin="normal"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!formErrors.confirmPassword}
              helperText={formErrors.confirmPassword}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: '#2596be' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      disabled={loading}
                      sx={{ color: '#2596be' }}
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2596be',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2596be',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#2596be',
                },
              }}
            />
          </form>
        </CardContent>
      </Card>

      {/* Footer con botones */}
      <DialogActions 
        sx={{ 
          px: 3, 
          py: 2,
          borderTop: '1px solid rgba(37, 150, 190, 0.1)',
          background: 'rgba(37, 150, 190, 0.02)',
          gap: 2
        }}
      >
        <Button 
          onClick={onClose} 
          disabled={loading}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
            px: 3,
            color: '#666',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            }
          }}
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained" 
          disabled={loading}
          startIcon={loading ? null : <PersonAdd />}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 4,
            py: 1.5,
            background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)',
            boxShadow: '0 4px 12px rgba(37, 150, 190, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1e7a9e 0%, #1ba5b8 100%)',
              boxShadow: '0 6px 20px rgba(37, 150, 190, 0.4)',
              transform: 'translateY(-1px)',
            },
            '&:disabled': {
              background: 'rgba(37, 150, 190, 0.3)',
              color: 'white',
            },
            transition: 'all 0.3s ease'
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box 
                sx={{ 
                  width: 16, 
                  height: 16, 
                  border: '2px solid currentColor',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }}
              />
              Registrando...
            </Box>
          ) : (
            'Registrar Asistente'
          )}
        </Button>
      </DialogActions>
    </Box>
  );
}