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
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CancelIcon from "@mui/icons-material/Cancel";
import AddIcon from "@mui/icons-material/Add";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useReserva } from "../context/reservaContext";
import DespliegueEventos from "../components/PanelDespliegue/DespliegueEventos";

const statusMap = {
  confirmada: { color: "success", label: "Confirmada", icon: <CheckCircleIcon fontSize="small" /> },
  pendiente: { color: "warning", label: "Pendiente", icon: <WarningAmberIcon fontSize="small" /> },
  cancelada: { color: "error", label: "Cancelada", icon: <CancelIcon fontSize="small" /> }
};

function AppointmentCard({ reserva, onClick }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const tipoAtencionIcon =
    reserva.tipoAtencion === "Telemedicina" ? <VideocamIcon fontSize="small" sx={{ mr: 0.5 }} /> :
    reserva.tipoAtencion === "Presencial" ? <PlaceIcon fontSize="small" sx={{ mr: 0.5 }} /> : null;

  const status = statusMap[reserva.estado] || statusMap.pendiente;

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s, border-color 0.2s, background 0.2s',
        '&:hover': {
          boxShadow: 4,
          borderColor: 'primary.main',
          backgroundColor: 'rgba(37,150,190,0.08)',
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ display: "flex", alignItems: "flex-start", p: 2 }}>
        <Box
          sx={{
            bgcolor: "primary.light",
            color: "primary.main",
            borderRadius: "50%",
            width: 48,
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mr: 2
          }}
        >
          <AccessTimeIcon />
        </Box>
        <Box flex={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography fontWeight={600}>
                {reserva.hora} - {dayjs(reserva.hora, "HH:mm").add(30, "minute").format("HH:mm")}
              </Typography>
              <Stack direction="row" spacing={1} mt={0.5}>
                <Chip
                  label={reserva.tipoCita || "Consulta"}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
                <Chip
                  icon={tipoAtencionIcon}
                  label={reserva.tipoAtencion}
                  size="small"
                  variant="outlined"
                  color="info"
                />
              </Stack>
            </Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Chip
                icon={status.icon}
                label={status.label}
                color={status.color}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Stack>
          </Stack>
          <Stack direction="row" alignItems="center" mt={2}>
            <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
              {reserva.paciente?.nombre?.[0] || "?"}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={500}>
                {reserva.paciente?.nombre}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {reserva.paciente?.email}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function TodayPage() {
  const { getReservas } = useReserva();
  const [reservas, setReservas] = useState([]);
  const [tab, setTab] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Para el panel desplegable
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchReservas = async () => {
      const data = await getReservas();
      const hoy = dayjs().format("YYYY-MM-DD");
      setReservas(
        (data || []).filter(r =>
          dayjs(r.siguienteCita).format("YYYY-MM-DD") === hoy
        )
      );
    };
    fetchReservas();
  }, [getReservas]);

  // Filtrado por estado
  const filtered = reservas.filter(r => {
    if (tab === 0) return true;
    if (tab === 1) return r.estado === "confirmada";
    if (tab === 2) return r.estado === "pendiente";
    return true;
  });

  // Agrupa por mañana/tarde
  const morning = filtered.filter(r => parseInt(r.hora.split(":")[0], 10) < 13);
  const afternoon = filtered.filter(r => parseInt(r.hora.split(":")[0], 10) >= 13);

  // Manejo de click en tarjeta
  const handleCardClick = (reserva) => {
    setSelectedEvent(reserva);
    setOpen(true);
  };

  const handleCloseDrawer = () => {
    setOpen(false);
    setTimeout(() => setSelectedEvent(null), 500);
  };

  // Puedes pasar fetchReservas si quieres refrescar desde el panel
  const fetchReservasAgain = async () => {
    const data = await getReservas();
    const hoy = dayjs().format("YYYY-MM-DD");
    setReservas(
      (data || []).filter(r =>
        dayjs(r.siguienteCita).format("YYYY-MM-DD") === hoy
      )
    );
  };

  return (
    <>
      <Box
        maxWidth={isMobile ? "100%" : "100%"}
        width="100%"
        mx="auto"
        px={isMobile ? 0 : 0}
        py={isMobile ? 0 : 0}
      >
        <Stack direction={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "stretch" : "center"} spacing={2} p={2} borderRadius={1} sx={{ background: "linear-gradient(45deg, #2596be 30%, #21cbe6 90%)" }}>
          <Typography variant="h5" fontWeight={700} color="white">
            Citas del día: {dayjs().locale("es").format("dddd, D [de] MMMM [de] YYYY")}
          </Typography>
        </Stack>
        <Card>
          <CardHeader
              sx={{ pb: 0 }}
              title={null}
          />
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt:-2, backgroundColor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
              <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  variant={isMobile ? "scrollable" : "standard"}
                  scrollButtons={isMobile ? "auto" : false}
                  aria-label="tabs"
                  >
                  <Tab label="Todas" />
                  <Tab label="Confirmadas" />
                  <Tab label="Pendientes" />
              </Tabs>
          </Box>
          <CardContent>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" mb={1} mt={2}>
                Mañana
              </Typography>
              {morning.length === 0 ? (
                <Typography variant="body2" color="text.disabled" mb={2}>
                  Sin citas en la mañana
                </Typography>
              ) : (
                morning.map(reserva => (
                  <AppointmentCard key={reserva._id} reserva={reserva} onClick={() => handleCardClick(reserva)} />
                ))
              )}
            </Box>
            <Box mt={3}>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Tarde
              </Typography>
              {afternoon.length === 0 ? (
                <Typography variant="body2" color="text.disabled">
                  Sin citas en la tarde
                </Typography>
              ) : (
                afternoon.map(reserva => (
                  <AppointmentCard key={reserva._id} reserva={reserva} onClick={() => handleCardClick(reserva)} />
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
      >
        <Slide
          direction={isMobile ? 'down' : 'left'}
          in={open}
          mountOnEnter
          unmountOnExit
          timeout={500}
        >
          <Box>
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