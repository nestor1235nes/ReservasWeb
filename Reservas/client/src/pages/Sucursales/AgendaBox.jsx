import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import "dayjs/locale/es";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TodayIcon from "@mui/icons-material/Today";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import CancelIcon from "@mui/icons-material/Cancel";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import PeopleIcon from "@mui/icons-material/People";
import LayersIcon from "@mui/icons-material/Layers";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import {
  getBoxRequest,
  getOcupacionesBoxRequest,
  crearOcupacionRequest,
  actualizarOcupacionRequest,
  cambiarEstadoOcupacionRequest,
  cancelarOcupacionRequest,
} from "../../api/boxes";
import { useAuth } from "../../context/authContext";

dayjs.locale("es");

const TIPO_LABELS = {
  atencion: "Atención",
  reunion: "Reunión",
  mantenimiento: "Mantenimiento",
  capacitacion: "Capacitación",
  otro: "Otro",
};

const ESTADO_CONFIG = {
  reservado:  { label: "Reservado",  color: "#f59e0b", bg: "#fef3c7", icon: <EventAvailableIcon fontSize="small" /> },
  en_curso:   { label: "En curso",   color: "#2596be", bg: "#dbeafe", icon: <PlayCircleIcon fontSize="small" /> },
  completado: { label: "Completado", color: "#16a34a", bg: "#dcfce7", icon: <CheckCircleIcon fontSize="small" /> },
  cancelado:  { label: "Cancelado",  color: "#9e9e9e", bg: "#f5f5f5", icon: <CancelIcon fontSize="small" /> },
};

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const ahoraMin = () => {
  const now = dayjs();
  return now.hour() * 60 + now.minute();
};

const estadoEsperado = (oc, esHoy) => {
  if (!esHoy) return null;
  if (["completado", "cancelado"].includes(oc.estado)) return null;
  const now = ahoraMin();
  if (now >= toMinutes(oc.horaFin)) return "completado";
  if (now >= toMinutes(oc.horaInicio)) return "en_curso";
  return null;
};

const formVacio = { horaInicio: "09:00", horaFin: "10:00", tipo: "atencion", motivo: "", notas: "" };

// Genera la grilla de horas 07:00–21:00 cada 30 min
const SLOTS = [];
for (let h = 7; h < 21; h++) {
  SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}
const SLOT_HEIGHT = 40;

