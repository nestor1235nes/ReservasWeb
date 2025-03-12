import React, { useState } from "react";
import { Box, Stack, Typography, TextField, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useAuth } from "../context/authContext";

const PerfilMensajesAutomatizados = () => {
  const { user, updatePerfil } = useAuth();
  const [showInputs, setShowInputs] = useState(false);
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [wspData, setWspData] = useState({
    idInstance: user.idInstance || "",
    apiTokenInstance: user.apiTokenInstance || "",
    defaultMessage: user.defaultMessage || "",
    reminderMessage: user.reminderMessage || ""
  });

  const handleWspChange = (e) => {
    const { name, value } = e.target;
    setWspData({
      ...wspData,
      [name]: value
    });
  };

  const handleWspSave = async () => {
    await updatePerfil(user.id || user._id, wspData);
    setShowInputs(false);
  };

  const handleWspCancel = () => {
    setWspData({
      idInstance: user.idInstance || "",
      apiTokenInstance: user.apiTokenInstance || ""
    });
    setShowInputs(false);
  };

  const handleMessageBoxSave = async () => {
    await updatePerfil((user.id || user._id), { defaultMessage: wspData.defaultMessage });
    setShowMessageBox(false);
  };

  return (
    <Box mt={10}>
      {user.celular && !user.idInstance && (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography
            variant="body2"
            style={{ fontStyle: 'italic', textDecoration: 'underline', opacity: 0.7, cursor: 'pointer' }}
            onClick={() => setShowInputs(true)}
          >
            ¿Deseas enviar mensajes automáticos a tus pacientes?
          </Typography>
        </Stack>
      )}
      {user.celular && user.idInstance && (
        <Box p={1} sx={{ borderRadius: 2, minWidth: '100%', minHeight: '10vh', backgroundColor: '#f0f0f0', border: '1px solid #ddd', boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)' }}>
          <Box display={'flex'} justifyContent={'space-between'} alignItems={'center'}>
            <Typography
              variant="body2"
              style={{ fontStyle: 'italic', textDecoration: 'underline', opacity: 0.7, cursor: 'pointer' }}
              onClick={() => setShowMessageBox(true)}
            >
              Editar mensaje predeterminado
            </Typography>
          </Box>
          {user.defaultMessage && (
            <Typography variant="body2" color="textSecondary">
              <strong>Mensaje al liberar horas:</strong> {user.defaultMessage}
            </Typography>
          )}
          {!user.defaultMessage && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography
                variant="body2"
                style={{ fontStyle: 'italic', textDecoration: 'underline', opacity: 0.7, cursor: 'pointer' }}
                onClick={() => setShowMessageBox(true)}
              >
                Personaliza tu mensaje predeterminado
              </Typography>
            </Stack>
          )}
        </Box>
      )}
      {user.celular && user.idInstance && (
        <Box p={1} mt={2} sx={{ borderRadius: 2, minWidth: '100%', minHeight: '10vh', backgroundColor: '#f0f0f0', border: '1px solid #ddd', boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)' }}>
          <Box display={'flex'} justifyContent={'space-between'} alignItems={'center'}>
            <Typography
              variant="body2"
              style={{ fontStyle: 'italic', textDecoration: 'underline', opacity: 0.7, cursor: 'pointer' }}
            >
              Para modificar el mensaje de recordatorio, por favor contacta a nuestro soporte.
            </Typography>
          </Box>
          {user.reminderMessage && (
            <Typography variant="body2" color="textSecondary">
              <strong>Mensaje de recordatiorio:</strong> {user.reminderMessage}
            </Typography>
          )}
        </Box>
      )}
      {showMessageBox && (
        <Dialog open={showMessageBox} onClose={() => setShowMessageBox(false)}>
          <DialogTitle>Personalizar mensaje predeterminado</DialogTitle>
          <DialogContent>
            <TextField
              label="Mensaje predeterminado"
              name="defaultMessage"
              value={wspData.defaultMessage}
              onChange={handleWspChange}
              fullWidth
              margin="normal"
              multiline
              rows={4}
            />
          </DialogContent>
          <DialogActions>
            <Button variant="contained" color="primary" onClick={handleMessageBoxSave}>
              Guardar
            </Button>
            <Button variant="contained" color="secondary" onClick={() => setShowMessageBox(false)}>
              Cancelar
            </Button>
          </DialogActions>
        </Dialog>
      )}
      {showInputs && (
        <Box width="100vh" p={1} mt={1}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <TextField
              label="ID Instance"
              name="idInstance"
              value={wspData.idInstance}
              onChange={handleWspChange}
              fullWidth
              margin="normal"
              sx={{ width: '40%' }}
            />
            <TextField
              label="API Token Instance"
              name="apiTokenInstance"
              value={wspData.apiTokenInstance}
              onChange={handleWspChange}
              fullWidth
              margin="normal"
              sx={{ width: '40%' }}
            />
            <Button variant="contained" color="primary" onClick={handleWspSave} sx={{ padding: '10px', width: '100px' }}>
              Confirmar
            </Button>
            <Button variant="contained" color="secondary" onClick={handleWspCancel} sx={{ padding: '10px', width: '100px' }}>
              Cancelar
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default PerfilMensajesAutomatizados;