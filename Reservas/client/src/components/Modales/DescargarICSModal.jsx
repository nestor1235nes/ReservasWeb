import React, { useState } from "react";
import { Modal, Box, Typography, Button, Stack, Divider, IconButton, Fade } from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  borderRadius: 4,
  boxShadow: 24,
  p: 0,
  overflow: 'hidden'
};

export default function DescargarICSModal({ open, onClose, onDescargar }) {
  const [descargado, setDescargado] = useState(false);

  const handleDescargar = () => {
    onDescargar();
    setDescargado(true);
    setTimeout(() => {
      setDescargado(false);
      onClose();
    }, 1800);
  };

  return (
    <Modal open={open} onClose={onClose} closeAfterTransition>
      <Fade in={open}>
        <Box sx={style}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              bgcolor: "#2596be",
              color: "white",
              px: 3,
              py: 2,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              position: "relative"
            }}
          >
            <CalendarTodayIcon sx={{ mr: 1, fontSize: 28 }} />
            <Typography variant="h6" fontWeight={700} flex={1}>
              Guardar cita en tu calendario
            </Typography>
            <IconButton onClick={onClose} sx={{ color: "white" }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ px: 3, py: 3 }}>
            {!descargado ? (
              <>
                <Typography variant="body1" mb={1.5} color="#2596be" fontWeight={600}>
                  ¿No quieres olvidar tu cita? Descarga el archivo y agrégalo fácilmente a tu calendario favorito:
                </Typography>
                <Stack spacing={1.2} mb={2}>
                  <Typography variant="body2">
                    <b style={{ color: "#2596be" }}>Google Calendar:</b> Menú lateral &gt; <b>Importar</b> &gt; Selecciona el archivo <b>.ics</b>.
                  </Typography>
                  <Typography variant="body2">
                    <b style={{ color: "#2596be" }}>Outlook:</b> Calendario &gt; <b>Agregar calendario</b> &gt; <b>Desde archivo</b>.
                  </Typography>
                  <Typography variant="body2">
                    <b style={{ color: "#2596be" }}>Iphone/Android:</b> Selecciona el archivo descargado &gt; Seleccionar calendario del dispositivo.
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <Button
                  variant="contained"
                  fullWidth
                  sx={{
                    background: "#2596be",
                    color: "white",
                    fontWeight: 700,
                    fontSize: 16,
                    py: 1.2,
                    borderRadius: 2,
                    boxShadow: 2,
                    "&:hover": { background: "#21cbe6" }
                  }}
                  onClick={handleDescargar}
                >
                  Descargar archivo .ics
                </Button>
              </>
            ) : (
              <Stack alignItems="center" spacing={2} py={3}>
                <CheckCircleOutlineIcon sx={{ color: "#21cbe6", fontSize: 48 }} />
                <Typography variant="h6" color="#2596be" fontWeight={700}>
                  ¡Archivo descargado!
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  Ahora puedes importar tu cita en tu calendario preferido.
                </Typography>
              </Stack>
            )}
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
}