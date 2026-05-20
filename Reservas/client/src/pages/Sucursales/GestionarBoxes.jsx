import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  Snackbar,
  Alert,
  FormControlLabel,
  InputAdornment,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import PeopleIcon from "@mui/icons-material/People";
import LayersIcon from "@mui/icons-material/Layers";
import BuildIcon from "@mui/icons-material/Build";
import TagIcon from "@mui/icons-material/Tag";
import CircleIcon from "@mui/icons-material/Circle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import { useSucursal } from "../../context/sucursalContext";
import { useAuth } from "../../context/authContext";
import { useSubscription } from "../../context/subscriptionContext";
import {
  getBoxesSucursalRequest,
  crearBoxRequest,
  actualizarBoxRequest,
  eliminarBoxRequest,
  toggleActivoBoxRequest,
} from "../../api/boxes";

const COLORES_PRESET = [
  "#2596be", "#21cbe6", "#0d9488", "#16a34a", "#ca8a04",
  "#dc2626", "#9333ea", "#db2777", "#f97316", "#6366f1",
];

const boxVacio = {
  nombre: "",
  descripcion: "",
  codigo: "",
  capacidad: 1,
  piso: "",
  equipamiento: [],
  activo: true,
  color: "#2596be",
  notas: "",
};

export default function GestionarBoxes() {
  const { getSucursal } = useSucursal();
  const { esAdminSucursal, esAsistente } = useAuth();
  const { isTeams } = useSubscription();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Solo admins de sucursal con plan Teams pueden crear/editar/eliminar
  const puedeGestionar = esAdminSucursal && isTeams;

  const [sucursal, setSucursal] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal crear/editar
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null); // null = crear, objeto = editar
  const [form, setForm] = useState(boxVacio);
  const [equipamientoInput, setEquipamientoInput] = useState("");

  // Modal confirmar eliminación
  const [confirmDialog, setConfirmDialog] = useState({ open: false, boxId: null, boxNombre: "" });

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getSucursal();
      setSucursal(s);
      if (s?._id) {
        const res = await getBoxesSucursalRequest(s._id);
        setBoxes(res.data);
      }
    } catch {
      mostrarSnackbar("Error al cargar los datos", "error");
    } finally {
      setLoading(false);
    }
  }, [getSucursal]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const mostrarSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const abrirCrear = () => {
    setEditando(null);
    setForm(boxVacio);
    setEquipamientoInput("");
    setDialogOpen(true);
  };

  const abrirEditar = (box) => {
    setEditando(box);
    setForm({
      nombre: box.nombre || "",
      descripcion: box.descripcion || "",
      codigo: box.codigo || "",
      capacidad: box.capacidad || 1,
      piso: box.piso || "",
      equipamiento: box.equipamiento || [],
      activo: box.activo ?? true,
      color: box.color || "#2596be",
      notas: box.notas || "",
    });
    setEquipamientoInput("");
    setDialogOpen(true);
  };

  const cerrarDialog = () => {
    setDialogOpen(false);
    setEditando(null);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const agregarEquipamiento = () => {
    const item = equipamientoInput.trim();
    if (item && !form.equipamiento.includes(item)) {
      setForm((prev) => ({ ...prev, equipamiento: [...prev.equipamiento, item] }));
    }
    setEquipamientoInput("");
  };

  const quitarEquipamiento = (item) => {
    setForm((prev) => ({ ...prev, equipamiento: prev.equipamiento.filter((e) => e !== item) }));
  };

  const guardarBox = async () => {
    if (!form.nombre.trim()) {
      mostrarSnackbar("El nombre del box es obligatorio", "error");
      return;
    }
    try {
      if (editando) {
        const res = await actualizarBoxRequest(editando._id, form);
        setBoxes((prev) => prev.map((b) => (b._id === editando._id ? res.data : b)));
        mostrarSnackbar("Box actualizado correctamente");
      } else {
        const res = await crearBoxRequest(sucursal._id, form);
        setBoxes((prev) => [...prev, res.data]);
        mostrarSnackbar("Box creado correctamente");
      }
      cerrarDialog();
    } catch {
      mostrarSnackbar("Error al guardar el box", "error");
    }
  };

  const abrirConfirmEliminar = (box) => {
    setConfirmDialog({ open: true, boxId: box._id, boxNombre: box.nombre });
  };

  const eliminarBox = async () => {
    try {
      await eliminarBoxRequest(confirmDialog.boxId);
      setBoxes((prev) => prev.filter((b) => b._id !== confirmDialog.boxId));
      mostrarSnackbar("Box eliminado correctamente");
    } catch {
      mostrarSnackbar("Error al eliminar el box", "error");
    }
    setConfirmDialog({ open: false, boxId: null, boxNombre: "" });
  };

  const toggleActivo = async (box) => {
    try {
      const res = await toggleActivoBoxRequest(box._id);
      setBoxes((prev) =>
        prev.map((b) => (b._id === box._id ? { ...b, activo: res.data.activo } : b))
      );
      mostrarSnackbar(res.data.message);
    } catch {
      mostrarSnackbar("Error al cambiar el estado del box", "error");
    }
  };

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
          <MeetingRoomIcon sx={{ color: "white", fontSize: 32 }} />
          <Typography variant="h5" fontWeight={700} color="white">
            Salas de Box — {sucursal?.nombre || "..."}
          </Typography>
        </Stack>
        {puedeGestionar && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ background: "white", color: "#2596be", borderRadius: 2, fontWeight: 700 }}
            onClick={abrirCrear}
          >
            Nuevo Box
          </Button>
        )}
      </Stack>

      {/* Contenido */}
      <Box sx={{ background: "white", borderRadius: 3, boxShadow: 4, p: isMobile ? 1 : 3, mt: 0 }}>
        {loading ? (
          <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
            Cargando boxes...
          </Typography>
        ) : boxes.length === 0 ? (
          <Stack alignItems="center" spacing={2} sx={{ mt: 6, mb: 4 }}>
            <MeetingRoomIcon sx={{ fontSize: 64, color: "#b0bec5" }} />
            <Typography color="text.secondary" variant="h6">
              No hay salas de box registradas
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Crea el primer box para comenzar a organizar tus atenciones
            </Typography>
            {puedeGestionar && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={abrirCrear}
                sx={{ background: "linear-gradient(45deg,#2596be,#21cbe6)", color: "white" }}>
                Crear primer box
              </Button>
            )}
          </Stack>
        ) : (
          <Grid container spacing={3} sx={{ mt: 0 }}>
            {boxes.map((box) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={box._id}>
                <BoxCard box={box} onEditar={abrirEditar} onEliminar={abrirConfirmEliminar} onToggleActivo={toggleActivo} onVerAgenda={(b) => navigate(`/mi-empresa/boxes/${b._id}/agenda`)} puedeGestionar={puedeGestionar} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Dialog Crear/Editar */}
      <Dialog open={dialogOpen} onClose={cerrarDialog} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            background: "linear-gradient(45deg, #2596be 30%, #21cbe6 90%)",
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
            <Typography variant="h6" fontWeight={600}>
              {editando ? "Editar Box" : "Nuevo Box"}
            </Typography>
          </Box>
          <IconButton onClick={cerrarDialog} sx={{ color: "white", "&:hover": { bgcolor: "rgba(255,255,255,0.15)" } }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, pt: 4 }}>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {editando ? "Modifica la información de la sala de box." : "Completa la información de la nueva sala de box."}
          </Typography>
          <Stack spacing={3}>
            <TextField
              label="Nombre del box *"
              name="nombre"
              value={form.nombre}
              onChange={handleFormChange}
              fullWidth
              placeholder="Ej: Box 1, Sala de Kinesiología"
              sx={{ "& .MuiOutlinedInput-root": { "&.Mui-focused fieldset": { borderColor: "#2596be" } } }}
            />

            <Box display="flex" gap={2}>
              <TextField
                label="Código / N°"
                name="codigo"
                value={form.codigo}
                onChange={handleFormChange}
                fullWidth
                placeholder="Ej: B1, 01"
                InputProps={{ startAdornment: <InputAdornment position="start"><TagIcon fontSize="small" /></InputAdornment> }}
                sx={{ "& .MuiOutlinedInput-root": { "&.Mui-focused fieldset": { borderColor: "#2596be" } } }}
              />
              <TextField
                label="Piso / Ubicación"
                name="piso"
                value={form.piso}
                onChange={handleFormChange}
                fullWidth
                placeholder="Ej: 2° piso, Ala Norte"
                InputProps={{ startAdornment: <InputAdornment position="start"><LayersIcon fontSize="small" /></InputAdornment> }}
                sx={{ "& .MuiOutlinedInput-root": { "&.Mui-focused fieldset": { borderColor: "#2596be" } } }}
              />
            </Box>

            <TextField
              label="Capacidad de pacientes"
              name="capacidad"
              type="number"
              value={form.capacidad}
              onChange={handleFormChange}
              inputProps={{ min: 1 }}
              fullWidth
              InputProps={{ startAdornment: <InputAdornment position="start"><PeopleIcon fontSize="small" /></InputAdornment> }}
              sx={{ "& .MuiOutlinedInput-root": { "&.Mui-focused fieldset": { borderColor: "#2596be" } } }}
            />

            <TextField
              label="Descripción (Opcional)"
              name="descripcion"
              value={form.descripcion}
              onChange={handleFormChange}
              fullWidth
              multiline
              rows={2}
              placeholder="Descripción breve del box o su uso"
              sx={{ "& .MuiOutlinedInput-root": { "&.Mui-focused fieldset": { borderColor: "#2596be" } } }}
            />

            <Divider />

            {/* Equipamiento */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={1} color="text.secondary">
                Equipamiento disponible
              </Typography>
              <Stack direction="row" spacing={1} mb={1.5}>
                <TextField
                  size="small"
                  placeholder="Ej: Camilla, Ultrasonido..."
                  value={equipamientoInput}
                  onChange={(e) => setEquipamientoInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarEquipamiento(); } }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><BuildIcon fontSize="small" /></InputAdornment> }}
                  sx={{ flexGrow: 1, "& .MuiOutlinedInput-root": { "&.Mui-focused fieldset": { borderColor: "#2596be" } } }}
                />
                <Button variant="outlined" onClick={agregarEquipamiento}
                  sx={{ whiteSpace: "nowrap", borderColor: "#2596be", color: "#2596be" }}>
                  Agregar
                </Button>
              </Stack>
              {form.equipamiento.length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {form.equipamiento.map((item) => (
                    <Chip key={item} label={item} onDelete={() => quitarEquipamiento(item)} size="small" />
                  ))}
                </Stack>
              )}
            </Box>

            <TextField
              label="Notas internas (Opcional)"
              name="notas"
              value={form.notas}
              onChange={handleFormChange}
              fullWidth
              multiline
              rows={2}
              placeholder="Observaciones o instrucciones especiales para el equipo"
              sx={{ "& .MuiOutlinedInput-root": { "&.Mui-focused fieldset": { borderColor: "#2596be" } } }}
            />

            <Divider />

            {/* Color */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={1} color="text.secondary">
                Color de identificación
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                {COLORES_PRESET.map((c) => (
                  <IconButton key={c} onClick={() => setForm((prev) => ({ ...prev, color: c }))} sx={{ p: 0.5 }}>
                    <CircleIcon sx={{
                      color: c, fontSize: 32,
                      outline: form.color === c ? "3px solid #333" : "none",
                      borderRadius: "50%",
                    }} />
                  </IconButton>
                ))}
                <Tooltip title="Color personalizado">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                    style={{ width: 36, height: 36, border: "2px solid #e0e0e0", cursor: "pointer", borderRadius: "50%", padding: 2 }}
                  />
                </Tooltip>
              </Stack>
            </Box>

            {/* Switch activo con color dinámico */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                border: "1px solid #e0e0e0",
                bgcolor: form.activo ? `${form.color}12` : "#f5f5f5",
              }}
            >
              <Switch
                checked={form.activo}
                onChange={(e) => setForm((prev) => ({ ...prev, activo: e.target.checked }))}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: form.color },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: form.color },
                }}
              />
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {form.activo ? "Box activo" : "Box inactivo"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {form.activo ? "El box aparece disponible para reservas." : "El box no puede ser reservado."}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, backgroundColor: "#f8f9fa" }}>
          <Button onClick={cerrarDialog} variant="outlined" color="secondary" startIcon={<CancelIcon />} sx={{ minWidth: 120 }}>
            Cancelar
          </Button>
          <Button onClick={guardarBox} variant="contained" startIcon={<SaveIcon />}
            disabled={!form.nombre.trim()}
            sx={{ minWidth: 140, background: "#2596be", "&:hover": { background: "#1e7a9b" } }}>
            {editando ? "Guardar cambios" : "Crear box"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Confirmar Eliminación */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, boxId: null, boxNombre: "" })} maxWidth="xs" fullWidth>
        <DialogTitle
          sx={{
            background: "linear-gradient(45deg, #d32f2f 30%, #ef5350 90%)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <DeleteIcon />
            <Typography variant="h6" fontWeight={600}>Eliminar box</Typography>
          </Box>
          <IconButton onClick={() => setConfirmDialog({ open: false, boxId: null, boxNombre: "" })}
            sx={{ color: "white", "&:hover": { bgcolor: "rgba(255,255,255,0.15)" } }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 4 }}>
          <DialogContentText>
            ¿Estás seguro que deseas eliminar el box <b>{confirmDialog.boxNombre}</b>?
            <br /><br />
            Esta acción eliminará también todas sus reservas y no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, backgroundColor: "#f8f9fa" }}>
          <Button onClick={() => setConfirmDialog({ open: false, boxId: null, boxNombre: "" })}
            variant="outlined" color="inherit" startIcon={<CancelIcon />} sx={{ minWidth: 120 }}>
            Cancelar
          </Button>
          <Button onClick={eliminarBox} color="error" variant="contained" startIcon={<DeleteIcon />} sx={{ minWidth: 120 }}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%", bgcolor: snackbar.severity === "success" ? "#43a047" : "#d32f2f", color: "white", "& .MuiAlert-icon": { color: "#fff" } }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function BoxCard({ box, onEditar, onEliminar, onToggleActivo, onVerAgenda, puedeGestionar }) {
  const [detalleOpen, setDetalleOpen] = useState(false);
  const color = box.color || "#2596be";

  // Detectar si hay contenido extra que no cabe en la tarjeta
  const tieneExtra = box.descripcion || (box.equipamiento?.length > 2) || box.notas;

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 4,
          border: `1.5px solid #e0e0e0`,
          boxShadow: "0 4px 24px 0 rgba(37,150,190,0.08)",
          overflow: "hidden",
          transition: "box-shadow 0.2s, border-color 0.2s",
          opacity: box.activo ? 1 : 0.65,
          "&:hover": { boxShadow: 8, borderColor: color },
          position: "relative",
          // Altura fija para todas las tarjetas
          display: "flex",
          flexDirection: "column",
          height: 340,
        }}
      >
        {/* Barra de color superior */}
        <Box sx={{ height: 8, background: color, flexShrink: 0 }} />

        {/* Acciones editar/eliminar — solo admins */}
        {puedeGestionar && (
          <Stack direction="row" justifyContent="flex-end"
            sx={{ position: "absolute", top: 12, right: 8, zIndex: 1 }} spacing={0.5}>
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => onEditar(box)}
                sx={{ bgcolor: "white", "&:hover": { bgcolor: "#e3f2fd" } }}>
                <EditIcon fontSize="small" sx={{ color: "#2596be" }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar">
              <IconButton size="small" onClick={() => onEliminar(box)}
                sx={{ bgcolor: "white", "&:hover": { bgcolor: "#ffeaea" } }}>
                <DeleteIcon fontSize="small" color="error" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}

        <CardContent sx={{ pt: 1.5, pb: 1, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Nombre y código */}
          <Stack direction="row" alignItems="center" spacing={1} mb={0.5} pr={7}>
            <MeetingRoomIcon sx={{ color, fontSize: 28, flexShrink: 0 }} />
            <Box overflow="hidden">
              <Typography fontWeight={700} fontSize={17} lineHeight={1.2} noWrap>
                {box.nombre}
              </Typography>
              {box.codigo && (
                <Typography variant="caption" color="text.secondary">#{box.codigo}</Typography>
              )}
            </Box>
          </Stack>

          {/* Descripción truncada a 1 línea */}
          {box.descripcion && (
            <Typography variant="body2" color="text.secondary"
              sx={{ mt: 0.5, mb: 0.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
              {box.descripcion}
            </Typography>
          )}

          <Divider sx={{ my: 1 }} />

          <Stack spacing={0.5} flex={1}>
            {box.piso && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <LayersIcon fontSize="small" sx={{ color: "text.secondary", flexShrink: 0 }} />
                <Typography variant="body2" color="text.secondary" noWrap>{box.piso}</Typography>
              </Stack>
            )}
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <PeopleIcon fontSize="small" sx={{ color: "text.secondary", flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary">
                Cap. {box.capacidad} paciente{box.capacidad !== 1 ? "s" : ""}
              </Typography>
            </Stack>

            {/* Equipamiento: máx 2 chips + indicador si hay más */}
            {box.equipamiento?.length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.5} alignItems="center">
                {box.equipamiento.slice(0, 2).map((e) => (
                  <Chip key={e} label={e} size="small" variant="outlined"
                    sx={{ maxWidth: 100, "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }} />
                ))}
                {box.equipamiento.length > 2 && (
                  <Chip label={`+${box.equipamiento.length - 2}`} size="small"
                    sx={{ bgcolor: `${color}20`, color, borderColor: color, fontWeight: 700 }} variant="outlined" />
                )}
              </Stack>
            )}
          </Stack>

          <Divider sx={{ my: 1 }} />

          {/* Toggle activo */}
          <Stack direction="row" alignItems="center" justifyContent="space-between"
            sx={{ p: 1, borderRadius: 2, bgcolor: box.activo ? `${color}12` : "#f5f5f5" }}>
            <Chip
              icon={box.activo ? <CheckCircleIcon /> : <CancelIcon />}
              label={box.activo ? "Activo" : "Inactivo"}
              size="small"
              sx={box.activo ? {
                bgcolor: `${color}20`, color, borderColor: color,
                "& .MuiChip-icon": { color },
              } : {}}
              color={box.activo ? undefined : "default"}
              variant="outlined"
            />
            {puedeGestionar && (
              <Tooltip title={box.activo ? "Desactivar box" : "Activar box"}>
                <Switch checked={box.activo} onChange={() => onToggleActivo(box)} size="small"
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": { color },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: color },
                  }} />
              </Tooltip>
            )}
          </Stack>
        </CardContent>

        {/* Footer fijo: botones siempre visibles */}
        <Box sx={{ px: 2, pb: 2, flexShrink: 0 }}>
          <Stack direction="row" spacing={1}>
            {tieneExtra && (
              <Button size="small" variant="text" onClick={() => setDetalleOpen(true)}
                sx={{ color, fontSize: 12, px: 1, flex: "0 0 auto" }}>
                Ver más
              </Button>
            )}
            <Button fullWidth variant="outlined" startIcon={<CalendarMonthIcon />}
              onClick={() => onVerAgenda(box)}
              sx={{ borderColor: color, color, fontWeight: 700, borderRadius: 2, "&:hover": { bgcolor: `${color}15` } }}>
              Ver agenda
            </Button>
          </Stack>
        </Box>
      </Card>

      {/* Dialog detalle completo */}
      <Dialog open={detalleOpen} onClose={() => setDetalleOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            background: `linear-gradient(45deg, ${color} 30%, ${color}bb 90%)`,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <MeetingRoomIcon />
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1.1}>{box.nombre}</Typography>
              {box.codigo && <Typography variant="caption" sx={{ opacity: 0.85 }}>#{box.codigo}</Typography>}
            </Box>
          </Stack>
          <IconButton onClick={() => setDetalleOpen(false)}
            sx={{ color: "white", "&:hover": { bgcolor: "rgba(255,255,255,0.15)" } }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2}>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <Chip icon={box.activo ? <CheckCircleIcon /> : <CancelIcon />}
                label={box.activo ? "Activo" : "Inactivo"} size="small"
                sx={box.activo ? { bgcolor: `${color}20`, color, borderColor: color, "& .MuiChip-icon": { color } } : {}}
                variant="outlined" color={box.activo ? undefined : "default"} />
              <Chip icon={<PeopleIcon />}
                label={`Cap. ${box.capacidad} paciente${box.capacidad !== 1 ? "s" : ""}`}
                size="small" variant="outlined" />
              {box.piso && <Chip icon={<LayersIcon />} label={box.piso} size="small" variant="outlined" />}
            </Stack>

            {box.descripcion && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={0.5}>
                  Descripción
                </Typography>
                <Typography variant="body2">{box.descripcion}</Typography>
              </Box>
            )}

            {box.equipamiento?.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={0.5}>
                  Equipamiento disponible
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.8}>
                  {box.equipamiento.map((e) => (
                    <Chip key={e} label={e} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>
            )}

            {box.notas && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={0.5}>
                  Notas internas
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{box.notas}</Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: "#f8f9fa", gap: 1 }}>
          {puedeGestionar && (
            <Button onClick={() => { setDetalleOpen(false); onEditar(box); }} startIcon={<EditIcon />}
              variant="outlined" sx={{ borderColor: color, color }}>
              Editar
            </Button>
          )}
          <Button onClick={() => { setDetalleOpen(false); onVerAgenda(box); }}
            startIcon={<CalendarMonthIcon />} variant="contained"
            sx={{ bgcolor: color, "&:hover": { bgcolor: color, filter: "brightness(0.9)" } }}>
            Ver agenda
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
