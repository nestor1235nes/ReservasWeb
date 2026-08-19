import React, { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';
import axios from '../api/axios';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Stack,
  Button,
  TextField,
  Avatar,
  Chip,
  Divider,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { useAlert } from '../context/AlertContext';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import SecurityIcon from '@mui/icons-material/Security';
import VideocamIcon from '@mui/icons-material/Videocam';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import TopAppBar from '../components/ui/TopAppBar';
import SiteFooter from '../components/ui/SiteFooter';

const PatientSession = () => {
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const location = useLocation();
  const [joined, setJoined] = useState(false);
  const showAlert = useAlert();

  useEffect(() => {
    // No auto-join; the patient must provide the session password
    return () => {
      const frame = frameRef.current;
      if (frame) {
        try { frame.leave(); frame.destroy(); } catch (e) {}
        frameRef.current = null;
      }
    };
  }, [location]);

  const q = new URLSearchParams(location.search);
  const professionalName = q.get('name') || 'Profesional';
  const sid = q.get('sid');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleJoin = async () => {
    try {
      if (!sid) { try { showAlert && showAlert('error', 'Link inválido'); } catch(_){}; return; }
      if (!password) { try { showAlert && showAlert('info', 'Ingresa la clave enviada por tu profesional'); } catch(_){}; return; }
      const resp = await axios.post('/daily/join-public', { shareId: sid, password });
      const { token, room } = resp.data;
      const frame = DailyIframe.createFrame(videoRef.current, {
        showLeaveButton: true,
        lang: 'es',
      });
      await frame.join({ url: room.url, token });
      frameRef.current = frame;
      setJoined(true);
      try { showAlert && showAlert('success', 'Conectado a la videollamada.'); } catch(_){}
    } catch (e) {
      console.error('Failed to join as patient', e.response?.data || e.message);
      const msg = e.response?.data?.message || 'No se pudo unir a la videollamada. Verifica la clave.';
      try { showAlert && showAlert('error', msg); } catch(_){}
    }
  };

  const handleLeave = () => {
    if (frameRef.current) {
      frameRef.current.leave();
      frameRef.current.destroy();
      frameRef.current = null;
      setJoined(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%', background: 'linear-gradient(180deg, #e9f5f9 0%, #ffffff 100%)' }}>
      <TopAppBar />
      <Box sx={{ width: '100%', maxWidth: 1100, alignSelf: 'center', flex: 1, p: { xs: 1.5, sm: 3 } }}>
        {/* Encabezado elegante */}
        <Card sx={{ mb: 2, border: '1px solid #d6eef6' }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: '#2596be', width: 48, height: 48 }}>
                  {String(professionalName).trim().charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>Sesión con {professionalName}</Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                    <Chip size="small" color="primary" icon={<VideocamIcon />} label="Telemedicina" variant="outlined" />
                    <Chip size="small" color="success" icon={<SecurityIcon />} label="Enlace seguro" variant="outlined" />
                  </Stack>
                </Box>
              </Stack>
              <Button
                variant="outlined"
                startIcon={<ExitToAppIcon />}
                color="error"
                onClick={handleLeave}
                sx={{ textTransform: 'none' }}
              >
                {joined ? 'Salir' : 'Cerrar'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Panel de acceso (antes del video) */}
        {!joined && (
          <Card sx={{ mb: 2, border: '1px solid #d6eef6' }}>
            <CardHeader title={<Typography variant="subtitle1" fontWeight={700}>Unirme a la videollamada</Typography>} />
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <TextField
                  label="Clave de la sesión"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  size="small"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" aria-label="mostrar clave">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  helperText="Ingresa la clave que te compartió tu profesional"
                />
                <Button
                  variant="contained"
                  startIcon={<VideocamIcon />}
                  onClick={handleJoin}
                  sx={{
                    top: -13,
                    minWidth: { xs: '100%', sm: 230 },
                    textTransform: 'none',
                    bgcolor: '#2596be',
                    '&:hover': { bgcolor: '#1f84a7' },
                    color: 'white',
                  }}
                >
                  Unirme a la videollamada
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Área de video */}
        <Card sx={{ border: '1px solid #d6eef6' }}>
          <CardContent sx={{ p: 0 }}>
            <Box
              ref={videoRef}
              sx={{
                width: '100%',
                height: { xs: '65vh', sm: '70vh', md: '78vh' },
                background: '#000',
              }}
            />
          </CardContent>
        </Card>

        {/* Nota informativa */}
        {!joined && (
          <Box mt={1.5}>
            <Typography variant="caption" color="text.secondary">
              Consejo: asegúrate de estar en un lugar tranquilo y con buena conexión a internet.
            </Typography>
          </Box>
        )}
    </Box>
    <SiteFooter />
  </Box>
  );
};

export default PatientSession;
