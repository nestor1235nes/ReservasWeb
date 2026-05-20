import React, { useCallback, useEffect, useRef, useState } from "react";
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
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TodayIcon from "@mui/icons-material/Today";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import AddIcon from "@mui/icons-material/Add";
import CancelIcon from "@mui/icons-material/Cancel";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { useSucursal } from "../../context/sucursalContext";
import {
  getAgendaSucursalRequest,
  crearOcupacionRequest,
  actualizarOcupacionRequest,
  cambiarEstadoOcupacionRequest,
  cancelarOcupacionRequest,
} from "../../api/boxes";

dayjs.locale("es");

const generarSlots = (desde = "07:00", hasta = "21:00", intervalo = 30) => {
  const slots = [];
  let [h, m] = desde.split(":").map(Number);
  const [hFin, mFin] = hasta.split(":").map(Number);
  while (h < hFin || (h === hFin && m < mFin)) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += intervalo;
    if (m >= 60) { h++; m -= 60; }
  }
  return slots;
};

const SLOTS = generarSlots("07:00", "21:00", 30);
const SLOT_HEIGHT = 48;

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
  cancelado:  { label: "Cancelado",  color: "#dc2626", bg: "#fee2e2", icon: <CancelIcon fontSize="small" /> },
};

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Minutos actuales del día
const ahora = () => {
  const now = dayjs();
  return now.hour() * 60 + now.minute();
};

// Determina el estado que debería tener una ocupación según la hora actual
// Solo aplica si la fecha de la ocupación es hoy
const estadoEsperado = (ocupacion, esHoy) => {
  if (!esHoy) return null; // solo auto-transicionar en el día actual
  if (["completado", "cancelado"].includes(ocupacion.estado)) return null;
  const nowMin = ahora();
  const inicio = toMinutes(ocupacion.horaInicio);
  const fin = toMinutes(ocupacion.horaFin);
  if (nowMin >= fin) return "completado";
  if (nowMin >= inicio) return "en_curso";
  return null; // aún no empieza
};

const formVacio = {
  horaInicio: "09:00",
  horaFin: "10:00",
  tipo: "atencion",
  motivo: "",
  notas: "",
};

