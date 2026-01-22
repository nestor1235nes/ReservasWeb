import React, { useEffect } from 'react';
import { Popover, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert, Box, Paper, Stack, Typography, Card, CardContent, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../schemas/auth';
import { useAuth } from '../context/authContext';

export default function LoginModal({ open, onClose, anchorEl }) {
  const { signin, errors: loginErrors, isAuthenticated } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data) => signin(data);

  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      // close modal and navigate to calendario (same behavior as LoginPage)
      onClose?.();
      navigate('/calendario');
    }
  }, [isAuthenticated]);

  const popOpen = Boolean(anchorEl);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const formContent = (
    <Stack spacing={2.5}>
      {loginErrors?.map((e, i) => (
        <Alert key={i} severity="error" variant="outlined" sx={{ borderColor: 'error.main' }}>{e}</Alert>
      ))}
      <Box>
        <Typography variant="h6" fontWeight={700} sx={{ color: '#2596be' }}>
          Iniciar sesión
        </Typography>
      </Box>
      <form id="login-form" onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2}>
          <TextField
            label="Correo electrónico"
            type="email"
            fullWidth
            variant="outlined"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            label="Contraseña"
            type="password"
            fullWidth
            variant="outlined"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Button
              variant="text"
              size="small"
              onClick={() => {
                onClose?.();
                navigate('/reset-password');
              }}
              sx={{ color: '#2596be', fontWeight: 600, textTransform: 'none', p: 0, justifyContent: 'flex-start' }}
            >
              ¿Olvidaste tu contraseña?
            </Button>
            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={onClose}
                sx={{
                  borderColor: '#2596be',
                  color: '#2596be',
                  fontWeight: 600,
                  flex: 1,
                  '&:hover': {
                    borderColor: '#1e7fa0',
                    backgroundColor: 'rgba(37,150,190,0.08)'
                  }
                }}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                form="login-form" 
                variant="contained" 
                sx={{ 
                  backgroundColor: '#2596be',
                  fontWeight: 600,
                  flex: 1,
                  '&:hover': { backgroundColor: '#1e7fa0' },
                  color: 'white'
                }}
              >
                Iniciar sesión
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </form>
    </Stack>
  );

  // If on mobile, show centered Dialog regardless (render plain formContent to avoid nested Card)
  if (isMobile) {
    return (
      <Dialog open={!!open || popOpen} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogContent sx={{ pt: 3 }}>
          {formContent}
        </DialogContent>
      </Dialog>
    );
  }

  // If anchorEl provided, render as Popover (appears under button, no backdrop)
  if (anchorEl) {
    return (
      <Popover
        open={popOpen}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { borderRadius: 2, boxShadow: 6 } }}
      >
        <Card sx={{ width: 340, boxShadow: 0, border: '2px solid #e3f2fd', '&:hover': { borderColor: '#2596be' } }}>
          <CardContent sx={{ p: 2.5 }}>
            {formContent}
          </CardContent>
        </Card>
      </Popover>
    );
  }

  // Fallback: keep Dialog behavior if anchorEl not provided
  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogContent sx={{ pt: 3 }}>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
