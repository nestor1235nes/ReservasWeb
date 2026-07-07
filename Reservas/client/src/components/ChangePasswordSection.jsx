import React, { useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PasswordRequirements from './ui/PasswordRequirements';
import { changePasswordRequest } from '../api/auth';

export default function ChangePasswordSection({ userEmail }) {
  const primary = '#2596be';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canSubmit = useMemo(() => {
    if (!currentPassword || !newPassword || !confirmNewPassword) return false;
    if (newPassword !== confirmNewPassword) return false;
    return true;
  }, [currentPassword, newPassword, confirmNewPassword]);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (newPassword !== confirmNewPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await changePasswordRequest({ currentPassword, newPassword });
      setSuccess('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (e) {
      const msg = e?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg || 'No se pudo cambiar la contraseña'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, border: '1px solid #e6eef2', boxShadow: 'none', '&:hover': { boxShadow: '0 6px 24px rgba(37,150,190,0.10)', borderColor: '#bfe3ef' }, transition: 'all 0.25s ease' }}>
      <CardContent>
        <Stack spacing={2.5}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(37,150,190,0.10)' }}>
              <LockOutlinedIcon sx={{ color: primary, fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#143b46' }}>Cambiar contraseña</Typography>
              <Typography variant="body2" color="text.secondary">
                {userEmail ? `Cuenta: ${userEmail}` : 'Actualiza tu contraseña de acceso.'}
              </Typography>
            </Box>
          </Box>

          {error && <Alert severity="error" variant="outlined" sx={{ borderColor: 'error.main' }}>{error}</Alert>}
          {success && <Alert severity="success" variant="outlined" sx={{ borderColor: 'success.main' }}>{success}</Alert>}

          <TextField
            label="Contraseña actual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            fullWidth
            variant="outlined"
          />

          <TextField
            label="Nueva contraseña"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            variant="outlined"
          />
          <PasswordRequirements password={newPassword} />

          <TextField
            label="Confirmar nueva contraseña"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            fullWidth
            variant="outlined"
            error={Boolean(confirmNewPassword) && newPassword !== confirmNewPassword}
            helperText={Boolean(confirmNewPassword) && newPassword !== confirmNewPassword ? 'Las contraseñas no coinciden' : ''}
          />

          <Box display="flex" justifyContent="flex-end" sx={{ pt: 1 }}>
            <Button
              variant="contained"
              disabled={!canSubmit || loading}
              onClick={handleSubmit}
              sx={{ backgroundColor: primary, '&:hover': { backgroundColor: '#1e7fa0' }, fontWeight: 700, color: 'white' }}
            >
              Guardar
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
