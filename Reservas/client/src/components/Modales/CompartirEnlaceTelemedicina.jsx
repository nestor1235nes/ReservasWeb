import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  Button,
  Tabs,
  Tab,
  TextField,
  Typography,
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import VideocamIcon from '@mui/icons-material/Videocam';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/authContext';
import { getReservasRequest } from '../../api/reservas';
import axios from '../../api/axios';
import sendWhatsAppMessage from '../../sendWhatsAppMessage';

function combineDateTime(dateLike, timeStr) {
  try {
    if (!dateLike) return null;
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return null;
    if (typeof timeStr === 'string' && /^\d{2}:\d{2}/.test(timeStr)) {
      const [hh, mm] = timeStr.split(':').map(Number);
      d.setHours(hh, mm, 0, 0);
    }
    return d;
  } catch {
    return null;
  }
}

function isTelemedicina(modalidad) {
  if (!modalidad) return false;
  return /telemedicina|virtual/i.test(String(modalidad));
}

const telePlaceholders = [
  { token: '{nombre}', label: 'nombre' },
  { token: '{fecha}', label: 'fecha' },
  { token: '{hora}', label: 'hora' },
  { token: '{servicio}', label: 'servicio' },
  { token: '{profesional}', label: 'profesional' },
  { token: '{sucursal}', label: 'sucursal' },
  { token: '{enlaceTelemedicina}', label: 'enlace' },
  { token: '{codigoTelemedicina}', label: 'código' },
];

