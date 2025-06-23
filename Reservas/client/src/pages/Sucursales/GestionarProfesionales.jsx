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
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import { useSucursal } from "../../context/sucursalContext";
import { useAuth } from "../../context/authContext";
import RegisterProfesional from "../../components/Surcursales/RegisterProfesional";
import { useTheme } from "@mui/material/styles";

export default function GestionarProfesionales() {
  const { user, deleteUser } = useAuth();
  const { getSucursal, getProfesionalesSucursal, eliminarProfesional } = useSucursal();
  const [sucursal, setSucursal] = useState(null);
  const [profesionales, setProfesionales] = useState([]);
  console.log("user", profesionales);
  const [openDialog, setOpenDialog] = useState(false);

  // Modal de confirmación de eliminación
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    profesionalId: null,
    profesionalNombre: ""
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
    const fetchProfesionales = async () => {
      if (sucursal?._id) {
        const profesionales = await getProfesionalesSucursal(sucursal._id);
        setProfesionales(profesionales || []);
      }
    };
    fetchProfesionales();
  }, [getProfesionalesSucursal, sucursal?._id]);

  const handleSuccess = async () => {
    setOpenDialog(false);
    // Refresca la lista
    const res = await getSucursal();
    setSucursal(res);
    const profesionales = await getProfesionalesSucursal(res._id);
    setProfesionales(profesionales || []);
    setSnackbar({
      open: true,
      message: "Profesional agregado exitosamente.",
      severity: "success"
    });
  };

  // Abre el modal de confirmación
  const handleOpenConfirm = (profesionalId, profesionalNombre) => {
    setConfirmDialog({
      open: true,
      profesionalId,
      profesionalNombre
    });
  };

  // Cierra el modal de confirmación
  const handleCloseConfirm = () => {
    setConfirmDialog({
      open: false,
      profesionalId: null,
      profesionalNombre: ""
    });
  };

  // Elimina el profesional después de confirmar
  const handleEliminar = async () => {
    const { profesionalId } = confirmDialog;
    try {
      await eliminarProfesional(sucursal._id, profesionalId);
      setProfesionales(prev => prev.filter(p => p._id !== profesionalId));
      await deleteUser(profesionalId);
      // Refresca la lista
      const res = await getSucursal();
      setSucursal(res);
      const profesionales = await getProfesionalesSucursal(res._id);
      setProfesionales(profesionales || []);
      setSnackbar({
        open: true,
        message: "Profesional eliminado correctamente.",
        severity: "success"
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error al eliminar el profesional.",
        severity: "error"
      });
    }
    handleCloseConfirm();
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Tarjeta visual para cada profesional
  const ProfesionalCard = ({ profesional, onDelete }) => (
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
        position: "relative", // Para posicionar el botón eliminar
      }}
    >
      {/* Botón eliminar en la esquina superior derecha */}
      <IconButton
        color="error"
        onClick={() =>
          onDelete(
            profesional._id || profesional,
            profesional.username || profesional.email || profesional
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
          src={profesional.fotoPerfil ? `http://localhost:4000${profesional.fotoPerfil}` : undefined}
          sx={{
            bgcolor: profesional.fotoPerfil ? "white" : "#2596be",
            color: profesional.fotoPerfil ? "#2596be" : "white",
            width: 64,
            height: 64,
            mb: 1.5,
            fontSize: 36,
          }}
        >
          {!profesional.fotoPerfil && <PersonIcon fontSize="large" />}
        </Avatar>
        <Typography fontWeight={700} fontSize={20} color="white" align="center">
          {profesional.username || "Sin datos"}
        </Typography>
      </Box>
      <CardContent sx={{ px: 3, py: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <MedicalInformationIcon sx={{color:"#2596be"}} />
            <Typography variant="body1" fontWeight={500}>
              {profesional.especialidad || "Sin datos"}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <EmailIcon sx={{color:"#2596be"}} />
            <Typography variant="body2" color="text.secondary">
              {profesional.email || "Sin datos"}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <LocalPhoneIcon sx={{color:"#2596be"}} />
            <Typography variant="body2" color="text.secondary">
              {profesional.celular || "Sin datos"}
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
          Lista de profesionales de la clínica {sucursal?.nombre || "desconocida"}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ background: "white", color: "#2596be", borderRadius: 2 }}
          onClick={() => setOpenDialog(true)}
        >
          Agregar profesional
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
          {profesionales.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ mt: 3 }}>
              No hay profesionales registrados en esta sucursal.
            </Typography>
          ) : (
            <Grid container spacing={3} justifyContent="flex-start">
              {profesionales.map(profesional => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={profesional._id || profesional}>
                  <ProfesionalCard
                    profesional={profesional}
                    onDelete={handleOpenConfirm}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Box>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} >
        <RegisterProfesional
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
            ¿Estás seguro que deseas eliminar al profesional <b>{confirmDialog.profesionalNombre}</b>? Esta acción no se puede deshacer.
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