export default function AgendaBoxes() {
  const { getSucursal } = useSucursal();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [sucursal, setSucursal] = useState(null);
  const [fecha, setFecha] = useState(dayjs());
  const [agenda, setAgenda] = useState([]);
  const [loading, setLoading] = useState(true);
  const sucursalRef = useRef(null);

  // Dialog reservar/editar
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [boxSeleccionado, setBoxSeleccionado] = useState(null);
  const [form, setForm] = useState(formVacio);
  const [guardando, setGuardando] = useState(false);

  // Dialog detalle
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [ocupacionDetalle, setOcupacionDetalle] = useState(null);

  // Dialog confirmar liberación/cancelación
  const [liberarDialog, setLiberarDialog] = useState({ open: false, ocupacion: null });

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const mostrarSnackbar = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  const esHoy = fecha.isSame(dayjs(), "day");

  // ── Carga de agenda ──────────────────────────────────────────────
  const fetchAgenda = useCallback(async (s) => {
    const suc = s || sucursalRef.current;
    if (!suc?._id) return;
    try {
      const res = await getAgendaSucursalRequest(suc._id, fecha.format("YYYY-MM-DD"));
      setAgenda(res.data);
    } catch {
      mostrarSnackbar("Error al cargar la agenda", "error");
    }
  }, [fecha]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const s = await getSucursal();
      setSucursal(s);
      sucursalRef.current = s;
      await fetchAgenda(s);
      setLoading(false);
    };
    init();
  }, [getSucursal]);

  useEffect(() => {
    if (!sucursalRef.current) return;
    setLoading(true);
    fetchAgenda().finally(() => setLoading(false));
  }, [fecha, fetchAgenda]);

  // ── Auto-transición de estados cada 60 segundos (solo día actual) ──
  useEffect(() => {
    if (!esHoy) return;

    const autoTransicion = async () => {
      const todasOcupaciones = agenda.flatMap((a) => a.ocupaciones);
      const pendientes = todasOcupaciones.filter((oc) => {
        const esperado = estadoEsperado(oc, true);
        return esperado !== null && esperado !== oc.estado;
      });

      if (pendientes.length === 0) return;

      await Promise.all(
        pendientes.map((oc) =>
          cambiarEstadoOcupacionRequest(oc._id, estadoEsperado(oc, true)).catch(() => {})
        )
      );

      // Refrescar agenda para reflejar los cambios
      await fetchAgenda();
    };

    // Ejecutar inmediatamente al cargar o cambiar agenda
    autoTransicion();

    // Repetir cada 60 segundos
    const intervalo = setInterval(autoTransicion, 60_000);
    return () => clearInterval(intervalo);
  }, [agenda, esHoy, fetchAgenda]);

  // ── Helpers de UI ────────────────────────────────────────────────
  const cambiarDia = (delta) => setFecha((prev) => prev.add(delta, "day"));

  const calcularBloque = (horaInicio, horaFin) => {
    const primerSlot = toMinutes(SLOTS[0]);
    const top = ((toMinutes(horaInicio) - primerSlot) / 30) * SLOT_HEIGHT;
    const alto = ((toMinutes(horaFin) - toMinutes(horaInicio)) / 30) * SLOT_HEIGHT;
    return { top, alto };
  };

  const abrirReservar = (box, slotHora = null) => {
    setEditando(null);
    setBoxSeleccionado(box);
    const inicioMin = slotHora ? toMinutes(slotHora) : toMinutes("09:00");
    const finMin = inicioMin + 60;
    const fmtMin = (min) =>
      `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
    setForm({ ...formVacio, horaInicio: slotHora || "09:00", horaFin: fmtMin(finMin) });
    setDialogOpen(true);
  };

  const abrirEditar = (ocupacion, box) => {
    setDetalleOpen(false);
    setEditando(ocupacion);
    setBoxSeleccionado(box);
    setForm({
      horaInicio: ocupacion.horaInicio,
      horaFin: ocupacion.horaFin,
      tipo: ocupacion.tipo,
      motivo: ocupacion.motivo || "",
      notas: ocupacion.notas || "",
    });
    setDialogOpen(true);
  };

  const guardar = async () => {
    if (toMinutes(form.horaInicio) >= toMinutes(form.horaFin)) {
      mostrarSnackbar("La hora de inicio debe ser antes que la hora de fin", "error");
      return;
    }
    setGuardando(true);
    try {
      if (editando) {
        await actualizarOcupacionRequest(editando._id, { ...form, fecha: fecha.format("YYYY-MM-DD") });
        mostrarSnackbar("Reserva actualizada");
      } else {
        await crearOcupacionRequest(boxSeleccionado._id, { ...form, fecha: fecha.format("YYYY-MM-DD") });
        mostrarSnackbar("Box reservado correctamente");
      }
      setDialogOpen(false);
      await fetchAgenda();
    } catch (err) {
      mostrarSnackbar(err?.response?.data?.message || "Error al guardar la reserva", "error");
    } finally {
      setGuardando(false);
    }
  };

  // Liberar box: marca como completado (terminó antes o no se ocupó)
  const liberarBox = async () => {
    const { ocupacion } = liberarDialog;
    try {
      await cambiarEstadoOcupacionRequest(ocupacion._id, "completado");
      mostrarSnackbar("Box liberado correctamente");
    } catch {
      mostrarSnackbar("Error al liberar el box", "error");
    }
    setLiberarDialog({ open: false, ocupacion: null });
    setDetalleOpen(false);
    await fetchAgenda();
  };

  const cancelarOcupacion = async (id) => {
    try {
      await cancelarOcupacionRequest(id);
      mostrarSnackbar("Reserva cancelada");
      setDetalleOpen(false);
      await fetchAgenda();
    } catch {
      mostrarSnackbar("Error al cancelar la reserva", "error");
    }
  };

  const boxesActivos = agenda.filter((a) => a.box.activo);
  const totalAltura = SLOTS.length * SLOT_HEIGHT;

  // Línea de hora actual
  const lineaAhora = esHoy
    ? ((ahora() - toMinutes(SLOTS[0])) / 30) * SLOT_HEIGHT
    : null;

  return (
    <Box width="100%" minHeight="100%" bgcolor="#f5f7fa">
      {/* Header */}
      <Stack
        direction={isMobile ? "column" : "row"}
        justifyContent="space-between"
        alignItems={isMobile ? "stretch" : "center"}
        spacing={2}
        p={2}
        sx={{ background: "linear-gradient(45deg, #2596be 30%, #21cbe6 90%)" }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <EventAvailableIcon sx={{ color: "white", fontSize: 32 }} />
          <Typography variant="h5" fontWeight={700} color="white">
            Agenda de Boxes
          </Typography>
          {esHoy && (
            <Chip label="Auto-actualización activa" size="small"
              sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "white", fontSize: 11 }} />
          )}
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={() => cambiarDia(-1)} sx={{ color: "white" }}>
            <ChevronLeftIcon />
          </IconButton>
          <Stack alignItems="center">
            <Typography color="white" fontWeight={700} fontSize={16}>
              {fecha.format("dddd D [de] MMMM YYYY")}
            </Typography>
            {esHoy && (
              <Chip label="Hoy" size="small"
                sx={{ bgcolor: "white", color: "#2596be", fontWeight: 700, height: 18 }} />
            )}
          </Stack>
          <IconButton onClick={() => cambiarDia(1)} sx={{ color: "white" }}>
            <ChevronRightIcon />
          </IconButton>
          <Tooltip title="Ir a hoy">
            <IconButton onClick={() => setFecha(dayjs())} sx={{ color: "white" }}>
              <TodayIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Leyenda */}
      <Stack direction="row" flexWrap="wrap" gap={1} px={2} py={1} bgcolor="white" borderBottom="1px solid #e0e0e0">
        {Object.entries(ESTADO_CONFIG).filter(([k]) => k !== "cancelado").map(([key, cfg]) => (
          <Chip key={key} icon={cfg.icon} label={cfg.label} size="small"
            sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, "& .MuiChip-icon": { color: cfg.color } }} />
        ))}
        <Chip label="Libre" size="small" sx={{ bgcolor: "#f0fdf4", color: "#16a34a", fontWeight: 600 }} />
        {esHoy && (
          <Typography variant="caption" color="text.secondary" alignSelf="center" ml={1}>
            — Los estados se actualizan automáticamente según la hora
          </Typography>
        )}
      </Stack>

      {/* Grilla */}
      <Box sx={{ overflowX: "auto", bgcolor: "white" }}>
        {loading ? (
          <Stack alignItems="center" justifyContent="center" height={300}>
            <CircularProgress />
          </Stack>
        ) : boxesActivos.length === 0 ? (
          <Stack alignItems="center" spacing={2} py={8}>
            <MeetingRoomIcon sx={{ fontSize: 64, color: "#b0bec5" }} />
            <Typography color="text.secondary">No hay boxes activos configurados.</Typography>
            <Typography variant="body2" color="text.secondary">
              Ve a "Salas de Box" para crear y activar boxes primero.
            </Typography>
          </Stack>
        ) : (
          <Box sx={{ minWidth: 160 + boxesActivos.length * 180 }}>
            {/* Cabecera de boxes */}
            <Box sx={{ display: "flex", borderBottom: "2px solid #e0e0e0", position: "sticky", top: 0, zIndex: 10, bgcolor: "white" }}>
              <Box sx={{ width: 64, flexShrink: 0, borderRight: "1px solid #e0e0e0" }} />
              {boxesActivos.map(({ box }) => (
                <Box key={box._id} sx={{ flex: 1, minWidth: 160, borderRight: "1px solid #e0e0e0", p: 1, textAlign: "center" }}>
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} mb={0.3}>
                    <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: box.color || "#2596be", flexShrink: 0 }} />
                    <Typography fontWeight={700} fontSize={14} noWrap>{box.nombre}</Typography>
                  </Stack>
                  {box.codigo && <Typography variant="caption" color="text.secondary">#{box.codigo}</Typography>}
                  <Button size="small" startIcon={<AddIcon />} onClick={() => abrirReservar(box)}
                    sx={{ mt: 0.5, fontSize: 11, color: "#2596be", p: "2px 8px" }}>
                    Reservar
                  </Button>
                </Box>
              ))}
            </Box>

            {/* Grilla de horas */}
            <Box sx={{ display: "flex", position: "relative" }}>
              {/* Columna de horas */}
              <Box sx={{ width: 64, flexShrink: 0, borderRight: "1px solid #e0e0e0" }}>
                {SLOTS.map((slot) => (
                  <Box key={slot} sx={{ height: SLOT_HEIGHT, borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "flex-start", pt: 0.5, pl: 1 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>{slot}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Columnas de boxes */}
              {boxesActivos.map(({ box, ocupaciones }) => (
                <Box key={box._id} sx={{ flex: 1, minWidth: 160, borderRight: "1px solid #e0e0e0", position: "relative", height: totalAltura }}>
                  {/* Slots clickeables */}
                  {SLOTS.map((slot) => (
                    <Box key={slot} onClick={() => abrirReservar(box, slot)}
                      sx={{ height: SLOT_HEIGHT, borderBottom: "1px solid #f0f0f0", cursor: "pointer", "&:hover": { bgcolor: "#f0f9ff" }, transition: "background 0.1s" }}
                    />
                  ))}

                  {/* Bloques de ocupación */}
                  {ocupaciones.map((oc) => {
                    const { top, alto } = calcularBloque(oc.horaInicio, oc.horaFin);
                    const cfg = ESTADO_CONFIG[oc.estado] || ESTADO_CONFIG.reservado;
                    return (
                      <Tooltip key={oc._id}
                        title={`${oc.horaInicio}–${oc.horaFin} · ${oc.solicitadoPor?.username || ""} · ${TIPO_LABELS[oc.tipo] || oc.tipo}`}
                        arrow>
                        <Box
                          onClick={(e) => { e.stopPropagation(); setOcupacionDetalle({ ocupacion: oc, box }); setDetalleOpen(true); }}
                          sx={{
                            position: "absolute", top, left: 4, right: 4,
                            height: Math.max(alto - 4, 24),
                            bgcolor: cfg.bg, border: `2px solid ${cfg.color}`,
                            borderRadius: 2, p: "2px 6px", cursor: "pointer", zIndex: 2,
                            overflow: "hidden", "&:hover": { filter: "brightness(0.95)", zIndex: 3 },
                          }}
                        >
                          <Typography fontSize={11} fontWeight={700} color={cfg.color} noWrap>
                            {oc.horaInicio}–{oc.horaFin}
                          </Typography>
                          <Typography fontSize={11} color={cfg.color} noWrap>
                            {oc.solicitadoPor?.username || ""}
                          </Typography>
                          {alto >= 60 && oc.motivo && (
                            <Typography fontSize={10} color={cfg.color} noWrap>{oc.motivo}</Typography>
                          )}
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
              ))}

              {/* Línea de hora actual */}
              {lineaAhora !== null && lineaAhora > 0 && (
                <Box sx={{
                  position: "absolute", left: 0, right: 0,
                  top: lineaAhora,
                  height: 2, bgcolor: "#ef4444", zIndex: 5, pointerEvents: "none",
                }}>
                  <Box sx={{
                    position: "absolute", left: -4, top: -5,
                    width: 10, height: 10, borderRadius: "50%", bgcolor: "#ef4444",
                  }} />
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* ── Dialog Reservar / Editar ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#2596be" }}>
          {editando ? "Editar reserva" : `Reservar ${boxSeleccionado?.nombre || "box"}`}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <Stack direction="row" spacing={2}>
              <TextField label="Hora inicio" type="time" value={form.horaInicio}
                onChange={(e) => setForm((p) => ({ ...p, horaInicio: e.target.value }))}
                InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Hora fin" type="time" value={form.horaFin}
                onChange={(e) => setForm((p) => ({ ...p, horaFin: e.target.value }))}
                InputLabelProps={{ shrink: true }} fullWidth />
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
              fullWidth placeholder="Ej: Atención paciente Juan, Reunión de equipo..." />
            <TextField label="Notas internas (opcional)" value={form.notas}
              onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
              fullWidth multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancelar</Button>
          <Button onClick={guardar} variant="contained" disabled={guardando}
            sx={{ background: "linear-gradient(45deg,#2596be,#21cbe6)", color: "white" }}>
            {guardando ? <CircularProgress size={18} color="inherit" /> : editando ? "Guardar cambios" : "Reservar box"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog Detalle Ocupación ── */}
      {ocupacionDetalle && (
        <Dialog open={detalleOpen} onClose={() => setDetalleOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: ocupacionDetalle.box.color || "#2596be" }} />
              <span>{ocupacionDetalle.box.nombre}</span>
            </Stack>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1.5}>
              <DetalleRow label="Horario" value={`${ocupacionDetalle.ocupacion.horaInicio} – ${ocupacionDetalle.ocupacion.horaFin}`} />
              <DetalleRow label="Fecha" value={dayjs(ocupacionDetalle.ocupacion.fecha).format("DD/MM/YYYY")} />
              <DetalleRow label="Tipo" value={TIPO_LABELS[ocupacionDetalle.ocupacion.tipo] || ocupacionDetalle.ocupacion.tipo} />
              <DetalleRow label="Reservado por" value={ocupacionDetalle.ocupacion.solicitadoPor?.username || "—"} />
              {ocupacionDetalle.ocupacion.motivo && <DetalleRow label="Motivo" value={ocupacionDetalle.ocupacion.motivo} />}
              {ocupacionDetalle.ocupacion.notas && <DetalleRow label="Notas" value={ocupacionDetalle.ocupacion.notas} />}
              <Divider />
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Estado:</Typography>
                {(() => {
                  const cfg = ESTADO_CONFIG[ocupacionDetalle.ocupacion.estado];
                  return <Chip icon={cfg?.icon} label={cfg?.label} size="small"
                    sx={{ bgcolor: cfg?.bg, color: cfg?.color, fontWeight: 600, "& .MuiChip-icon": { color: cfg?.color } }} />;
                })()}
              </Stack>

              {/* Mensaje informativo en día actual */}
              {esHoy && ["reservado", "en_curso"].includes(ocupacionDetalle.ocupacion.estado) && (
                <Alert severity="info" sx={{ fontSize: 12 }}>
                  {ocupacionDetalle.ocupacion.estado === "reservado"
                    ? `El box pasará a "En curso" automáticamente a las ${ocupacionDetalle.ocupacion.horaInicio}.`
                    : `El box se marcará como completado automáticamente a las ${ocupacionDetalle.ocupacion.horaFin}.`}
                </Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, flexWrap: "wrap", gap: 1 }}>
            {/* Liberar box: disponible cuando está en curso o reservado */}
            {["reservado", "en_curso"].includes(ocupacionDetalle.ocupacion.estado) && (
              <Button size="small" variant="contained" startIcon={<LockOpenIcon />}
                color="warning"
                onClick={() => setLiberarDialog({ open: true, ocupacion: ocupacionDetalle.ocupacion })}
                sx={{ fontWeight: 700 }}>
                Liberar box
              </Button>
            )}
            <Button size="small" startIcon={<EditIcon />}
              disabled={["completado", "cancelado"].includes(ocupacionDetalle.ocupacion.estado)}
              onClick={() => abrirEditar(ocupacionDetalle.ocupacion, ocupacionDetalle.box)}>
              Editar
            </Button>
            {ocupacionDetalle.ocupacion.estado === "reservado" && (
              <Button size="small" startIcon={<CancelIcon />} color="error"
                onClick={() => cancelarOcupacion(ocupacionDetalle.ocupacion._id)}>
                Cancelar reserva
              </Button>
            )}
            <Box flex={1} />
            <Button onClick={() => setDetalleOpen(false)} color="inherit" size="small">Cerrar</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* ── Dialog Confirmar Liberar Box ── */}
      <Dialog open={liberarDialog.open} onClose={() => setLiberarDialog({ open: false, ocupacion: null })}>
        <DialogTitle>Liberar box</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {liberarDialog.ocupacion?.estado === "reservado"
              ? "El profesional no ocupó el box o finalizó antes de lo previsto. ¿Confirmas liberar el box ahora? Quedará disponible para el resto del horario."
              : "¿Confirmas que el box ya no está siendo utilizado? Quedará disponible para el resto del horario."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLiberarDialog({ open: false, ocupacion: null })} color="inherit">No</Button>
          <Button onClick={liberarBox} variant="contained" color="warning" startIcon={<LockOpenIcon />}>
            Sí, liberar box
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

function DetalleRow({ label, value }) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Typography variant="body2" color="text.secondary" fontWeight={600} minWidth={100}>{label}:</Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}
