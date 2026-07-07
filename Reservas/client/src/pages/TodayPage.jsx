import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Tabs,
  Tab,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Stack,
  useMediaQuery,
  Drawer,
  Slide
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VideocamIcon from "@mui/icons-material/Videocam";
import PlaceIcon from "@mui/icons-material/Place";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CancelIcon from "@mui/icons-material/Cancel";
import AddIcon from "@mui/icons-material/Add";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useReserva } from "../context/reservaContext";
// import { usePaciente } from "../context/pacienteContext"; // ya no se usa para estado
import { useAlert } from "../context/AlertContext";
import DespliegueEventos from "../components/PanelDespliegue/DespliegueEventos";
import { updateConfirmStatus as updateConfirmStatusApi, generateConfirmLink } from '../api/confirmation.js';
import FullPageLoader from "../components/ui/FullPageLoader";

const statusMap = {
  confirmed: { label: "Confirmada", icon: <CheckCircleIcon sx={{ fontSize: 15 }} />, bg: "rgba(22,163,74,0.10)", fg: "#15803d" },
  pending: { label: "Pendiente", icon: <WarningAmberIcon sx={{ fontSize: 15 }} />, bg: "rgba(245,158,11,0.12)", fg: "#b26a00" },
  cancelled: { label: "Cancelada", icon: <CancelIcon sx={{ fontSize: 15 }} />, bg: "rgba(211,47,47,0.10)", fg: "#d32f2f" },
  reschedule_requested: { label: "Solicitud cambio", icon: <WarningAmberIcon sx={{ fontSize: 15 }} />, bg: "rgba(37,150,190,0.10)", fg: "#1b7d9c" },
  completed: { label: "Completada", icon: <CheckCircleIcon sx={{ fontSize: 15 }} />, bg: "rgba(22,163,74,0.10)", fg: "#15803d" }
};

