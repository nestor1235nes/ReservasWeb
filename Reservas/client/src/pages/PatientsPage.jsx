import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Avatar,
  Stack,
  Button,
  useMediaQuery,
  Slide,
  Drawer,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@mui/material";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PeopleIcon from "@mui/icons-material/People";
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
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import { resolveAssetUrl } from "../utils/resolveAssetUrl";
import dayjs from "dayjs";
import { useAuth } from "../context/authContext";
import FullPageLoader from "../components/ui/FullPageLoader";
import PageHeader from "../components/ui/PageHeader";
import PageLayout from "../components/ui/PageLayout";
import FilterBar from "../components/ui/FilterBar";


// Fila compacta de icono + valor, compartida por la tabla y las tarjetas moviles.
function DatoPaciente({ icono, valor, atenuado = false }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
      <Box sx={{ display: 'flex', color: atenuado ? 'text.secondary' : 'primary.main' }}>{icono}</Box>
      <Typography variant="body2" color={atenuado ? 'text.secondary' : 'text.primary'} noWrap>
        {valor}
      </Typography>
    </Stack>
  );
}

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

  // Iniciales para el Avatar cuando el paciente no tiene fotoPerfil cargada.
  const iniciales = (nombre) =>
    String(nombre || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();

  // Linea secundaria del nombre. 'No especifica' es el default del modelo, asi que
  // no aporta nada mostrarlo.
  const metaPaciente = (p) =>
    [
      p.edad ? `${p.edad} años` : null,
      p.sexo && p.sexo !== 'No especifica' ? String(p.sexo).toLowerCase() : null,
    ]
      .filter(Boolean)
      .join(' · ');

  // Proxima cita derivada de las reservas que la pagina ya carga: la mas cercana
  // que no este cancelada y no sea anterior a hoy. Se recorta la fecha a YYYY-MM-DD
  // antes de parsear para evitar el corrimiento de un dia cuando viene como UTC
  // medianoche, igual que hace buildLocalStart.
  const proximaCitaDe = (pacienteId) => {
    const hoy = dayjs().startOf('day');
    return reservas
      .filter((r) => r?.paciente?._id === pacienteId && r?.siguienteCita)
      .filter((r) => r.confirmStatus !== 'cancelled')
      .map((r) => ({ fecha: dayjs(String(r.siguienteCita).substring(0, 10)), hora: r.hora }))
      .filter((r) => r.fecha.isValid() && !r.fecha.isBefore(hoy))
      .sort((a, b) => a.fecha.valueOf() - b.fecha.valueOf())[0] || null;
  };

  const textoProximaCita = (p) => {
    const cita = proximaCitaDe(p._id);
    if (!cita) return 'Sin agenda';
    const fecha = cita.fecha.format('D MMM YYYY');
    return cita.hora ? `${fecha}, ${cita.hora}` : fecha;
  };
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
  <PageLayout
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        overflow: 'visible',
        px: isMobile ? 0.5 : 0,
        pb: isMobile ? 1 : 0,
        position: 'relative',
      }}
    >
      <FullPageLoader open={loading} withinContainer message="Cargando pacientes" />
      <PageHeader
        icon={<PeopleIcon />}
        title="Pacientes"
        subtitle="Administra tus pacientes y su historial"
        actions={
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
        }
      />
      <FilterBar>
        {user?.sucursal?._id && !esAsistente && (
          <ToggleButtonGroup
            color="standard"
            value={filtroModo}
            exclusive
            onChange={(e, val) => { if (val) { setFiltroModo(val); setPage(0); } }}
            size="small"
            sx={{
              backgroundColor: '#ffffff',
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
                '&:hover': { background: 'rgba(37,150,190,0.08)' },
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
                '&:hover': { background: 'rgba(37,150,190,0.08)' },
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
      </FilterBar>
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
            isMobile ? (
              <Stack spacing={1.25} sx={{ p: 0.5 }}>
                {paginated.map((paciente) => (
                  <Card
                    key={paciente._id}
                    onClick={() => handlePacienteClick(paciente)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'border-color 160ms ease, box-shadow 160ms ease',
                      '&:active': { borderColor: 'primary.main' },
                    }}
                  >
                    <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          src={paciente.fotoPerfil ? resolveAssetUrl(paciente.fotoPerfil) : undefined}
                          sx={(t) => ({
                            bgcolor: t.palette.custom.tint[200],
                            color: t.palette.custom.header.text,
                            fontWeight: 700,
                            fontSize: 14,
                          })}
                        >
                          {iniciales(paciente.nombre)}
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography fontWeight={700} color="text.primary" noWrap>
                            {paciente.nombre}
                          </Typography>
                          {metaPaciente(paciente) && (
                            <Typography variant="caption" color="text.secondary">
                              {metaPaciente(paciente)}
                            </Typography>
                          )}
                        </Box>
                      </Stack>

                      <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                        <DatoPaciente icono={<BadgeOutlinedIcon fontSize="small" />} valor={paciente.rut} />
                        <DatoPaciente icono={<PhoneIcon fontSize="small" />} valor={paciente.telefono ? `+${paciente.telefono}` : 'Sin teléfono'} />
                        <DatoPaciente icono={<MailOutlineIcon fontSize="small" />} valor={paciente.email || 'Sin email'} />
                        {paciente.prevision && (
                          <DatoPaciente icono={<ShieldOutlinedIcon fontSize="small" />} valor={paciente.prevision} />
                        )}
                        <DatoPaciente
                          icono={<EventOutlinedIcon fontSize="small" />}
                          valor={textoProximaCita(paciente)}
                          atenuado={!proximaCitaDe(paciente._id)}
                        />
                      </Stack>

                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<MedicalInformationIcon />}
                        sx={{ mt: 1.75 }}
                        onClick={(e) => { e.stopPropagation(); handlePacienteClick(paciente); }}
                      >
                        Ficha clínica
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell>Paciente</TableCell>
                      <TableCell>Contacto</TableCell>
                      <TableCell>RUT</TableCell>
                      <TableCell>Previsión</TableCell>
                      <TableCell>Próxima cita</TableCell>
                      <TableCell align="right">Ficha</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginated.map((paciente) => (
                      <TableRow
                        key={paciente._id}
                        hover
                        onClick={() => handlePacienteClick(paciente)}
                        sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar
                              src={paciente.fotoPerfil ? resolveAssetUrl(paciente.fotoPerfil) : undefined}
                              sx={(t) => ({
                                width: 38,
                                height: 38,
                                bgcolor: t.palette.custom.tint[200],
                                color: t.palette.custom.header.text,
                                fontWeight: 700,
                                fontSize: 14,
                              })}
                            >
                              {iniciales(paciente.nombre)}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography fontWeight={700} color="text.primary">
                                {paciente.nombre}
                              </Typography>
                              {metaPaciente(paciente) && (
                                <Typography variant="caption" color="text.secondary">
                                  {metaPaciente(paciente)}
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Stack spacing={0.5}>
                            <DatoPaciente icono={<PhoneIcon fontSize="small" />} valor={paciente.telefono ? `+${paciente.telefono}` : 'Sin teléfono'} />
                            <DatoPaciente icono={<MailOutlineIcon fontSize="small" />} valor={paciente.email || 'Sin email'} atenuado={!paciente.email} />
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" color="text.primary">{paciente.rut}</Typography>
                        </TableCell>

                        <TableCell>
                          {paciente.prevision
                            ? <Typography variant="body2" color="text.primary">{paciente.prevision}</Typography>
                            : <Typography variant="body2" color="text.secondary">—</Typography>}
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" color={proximaCitaDe(paciente._id) ? 'text.primary' : 'text.secondary'}>
                            {textoProximaCita(paciente)}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<MedicalInformationIcon />}
                            sx={{ whiteSpace: 'nowrap' }}
                            onClick={(e) => { e.stopPropagation(); handlePacienteClick(paciente); }}
                          >
                            Ficha
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
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
    </PageLayout>
  );
}