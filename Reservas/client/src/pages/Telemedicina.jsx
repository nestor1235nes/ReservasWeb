import React, { useEffect, useRef, useState } from 'react';
import axios from '../api/axios';
import DailyIframe from '@daily-co/daily-js';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Stack,
  TextField,
  IconButton,
  Tooltip,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const Telemedicina = ({ reservaId }) => {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const [callFrame, setCallFrame] = useState(null);
  const [joined, setJoined] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [loadingShare, setLoadingShare] = useState(false);
  const query = useQuery();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const joinWithToken = async (roomUrl, token) => {
    try {
      const frame = DailyIframe.createFrame(videoRef.current, { showLeaveButton: true });
      await frame.join({ url: roomUrl, token });
      setCallFrame(frame);
      setJoined(true);
    } catch (err) {
      console.error('Failed to join Daily room', err.response?.data || err.message || err);
      alert('No se pudo unir a la videollamada.');
    }
  };

  const joinRoom = async () => {
    try {
      const roomName = `reserva_${reservaId || 'public'}`;
      const resp = await axios.post('/daily/token', { roomName });
      const { token, room } = resp.data;
      await joinWithToken(room.url, token);
    } catch (error) {
      console.error('Failed to get token', error.response?.data || error.message);
      alert('No se pudo iniciar la videollamada.');
    }
  };

  useEffect(() => {
    // If url and token are present in query params, auto-join (for patient links)
    const url = query.get('url');
    const token = query.get('token');
    if (url && token) {
      joinWithToken(url, token);
    }

    return () => {
      if (callFrame) {
        callFrame.leave();
        callFrame.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateShareLink = async () => {
    try {
      setLoadingShare(true);
      const resp = await axios.post('/daily/share');
      setShareUrl(resp.data.shareUrl);
      await navigator.clipboard.writeText(resp.data.shareUrl);

      // Auto-join as owner (professional) if ownerToken provided
      const ownerToken = resp.data.ownerToken;
      const roomUrl = resp.data.room?.url;
      if (ownerToken && roomUrl) {
        await joinWithToken(roomUrl, ownerToken);
      }
    } catch (error) {
      console.error('Failed to create share link', error.response?.data || error.message);
      alert('No se pudo crear link de invitación.');
    } finally {
      setLoadingShare(false);
    }
  };

  const handleCopyShare = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <Box
      maxWidth={isMobile ? '100%' : '100%'}
      width="100%"
      mx="auto"
      px={isMobile ? 0 : 0}
      py={isMobile ? 0 : 0}
    >
      <Stack direction={isMobile ? 'column' : 'row'} justifyContent="space-between" alignItems={isMobile ? 'stretch' : 'center'} spacing={2} p={2} borderRadius={1} sx={{ background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)' }}>
        <Typography variant="h5" fontWeight={700} color="white">Telemedicina</Typography>
      </Stack>

      <Card sx={{ mt: 2 }}>
        <CardHeader sx={{ pb: 0 }} title={null} />
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: -2, backgroundColor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
          {/* Placeholder for future filters */}
        </Box>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" mb={2}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={600}>{user?.username}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.especialidad || ''}</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              {!joined ? (
                <Button startIcon={<VideoCameraFrontIcon />} variant="contained" sx={{ background: '#2596be' }} onClick={generateShareLink}>
                  Generar link e iniciar llamada
                </Button>
              ) : (
                <Button startIcon={<ExitToAppIcon />} variant="outlined" color="error" onClick={() => { callFrame?.leave(); setJoined(false); }}>
                  Salir
                </Button>
              )}
            </Stack>
          </Stack>

          <Box sx={{ mb: 2, width: '100%', maxWidth: 760, mx: 'auto', display: 'flex', justifyContent: 'center' }}>
            <TextField
              label="Link de invitación"
              value={shareUrl}
              fullWidth
              size="small"
              InputProps={{
                endAdornment: (
                  <Tooltip title="Copiar link">
                    <IconButton onClick={handleCopyShare}><ContentCopyIcon /></IconButton>
                  </Tooltip>
                )
              }}
              placeholder="Genera un link para invitar pacientes"
              onChange={() => {}}
            />
          </Box>

          <Card sx={{ border: '1px solid #e0e0e0' }}>
            <CardContent sx={{ p: 0 }}>
              <Box ref={videoRef} sx={{ width: '100%', height: { xs: '60vh', md: '80vh' }, background: '#000' }} />
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Telemedicina;
