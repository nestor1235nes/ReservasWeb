import React, { useState, useEffect, useRef } from 'react';
import { Box, Card, CardHeader, CardContent, Stack, Typography, TextField, Divider, Paper, Button, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import { useAuth } from '../context/authContext';

const PLACEHOLDERS = [
  { key: 'nombre', desc: 'Nombre del paciente' },
  { key: 'fecha', desc: 'Fecha de la cita (ej: 25/09/2025)' },
  { key: 'hora', desc: 'Hora de la cita (ej: 15:30)' },
  { key: 'servicio', desc: 'Nombre del servicio o motivo' },
  { key: 'profesional', desc: 'Nombre del profesional' },
  { key: 'sucursal', desc: 'Nombre de la sucursal (si aplica)' },
  { key: 'enlaceConfirmacion', desc: 'URL única para confirmar la cita' },
];

// Reemplazos de ejemplo para vista previa sin acceder a datos reales
const previewSample = {
  nombre: 'Juan Pérez',
  fecha: '25/09/2025',
  hora: '15:30',
  servicio: 'Consulta General',
  profesional: 'Dra. Gómez',
  sucursal: 'Centro Salud Central',
  enlaceConfirmacion: 'https://midominio.cl/confirmacion/ABC123'
};

const applyPreview = (template) => {
  if (!template) return 'Sin mensaje configurado';
  return template.replace(/\{(\w+)\}/g, (_, key) => previewSample[key] || `{${key}}`);
};

// Sufijo obligatorio para recordatorios
const FORCED_SUFFIX = '\n\nPor favor, confirme su cita a través del siguiente enlace: {enlaceConfirmacion}';
const ensureForcedSuffix = (message) => {
  if (!message) return '';
  const normalized = message.trimEnd();
  const suffixPlain = 'Por favor, confirme su cita a través del siguiente enlace:';
  if (normalized.includes(suffixPlain)) return normalized; // evita duplicados
  return normalized + FORCED_SUFFIX;
};

const MensajesAutomaticos = ({ formData, onChange, editProfileMode, isMobile, reservaDemo }) => {
  const { updatePerfil, user } = useAuth();
  const [editing, setEditing] = useState(false); // edición local
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [localData, setLocalData] = useState({
    idInstance: '',
    apiTokenInstance: '',
    defaultMessage: '',
    reminderMessage: ''
  });
  const activeFieldRef = useRef(null);
  const [activeField, setActiveField] = useState(null); // defaultMessage | reminderMessage
  const [helpOpen, setHelpOpen] = useState(false);

  // Sync con props inicial y cuando cambia user (re-hidratación)
  useEffect(() => {
    setLocalData({
      idInstance: formData.idInstance || '',
      apiTokenInstance: formData.apiTokenInstance || '',
      defaultMessage: formData.defaultMessage || '',
      reminderMessage: formData.reminderMessage || ''
    });
  }, [formData.idInstance, formData.apiTokenInstance, formData.defaultMessage, formData.reminderMessage]);

  const propagate = (name, value) => {
    // notificar al padre (PerfilPage) para mantener un solo origen de verdad
    if (onChange) {
      onChange({ target: { name, value } });
    }
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setLocalData(prev => ({ ...prev, [name]: value }));
    propagate(name, value);
  };

  const handlePlaceholderInsert = (placeholder) => {
    const key = `{${placeholder}}`;
    const field = activeField || 'defaultMessage';
    setLocalData(prev => {
      const current = prev[field] || '';
      const selectionStart = activeFieldRef.current?.selectionStart ?? current.length;
      const selectionEnd = activeFieldRef.current?.selectionEnd ?? current.length;
      const newValue = current.slice(0, selectionStart) + key + current.slice(selectionEnd);
      const updated = { ...prev, [field]: newValue };
      propagate(field, newValue);
      return updated;
    });
    // Restaurar foco
    setTimeout(() => {
      if (activeFieldRef.current) {
        const pos = (activeFieldRef.current.selectionStart || 0) + key.length;
        activeFieldRef.current.focus();
        activeFieldRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const startEdit = () => {
    setError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setError(null);
    setEditing(false);
    // revertir a props
    setLocalData({
      idInstance: formData.idInstance || '',
      apiTokenInstance: formData.apiTokenInstance || '',
      defaultMessage: formData.defaultMessage || '',
      reminderMessage: formData.reminderMessage || ''
    });
  };


  const handleSave = async () => {
    setError(null);
    const { idInstance, apiTokenInstance, defaultMessage } = localData;
    // Aseguramos sufijo obligatorio antes de persistir
    const reminderMessageWithSuffix = ensureForcedSuffix(localData.reminderMessage);
    setLocalData(prev => ({ ...prev, reminderMessage: reminderMessageWithSuffix }));
    propagate('reminderMessage', reminderMessageWithSuffix);
    const reminderMessage = reminderMessageWithSuffix;
    const mensajesConfigurados = [defaultMessage, reminderMessage].some(m => m && m.trim() !== '');
    if (mensajesConfigurados && (!idInstance || !apiTokenInstance)) {
      setError('Debes ingresar ID Instance y API Token para guardar mensajes.');
      return;
    }
    try {
      setSaving(true);
      await updatePerfil(user.id || user._id, {
        idInstance,
        apiTokenInstance,
        defaultMessage,
        reminderMessage
      });
      setEditing(false);
    } catch (e) {
      setError('Error al guardar cambios.');
    } finally {
      setSaving(false);
    }
  };

  const credsMissing = !localData.idInstance && !localData.apiTokenInstance;

  return (
    <Box mt={2}>
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h5" fontWeight={600}>
                Mensajes Automáticos (WhatsApp)
              </Typography>
              <Tooltip title="Ayuda sobre placeholders">
                <IconButton size="small" onClick={() => setHelpOpen(true)}>
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>
            </Box>
          }
          action={
            editing ? (
              <Box display="flex" gap={1}>
                <Button
                  startIcon={<SaveIcon />}
                  variant="contained"
                  color="success"
                  onClick={handleSave}
                  disabled={saving}
                >
                  Guardar
                </Button>
                <Button
                  startIcon={<CancelIcon />}
                  variant="outlined"
                  color="secondary"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Cancelar
                </Button>
              </Box>
            ) : (
              <Button
                startIcon={<EditIcon />}
                variant="contained"
                onClick={startEdit}
              >
                Editar
              </Button>
            )
          }
          subheader="Configura y personaliza los mensajes que se enviarán a tus pacientes."
        />
        <CardContent>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <Typography variant="subtitle1" fontWeight={600}>Credenciales</Typography>
            <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
              <TextField
                label="ID Instance"
                name="idInstance"
                value={localData.idInstance}
                onChange={handleFieldChange}
                fullWidth
                disabled={!editing}
              />
              <TextField
                label="API Token Instance"
                name="apiTokenInstance"
                value={localData.apiTokenInstance}
                onChange={handleFieldChange}
                fullWidth
                disabled={!editing}
              />
            </Stack>
            <Divider />
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
              <Typography variant="subtitle1" fontWeight={600}>Plantillas de Mensajes</Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {PLACEHOLDERS.map(p => (
                  <Chip
                    key={p.key}
                    size="small"
                    label={`{${p.key}}`}
                    onClick={() => editing && handlePlaceholderInsert(p.key)}
                    color="primary"
                    variant="outlined"
                    sx={{ cursor: editing ? 'pointer' : 'default' }}
                  />
                ))}
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Haz clic en un placeholder para insertarlo en el mensaje activo. Se reemplazará automáticamente al enviar.
            </Typography>
            <TextField
              inputRef={activeField === 'defaultMessage' ? activeFieldRef : null}
              onFocus={() => setActiveField('defaultMessage')}
              label="Mensaje al Liberar Horas"
              name="defaultMessage"
              value={localData.defaultMessage}
              onChange={handleFieldChange}
              fullWidth
              multiline
              minRows={3}
              disabled={!editing}
              placeholder="Ej: Hola {nombre}, se han liberado nuevas horas para {servicio} el {fecha}. Reserva pronto."
            />
            <TextField
              inputRef={activeField === 'reminderMessage' ? activeFieldRef : null}
              onFocus={() => setActiveField('reminderMessage')}
              label="Mensaje de Recordatorio"
              name="reminderMessage"
              value={localData.reminderMessage}
              onChange={handleFieldChange}
              fullWidth
              multiline
              minRows={3}
              disabled={!editing}
              placeholder="Ej: Estimado {nombre}, le recordamos su cita de {servicio} el {fecha} a las {hora}. (el enlace de confirmación se agregará automáticamente)"
            />
            <Typography variant="caption" color="text.secondary">
              Nota: Al guardar, siempre se añadirá la línea final con el texto: "Por favor, confirme su cita a través del siguiente enlace: {'{enlaceConfirmacion}'}".
            </Typography>
            <Divider />
            <Typography variant="subtitle1" fontWeight={600}>Vista Previa (Ejemplo)</Typography>
            <Paper variant="outlined" sx={{ p:2, background:'#f9f9f9' }}>
              <Typography variant="caption" color="text.secondary">Liberar horas</Typography>
              <Typography variant="body2" sx={{ mb:2 }}>
                {applyPreview(localData.defaultMessage)}
              </Typography>
              <Typography variant="caption" color="text.secondary">Recordatorio</Typography>
              <Typography variant="body2" sx={{ whiteSpace:'pre-line' }}>
                {applyPreview(ensureForcedSuffix(localData.reminderMessage))}
              </Typography>
            </Paper>
            {reservaDemo && (
              <Paper variant="outlined" sx={{ p:2, background:'#f1f8e9' }}>
                <Typography variant="caption" color="text.secondary">Vista con datos de ejemplo de una reserva</Typography>
                <Typography variant="body2" sx={{ whiteSpace:'pre-line', mt:1 }}>
                  {applyPreview(
                    ensureForcedSuffix(localData.reminderMessage)
                      .replace('{enlaceConfirmacion}', 'https://midominio.cl/confirmacion/DEMO123')
                  )}
                </Typography>
              </Paper>
            )}
            {credsMissing && (
              <Typography variant="body2" color="warning.main">
                Ingresa tus credenciales de Green API para habilitar el envío automático.
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Diálogo de ayuda */}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cómo personalizar tus mensajes</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" paragraph>
            Usa placeholders encerrados en llaves para insertar datos dinámicos. Al enviar el mensaje, cada placeholder se reemplazará con el valor real del paciente o de la cita.
          </Typography>
          <Typography variant="subtitle2" gutterBottom>Placeholders disponibles:</Typography>
          <Stack spacing={1} mb={2}>
            {PLACEHOLDERS.map(p => (
              <Box key={p.key} display="flex" alignItems="center" gap={1}>
                <Chip label={`{${p.key}}`} size="small" />
                <Typography variant="body2" color="text.secondary">{p.desc}</Typography>
              </Box>
            ))}
          </Stack>
          <Typography variant="subtitle2" gutterBottom>Ejemplos:</Typography>
          <Paper variant="outlined" sx={{ p:1, mb:1 }}>
            <Typography variant="caption" color="text.secondary">Plantilla</Typography>
            <Typography variant="body2">Hola {`{nombre}`}, tu cita de {`{servicio}`} está agendada para el {`{fecha}`} a las {`{hora}`}.</Typography>
            <Typography variant="caption" color="text.secondary">Resultado</Typography>
            <Typography variant="body2">Hola Juan Pérez, tu cita de Consulta General está agendada para el 25/09/2025 a las 15:30.</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p:1 }}>
            <Typography variant="caption" color="text.secondary">Plantilla</Typography>
            <Typography variant="body2">Estimado {`{nombre}`}, recuerde asistir a su cita con {`{profesional}`} en {`{sucursal}`} el {`{fecha}`} a las {`{hora}`}.</Typography>
            <Typography variant="caption" color="text.secondary">Resultado</Typography>
            <Typography variant="body2">Estimado Juan Pérez, recuerde asistir a su cita con Dra. Gómez en Centro Salud Central el 25/09/2025 a las 15:30.</Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)} variant="contained">Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MensajesAutomaticos;