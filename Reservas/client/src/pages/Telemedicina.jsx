import React, { useEffect, useRef, useState } from 'react';
import axios from '../api/axios';
import DailyIframe from '@daily-co/daily-js';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { useAlert } from '../context/AlertContext';
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
} from '@mui/material';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import CompartirEnlaceTelemedicina from '../components/Modales/CompartirEnlaceTelemedicina';
import PageHeader from '../components/ui/PageHeader';
import PageLayout from '../components/ui/PageLayout';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const Telemedicina = ({ reservaId }) => {
  const { user } = useAuth();
  const showAlert = useAlert();
  const videoRef = useRef(null);
  const [callFrame, setCallFrame] = useState(null);
  const [joined, setJoined] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [loadingShare, setLoadingShare] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const query = useQuery();

  const joinWithToken = async (roomUrl, token) => {
    try {
      const frame = DailyIframe.createFrame(videoRef.current, {
        showLeaveButton: true,
        lang: 'es',
      });
      await frame.join({ url: roomUrl, token });
      setCallFrame(frame);
      setJoined(true);
      try { showAlert && showAlert('success', 'Conectado a la videollamada.'); } catch(_){}
    } catch (err) {
      console.error('Failed to join Daily room', err.response?.data || err.message || err);
      try { showAlert && showAlert('error', 'No se pudo unir a la videollamada.'); } catch(_){}
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
  setSharePassword(resp.data.password || '');
  // Copia solo el link; la clave se comparte por separado
  await navigator.clipboard.writeText(`${resp.data.shareUrl}`);
      try { showAlert && showAlert('success', 'Link copiado.'); } catch(_){}

      // Auto-join as owner (professional) if ownerToken provided
      const ownerToken = resp.data.ownerToken;
      const roomUrl = resp.data.room?.url;
      if (ownerToken && roomUrl) {
        await joinWithToken(roomUrl, ownerToken);
      }
    } catch (error) {
      console.error('Failed to create share link', error.response?.data || error.message);
      const msg = error.response?.data?.message || 'No se pudo crear link de invitación.';
      try { showAlert && showAlert('error', msg); } catch(_){}
    } finally {
      setLoadingShare(false);
    }
  };

  const handleCopyShare = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      try { showAlert && showAlert('success', 'Link copiado.'); } catch(_){}
    }
  };

  const handlePatientJoin = async () => {
    try {
      const sid = query.get('sid');
      if (!sid) { try { showAlert && showAlert('error', 'Link inválido'); } catch(_){}; return; }
      if (!joinPassword) { try { showAlert && showAlert('info', 'Ingresa la clave enviada por tu profesional'); } catch(_){}; return; }
      const resp = await axios.post('/daily/join-public', { shareId: sid, password: joinPassword });
      const { token, room } = resp.data;
      await joinWithToken(room.url, token);
    } catch (error) {
      console.error('Join public failed', error.response?.data || error.message);
      const msg = error.response?.data?.message || 'No se pudo unir. Verifica la clave o solicita un nuevo link.';
      try { showAlert && showAlert('error', msg); } catch(_){}
    }
  };

  return (
    <PageLayout>
      <PageHeader
        icon={<VideoCallIcon />}
        title="Telemedicina"
        subtitle="Videoconsultas con tus pacientes"
      />

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
              {Boolean(shareUrl) && (
                <CompartirEnlaceTelemedicina
                  shareUrlFromParent={shareUrl}
                  shareCodeFromParent={sharePassword}
                />
              )}
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

          <Box sx={{ mb: 2, width: '100%', maxWidth: 760, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
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
            {sharePassword && (
              <TextField
                label="Clave para el paciente"
                value={sharePassword}
                size="small"
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <Tooltip title="Copiar clave">
                      <IconButton onClick={async () => { await navigator.clipboard.writeText(sharePassword); try { showAlert && showAlert('success', 'Clave copiada.'); } catch(_){} }}>
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>
                  )
                }}
              />
            )}
          </Box>

          <Card sx={{ border: '1px solid #e0e0e0' }}>
            <CardContent sx={{ p: 0 }}>
              <Box ref={videoRef} sx={{ width: '100%', height: { xs: '60vh', md: '80vh' }, background: '#000' }} />
            </CardContent>
          </Card>

          {query.get('sid') && !joined && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mt={2} alignItems="center" justifyContent="center">
              <TextField label="Clave de la sesión" value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} size="small" />
              <Button variant="contained" onClick={handlePatientJoin}>Unirme a la videollamada</Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default Telemedicina;
