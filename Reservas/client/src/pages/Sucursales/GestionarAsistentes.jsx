import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  Stack,
  Tooltip,
  Chip,
  Snackbar,
  Alert,
  Grid,
  useMediaQuery
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import EmailIcon from "@mui/icons-material/Email";
import { useSucursal } from "../../context/sucursalContext";
import { useAuth } from "../../context/authContext";
import RegisterAsistente from "../../components/Surcursales/RegisterAsistente";
import { useTheme } from "@mui/material/styles";
import { ASSETS_BASE } from "../../config";

export default function GestionarAsistentes() {
  const { user, deleteUser } = useAuth();
  const { getSucursal, eliminarAsistente, getAsistentesSucursal } = useSucursal();
  const [sucursal, setSucursal] = useState(null);
  const [asistentes, setAsistentes] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);

  // Modal de confirmación de eliminación
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    asistenteId: null,
    asistenteNombre: ""
  });

  // Mensaje de éxito/error
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success"
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const fetchSucursal = async () => {
      const sucursal = await getSucursal();
      setSucursal(sucursal);
    };
    fetchSucursal();
  }, [getSucursal, user.sucursal]);

  useEffect(() => {
    const fetchAsistentes = async () => {
      if (sucursal?._id) {
        const asistentes = await getAsistentesSucursal(sucursal._id);
        setAsistentes(asistentes || []);
      }
    };
    fetchAsistentes();
  }, [getAsistentesSucursal, sucursal?._id]);

  const handleSuccess = async () => {
    setOpenDialog(false);
    // Refresca la lista
    const res = await getSucursal();
    setSucursal(res);
    const asistentes = await getAsistentesSucursal(res._id);
    setAsistentes(asistentes || []);
    setSnackbar({
      open: true,
      message: "Asistente agregado exitosamente.",
      severity: "success"
    });
  };

  // Abre el modal de confirmación
  const handleOpenConfirm = (asistenteId, asistenteNombre) => {
    setConfirmDialog({
      open: true,
      asistenteId,
      asistenteNombre
    });
  };

  // Cierra el modal de confirmación
  const handleCloseConfirm = () => {
    setConfirmDialog({
      open: false,
      asistenteId: null,
      asistenteNombre: ""
    });
  };

  // Elimina el asistente después de confirmar
  const handleEliminar = async () => {
    const { asistenteId } = confirmDialog;
    try {
      await eliminarAsistente(sucursal._id, asistenteId);
      setAsistentes(prev => prev.filter(a => a._id !== asistenteId));
      await deleteUser(asistenteId);
      // Refresca la lista
      const res = await getSucursal();
      setSucursal(res);
      const asistentes = await getAsistentesSucursal(res._id);
      setAsistentes(asistentes || []);
      setSnackbar({
        open: true,
        message: "Asistente eliminado correctamente.",
        severity: "success"
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error al eliminar el asistente.",
        severity: "error"
      });
    }
    handleCloseConfirm();
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Tarjeta visual para cada asistente
  const AsistenteCard = ({ asistente, onDelete }) => (
    <Card
      variant="outlined"
      sx={{
        border: "1.5px solid #e0e0e0",
        boxShadow: "0 4px 24px 0 rgba(37,150,190,0.08)",
        borderRadius: 4,
        minWidth: 260,
        maxWidth: 340,
        mx: "auto",
        mb: 2,
        p: 0,
        overflow: "hidden",
        transition: "box-shadow 0.2s, border-color 0.2s",
        "&:hover": {
          boxShadow: 8,
          borderColor: "primary.main",
        },
        position: "relative",
      }}
    >
      {/* Botón eliminar en la esquina superior derecha */}
      <IconButton
        color="error"
        onClick={() =>
          onDelete(
            asistente._id || asistente,
            asistente.username || asistente.email || asistente
          )
        }
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 2,
          "&:hover": { bgcolor: "#ffeaea" }
        }}
      >
        <DeleteIcon />
      </IconButton>
      <Box
        sx={{
          background: "linear-gradient(90deg, #2596be 60%, #21cbe6 100%)",
          py: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Avatar
          src={asistente.fotoPerfil ? `${ASSETS_BASE}${asistente.fotoPerfil}` : undefined}
          sx={{
            bgcolor: asistente.fotoPerfil ? "white" : "#2596be",
            color: asistente.fotoPerfil ? "#2596be" : "white",
            width: 64,
            height: 64,
            mb: 1.5,
            fontSize: 36,
          }}
        >
          {!asistente.fotoPerfil && <PersonIcon fontSize="large" sx={{background:'white', color:'#2596be', borderRadius:'50%'}}/>}
        </Avatar>
        <Typography fontWeight={700} fontSize={20} color="white" align="center">
          {asistente.username || "Sin datos"}
        </Typography>
      </Box>
      <CardContent sx={{ px: 3, py: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <EmailIcon sx={{color:"#2596be"}} />
            <Typography variant="body2" color="text.secondary">
              {asistente.email || "Sin datos"}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
      <Divider />
    </Card>
  );

  return (
    <Box
      maxWidth={isMobile ? "100%" : "100%"}
      width="100%"
      mx="auto"
      px={isMobile ? 0 : 0}
      py={isMobile ? 0 : 0}
      minHeight="100%"
      bgcolor="#f5f7fa"
    >
      <Stack
        direction={isMobile ? "column" : "row"}
        justifyContent="space-between"
        alignItems={isMobile ? "stretch" : "center"}
        spacing={2}
        p={2}
        borderRadius={1}
        sx={{ background: "linear-gradient(45deg, #2596be 30%, #21cbe6 90%)" }}
        mb={0}
      >
        <Typography variant="h5" fontWeight={700} color="white">
          Lista de asistentes de la clínica {sucursal?.nombre || "desconocida"}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ background: "white", color: "#2596be", borderRadius: 2 }}
          onClick={() => setOpenDialog(true)}
        >
          Agregar asistente
        </Button>
      </Stack>
      <Box
        sx={{
          width: isMobile ? "100%" : "100%",
          mx: "auto",
          background: "white",
          borderRadius: 3,
          boxShadow: 4,
          p: isMobile ? 1 : 3,
        }}
      >
        <CardHeader
          sx={{ px: 0, pt: 0 }}
        />
        <Box>
          {asistentes.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ mt: 3 }}>
              No hay asistentes registrados en esta sucursal.
            </Typography>
          ) : (
            <Grid container spacing={3} justifyContent="flex-start">
              {asistentes.map(asistente => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={asistente._id || asistente}>
                  <AsistenteCard
                    asistente={asistente}
                    onDelete={handleOpenConfirm}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Box>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <RegisterAsistente
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          sucursalId={sucursal?._id}
          onSuccess={handleSuccess}
        />
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCloseConfirm}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro que deseas eliminar al asistente <b>{confirmDialog.asistenteNombre}</b>? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirm} color="inherit">
            Cancelar
          </Button>
          <Button onClick={handleEliminar} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{
            width: "100%",
            bgcolor: snackbar.severity === "success" ? "#43a047" : "#d32f2f",
            color: "white",
            "& .MuiAlert-icon": {
              color: "#fff"
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}