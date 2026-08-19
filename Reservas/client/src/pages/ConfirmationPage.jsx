import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { resolveToken, confirmByToken, cancelByToken, requestReschedule } from '../api/confirmation.js';
import { Box, Card, CardContent, Typography, Button, Stack, Alert, Divider } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import TopAppBar from '../components/ui/TopAppBar';
import SiteFooter from '../components/ui/SiteFooter';
import VitalinkLoader from '../components/ui/VitalinkLoader';

// Etiqueta y estilo (paleta del sistema) según el estado de la cita
const STATUS_META = {
  pending: { label: 'Pendiente', bg: 'rgba(37,150,190,0.10)', fg: '#1b7d9c' },
  confirmed: { label: 'Confirmada', bg: 'rgba(22,163,74,0.10)', fg: '#15803d' },
  cancelled: { label: 'Cancelada', bg: 'rgba(211,47,47,0.10)', fg: '#d32f2f' },
  reschedule_requested: { label: 'Cambio solicitado', bg: 'rgba(245,158,11,0.12)', fg: '#b26a00' },
};

// Fila de dato: icono en badge cian + etiqueta discreta + valor en tinta
const InfoRow = ({ icon, label, value }) => (
  <Stack direction="row" spacing={1.5} alignItems="center">
    <Box sx={{ width: 34, height: 34, borderRadius: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(37,150,190,0.10)' }}>
      {icon}
    </Box>
    <Box>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#90a4ae', lineHeight: 1.4 }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#37474f' }}>{value || '—'}</Typography>
    </Box>
  </Stack>
);

const ConfirmationPage = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [reason, setReason] = useState('');
  const [actionMsg, setActionMsg] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await resolveToken(token);
        setInfo(data);
      } catch (e) {
        setError(e.response?.data?.message || 'No se pudo cargar la información');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  // Formateo robusto de fecha para evitar desfase de un día cuando llega como "YYYY-MM-DD" o "T00:00:00Z"
  const fechaLabel = useMemo(() => {
    if (!info?.fecha) return '—';
    const f = info.fecha;
    if (typeof f === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(f)) {
        const [y, m, d] = f.split('-');
        return `${d}/${m}/${y}`;
      }
      if (f.endsWith('Z') && f.includes('T00:00:00')) {
        const [y, m, d] = f.slice(0, 10).split('-');
        return `${d}/${m}/${y}`;
      }
    }
    try {
      return new Date(f).toLocaleDateString('es-CL');
    } catch {
      return '—';
    }
  }, [info]);

  const handleConfirm = async () => {
    setActionMsg(null);
    try {
      const r = await confirmByToken(token);
      setActionMsg(r.message);
      setInfo(prev => ({ ...prev, status: 'confirmed' }));
    } catch (e) {
      setError(e.response?.data?.message || 'Error confirmando');
    }
  };

  const handleCancel = async () => {
    setActionMsg(null);
    try {
      const r = await cancelByToken(token);
      setActionMsg(r.message);
      setInfo(prev => ({ ...prev, status: 'cancelled' }));
    } catch (e) {
      setError(e.response?.data?.message || 'Error cancelando');
    }
  };

  const handleReschedule = async () => {
    setActionMsg(null);
    try {
      const r = await requestReschedule(token, { newDate, newTime, reason });
      setActionMsg(r.message);
      setInfo(prev => ({ ...prev, status: 'reschedule_requested' }));
      setRescheduleMode(false);
    } catch (e) {
      setError(e.response?.data?.message || 'Error solicitando cambio');
    }
  };

  // Envoltura común: barra superior + contenido centrado + pie
  const wrap = (children) => (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg,#ffffff 0%, #f0fbff 100%)' }}>
      <TopAppBar hideProLink />
      <Box display="flex" justifyContent="center" alignItems="flex-start" mt={6} px={2} sx={{ flex: 1, pb: 6 }}>
        {children}
      </Box>
      <SiteFooter />
    </Box>
  );

  if (loading) return wrap(<Box sx={{ mt: 8 }}><VitalinkLoader caption="Cargando tu cita…" /></Box>);
  if (error) return wrap(<Alert severity="error" sx={{ maxWidth: 560, width: '100%', borderRadius: 2 }}>{error}</Alert>);
  if (!info) return wrap(<Alert severity="warning" sx={{ maxWidth: 560, width: '100%', borderRadius: 2 }}>No se encontró información de la cita.</Alert>);

  const statusMeta = STATUS_META[info.status] || { label: info.status, bg: 'rgba(144,164,174,0.14)', fg: '#607d8b' };

  return wrap(
    <Card variant="outlined" sx={{ maxWidth: 640, width: '100%', border: '1px solid #e6eef2' }}>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
          <Box sx={{ width: 42, height: 42, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(37,150,190,0.10)' }}>
            <EventAvailableIcon sx={{ color: '#2596be', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#143b46', lineHeight: 1.2 }}>
              Confirmación de Cita
            </Typography>
            <Typography variant="body2" sx={{ color: '#7c93a0' }}>
              Revisa los datos y confirma tu asistencia
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2.5, borderColor: '#eef3f6' }} />

        {actionMsg && <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2 }}>{actionMsg}</Alert>}

        <Stack spacing={2.25} mb={3}>
          <InfoRow icon={<PersonIcon sx={{ color: '#2596be', fontSize: 18 }} />} label="Paciente" value={info.paciente} />
          <InfoRow icon={<MedicalServicesIcon sx={{ color: '#2596be', fontSize: 18 }} />} label="Servicio" value={info.servicio} />
          <InfoRow icon={<EventAvailableIcon sx={{ color: '#2596be', fontSize: 18 }} />} label="Fecha" value={fechaLabel} />
          <InfoRow icon={<AccessTimeIcon sx={{ color: '#2596be', fontSize: 18 }} />} label="Hora" value={info.hora} />
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 34, flexShrink: 0 }} />
            <Box>
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#90a4ae', lineHeight: 1.4, mb: 0.5 }}>Estado</Typography>
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.5, borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, bgcolor: statusMeta.bg, color: statusMeta.fg }}>
                {statusMeta.label}
              </Box>
            </Box>
          </Stack>
        </Stack>

        {info.status === 'pending' && !rescheduleMode && (
          <>
            <Divider sx={{ mb: 2.5, borderColor: '#eef3f6' }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                onClick={handleConfirm}
                startIcon={<CheckCircleOutlineIcon />}
                fullWidth
                sx={{
                  textTransform: 'none',
                  borderRadius: 3,
                  py: 1.1,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg,#2596be,#21cbe6)',
                  boxShadow: '0 6px 16px rgba(37,150,190,0.30)',
                  '&:hover': { background: 'linear-gradient(135deg,#1e7fa0,#1ab9d3)', boxShadow: '0 6px 18px rgba(37,150,190,0.40)' },
                }}
              >
                Confirmar Cita
              </Button>
              <Button
                variant="outlined"
                onClick={handleCancel}
                startIcon={<CancelOutlinedIcon />}
                fullWidth
                sx={{
                  textTransform: 'none',
                  borderRadius: 3,
                  py: 1.1,
                  fontWeight: 700,
                  borderColor: '#e6a9a9',
                  color: '#d32f2f',
                  '&:hover': { backgroundColor: 'rgba(211,47,47,0.06)', borderColor: '#d32f2f' },
                }}
              >
                Cancelar Cita
              </Button>
            </Stack>
          </>
        )}
        {info.status === 'confirmed' && <Alert severity="success" sx={{ borderRadius: 2 }}>Tu cita está confirmada. ¡Te esperamos!</Alert>}
        {info.status === 'cancelled' && <Alert severity="warning" sx={{ borderRadius: 2 }}>La cita fue cancelada.</Alert>}
        {info.status === 'reschedule_requested' && <Alert severity="info" sx={{ borderRadius: 2 }}>Se registró tu solicitud de cambio de horario.</Alert>}
      </CardContent>
    </Card>
  );
};

export default ConfirmationPage;
