import React, { useEffect, useState, useMemo } from "react";
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
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
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
  const { getPacientes, getPacientesUsuario, getPacientesSucursal } = usePaciente();
  const { getReservas } = useReserva();
  const { esAsistente, esAdminSucursal, user } = useAuth();
  const [pacientes, setPacientes] = useState([]); // conjunto completo (mis pacientes o sucursal según fetch)
  const [misPacientes, setMisPacientes] = useState([]); // caché de mis propios pacientes
  const [pacientesSucursal, setPacientesSucursal] = useState([]); // caché pacientes de sucursal (solo si aplica)
  const [filtroModo, setFiltroModo] = useState('mios'); // 'mios' | 'sucursal'
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
  
  // Carga inicial: limitar siempre a los pacientes visibles para el usuario (p.ej. propios)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // mis pacientes (derivados de reservas + asociaciones directas)
        const pacientesData = await getPacientesUsuario();
        setMisPacientes(pacientesData || []);
        // Cargar reservas para navegación rápida a detalles
        const reservasDataAll = await getReservas();
        setReservas(reservasDataAll || []);

        // Si el usuario pertenece a una sucursal, cargar pacientes de la sucursal completos
        if (user?.sucursal?._id) {
          const sucPac = await getPacientesSucursal(user.sucursal._id);
          setPacientesSucursal(sucPac || []);
          // Por requerimiento: en sucursal, ver por defecto pacientes de sucursal
          setFiltroModo('sucursal');
          setPacientes(sucPac || []);
        } else {
          // Profesional independiente
          setFiltroModo('mios');
          setPacientes(pacientesData || []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // Dependencias correctas: funciones usadas dentro
  }, [getPacientesUsuario, getPacientesSucursal, getReservas, user?.sucursal?._id]);

  // Forzar asistentes a modo sucursal siempre
  useEffect(() => {
    if (user?.sucursal?._id && esAsistente) {
      setFiltroModo('sucursal');
    }
  }, [user?.sucursal?._id, esAsistente]);

  // Pacientes visibles según modo
  const pacientesVisibles = useMemo(() => {
    return filtroModo === 'sucursal' ? pacientesSucursal : misPacientes;
  }, [filtroModo, pacientesSucursal, misPacientes]);

  const filtered = pacientesVisibles.filter(
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
      const pacientesData = await getPacientesUsuario();
      setMisPacientes(pacientesData || []);
      const reservasData = await getReservas();
      setReservas(reservasData || []);
      if (user?.sucursal?._id) {
        const sucPac = await getPacientesSucursal(user.sucursal._id);
        setPacientesSucursal(sucPac || []);
        // Si asistente, siempre sucursal; si no, respetar filtro actual
        if (esAsistente) {
          setPacientes(sucPac || []);
          setFiltroModo('sucursal');
        } else {
          setPacientes(filtroModo === 'sucursal' ? (sucPac || []) : (pacientesData || []));
        }
      } else {
        // Sin sucursal, mantener mis pacientes
        setPacientes(pacientesData || []);
        setFiltroModo('mios');
      }
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
      // Construir vista sin reserva pero con listado de profesionales asociados
      setSelectedReserva({
        paciente,
        historial: [],
        diagnostico: "",
        imagenes: [],
        start: null,
        hora: "",
        profesionales: paciente.profesionales || [],
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
          {user?.sucursal?._id && !esAsistente && (
            <ToggleButtonGroup
              color="standard"
              value={filtroModo}
              exclusive
              onChange={(e, val) => { if (val) { setFiltroModo(val); setPage(0); } }}
              size="small"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.81)',
                borderRadius: '999px',
                p: 0,
                height: 40,
                width: isMobile ? '100%' : 'auto',
                mb: isMobile ? 1 : 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                border: '1px solid rgba(37,150,190,0.35)',
                overflow: 'hidden',
                gap: 0,
                '& .MuiToggleButtonGroup-grouped': {
                  border: 'none',
                  margin: 0,
                  borderRadius: 0,
                },
                '& .MuiToggleButton-root': {
                  borderRadius: 0,
                }
              }}
            >
              <ToggleButton
                value="mios"
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  color: '#2596be',
                  border: 'none',
                  px: 1.8,
                  ...(isMobile ? { flex: 1 } : {}),
                  '&.Mui-selected': {
                    background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(37,150,190,0.35)',
                    borderRadius: '999px',
                  },
                  '&.Mui-selected:hover': {
                    background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
                  },
                  '&:hover': { background: 'rgba(255,255,255,0.12)' },
                  transition: 'background 160ms ease-out, color 160ms ease-out',
                }}
              >
                Mis pacientes
              </ToggleButton>
              <ToggleButton
                value="sucursal"
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  color: '#2596be',
                  border: 'none',
                  px: 1.8,
                  ...(isMobile ? { flex: 1 } : {}),
                  '&.Mui-selected': {
                    background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(37,150,190,0.35)',
                    borderRadius: '999px',
                  },
                  '&.Mui-selected:hover': {
                    background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
                  },
                  '&:hover': { background: 'rgba(255,255,255,0.12)' },
                  transition: 'background 160ms ease-out, color 160ms ease-out',
                }}
              >
                Sucursal
              </ToggleButton>
            </ToggleButtonGroup>
          )}
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
            <List sx={{ p: isMobile ? 0.5 : 1.5 }}>
              {paginated.map((paciente) => (
                <React.Fragment key={paciente._id}>
                  <ListItem
                    onClick={() => handlePacienteClick(paciente)}
                    alignItems="flex-start"
                    sx={{
                      position: 'relative',
                      backgroundColor: 'white',
                      border: '1px solid rgba(37,150,190,0.15)',
                      boxShadow: '0 1px 6px rgba(37,150,190,0.08)',
                      transition: 'box-shadow 160ms ease, transform 120ms ease, border-color 160ms ease',
                      '&:hover': {
                        boxShadow: '0 6px 20px rgba(37,150,190,0.18)',
                        borderColor: '#2596be',
                        transform: 'translateY(-1px)'
                      },
                      '&:focus-visible': {
                        outline: '3px solid rgba(33,203,230,0.4)',
                        outlineOffset: 2,
                      },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: 4,
                        background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
                        opacity: 0,
                        transition: 'opacity 160ms ease',
                      },
                      '&:hover::before': { opacity: 1 },
                      borderRadius: 2.5,
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "stretch" : "flex-start",
                      px: isMobile ? 1 : 2.25,
                      py: isMobile ? 1 : 2,
                      mb: isMobile ? 1 : 1.25,
                    }}
                    secondaryAction={
                      <Button
                        startIcon={<MedicalInformationIcon />}
                        variant="contained"
                        size="small"
                        sx={{
                          minWidth: 120,
                          px: 2,
                          py: 0.75,
                          borderRadius: '999px',
                          textTransform: 'none',
                          fontWeight: 700,
                          letterSpacing: 0.2,
                          background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
                          color: 'white',
                          boxShadow: '0 3px 10px rgba(37,150,190,0.28)',
                          width: isMobile ? '100%' : 'auto',
                          mt: isMobile ? 1 : 0,
                          transition: 'transform 120ms ease, box-shadow 120ms ease, background 120ms ease',
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            background: 'linear-gradient(45deg, #238db1 30%, #1fb8d1 90%)',
                            boxShadow: '0 6px 14px rgba(37,150,190,0.35)'
                          },
                          '&:active': {
                            transform: 'translateY(0)',
                            boxShadow: '0 2px 8px rgba(37,150,190,0.25)'
                          },
                          '&:focus-visible': {
                            outline: '3px solid rgba(255,255,255,0.6)',
                            outlineOffset: 2,
                          }
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
                        <Typography fontWeight={700} component="span" color="text.primary">
                          {paciente.nombre}
                        </Typography>
                      }
                      secondary={
                        <Stack
                          direction={isMobile ? "column" : "row"}
                          spacing={isMobile ? 1 : 2}
                          mt={0.75}
                          alignItems={isMobile ? "flex-start" : "center"}
                          sx={{ color: 'text.secondary' }}
                        >
                          <Chip
                            label={`Rut: ${paciente.rut}`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              color: '#2596be',
                              borderColor: '#2596be',
                              backgroundColor: 'rgba(37,150,190,0.06)'
                            }}
                            variant="outlined"
                          />
                          <Box display="flex" alignItems="center">
                            <PhoneIcon fontSize="small" sx={{ mr: 0.5, color: '#2596be' }} />
                            <Typography variant="body2" component="span" color="text.primary">
                              +{paciente.telefono}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center">
                            <MailOutlineIcon fontSize="small" sx={{ mr: 0.5, color: '#2596be' }} />
                            <Typography variant="body2" component="span" color="text.primary">
                              {paciente.email || 'Sin email'}
                            </Typography>
                          </Box>
                        </Stack>
                      }
                    />
                  </ListItem>
                  {/* Divider eliminado para estilo de tarjetas espaciadas */}
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