export default function AgendaBox() {
  const { boxId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { esAsistente, user } = useAuth();

  // Asistentes solo pueden ver la agenda, no reservar
  const puedeReservar = !esAsistente;

  const [box, setBox] = useState(null);
  const [fecha, setFecha] = useState(dayjs());
  const [ocupaciones, setOcupaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(formVacio);
  const [guardando, setGuardando] = useState(false);

  const [detalleOc, setDetalleOc] = useState(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [liberarDialog, setLiberarDialog] = useState({ open: false, ocupacion: null });
  const [reagendarDialog, setReagendarDialog] = useState({ open: false, horaInicio: null, horaFin: null });

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const mostrar = (message, severity = "success") => setSnackbar({ open: true, message, severity });

  const esHoy = fecha.isSame(dayjs(), "day");

  // ── Carga ──────────────────────────────────────────────────────
  const fetchOcupaciones = useCallback(async () => {
    try {
      const res = await getOcupacionesBoxRequest(boxId, fecha.format("YYYY-MM-DD"));
      setOcupaciones(res.data);
    } catch {
      mostrar("Error al cargar ocupaciones", "error");
    }
  }, [boxId, fecha]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const res = await getBoxRequest(boxId);
        setBox(res.data);
        await fetchOcupaciones();
      } catch {
        mostrar("Error al cargar el box", "error");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [boxId]);

  useEffect(() => {
    if (!box) return;
    setLoading(true);
    fetchOcupaciones().finally(() => setLoading(false));
  }, [fecha, fetchOcupaciones]);

  // ── Auto-transición cada 60s (solo hoy) ─────────────────────
  useEffect(() => {
    if (!esHoy) return;
    const run = async () => {
      const pendientes = ocupaciones.filter((oc) => {
        if (oc.estado === "cancelado") return false;
        const esp = estadoEsperado(oc, true);
        return esp && esp !== oc.estado;
      });
      if (!pendientes.length) return;
      await Promise.all(
        pendientes.map((oc) => cambiarEstadoOcupacionRequest(oc._id, estadoEsperado(oc, true)).catch(() => {}))
      );
      await fetchOcupaciones();
    };
    run();
    const id = setInterval(run, 60_000);
    return () => clearInterval(id);
  }, [ocupaciones, esHoy, fetchOcupaciones]);

  // ── Acciones ─────────────────────────────────────────────────
  const abrirReservar = (slotHora = null) => {
    setEditando(null);
    const inicioMin = slotHora ? toMinutes(slotHora) : toMinutes("09:00");
    const finMin = Math.min(inicioMin + 60, toMinutes("21:00"));
    const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    setForm({ ...formVacio, horaInicio: slotHora || "09:00", horaFin: fmt(finMin) });
    setDialogOpen(true);
  };

  const abrirEditar = (oc) => {
    setDetalleOpen(false);
    setEditando(oc);
    setForm({ horaInicio: oc.horaInicio, horaFin: oc.horaFin, tipo: oc.tipo, motivo: oc.motivo || "", notas: oc.notas || "" });
    setDialogOpen(true);
  };

  const guardar = async () => {
    if (toMinutes(form.horaInicio) >= toMinutes(form.horaFin)) {
      mostrar("La hora de inicio debe ser antes que la de fin", "error");
      return;
    }
    setGuardando(true);
    try {
      if (editando) {
        await actualizarOcupacionRequest(editando._id, { ...form, fecha: fecha.format("YYYY-MM-DD") });
        mostrar("Reserva actualizada");
      } else {
        await crearOcupacionRequest(boxId, { ...form, fecha: fecha.format("YYYY-MM-DD") });
        mostrar("Box reservado correctamente");
      }
      setDialogOpen(false);
      await fetchOcupaciones();
    } catch (err) {
      mostrar(err?.response?.data?.message || "Error al guardar", "error");
    } finally {
      setGuardando(false);
    }
  };

  const liberarBox = async (reagendar = false) => {
    const oc = liberarDialog.ocupacion;
    try {
      if (oc.estado === "en_curso") {
        // Ajustar horaFin a la hora actual y marcar completado
        const now = dayjs();
        const horaFinReal = `${String(now.hour()).padStart(2, "0")}:${String(now.minute()).padStart(2, "0")}`;
        await cambiarEstadoOcupacionRequest(oc._id, "completado", horaFinReal);
        mostrar(`Box liberado. Hora de fin ajustada a ${horaFinReal}`);
      } else {
        // "reservado" → cancelar (queda como historial gris)
        await cancelarOcupacionRequest(oc._id);
        mostrar("Reserva liberada y registrada en historial");
        if (reagendar) {
          // Ofrecer reagendar en el mismo slot
          setReagendarDialog({ open: true, horaInicio: oc.horaInicio, horaFin: oc.horaFin });
        }
      }
    } catch {
      mostrar("Error al liberar el boxxxxx", "error");
    }
    setLiberarDialog({ open: false, ocupacion: null });
    setDetalleOpen(false);
    await fetchOcupaciones();
  };

  const cancelar = async (id) => {
    try {
      await cancelarOcupacionRequest(id);
      mostrar("Reserva cancelada");
      setDetalleOpen(false);
      await fetchOcupaciones();
    } catch {
      mostrar("Error al cancelar", "error");
    }
  };

  // ── Grilla visual ─────────────────────────────────────────────
  const calcularBloque = (horaInicio, horaFin) => {
    const base = toMinutes(SLOTS[0]);
    const top = ((toMinutes(horaInicio) - base) / 30) * SLOT_HEIGHT;
    const alto = ((toMinutes(horaFin) - toMinutes(horaInicio)) / 30) * SLOT_HEIGHT;
    return { top, alto };
  };

  const lineaAhora = esHoy
    ? ((ahoraMin() - toMinutes(SLOTS[0])) / 30) * SLOT_HEIGHT
    : null;

  // Mostrar todas incluyendo canceladas (historial gris)
  const ocupacionesVisibles = ocupaciones;
  const ocupacionesActivas = ocupaciones.filter((oc) => oc.estado !== "cancelado");
  const ocupacionesCanceladas = ocupaciones.filter((oc) => oc.estado === "cancelado");

  if (loading && !box) {
    return (
      <Stack alignItems="center" justifyContent="center" height="60vh">
        <CircularProgress />
      </Stack>
    );
  }

  const colorBox = box?.color || "#2596be";

  return (
    <Box width="100%" minHeight="100%" bgcolor="#f5f7fa">
      {/* Header */}
      <Stack
        direction={isMobile ? "column" : "row"}
        justifyContent="space-between"
        alignItems={isMobile ? "stretch" : "center"}
        spacing={2}
        p={2}
        sx={{ background: `linear-gradient(45deg, ${colorBox} 30%, ${colorBox}bb 90%)` }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Tooltip title="Volver a Salas de Box">
            <IconButton onClick={() => navigate("/mi-empresa/boxes")} sx={{ color: "white" }}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <MeetingRoomIcon sx={{ color: "white", fontSize: 28 }} />
          <Box>
            <Typography variant="h5" fontWeight={700} color="white" lineHeight={1}>
              {box?.nombre || "Box"}
            </Typography>
            {box?.codigo && (
              <Typography variant="caption" color="rgba(255,255,255,0.8)">#{box.codigo}</Typography>
            )}
          </Box>
          {esHoy && (
            <Chip label="Auto-actualización activa" size="small"
              sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", fontSize: 11 }} />
          )}
        </Stack>

        {/* Navegación de fecha */}
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton onClick={() => setFecha((p) => p.subtract(1, "day"))} sx={{ color: "white" }}>
            <ChevronLeftIcon />
          </IconButton>
          <Stack alignItems="center" minWidth={200}>
            <Typography color="white" fontWeight={700} fontSize={15}>
              {fecha.format("dddd D [de] MMMM YYYY")}
            </Typography>
            {esHoy && <Chip label="Hoy" size="small" sx={{ bgcolor: "white", color: colorBox, fontWeight: 700, height: 16, fontSize: 11 }} />}
          </Stack>
          <IconButton onClick={() => setFecha((p) => p.add(1, "day"))} sx={{ color: "white" }}>
            <ChevronRightIcon />
          </IconButton>
          <Tooltip title="Ir a hoy">
            <IconButton onClick={() => setFecha(dayjs())} sx={{ color: "white" }}>
              <TodayIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {puedeReservar && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => abrirReservar()}
            sx={{ bgcolor: "white", color: colorBox, fontWeight: 700, borderRadius: 2, "&:hover": { bgcolor: "#f0f0f0" } }}>
            Nueva reserva
          </Button>
        )}
      </Stack>

      {/* Info del box */}
      {box && (
        <Stack direction="row" flexWrap="wrap" gap={2} px={2} py={1.5} bgcolor="white" borderBottom="1px solid #e0e0e0" alignItems="center">
          {box.piso && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <LayersIcon fontSize="small" sx={{ color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">{box.piso}</Typography>
            </Stack>
          )}
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <PeopleIcon fontSize="small" sx={{ color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              Cap. {box.capacidad} paciente{box.capacidad !== 1 ? "s" : ""}
            </Typography>
          </Stack>
          {box.equipamiento?.length > 0 && box.equipamiento.map((e) => (
            <Chip key={e} label={e} size="small" variant="outlined" />
          ))}
          <Box flex={1} />
          {/* Leyenda */}
          {Object.entries(ESTADO_CONFIG).filter(([k]) => k !== "cancelado").map(([key, cfg]) => (
            <Chip key={key} icon={cfg.icon} label={cfg.label} size="small"
              sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, "& .MuiChip-icon": { color: cfg.color } }} />
          ))}
        </Stack>
      )}

      {/* Layout principal: lista de reservas + grilla */}
      <Stack direction={isMobile ? "column" : "row"} sx={{ bgcolor: "white", minHeight: 500 }}>

        {/* Panel izquierdo: resumen del día */}
        <Box sx={{ width: isMobile ? "100%" : 300, flexShrink: 0, borderRight: "1px solid #e0e0e0", p: 2, bgcolor: "#fafafa" }}>
          <Typography fontWeight={700} color="text.secondary" fontSize={13} mb={1.5} textTransform="uppercase">
            Reservas del día
          </Typography>

          {loading ? (
            <Stack alignItems="center" py={4}><CircularProgress size={24} /></Stack>
          ) : ocupacionesActivas.length === 0 ? (
            <Stack alignItems="center" spacing={1} py={4}>
              <EventAvailableIcon sx={{ fontSize: 40, color: "#b0bec5" }} />
              <Typography variant="body2" color="text.secondary" align="center">
                Sin reservas para este día
              </Typography>
              {puedeReservar && (
                <Button size="small" startIcon={<AddIcon />} onClick={() => abrirReservar()}
                  sx={{ color: colorBox }}>
                  Agregar reserva
                </Button>
              )}
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              {[...ocupacionesActivas].sort((a, b) => toMinutes(a.horaInicio) - toMinutes(b.horaInicio)).map((oc) => {
                const cfg = ESTADO_CONFIG[oc.estado] || ESTADO_CONFIG.reservado;
                return (
                  <Card key={oc._id} onClick={() => { setDetalleOc(oc); setDetalleOpen(true); }} cfg={cfg} oc={oc} />
                );
              })}
            </Stack>
          )}

          {/* Historial de liberadas */}
          {ocupacionesCanceladas.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography fontWeight={700} color="text.secondary" fontSize={12} mb={1} textTransform="uppercase"
                sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <CancelIcon sx={{ fontSize: 14 }} />
                Historial liberadas
              </Typography>
              <Stack spacing={1}>
                {[...ocupacionesCanceladas].sort((a, b) => toMinutes(a.horaInicio) - toMinutes(b.horaInicio)).map((oc) => (
                  <Box
                    key={oc._id}
                    onClick={() => { setDetalleOc(oc); setDetalleOpen(true); }}
                    sx={{
                      border: "1.5px dashed #bdbdbd",
                      borderRadius: 2,
                      p: 1.2,
                      bgcolor: "#f5f5f5",
                      cursor: "pointer",
                      opacity: 0.75,
                      "&:hover": { opacity: 1, boxShadow: 1 },
                      transition: "all 0.15s",
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.2}>
                      <Typography fontWeight={600} fontSize={12} color="#9e9e9e"
                        sx={{ textDecoration: "line-through" }}>
                        {oc.horaInicio} – {oc.horaFin}
                      </Typography>
                      <Chip label="Liberada" size="small"
                        sx={{ height: 16, fontSize: 10, bgcolor: "transparent", border: "1px solid #bdbdbd", color: "#9e9e9e" }} />
                    </Stack>
                    <Typography fontSize={12} color="#bdbdbd" noWrap>
                      {oc.solicitadoPor?.username || "—"}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </>
          )}
        </Box>

        {/* Panel derecho: grilla de horas */}
        <Box sx={{ flex: 1, overflowY: "auto", position: "relative" }}>
          <Box sx={{ position: "relative", minHeight: SLOTS.length * SLOT_HEIGHT }}>
            {/* Slots */}
            {SLOTS.map((slot) => (
              <Box key={slot}
                onClick={() => puedeReservar && abrirReservar(slot)}
                sx={{
                  height: SLOT_HEIGHT,
                  borderBottom: "1px solid #f0f0f0",
                  display: "flex",
                  alignItems: "center",
                  cursor: puedeReservar ? "pointer" : "default",
                  "&:hover": puedeReservar ? { bgcolor: `${colorBox}10` } : {},
                  transition: "background 0.1s",
                  px: 1,
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600} width={48} flexShrink={0}>
                  {slot}
                </Typography>
              </Box>
            ))}

            {/* Bloques de ocupación (incluye canceladas como historial gris) */}
            {ocupacionesVisibles.map((oc) => {
              const { top, alto } = calcularBloque(oc.horaInicio, oc.horaFin);
              const cfg = ESTADO_CONFIG[oc.estado] || ESTADO_CONFIG.reservado;
              const esCancelada = oc.estado === "cancelado";
              return (
                <Tooltip key={oc._id}
                  title={esCancelada ? `Liberada · ${oc.horaInicio}–${oc.horaFin}` : `${TIPO_LABELS[oc.tipo] || oc.tipo} · ${oc.solicitadoPor?.username || ""}`} arrow>
                  <Box
                    onClick={(e) => { e.stopPropagation(); setDetalleOc(oc); setDetalleOpen(true); }}
                    sx={{
                      position: "absolute",
                      top: top + 1,
                      left: 56,
                      right: 8,
                      height: Math.max(alto - 2, 28),
                      bgcolor: esCancelada ? "#f5f5f5" : cfg.bg,
                      border: `2px ${esCancelada ? "dashed" : "solid"} ${esCancelada ? "#bdbdbd" : cfg.color}`,
                      borderRadius: 2,
                      px: 1.5,
                      py: 0.5,
                      cursor: "pointer",
                      zIndex: esCancelada ? 1 : 2,
                      overflow: "hidden",
                      opacity: esCancelada ? 0.6 : 1,
                      "&:hover": { filter: "brightness(0.96)", boxShadow: esCancelada ? 0 : 2 },
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography fontSize={12} fontWeight={esCancelada ? 400 : 700} color={esCancelada ? "#9e9e9e" : cfg.color}
                        sx={esCancelada ? { textDecoration: "line-through" } : {}}>
                        {oc.horaInicio}–{oc.horaFin}
                      </Typography>
                      <Chip label={cfg.label} size="small"
                        sx={{ height: 16, fontSize: 10, bgcolor: "transparent", border: `1px solid ${esCancelada ? "#bdbdbd" : cfg.color}`, color: esCancelada ? "#9e9e9e" : cfg.color }} />
                    </Stack>
                    {!esCancelada && (
                      <Typography fontSize={12} color={cfg.color} noWrap>
                        {oc.solicitadoPor?.username || ""}
                        {oc.motivo ? ` · ${oc.motivo}` : ""}
                      </Typography>
                    )}
                  </Box>
                </Tooltip>
              );
            })}

            {/* Línea de hora actual */}
            {lineaAhora !== null && lineaAhora >= 0 && (
              <Box sx={{ position: "absolute", left: 0, right: 0, top: lineaAhora, height: 2, bgcolor: "#ef4444", zIndex: 5, pointerEvents: "none" }}>
                <Box sx={{ position: "absolute", left: 44, top: -5, width: 10, height: 10, borderRadius: "50%", bgcolor: "#ef4444" }} />
              </Box>
            )}
          </Box>
        </Box>
      </Stack>

      {/* ── Dialog Reservar / Editar ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle
          sx={{
            background: `linear-gradient(45deg, ${colorBox} 30%, ${colorBox}bb 90%)`,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            mb: 1,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            {editando ? <EditIcon /> : <AddIcon />}
            <Box>
              <Typography variant="h6" fontWeight={600} lineHeight={1.2}>
                {editando ? "Editar reserva" : `Reservar ${box?.nombre || "box"}`}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                {fecha.format("dddd D [de] MMMM YYYY")}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setDialogOpen(false)}
            sx={{ color: "white", "&:hover": { bgcolor: "rgba(255,255,255,0.15)" } }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, pt: 4 }}>
          <Stack spacing={2} mt={1}>
            <Stack direction="row" spacing={2}>
              <TextField label="Hora inicio" type="time" value={form.horaInicio}
                onChange={(e) => setForm((p) => ({ ...p, horaInicio: e.target.value }))}
                InputLabelProps={{ shrink: true }} fullWidth
                sx={{ "& .MuiOutlinedInput-root": { "&.Mui-focused fieldset": { borderColor: colorBox } } }} />
              <TextField label="Hora fin" type="time" value={form.horaFin}
                onChange={(e) => setForm((p) => ({ ...p, horaFin: e.target.value }))}
                InputLabelProps={{ shrink: true }} fullWidth
                sx={{ "& .MuiOutlinedInput-root": { "&.Mui-focused fieldset": { borderColor: colorBox } } }} />
            </Stack>
            <FormControl fullWidth>
              <InputLabel>Tipo de uso</InputLabel>
              <Select value={form.tipo} label="Tipo de uso"
                onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}>
                {Object.entries(TIPO_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Motivo (opcional)" value={form.motivo}
              onChange={(e) => setForm((p) => ({ ...p, motivo: e.target.value }))}
              fullWidth placeholder="Ej: Atención paciente Juan..."
              sx={{ "& .MuiOutlinedInput-root": { "&.Mui-focused fieldset": { borderColor: colorBox } } }} />
            <TextField label="Notas internas (opcional)" value={form.notas}
              onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
              fullWidth multiline rows={2}
              sx={{ "& .MuiOutlinedInput-root": { "&.Mui-focused fieldset": { borderColor: colorBox } } }} />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, backgroundColor: "#f8f9fa" }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" color="secondary"
            startIcon={<CancelIcon />} sx={{ minWidth: 120 }}>
            Cancelar
          </Button>
          <Button onClick={guardar} variant="contained" disabled={guardando} startIcon={guardando ? null : <SaveIcon />}
            sx={{ minWidth: 140, bgcolor: colorBox, "&:hover": { bgcolor: colorBox, filter: "brightness(0.9)" } }}>
            {guardando ? <CircularProgress size={18} color="inherit" /> : editando ? "Guardar cambios" : "Reservar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog Detalle ── */}
      {detalleOc && (() => {
        const cfg = ESTADO_CONFIG[detalleOc.estado] || ESTADO_CONFIG.reservado;
        const userId = user?.id || user?._id;
        const duenioId = detalleOc.solicitadoPor?._id || detalleOc.solicitadoPor?.id;
        const esDuenio = userId && duenioId && userId === duenioId;
        const puedeAccionar = puedeReservar && esDuenio;
        return (
          <Dialog open={detalleOpen} onClose={() => setDetalleOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle
              sx={{
                background: `linear-gradient(45deg, ${cfg.color} 30%, ${cfg.color}cc 90%)`,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                pb: 1.5,
                mb: 2,
              }}
            >
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box sx={{ "& .MuiSvgIcon-root": { color: "white", fontSize: 28 } }}>{cfg.icon}</Box>
                <Box>
                  <Typography variant="h6" fontWeight={700} lineHeight={1.2} color="white">
                    {detalleOc.horaInicio} – {detalleOc.horaFin}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.88, color: "white" }}>
                    {cfg.label} · {TIPO_LABELS[detalleOc.tipo] || detalleOc.tipo}
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={() => setDetalleOpen(false)}
                sx={{ color: "white", "&:hover": { bgcolor: "rgba(255,255,255,0.15)" } }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, pt: 3 }}>
              <Stack spacing={1.5}>
                <DetalleRow label="Reservado por" value={detalleOc.solicitadoPor?.username || "—"} />
                {detalleOc.motivo && <DetalleRow label="Motivo" value={detalleOc.motivo} />}
                {detalleOc.notas && <DetalleRow label="Notas" value={detalleOc.notas} />}
                {esHoy && ["reservado", "en_curso"].includes(detalleOc.estado) && (
                  <Alert severity="info" sx={{ fontSize: 12 }}>
                    {detalleOc.estado === "reservado"
                      ? `Pasará a "En curso" automáticamente a las ${detalleOc.horaInicio}.`
                      : `Se completará automáticamente a las ${detalleOc.horaFin}.`}
                  </Alert>
                )}
                {puedeReservar && !esDuenio && (
                  <Alert severity="warning" sx={{ fontSize: 12 }}>
                    Esta reserva pertenece a otro profesional.
                  </Alert>
                )}
              </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, bgcolor: "#f8f9fa", gap: 1, flexWrap: "wrap" }}>
              {puedeAccionar && ["reservado", "en_curso"].includes(detalleOc.estado) && (
                <Button size="small" variant="contained" startIcon={<LockOpenIcon />} color="warning"
                  sx={{ fontWeight: 700 }}
                  onClick={() => setLiberarDialog({ open: true, ocupacion: detalleOc })}>
                  Liberar box
                </Button>
              )}
              {puedeAccionar && (
                <Button size="small" variant="outlined" startIcon={<EditIcon />}
                  disabled={["completado", "cancelado"].includes(detalleOc.estado)}
                  onClick={() => abrirEditar(detalleOc)}>
                  Editar
                </Button>
              )}
              {puedeAccionar && detalleOc.estado === "reservado" && (
                <Button size="small" variant="outlined" startIcon={<CancelIcon />} color="error"
                  onClick={() => cancelar(detalleOc._id)}>
                  Cancelar
                </Button>
              )}
              <Box flex={1} />
              <Button onClick={() => setDetalleOpen(false)} variant="outlined" color="inherit" size="small"
                startIcon={<CloseIcon />}>
                Cerrar
              </Button>
            </DialogActions>
          </Dialog>
        );
      })()}

      {/* ── Dialog Liberar ── */}
      <Dialog open={liberarDialog.open} onClose={() => setLiberarDialog({ open: false, ocupacion: null })} maxWidth="xs" fullWidth>
        <DialogTitle
          sx={{
            background: "linear-gradient(45deg, #f59e0b 30%, #fbbf24 90%)",
            color: "white",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <LockOpenIcon />
            <Typography variant="h6" fontWeight={600}>Liberar box</Typography>
          </Box>
          <IconButton onClick={() => setLiberarDialog({ open: false, ocupacion: null })}
            sx={{ color: "white", "&:hover": { bgcolor: "rgba(255,255,255,0.15)" } }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 4 }}>
          {liberarDialog.ocupacion?.estado === "en_curso" ? (
            <DialogContentText>
              El box está <b>en curso</b>. Al liberar, se ajustará la hora de fin a la hora actual y quedará marcado como completado.
            </DialogContentText>
          ) : (
            <DialogContentText>
              La reserva aún no ha comenzado. Al liberarla quedará registrada en el historial y el horario quedará disponible para nuevas reservas.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: "#f8f9fa", gap: 1 }}>
          <Button onClick={() => setLiberarDialog({ open: false, ocupacion: null })} variant="outlined" color="inherit">
            Cancelar
          </Button>
          <Button onClick={() => liberarBox(false)} variant="contained" color="warning" startIcon={<LockOpenIcon />}>
            {liberarDialog.ocupacion?.estado === "en_curso" ? "Liberar ahora" : "Liberar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog Reagendar tras liberar ── */}
      <Dialog open={reagendarDialog.open} onClose={() => setReagendarDialog({ open: false, horaInicio: null, horaFin: null })} maxWidth="xs" fullWidth>
        <DialogTitle
          sx={{
            background: `linear-gradient(45deg, ${colorBox} 30%, ${colorBox}bb 90%)`,
            color: "white",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <AddIcon />
            <Typography variant="h6" fontWeight={600}>Reagendar horario liberado</Typography>
          </Box>
          <IconButton onClick={() => setReagendarDialog({ open: false, horaInicio: null, horaFin: null })}
            sx={{ color: "white", "&:hover": { bgcolor: "rgba(255,255,255,0.15)" } }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 4 }}>
          <DialogContentText mb={2}>
            El horario <b>{reagendarDialog.horaInicio} – {reagendarDialog.horaFin}</b> quedó disponible. ¿Deseas crear una nueva reserva para ese mismo horario?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: "#f8f9fa", gap: 1 }}>
          <Button onClick={() => setReagendarDialog({ open: false, horaInicio: null, horaFin: null })} variant="outlined" color="inherit">
            No, gracias
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ bgcolor: colorBox, "&:hover": { bgcolor: colorBox, filter: "brightness(0.9)" } }}
            onClick={() => {
              setReagendarDialog({ open: false, horaInicio: null, horaFin: null });
              setEditando(null);
              setForm({ ...formVacio, horaInicio: reagendarDialog.horaInicio, horaFin: reagendarDialog.horaFin });
              setDialogOpen(true);
            }}
          >
            Crear nueva reserva
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert onClose={() => setSnackbar((p) => ({ ...p, open: false }))} severity={snackbar.severity}
          sx={{ width: "100%", bgcolor: snackbar.severity === "success" ? "#43a047" : "#d32f2f", color: "white", "& .MuiAlert-icon": { color: "#fff" } }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// Tarjeta de reserva en el panel izquierdo
function Card({ oc, cfg, onClick }) {
  return (
    <Box onClick={onClick} sx={{
      border: `1.5px solid ${cfg.color}`, borderRadius: 2, p: 1.5,
      bgcolor: cfg.bg, cursor: "pointer",
      "&:hover": { boxShadow: 2, filter: "brightness(0.97)" },
      transition: "all 0.15s",
    }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.3}>
        <Typography fontWeight={700} fontSize={13} color={cfg.color}>
          {oc.horaInicio} – {oc.horaFin}
        </Typography>
        <Chip label={cfg.label} size="small"
          sx={{ height: 18, fontSize: 10, bgcolor: "transparent", border: `1px solid ${cfg.color}`, color: cfg.color }} />
      </Stack>
      <Typography fontSize={13} fontWeight={600} noWrap>{oc.solicitadoPor?.username || "—"}</Typography>
      <Typography fontSize={12} color="text.secondary" noWrap>{TIPO_LABELS[oc.tipo] || oc.tipo}{oc.motivo ? ` · ${oc.motivo}` : ""}</Typography>
    </Box>
  );
}

function DetalleRow({ label, value }) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Typography variant="body2" color="text.secondary" fontWeight={600} minWidth={110}>{label}:</Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}
