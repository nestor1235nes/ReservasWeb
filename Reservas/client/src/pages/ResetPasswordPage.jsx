import React, { useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, Stack, TextField, Typography, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PasswordRequirements from '../components/ui/PasswordRequirements';
import { requestPasswordResetRequest, resetPasswordRequest } from '../api/auth';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const primary = '#2596be';

  const [step, setStep] = useState(1); // 1=request, 2=reset
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [email, setEmail] = useState('');
  const [phoneMasked, setPhoneMasked] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const canSubmitRequest = useMemo(() => Boolean(email && /.+@.+\..+/.test(email)), [email]);
  const canSubmitReset = useMemo(() => {
    if (!email || !code || !password || !confirmPassword) return false;
    if (!/^\d{6}$/.test(code)) return false;
    if (password !== confirmPassword) return false;
    return true;
  }, [email, code, password, confirmPassword]);

  const handleRequest = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const resp = await requestPasswordResetRequest(email.trim());
      setPhoneMasked(resp?.data?.phoneMasked || '');
      setStep(2);
      setSuccess('Te enviamos un código por WhatsApp. Ingresa el código para restablecer tu contraseña.');
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo enviar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError('');
    setSuccess('');
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordRequest({
        email: email.trim(),
        code: code.trim(),
        password,
      });
      setSuccess('Contraseña actualizada. Ya puedes iniciar sesión.');
      setTimeout(() => navigate('/login'), 700);
    } catch (e) {
      const msg = e?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg || 'No se pudo restablecer la contraseña'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" sx={{ background: 'linear-gradient(180deg, #ffffff 0%, #f7fbfd 100%)', p: 2 }}>
      <Card sx={{ maxWidth: 520, width: '100%', border: '2px solid #e3f2fd', '&:hover': { boxShadow: 6, borderColor: primary } }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ color: primary }}>Restablecer contraseña</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Te enviaremos un código por WhatsApp al teléfono asociado a tu cuenta.
              </Typography>
            </Box>

            {error && <Alert severity="error" variant="outlined" sx={{ borderColor: 'error.main' }}>{error}</Alert>}
            {success && <Alert severity="success" variant="outlined" sx={{ borderColor: 'success.main' }}>{success}</Alert>}

            {step === 1 && (
              <Stack spacing={2.5}>
                <TextField
                  label="Correo electrónico"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  variant="outlined"
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
                  <Button 
                    variant="outlined" 
                    onClick={() => navigate('/login')}
                    sx={{ borderColor: primary, color: primary, '&:hover': { borderColor: '#1e7fa0', backgroundColor: 'rgba(37,150,190,0.08)' } }}
                  >
                    Volver
                  </Button>
                  <Button
                    variant="contained"
                    disabled={!canSubmitRequest || loading}
                    onClick={handleRequest}
                    sx={{ backgroundColor: primary, '&:hover': { backgroundColor: '#1e7fa0' }, fontWeight: 700, color: 'white' }}
                  >
                    Enviar código
                  </Button>
                </Stack>
              </Stack>
            )}

            {step === 2 && (
              <Stack spacing={2.5}>
                <Box sx={{ bgcolor: '#f0f8ff', border: '1px solid #cfe9f3', borderRadius: 1.5, p: 1.5 }}>
                  <Typography variant="body2" color={primary} fontWeight={600}>
                    {phoneMasked ? `Código enviado a ${phoneMasked}` : 'Código enviado'}
                  </Typography>
                </Box>

                <TextField
                  label="Correo electrónico"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  variant="outlined"
                />

                <TextField
                  label="Código (6 dígitos)"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  fullWidth
                  variant="outlined"
                  placeholder="123456"
                />

                <TextField
                  label="Nueva contraseña"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  variant="outlined"
                />
                <PasswordRequirements password={password} />

                <TextField
                  label="Confirmar nueva contraseña"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  variant="outlined"
                  error={Boolean(confirmPassword) && password !== confirmPassword}
                  helperText={Boolean(confirmPassword) && password !== confirmPassword ? 'Las contraseñas no coinciden' : ''}
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
                  <Button 
                    variant="outlined" 
                    disabled={loading} 
                    onClick={handleRequest}
                    sx={{ borderColor: primary, color: primary, '&:hover': { borderColor: '#1e7fa0', backgroundColor: 'rgba(37,150,190,0.08)' } }}
                  >
                    Reenviar código
                  </Button>
                  <Button
                    variant="contained"
                    disabled={!canSubmitReset || loading}
                    onClick={handleReset}
                    sx={{ backgroundColor: primary, '&:hover': { backgroundColor: '#1e7fa0' }, fontWeight: 700, color: 'white' }}
                  >
                    Cambiar contraseña
                  </Button>
                </Stack>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
