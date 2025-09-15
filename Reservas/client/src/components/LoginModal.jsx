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
    <>
      {loginErrors?.map((e, i) => (
        <Alert key={i} severity="error" sx={{ mb: 1 }}>{e}</Alert>
      ))}
      <Typography variant="h6" gutterBottom>Iniciar sesión</Typography>
      <form id="login-form" onSubmit={handleSubmit(onSubmit)}>
        <TextField
          label="Correo electrónico"
          type="email"
          fullWidth
          margin="normal"
          {...register('email')}
          error={!!errors.email}
          helperText={errors.email?.message}
        />
        <TextField
          label="Contraseña"
          type="password"
          fullWidth
          margin="normal"
          {...register('password')}
          error={!!errors.password}
          helperText={errors.password?.message}
        />
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="login-form" variant="contained" sx={{ backgroundColor: '#2596be', '&:hover': { backgroundColor: '#1e7fa0' } }}>Iniciar sesión</Button>
        </Stack>
      </form>
    </>
  );

  // If on mobile, show centered Dialog regardless (render plain formContent to avoid nested Card)
  if (isMobile) {
    return (
      <Dialog open={!!open || popOpen} onClose={onClose} fullWidth maxWidth="xs">
        <DialogContent>
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
        <Box sx={{ p: 1 }}>
          <Card sx={{ width: 320, boxShadow: 0 }}>
            <CardContent>
              {formContent}
            </CardContent>
          </Card>
        </Box>
      </Popover>
    );
  }

  // Fallback: keep Dialog behavior if anchorEl not provided
  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Iniciar sesión</DialogTitle>
      <DialogContent>
  {formContent}
      </DialogContent>
    </Dialog>
  );
}