const CompartirEnlaceTelemedicina = ({ shareUrlFromParent, shareCodeFromParent }) => {
  const showAlert = useAlert();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [openSend, setOpenSend] = useState(false);
  const [sendTab, setSendTab] = useState('pre');
  const [generating, setGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareCode, setShareCode] = useState('');
  const nearest = items?.[0] || null;
  const pacienteNombre = nearest?.paciente?.nombre || nearest?.paciente?.rut || 'Paciente';
  const [customMsg, setCustomMsg] = useState('');
  const customInputRef = React.useRef(null);

  const handleOpen = async () => {
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!open) return;
      setLoading(true);
      try {
        const resp = await getReservasRequest();
        const reservas = Array.isArray(resp.data) ? resp.data : [];
        const now = new Date();
        const telePendientes = reservas
          .map((r) => {
            const when = combineDateTime(r.siguienteCita || r.diaPrimeraCita, r.hora);
            return { ...r, when };
          })
          .filter((r) => isTelemedicina(r.modalidad) && r.when && r.when >= now)
          .sort((a, b) => a.when - b.when);
        setItems(telePendientes);
      } catch (e) {
        console.error('Error cargando reservas telemedicina:', e?.response?.data || e?.message);
        try { showAlert && showAlert('error', 'No se pudo cargar la lista de telemedicina.'); } catch (_) {}
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [open, showAlert]);

  const templateMessage = useMemo(() => {
    const nombre = pacienteNombre || 'Paciente';
    const link = shareUrl || '[link]';
    const codigo = shareCode || '[código]';
    return `Estimado/a ${nombre}, para su cita en línea debe conectarse al siguiente link: ${link} con el siguiente código: ${codigo}. Por favor, no comparta este código con nadie más. Si necesita ayuda, responda a este mensaje.`;
  }, [pacienteNombre, shareUrl, shareCode]);

  const handleOpenSend = async () => {
    if (!nearest) return;
    setOpenSend(true);
    setSendTab('pre');
    setGenerating(true);
    try {
      const link = shareUrlFromParent || '';
      const code = shareCodeFromParent || '';
      if (!link || !code) {
        try { showAlert && showAlert('info', 'Primero genera el link de videollamada.'); } catch(_) {}
        setOpenSend(false);
        return;
      }
      setShareUrl(link);
      setShareCode(code);
      // Prefill personalizado con el template incluyendo link y código
      setCustomMsg(`Estimado/a ${pacienteNombre}, para su cita en línea debe conectarse al siguiente link: ${link} con el siguiente código: ${code}. Por favor, no comparta este código con nadie más. Si necesita ayuda, responda a este mensaje.`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyMessage = async () => {
    const text = sendTab === 'pre' ? templateMessage : customMsg;
    try {
      await navigator.clipboard.writeText(text);
      try { showAlert && showAlert('success', 'Mensaje copiado al portapapeles.'); } catch(_) {}
    } catch {
      try { showAlert && showAlert('error', 'No se pudo copiar el mensaje.'); } catch(_) {}
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      try { showAlert && showAlert('success', 'Link copiado.'); } catch(_) {}
    } catch {
      try { showAlert && showAlert('error', 'No se pudo copiar el link.'); } catch(_) {}
    }
  };

  const handleSend = async () => {
    if (!nearest) return;
    // Inyectar enlace/código de telemedicina en caso de placeholders
    const base = sendTab === 'pre' ? templateMessage : (customMsg || '').trim();
    const text = base
      .replaceAll('{enlaceTelemedicina}', shareUrl || '')
      .replaceAll('{codigoTelemedicina}', shareCode || '');
    if (!text) {
      try { showAlert && showAlert('info', 'Escribe un mensaje para enviar.'); } catch(_) {}
      return;
    }
    try {
      const report = await sendWhatsAppMessage([nearest], text, user);
      if (report?.sent > 0 && report?.failed === 0) {
        try { showAlert && showAlert('success', 'Mensaje enviado por WhatsApp.'); } catch(_) {}
        setOpenSend(false);
      } else {
        const detail = report?.details?.[0]?.reason || 'No se pudo enviar el mensaje.';
        try { showAlert && showAlert('warning', `Envío parcial o fallido: ${detail}`); } catch(_) {}
      }
    } catch (e) {
      console.error('Error enviando WhatsApp:', e?.response?.data || e?.message || e);
      try { showAlert && showAlert('error', 'No se pudo enviar el mensaje por WhatsApp.'); } catch(_) {}
    }
  };

  const content = useMemo(() => {
    if (loading) {
      return (
        <Box py={4} display="flex" alignItems="center" justifyContent="center">
          <CircularProgress size={28} />
        </Box>
      );
    }
    if (!items.length) {
      return (
        <Box py={3} textAlign="center" color="text.secondary">
          No hay pacientes pendientes con modalidad de telemedicina.
        </Box>
      );
    }
    return (
      <List dense>
        {items.map((r, idx) => {
          const nombre = r?.paciente?.nombre || r?.paciente?.rut || 'Paciente';
          const fecha = r?.when ? r.when.toLocaleDateString() : '';
          const hora = r?.when ? r.when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (r?.hora || '');
          const servicio = r?.servicio || 'Consulta';
          return (
            <React.Fragment key={r._id || idx}>
              <ListItem alignItems="flex-start" secondaryAction={idx === 0 && Boolean(shareUrlFromParent) ? (
                <Button size="small" variant="contained" sx={{ background: '#2596be' }} onClick={handleOpenSend}>
                  Enviar link
                </Button>
              ) : null}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: '#2596be' }}>
                    {String(nombre).trim().charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={nombre}
                  secondary={
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Chip size="small" icon={<ScheduleIcon />} label={`${fecha} · ${hora}`} variant="outlined" />
                      <Chip size="small" label={servicio} variant="outlined" />
                    </Stack>
                  }
                />
              </ListItem>
              {idx < items.length - 1 && <Divider component="li" />}
            </React.Fragment>
          );
        })}
      </List>
    );
  }, [items, loading]);

  return (
    <>
      <Tooltip title="Compartir enlace de telemedicina">
        <IconButton onClick={handleOpen} sx={{ color: '#2596be' }} aria-label="compartir enlace" disabled={!shareUrlFromParent}>
          <ShareIcon />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          Pacientes con telemedicina pendiente
        </DialogTitle>
        <DialogContent dividers>
          {content}
        </DialogContent>
      </Dialog>

      {/* Modal de envío */}
      <Dialog open={openSend} onClose={() => setOpenSend(false)} fullWidth maxWidth="sm">
        <DialogTitle>Enviar enlace de telemedicina</DialogTitle>
        <DialogContent dividers>
          {generating ? (
            <Box py={3} display="flex" alignItems="center" justifyContent="center">
              <CircularProgress size={28} />
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Paciente: <strong>{pacienteNombre}</strong>
              </Typography>
              <Tabs
                value={sendTab}
                onChange={(_, v) => setSendTab(v)}
                variant="fullWidth"
                sx={{ mb: 2 }}
              >
                <Tab value="pre" label="Mensaje predeterminado" />
                <Tab value="custom" label="Mensaje personalizado" />
              </Tabs>
              {sendTab === 'pre' ? (
                <Box>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{templateMessage}</Typography>
                </Box>
              ) : (
                <TextField
                  label="Mensaje personalizado"
                  multiline
                  minRows={5}
                  fullWidth
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  inputRef={customInputRef}
                />
              )}
              {sendTab === 'custom' && (
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                  {telePlaceholders.map((ph) => (
                    <Chip key={ph.token} label={ph.token} size="small" onClick={() => {
                      const el = customInputRef.current;
                      if (!el) { setCustomMsg((prev) => (prev || '') + ph.token); return; }
                      const start = el.selectionStart ?? customMsg.length;
                      const end = el.selectionEnd ?? customMsg.length;
                      const next = (customMsg || '').slice(0, start) + ph.token + (customMsg || '').slice(end);
                      setCustomMsg(next);
                      // reposicionar el cursor después del token
                      setTimeout(() => {
                        el.focus();
                        const pos = start + ph.token.length;
                        el.setSelectionRange(pos, pos);
                      }, 0);
                    }} />
                  ))}
                </Stack>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSend(false)}>Cerrar</Button>
          <Button variant="contained" startIcon={<WhatsAppIcon />} sx={{ background: '#25D366', '&:hover': { background: '#1ebe57' } }} onClick={handleSend} disabled={generating || (!shareUrl)}>
            Enviar mensaje
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CompartirEnlaceTelemedicina;
