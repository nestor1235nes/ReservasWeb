import React, { useState, useEffect, useRef } from 'react';
import { Box, Card, CardHeader, CardContent, Stack, Typography, TextField, Divider, Paper, Button, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import { useAuth } from '../context/authContext';
import api from '../api/axios';

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

// Texto de confirmación que puede agregarse en el envío (no se guarda forzado)
const FORCED_SUFFIX = '\n\nPor favor, confirme su cita a través del siguiente enlace: {enlaceConfirmacion}';
const suffixPlain = 'Por favor, confirme su cita a través del siguiente enlace:';

const MensajesAutomaticos = ({ formData, onChange, editProfileMode, isMobile, reservaDemo }) => {
  const { updatePerfil, user } = useAuth();
  const [editing, setEditing] = useState(false); // edición local
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [localData, setLocalData] = useState({
    idInstance: '',
    apiTokenInstance: '',
    reminderMessage: ''
  });
  const activeFieldRef = useRef(null);
  const [activeField, setActiveField] = useState('reminderMessage'); // solo reminderMessage
  const [helpOpen, setHelpOpen] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testSnack, setTestSnack] = useState({ open: false, message: '', severity: 'success' });
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testPhoneError, setTestPhoneError] = useState('');

  // Sync con props inicial y cuando cambia user (re-hidratación)
  useEffect(() => {
    setLocalData({
      idInstance: formData.idInstance || '',
      apiTokenInstance: formData.apiTokenInstance || '',
      reminderMessage: formData.reminderMessage || ''
    });
  }, [formData.idInstance, formData.apiTokenInstance, formData.reminderMessage]);

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
    const field = activeField || 'reminderMessage';
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
      reminderMessage: formData.reminderMessage || ''
    });
  };


  const handleSave = async () => {
    setError(null);
    const { idInstance, apiTokenInstance } = localData;
    // Guardamos exactamente lo que escribe el usuario; el sufijo se agregará dinámicamente en el envío si corresponde
    const reminderMessage = localData.reminderMessage;
    const mensajesConfigurados = (reminderMessage && reminderMessage.trim() !== '');
    if (mensajesConfigurados && (!idInstance || !apiTokenInstance)) {
      setError('Debes ingresar ID Instance y API Token para guardar mensajes.');
      return;
    }
    try {
      setSaving(true);
      await updatePerfil(user.id || user._id, {
        idInstance,
        apiTokenInstance,
        reminderMessage
      });
      setEditing(false);
    } catch (e) {
      setError('Error al guardar cambios.');
    } finally {
      setSaving(false);
    }
  };

  const credsMissing = !localData.idInstance || !localData.apiTokenInstance;

  // Normaliza teléfono a formato 569XXXXXXXX
  const normalizarTelefono = (telefono) => {
    if (!telefono) return '';
    let tel = String(telefono).replace(/\D/g, '');
    if (tel.length === 11 && tel.startsWith('569')) return tel;
    if (tel.length === 9 && tel.startsWith('9')) return '56' + tel;
    if (tel.length === 8) return '569' + tel;
    if (tel.startsWith('56') && !tel.startsWith('569')) return '569' + tel.slice(2);
    if (tel.length === 12 && tel.startsWith('0569')) return tel.slice(1);
    return tel;
  };

  // Construye mensaje de prueba reemplazando placeholders con datos del profesional y aleatorios
  const buildTestMessage = (template) => {
    if (!template) return '';
    // Para prueba, incluimos la línea de confirmación para visualizar el resultado final
    const withSuffix = template.includes(suffixPlain) ? template : (template + FORCED_SUFFIX);
    const t = withSuffix.replace(/\{enlaceconfirmacion\}/gi, '{enlaceConfirmacion}');
    const randomNames = ['Dr. Rodrigo Soto', 'Dra. Camila Vargas', 'Dr. Martín Rivas', 'Dra. Paula Díaz'];
    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    const inDays = Math.floor(Math.random() * 14) + 1;
    const date = new Date();
    date.setDate(date.getDate() + inDays);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const randomFecha = `${dd}/${mm}/${yyyy}`;
    const randomHora = `${String(9 + Math.floor(Math.random() * 9)).padStart(2, '0')}:${['00','15','30','45'][Math.floor(Math.random()*4)]}`;
    const map = {
      '{nombre}': user?.username || 'Profesional',
      '{fecha}': randomFecha,
      '{hora}': randomHora,
      '{servicio}': 'Consulta de prueba',
      '{profesional}': randomName,
      '{sucursal}': user?.sucursal?.nombre || '',
      '{enlaceConfirmacion}': 'https://example.com/confirmacion/TEST'
    };
    let out = t;
    Object.entries(map).forEach(([k,v]) => { out = out.replaceAll(k, v); });
    return out;
  };

  // Abre diálogo para ingresar número al que enviar la prueba
  const handleTestSend = () => {
    setError(null);
    if (!localData.reminderMessage || !localData.reminderMessage.trim()) {
      setTestSnack({ open: true, message: 'Configura tu mensaje de recordatorio antes de probar.', severity: 'warning' });
      return;
    }
    // Prefill con el celular del usuario si existe (solo como sugerencia, NO se envía automáticamente)
    const suggest = String(user?.celular || '').replace(/\D/g, '');
    const lastNine = suggest.endsWith('9') && suggest.length === 1 ? '' : suggest.slice(-9); // seguridad
    setTestPhone(lastNine || '');
    setTestPhoneError('');
    setTestDialogOpen(true);
  };

  const sendTestToPhone = async () => {
    setTestPhoneError('');
    const digits = String(testPhone || '').replace(/\D/g, '');
    if (!/^\d{9}$/.test(digits)) {
      setTestPhoneError('Ingresa 9 dígitos (ej: 912345678)');
      return;
    }
    const phoneNumber = normalizarTelefono(digits);
    const message = buildTestMessage(localData.reminderMessage);
    try {
      setTestSending(true);
      const resp = await api.post('/notifications/whatsapp', { phoneNumber, message });
      if (resp?.data?.ok) {
        setTestSnack({ open: true, message: `Mensaje de prueba enviado al +${phoneNumber}.`, severity: 'success' });
        setTestDialogOpen(false);
      } else {
        const msg = resp?.data?.message || 'No se pudo enviar el mensaje.';
        setTestSnack({ open: true, message: msg, severity: 'error' });
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Error al enviar mensaje.';
      setTestSnack({ open: true, message: msg, severity: 'error' });
    } finally {
      setTestSending(false);
    }
  };

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
            <Box display="flex" gap={1} flexWrap="wrap">
              {editing ? (
                <>
                  <Button
                    startIcon={<SaveIcon />}
                    variant="contained"
                    sx={{
                      background: 'linear-gradient(135deg, #2596be, #21cbe6)',
                      color: 'white',
                      boxShadow: '0 4px 10px rgba(37,150,190,0.3)',
                      '&:hover': { background: 'linear-gradient(135deg, #21cbe6, #2596be)' }
                    }}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    Guardar
                  </Button>
                  <Button
                    startIcon={<CancelIcon />}
                    variant="outlined"
                    sx={{
                      borderColor: '#2596be',
                      color: '#2596be',
                      '&:hover': { borderColor: '#21cbe6', color: '#21cbe6' }
                    }}
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  startIcon={<EditIcon />}
                  variant="contained"
                  sx={{
                    background: 'linear-gradient(135deg, #2596be, #21cbe6)',
                    color: 'white',
                    boxShadow: '0 4px 10px rgba(37,150,190,0.3)',
                    '&:hover': { background: 'linear-gradient(135deg, #21cbe6, #2596be)' }
                  }}
                  onClick={startEdit}
                >
                  Editar
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={handleTestSend}
                disabled={testSending}
                sx={{
                  borderColor: '#2596be',
                  color: '#2596be',
                  '&:hover': { borderColor: '#21cbe6', color: '#21cbe6' }
                }}
              >
                {testSending ? 'Enviando…' : 'Probar mensaje'}
              </Button>
            </Box>
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
              Nota: Al guardar, siempre se añadirá la línea final con el texto: "Por favor, confirme su cita a través del siguiente enlace: {'{enlaceConfirmacion}'}". Pero solo se incluirá en el mensaje enviado si la cita no ha sido confirmada por el paciente.
            </Typography>
            <Divider />
            <Typography variant="subtitle1" fontWeight={600}>Vista Previa (Ejemplo)</Typography>
            <Paper variant="outlined" sx={{ p:2, background:'#f9f9f9' }}>
              <Typography variant="caption" color="text.secondary">Recordatorio</Typography>
              <Typography variant="body2" sx={{ whiteSpace:'pre-line' }}>
                {applyPreview(localData.reminderMessage)}
              </Typography>
            </Paper>
            {reservaDemo && (
              <Paper variant="outlined" sx={{ p:2, background:'#f1f8e9' }}>
                <Typography variant="caption" color="text.secondary">Vista con datos de ejemplo de una reserva</Typography>
                <Typography variant="body2" sx={{ whiteSpace:'pre-line', mt:1 }}>
                  {applyPreview(
                    (localData.reminderMessage || '')
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
      <Dialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #2596be, #21cbe6)',
            color: 'white',
            fontWeight: 700
          }}
        >
          Cómo personalizar tus mensajes
        </DialogTitle>
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
          <Button
            onClick={() => setHelpOpen(false)}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #2596be, #21cbe6)',
              color: 'white',
              boxShadow: '0 4px 10px rgba(37,150,190,0.3)',
              '&:hover': { background: 'linear-gradient(135deg, #21cbe6, #2596be)' }
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para ingresar el número de prueba */}
      <Dialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #2596be, #21cbe6)',
          color: 'white',
          fontWeight: 700
        }}>
          Enviar mensaje de prueba
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Ingresa un número chileno al que enviar la prueba. Usa el formato 9 dígitos: 912345678.
            </Typography>
            <TextField
              label="Número de WhatsApp"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="912345678"
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 9 }}
              error={Boolean(testPhoneError)}
              helperText={testPhoneError || 'Se enviará como +56 9 XXXXXXXX'}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)} disabled={testSending}>Cancelar</Button>
          <Button
            onClick={sendTestToPhone}
            variant="contained"
            disabled={testSending}
            sx={{
              background: 'linear-gradient(135deg, #2596be, #21cbe6)',
              color: 'white',
              boxShadow: '0 4px 10px rgba(37,150,190,0.3)',
              '&:hover': { background: 'linear-gradient(135deg, #21cbe6, #2596be)' }
            }}
          >
            {testSending ? 'Enviando…' : 'Enviar prueba'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para feedback de prueba */}
      <Snackbar
        open={testSnack.open}
        autoHideDuration={3000}
        onClose={() => setTestSnack(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={testSnack.severity} onClose={() => setTestSnack(prev => ({ ...prev, open: false }))} sx={{ width: '100%' }}>
          {testSnack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MensajesAutomaticos;