import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider,
  Stack,
  Button,
  Chip,
  useMediaQuery,
  Slide,
  Drawer,
  IconButton
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PhoneIcon from '@mui/icons-material/Phone';
import AddIcon from "@mui/icons-material/Add";
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { usePaciente } from "../context/pacienteContext";
import { useReserva } from "../context/reservaContext";
import DespliegueEventos from "../components/PanelDespliegue/DespliegueEventos";
import AgregarPaciente from "../components/Modales/AgregarPaciente";
import dayjs from "dayjs";
import { useAuth } from "../context/authContext";
import FullPageLoader from "../components/ui/FullPageLoader";


export default function PatientsPage() {
  const { getPacientes, getPacientesUsuario } = usePaciente();
  const { getReservas } = useReserva();
  const { esAsistente, user } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [search, setSearch] = useState("");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();

  // Estado para el drawer y reserva seleccionada
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [openDrawer, setOpenDrawer] = useState(false);

  // Estado para el modal de nuevo paciente
  const [openAgregarPaciente, setOpenAgregarPaciente] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 8;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const pacientesData = await getPacientesUsuario();
        setPacientes(pacientesData || []);
        const reservasData = await getReservas();
        setReservas(reservasData || []);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [getPacientes, getReservas]);

  const filtered = pacientes.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      p.rut?.toLowerCase().includes(search.toLowerCase())
  );

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Clamp página si cambia el total
  useEffect(() => {
    if (page >= totalPages) setPage(totalPages - 1);
  }, [totalPages]);
  // Reset al cambiar búsqueda
  useEffect(() => {
    setPage(0);
  }, [search]);
  const startIndex = page * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filtered.length);
  const paginated = filtered.slice(startIndex, endIndex);
  const prevDisabled = totalPages <= 1 || page === 0;
  const nextDisabled = totalPages <= 1 || page >= totalPages - 1;

  // Refrescar pacientes y reservas después de agregar uno nuevo
  const fetchPacientesYActualizar = async () => {
    try {
      setLoading(true);
      const pacientesData = await getPacientes();
      setPacientes(pacientesData || []);
      const reservasData = await getReservas();
      setReservas(reservasData || []);
    } finally {
      setLoading(false);
    }
  };

  // Al hacer click en un paciente, busca su reserva más próxima (o la primera)
  const handlePacienteClick = (paciente) => {
    const reservasPaciente = reservas.filter(r => r.paciente._id === paciente._id);
    const reserva = reservasPaciente[0];

    if (reserva) {
      // Asegúrate de que 'start' sea un objeto Date igual que en CalendarioPage
      // Evitar desfase de un día cuando siguienteCita viene como "T00:00:00Z" (UTC medianoche)
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
        // Caso general: usar dayjs sin cambio de zona horaria explícito
        return dayjs(fecha).hour(hours).minute(minutes).second(0).toDate();
      };

      let start = buildLocalStart(reserva.siguienteCita, reserva.hora);
      setSelectedReserva({
        ...reserva,
        start, // Sobrescribe o agrega el campo start como Date
        end: start ? dayjs(start).add(1, 'hour').toDate() : null, // Opcional, igual que en CalendarioPage
        title: reserva.paciente.nombre // Opcional, igual que en CalendarioPage
      });
    } else {
      setSelectedReserva({
        paciente,
        historial: [],
        diagnostico: "",
        anamnesis: "",
        imagenes: [],
        start: null,
        hora: "",
        profesional: paciente.profesional || { username: "Sin asignar" }
      });
    }
    setOpenDrawer(true);
  };

  return (    
  <Box
      display="flex"
      flexDirection="column"
      minHeight="100%"
      backgroundColor="white"
      overflow="visible"
      px={isMobile ? 0.5 : 0}
      pb={isMobile ? 1 : 0}
      sx={{ position: 'relative' }}
    >
      <FullPageLoader open={loading} withinContainer message="Cargando pacientes" />
      <Stack
        p={isMobile ? 1 : 1.5}
        borderRadius={1}
        sx={{
          background: "linear-gradient(45deg, #2596be 30%, #21cbe6 90%)",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          gap: isMobile ? 1.5 : 0,
          mb: isMobile ? 1 : 0,
        }}
      >
        <Box
          display="flex"
          flexDirection={isMobile ? "column" : "row"}
          justifyContent="space-between"
          alignItems={isMobile ? "stretch" : "center"}
          width="100%"
          gap={isMobile ? 1 : 0}
        >
          <Typography
            variant={isMobile ? "h6" : "h5"}
            fontWeight={700}
            color="white"
            mb={isMobile ? 1 : 0}
          >
            Pacientes
          </Typography>
          <TextField
            fullWidth
            placeholder="Buscar por nombre o RUT"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#2596be" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              background: "white",
              borderRadius: 1,
              width: isMobile ? "100%" : "300px",
              marginLeft: isMobile ? 0 : 2,
              marginRight: isMobile ? 0 : 2,
              mb: isMobile ? 1 : 0,
            }}
            variant="outlined"
            size="small"
          />
          <Button
            variant="contained"
            sx={{
              minWidth: 110,
              backgroundColor: "white",
              color: "#2596be",
              width: isMobile ? "100%" : "auto",
              mt: isMobile ? 1 : 0,
            }}
            startIcon={<AddIcon />}
            onClick={() => setOpenAgregarPaciente(true)}
          >
            Nuevo Paciente
          </Button>
        </Box>
      </Stack>
      <Card
        sx={{
          mt: isMobile ? 1 : 0,
          borderRadius: isMobile ? 0 : 2,
          boxShadow: isMobile ? 0 : 2,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <CardContent sx={{ p: isMobile ? 0 : 2, flex: 1, overflow: "auto" }}>
          {filtered.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
              No se encontraron pacientes.
            </Typography>
          ) : (
            <List sx={{ p: 0 }}>
              {paginated.map((paciente) => (
                <React.Fragment key={paciente._id}>
                  <ListItem
                    onClick={() => handlePacienteClick(paciente)}
                    alignItems="flex-start"
                    sx={{
                      border: "2px solid #e3f2fd",
                      "&:hover": {
                        boxShadow: 3,
                        borderColor: "#2596be",
                      },
                      borderRadius: 2,
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "stretch" : "flex-start",
                      px: isMobile ? 1 : 2,
                      py: isMobile ? 1 : 2,
                      mb: isMobile ? 1 : 0,
                    }}
                    secondaryAction={
                      <Button
                        startIcon={<MedicalInformationIcon />}
                        variant="outlined"
                        size="small"
                        sx={{
                          minWidth: 110,
                          backgroundColor: "#2596be",
                          color: "white",
                          width: isMobile ? "100%" : "auto",
                          mt: isMobile ? 1 : 0,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePacienteClick(paciente);
                        }}
                      >
                        Más Info
                      </Button>
                    }
                  >
                    <ListItemAvatar sx={{ minWidth: 56 }}>
                      <Avatar sx={{ bgcolor: "#2596be" }}>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack
                          direction={isMobile ? "column" : "row"}
                          spacing={2}
                          alignItems={isMobile ? "flex-start" : "center"}
                        >
                          <Typography fontWeight={600} component="span">{paciente.nombre}</Typography>
                          <Chip
                            label={"Rut: " + paciente.rut}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        </Stack>
                      }
                      secondary={
                        <Stack
                          direction={isMobile ? "column" : "row"}
                          spacing={2}
                          mt={1}
                          alignItems={isMobile ? "flex-start" : "center"}
                        >
                          <Typography variant="body2" color="text.secondary" component="span">
                            <MailOutlineIcon fontSize="small" sx={{ mr: 0.5 }} />
                            {paciente.email || "Sin email"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" component="span">
                            <PhoneIcon fontSize="small" sx={{ mr: 0.5 }} />
                            +{paciente.telefono}
                          </Typography>
                          {paciente.edad && (
                            <Chip
                              label={`${paciente.edad} años`}
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{ mt: isMobile ? 1 : 0 }}
                            />
                          )}
                          {paciente.direccion && (
                            <Typography variant="body2" color="text.secondary" component="span" sx={{ mt: isMobile ? 1 : 0 }}>
                              {paciente.direccion}
                            </Typography>
                          )}
                        </Stack>
                      }
                    />
                  </ListItem>
                  <Divider component="li" sx={{ display: isMobile ? "none" : "block" }} />
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
        {/* Controles de paginación inferiores */}
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ pb: 2 }}>
          <IconButton
            size="small"
            onClick={() => !prevDisabled && setPage((p) => Math.max(0, p - 1))}
            disabled={prevDisabled}
            sx={{
              background: 'white',
              color: '#2596be',
              border: '1px solid #e0e0e0',
              '&:disabled': { opacity: 0.5 },
            }}
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" color="text.secondary">
            {filtered.length > 0
              ? `${startIndex + 1}-${endIndex} de ${filtered.length}`
              : '0-0 de 0'}
          </Typography>
          <IconButton
            size="small"
            onClick={() => !nextDisabled && setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={nextDisabled}
            sx={{
              background: 'white',
              color: '#2596be',
              border: '1px solid #e0e0e0',
              '&:disabled': { opacity: 0.5 },
            }}
          >
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Card>

      {/* Drawer para mostrar DespliegueEventos */}
      <Drawer
        anchor={isMobile ? 'bottom' : 'right'}
        open={openDrawer}
        onClose={() => {
          setOpenDrawer(false);
          setSelectedReserva(null);
        }}
      >
        <Slide
          direction={isMobile ? 'down' : 'left'}
          in={openDrawer}
          mountOnEnter
          unmountOnExit
          timeout={500}
        >
          <Box>
            {selectedReserva && (
              <DespliegueEventos
                event={selectedReserva}
                onClose={() => setOpenDrawer(false)}
                fetchReservas={fetchPacientesYActualizar}
                gapi={window.gapi}
                esAsistente={esAsistente}
              />
            )}
          </Box>
        </Slide>
      </Drawer>

      {/* Modal para agregar nuevo paciente */}
      <AgregarPaciente
        open={openAgregarPaciente}
        onClose={() => setOpenAgregarPaciente(false)}
        fetchReservas={fetchPacientesYActualizar}
        gapi={window.gapi}
      />
    </Box>
  );
}