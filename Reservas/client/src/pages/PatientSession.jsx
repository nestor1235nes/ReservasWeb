import React, { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { useLocation } from 'react-router-dom';
import { Box, Card, CardContent, CardHeader, Typography, Stack, Button } from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

const PatientSession = () => {
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const location = useLocation();
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const url = q.get('url');
    const token = q.get('token');
    if (url && token) {
      const frame = DailyIframe.createFrame(videoRef.current, { showLeaveButton: true });
      frame.join({ url, token })
        .then(() => setJoined(true))
        .catch((e) => {
          console.error('Failed to join as patient', e);
          alert('No se pudo unir a la videollamada.');
        });
      frameRef.current = frame;
      return () => {
        try {
          frame.leave();
          frame.destroy();
        } catch (e) {}
      };
    }
  }, [location]);

  const q = new URLSearchParams(location.search);
  const professionalName = q.get('name') || 'Profesional';

  const handleLeave = () => {
    if (frameRef.current) {
      frameRef.current.leave();
      frameRef.current.destroy();
      frameRef.current = null;
      setJoined(false);
    }
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center" p={2}>
      <Card sx={{ width: '100%', maxWidth: 1000, mb: 2, border: '2px solid #e3f2fd' }}>
        <CardHeader
          title={<Typography variant="h6" fontWeight={700}>Sesión con {professionalName}</Typography>}
          subheader={<Typography variant="body2">Esta vista es una versión simplificada para pacientes.</Typography>}
        />
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>{professionalName}</Typography>
              <Typography variant="body2" color="text.secondary">Conéctate con tu especialista en línea.</Typography>
            </Box>
            <Box>
              <Button variant="outlined" startIcon={<ExitToAppIcon />} color="error" onClick={handleLeave}>
                {joined ? 'Salir' : 'Cerrar'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ width: '100%', maxWidth: 1000 }}>
        <CardContent sx={{ p: 0 }}>
          <Box ref={videoRef} sx={{ width: '100%', height: { xs: '60vh', md: '80vh' }, background: '#000' }} />
        </CardContent>
      </Card>
    </Box>
  );
};

export default PatientSession;