function AppointmentCard({ reserva, onClick, onChangeEstado, onCopyLink }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const tipoAtencionValue = reserva.tipoAtencion || reserva.modalidad;
  const tipoAtencionIcon =
    tipoAtencionValue === "Telemedicina" ? <VideocamIcon sx={{ fontSize: 14 }} /> :
    tipoAtencionValue === "Presencial" ? <PlaceIcon sx={{ fontSize: 14 }} /> :
    tipoAtencionValue === "Domicilio" ? <HomeWorkIcon sx={{ fontSize: 14 }} /> : null;

  const estadoRaw = (reserva.confirmStatus || 'pending').toString().toLowerCase();
  const status = statusMap[estadoRaw] || statusMap.pending;

  const modalidadLabel = reserva.tipoAtencion || reserva.modalidad || 'Sin modalidad';
  const pillCyanTint = { display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 1.1, py: 0.4, borderRadius: '999px', fontSize: '0.74rem', fontWeight: 700, lineHeight: 1.5, bgcolor: 'rgba(37,150,190,0.10)', color: '#1b7d9c' };
  const pillOutline = { display: 'inline-flex', alignItems: 'center', px: 1.1, py: 0.4, borderRadius: '999px', fontSize: '0.74rem', fontWeight: 600, lineHeight: 1.5, border: '1px solid #dbe6ec', color: '#546e7a', bgcolor: '#fff' };

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 1.5,
        borderRadius: 3,
        border: '1px solid #e6eef2',
        boxShadow: 'none',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        '&:hover': {
          boxShadow: '0 6px 20px rgba(37,150,190,0.10)',
          borderColor: '#bfe3ef',
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'flex-start', p: { xs: 1.5, sm: 2 } }}>
        <Box
          sx={{
            bgcolor: "rgba(37,150,190,0.10)",
            color: "#2596be",
            borderRadius: 2.5,
            width: { xs: 42, sm: 48 },
            height: { xs: 42, sm: 48 },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mr: { xs: 1.5, sm: 2 },
            flexShrink: 0,
          }}
        >
          <AccessTimeIcon />
        </Box>
        <Box flex={1} minWidth={0}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'flex-start' }} gap={1}>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#143b46', fontSize: '1.05rem' }}>
                {reserva.hora} - {dayjs(reserva.hora, "HH:mm").add(30, "minute").format("HH:mm")}
              </Typography>
              <Stack direction="row" mt={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                <Box component="span" sx={pillOutline}>{reserva.tipoCita || "Consulta"}</Box>
                <Box component="span" sx={pillCyanTint}>
                  {tipoAtencionIcon}{modalidadLabel}
                </Box>
              </Stack>
            </Box>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' } }}>
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.5, borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, bgcolor: status.bg, color: status.fg }}>
                {status.icon}{status.label}
              </Box>
              {/* Menu para cambiar estado */}
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); handleMenuOpen(e); }}
                aria-controls={anchorEl ? 'estado-menu' : undefined}
                aria-haspopup="true"
                sx={{ color: '#90a4ae', '&:hover': { color: '#2596be', bgcolor: 'rgba(37,150,190,0.08)' } }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
              <Menu
                id="estado-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={(e) => { e.stopPropagation(); handleMenuClose(); }}
                onClick={(e) => e.stopPropagation()}
              >
                <MenuItem onClick={async () => { handleMenuClose(); onChangeEstado && onChangeEstado(reserva, 'confirmed'); }}>Confirmar</MenuItem>
                <MenuItem onClick={async () => { handleMenuClose(); onChangeEstado && onChangeEstado(reserva, 'pending'); }}>Marcar Pendiente</MenuItem>
                <MenuItem onClick={async () => { handleMenuClose(); onChangeEstado && onChangeEstado(reserva, 'cancelled'); }}>Cancelar</MenuItem>
                <MenuItem onClick={async () => { handleMenuClose(); onChangeEstado && onChangeEstado(reserva, 'reschedule_requested'); }}>Marcar Solicitud Cambio</MenuItem>
                <MenuItem onClick={async () => { handleMenuClose(); onCopyLink && onCopyLink(reserva); }}>Copiar Link Confirmación</MenuItem>
              </Menu>
            </Stack>
          </Stack>
          <Stack direction="row" alignItems="center" mt={2} sx={{ pt: 2, borderTop: '1px solid #f1f5f7' }}>
            <Avatar sx={{ width: 36, height: 36, mr: 1.25, bgcolor: 'rgba(37,150,190,0.12)', color: '#1b7d9c', fontWeight: 700, fontSize: '0.95rem', textTransform: 'uppercase' }}>
              {reserva.paciente?.nombre?.[0] || "?"}
            </Avatar>
            <Box minWidth={0}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#37474f' }}>
                {reserva.paciente?.nombre}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: { xs: '68vw', sm: '40vw' } }}>
                {reserva.paciente?.email}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {reserva.paciente?.rut ? `RUT: ${reserva.paciente.rut}` : ''}
              </Typography>
              {reserva.profesional?.username && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Profesional: {reserva.profesional.username}
                </Typography>
              )}
            </Box>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function TodayPage() {
  const { getReservas } = useReserva();
  const showAlert = useAlert();
  const [reservas, setReservas] = useState([]);
  const [tab, setTab] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [loading, setLoading] = useState(true);

  // Para el panel desplegable
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [open, setOpen] = useState(false);

  // Helper: determina si la reserva corresponde a HOY en hora local
  const isReservaDeHoy = (r) => {
    const fecha = r?.siguienteCita;
    if (!fecha) return false; // Evitar que undefined cuente como hoy (dayjs(undefined) => ahora)
    const hoyStr = dayjs().format('YYYY-MM-DD');
    // Manejar strings especiales: fecha-only o T00:00:00Z
    if (typeof fecha === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha === hoyStr;
      if (fecha.endsWith('Z') && fecha.includes('T00:00:00')) return fecha.slice(0, 10) === hoyStr;
    }
    const d = dayjs(fecha);
    if (!d.isValid()) return false;
    return d.format('YYYY-MM-DD') === hoyStr;
  };

  useEffect(() => {
    const fetchReservas = async () => {
      try {
        setLoading(true);
        const data = await getReservas();
        setReservas((data || []).filter(isReservaDeHoy));
      } finally {
        setLoading(false);
      }
    };
    fetchReservas();
  }, [getReservas]);

  // Filtrado por confirmStatus
  const getEstadoNormalized = (r) => (r.confirmStatus || 'pending').toString().toLowerCase().trim();

  const filtered = reservas.filter(r => {
    if (tab === 0) return true; // Todas
    const estado = getEstadoNormalized(r);
    if (tab === 1) return estado === 'confirmed';
    if (tab === 2) return estado === 'pending';
    if (tab === 3) return estado === 'cancelled';
    return true;
  });

  // Agrupa por mañana/tarde
  const morning = filtered.filter(r => parseInt(r.hora.split(":")[0], 10) < 13);
  const afternoon = filtered.filter(r => parseInt(r.hora.split(":")[0], 10) >= 13);

  // Manejo de click en tarjeta
  // Construir Date local desde siguienteCita (+ posibles formatos) y hora para evitar 'fecha no especificada'
  const buildLocalStart = (fecha, horaStr) => {
    if (!fecha || !horaStr) return null;
    const [hours, minutes] = horaStr.split(":").map(Number);
    if (typeof fecha === 'string') {
      const dateOnlyMatch = fecha.match(/^\d{4}-\d{2}-\d{2}$/);
      const zMidnight = fecha.includes('T00:00:00') && fecha.endsWith('Z');
      if (dateOnlyMatch || zMidnight) {
        const [y, m, d] = fecha.substring(0, 10).split('-').map(Number);
        return new Date(y, m - 1, d, hours, minutes, 0, 0);
      }
    }
    return dayjs(fecha).hour(hours).minute(minutes).second(0).toDate();
  };

  const handleCardClick = (reserva) => {
    // Fallback: si no hay siguienteCita, usar la fecha de hoy (esta página solo muestra citas de hoy)
    const fechaBase = reserva.siguienteCita || dayjs().format('YYYY-MM-DD');
    const start = buildLocalStart(fechaBase, reserva.hora);
    setSelectedEvent({
      ...reserva,
      siguienteCita: fechaBase,
      start,
      end: start ? dayjs(start).add(1, 'hour').toDate() : null,
      title: reserva.paciente?.nombre
    });
    setOpen(true);
  };

  const handleChangeEstado = async (reserva, nuevoEstado) => {
    try {
      await updateConfirmStatusApi(reserva._id, nuevoEstado);
      showAlert('success', `Estado cambiado a ${nuevoEstado}`);
      fetchReservasAgain();
    } catch (e) {
      console.error(e);
      showAlert('error', 'No fue posible cambiar el estado');
    }
  };

  const handleCopyLink = async (reserva) => {
    try {
      const { link } = await generateConfirmLink(reserva._id);
      await navigator.clipboard.writeText(link);
      showAlert('success', 'Link de confirmación copiado');
    } catch (e) {
      showAlert('error', 'No se pudo generar/copiar el link');
    }
  };

  const handleCloseDrawer = () => {
    setOpen(false);
    setTimeout(() => setSelectedEvent(null), 500);
  };

  // Puedes pasar fetchReservas si quieres refrescar desde el panel
  const fetchReservasAgain = async () => {
    try {
      setLoading(true);
      const data = await getReservas();
      setReservas((data || []).filter(isReservaDeHoy));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box
        maxWidth={isMobile ? "100%" : "100%"}
        width="100%"
        mx="auto"
        px={isMobile ? 0 : 0}
        py={isMobile ? 0 : 0}
        sx={{ overflowX: 'hidden', maxWidth: '100vw', position: 'relative' }}
      >
        <FullPageLoader open={loading} withinContainer message="Cargando citas de hoy" />
        <Stack direction={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "stretch" : "center"} spacing={2} p={2} borderRadius={1} sx={{ background: "linear-gradient(45deg, #2596be 30%, #21cbe6 90%)" }}>
          <Typography variant="h5" fontWeight={700} color="white">
            Citas del día: {dayjs().locale("es").format("dddd, D [de] MMMM [de] YYYY")}
          </Typography>
        </Stack>
        <Card sx={{ borderRadius: { xs: 0, sm: 2 } }}>
          <CardHeader
              sx={{ pb: 0 }}
              title={null}
          />
          <Box sx={{ width: '100%', mt:-2, backgroundColor: '#ffffff', borderBottom: '1px solid #e6eef2', overflowX: 'auto' }}>
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant={isMobile ? 'scrollable' : 'standard'}
                scrollButtons={isMobile ? 'auto' : false}
                aria-label="tabs"
                textColor="primary"
                indicatorColor="primary"
                sx={{
                  width: '100%',
                  maxWidth: '100%',
                  '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0', backgroundColor: '#2596be' },
                  '& .MuiTab-root': { fontWeight: 600, letterSpacing: '0.3px', color: '#7c93a0', '&.Mui-selected': { color: '#1b7d9c' } },
                }}
              >
                <Tab label="Todas" />
                <Tab label="Confirmadas" />
                <Tab label="Pendientes" />
                <Tab label="Canceladas" />
              </Tabs>
          </Box>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Box>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#90a4ae', mb: 1.5, mt: 2 }}>
                Mañana
              </Typography>
              {morning.length === 0 ? (
                <Typography variant="body2" color="text.disabled" mb={2}>
                  Sin citas en la mañana
                </Typography>
              ) : (
                morning.map(reserva => (
                  <AppointmentCard key={reserva._id} reserva={reserva} onClick={() => handleCardClick(reserva)} onChangeEstado={handleChangeEstado} onCopyLink={handleCopyLink} />
                ))
              )}
            </Box>
            <Box mt={3}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#90a4ae', mb: 1.5 }}>
                Tarde
              </Typography>
              {afternoon.length === 0 ? (
                <Typography variant="body2" color="text.disabled">
                  Sin citas en la tarde
                </Typography>
              ) : (
                afternoon.map(reserva => (
                  <AppointmentCard key={reserva._id} reserva={reserva} onClick={() => handleCardClick(reserva)} onChangeEstado={handleChangeEstado} onCopyLink={handleCopyLink} />
                ))
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
      {/* Drawer para el panel desplegable */}
      <Drawer
        anchor={isMobile ? 'bottom' : 'right'}
        open={open}
        onClose={handleCloseDrawer}
        PaperProps={{
          sx: {
            height: isMobile ? '80dvh' : '100%',
            maxHeight: isMobile ? '80dvh' : '100%',
          }
        }}
      >
        <Slide
          direction={isMobile ? 'down' : 'left'}
          in={open}
          mountOnEnter
          unmountOnExit
          timeout={500}
        >
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            {selectedEvent && (
              <DespliegueEventos
                event={selectedEvent}
                onClose={handleCloseDrawer}
                fetchReservas={fetchReservasAgain}
                gapi={window.gapi}
              />
            )}
          </Box>
        </Slide>
      </Drawer>
    </>
  );
}