import React, { useMemo, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Stack,
  Divider,
  TextField,
} from '@mui/material';
import TopAppBar from '../components/ui/TopAppBar';
import SiteFooter from '../components/ui/SiteFooter';
import Rutificador from '../components/Rutificador';
import { requestPatientOtpRequest, verifyPatientOtpRequest } from '../api/patientAuth';

const STORAGE_KEY = 'patient_rut';
const TOKEN_KEY = 'patient_token';
const BRAND_GRADIENT = 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)';

export default function PacienteLoginPage() {
  const navigate = useNavigate();

  const [validatedRut, setValidatedRut] = useState('');
  const [isRutValid, setIsRutValid] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('rut'); // 'rut' | 'otp'
  const [phoneMasked, setPhoneMasked] = useState('');
  const [code, setCode] = useState('');

  const primary = '#2596be';

  const canRequestOtp = useMemo(() => !!validatedRut && isRutValid && !loading, [validatedRut, isRutValid, loading]);
  const canVerify = useMemo(() => !!validatedRut && isRutValid && /^\d{6}$/.test(code) && !loading, [validatedRut, isRutValid, code, loading]);

  const handleRequestOtp = async () => {
    setError('');
    if (!validatedRut || !isRutValid) return;
    try {
      setLoading(true);
      const resp = await requestPatientOtpRequest(validatedRut);
      if (!resp?.data?.ok) {
        setError(resp?.data?.message || 'No se pudo enviar el código.');
        return;
      }
      setPhoneMasked(resp?.data?.phoneMasked || '');
      setStage('otp');
      setCode('');
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo enviar el código.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    if (!canVerify) return;
    try {
      setLoading(true);
      const resp = await verifyPatientOtpRequest(validatedRut, code);
      if (!resp?.data?.ok || !resp?.data?.token) {
        setError(resp?.data?.message || 'Código inválido.');
        return;
      }
      localStorage.setItem(STORAGE_KEY, validatedRut);
      localStorage.setItem(TOKEN_KEY, resp.data.token);
      navigate('/paciente/portal');
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo verificar el código.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #ffffff 0%, #f7fbfd 100%)' }}>
      <TopAppBar />

      <Box sx={{ width: '100%', maxWidth: 520, alignSelf: 'center', flex: 1, p: { xs: 1.5, sm: 3 }, display: 'flex', alignItems: 'center' }}>
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
              Acceso Paciente
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ingresa tu RUT para ver tu información clínica y tus atenciones.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Rutificador
              onRutValidated={(rut) => setValidatedRut(rut)}
              onValidChange={(ok) => setIsRutValid(!!ok)}
              exampleText="Ej: 12345678-9"
            />

            {stage === 'otp' ? (
              <>
                <Alert severity="info" sx={{ mt: 2 }}>
                  Te enviamos un código por WhatsApp{phoneMasked ? ` al número terminado en ${phoneMasked}` : ''}.
                </Alert>
                <TextField
                  label="Código (6 dígitos)"
                  value={code}
                  onChange={(e) => setCode(String(e.target.value || '').replace(/\D/g, '').slice(0, 6))}
                  fullWidth
                  sx={{ mt: 2 }}
                  inputProps={{ inputMode: 'numeric' }}
                />
              </>
            ) : null}

            <Button
              variant="contained"
              fullWidth
              disabled={stage === 'rut' ? !canRequestOtp : !canVerify}
              onClick={stage === 'rut' ? handleRequestOtp : handleVerify}
              sx={{
                mt: 1,
                background: BRAND_GRADIENT,
                '&:hover': { opacity: 0.95, background: BRAND_GRADIENT },
                py: 1.5,
                fontWeight: 800,
              }}
            >
              {loading ? (stage === 'rut' ? 'Enviando…' : 'Verificando…') : (stage === 'rut' ? 'Enviar código por WhatsApp' : 'Verificar y entrar')}
            </Button>

            {stage === 'otp' ? (
              <Button
                variant="text"
                fullWidth
                disabled={loading}
                onClick={handleRequestOtp}
                sx={{ mt: 0.5, fontWeight: 800 }}
              >
                Reenviar código
              </Button>
            ) : null}

            <Divider sx={{ my: 2 }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Button component={RouterLink} to="/" variant="text" sx={{ color: primary, fontWeight: 700 }}>
                Volver al inicio
              </Button>
              <Button component={RouterLink} to="/front-users" variant="text" color="inherit">
                ¿Eres profesional?
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <SiteFooter />
    </Box>
  );
}
