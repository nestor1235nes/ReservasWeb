import React, { useState, useEffect, useRef } from 'react';
import { Box, Card, CardHeader, CardContent, Stack, Typography, TextField, Divider, Paper, Button, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar, Tabs, Tab } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import { useAuth } from '../context/authContext';
import { useSucursal } from '../context/sucursalContext';
import { useSubscription } from '../context/subscriptionContext';
import api from '../api/axios';

const PLACEHOLDERS = [
  { key: 'nombre', desc: 'Nombre del paciente' },
  { key: 'dia', desc: 'Día de la semana (ej: lunes)' },
  { key: 'fecha', desc: 'Fecha de la cita (ej: 25/09/2025)' },
  { key: 'hora', desc: 'Hora de la cita (ej: 15:30)' },
  { key: 'servicio', desc: 'Nombre del servicio o motivo' },
  { key: 'profesional', desc: 'Nombre del profesional' },
  { key: 'sucursal', desc: 'Nombre de la sucursal (si aplica)' },
  { key: 'enlaceConfirmacion', desc: 'URL única para confirmar la cita' },
  { key: 'enlaceOferta', desc: 'URL única para aceptar hora de lista de espera' },
  { key: 'minutosVigencia', desc: 'Minutos disponibles para aceptar una oferta' },
];

// Reemplazos de ejemplo para construir mensajes de prueba sin acceder a datos reales
const previewSample = {
  nombre: 'Juan Pérez',
  dia: 'jueves',
  fecha: '25/09/2025',
  hora: '15:30',
  servicio: 'Consulta General',
  profesional: 'Dra. Gómez',
  sucursal: 'Centro Salud Central',
  enlaceConfirmacion: 'https://midominio.cl/confirmacion/ABC123',
  enlaceOferta: 'https://midominio.cl/lista-espera/aceptar/ABC123',
  minutosVigencia: '20',
};

// Defaults deben reflejar exactamente lo que el backend enviará si no hay overrides guardados.
const DEFAULT_TEMPLATES = {
  reminders: {
    registroInformativo:
      `Hola {nombre}, hemos agendado su cita para el {dia} {fecha} a las {hora} con {profesional}.\n\n` +
      `Le enviaremos un mensaje para recordarle y confirmar su asistencia 24 horas antes de su cita.\n\n` +
      `Gracias por su preferencia.`,
    registroConfirmacion:
      `Hola {nombre}, gracias por agendar su cita para el {dia} {fecha} a las {hora} con {profesional}.\n\n` +
      `Por favor, confirme su asistencia a través del siguiente enlace:\n` +
      `{enlaceConfirmacion}\n\n` +
      `Gracias por su preferencia.`,
    recordatorio24h:
      `Hola {nombre}, le recordamos que tiene una cita MAÑANA a las {hora} con {profesional}.\n\n` +
      `Por favor, confirme su asistencia a través del siguiente enlace:\n` +
      `{enlaceConfirmacion}\n\n` +
      `Si no puede asistir, le agradecemos cancelar su cita para liberar el espacio a otro paciente.`,
  },
  waitlist: {
    offer:
      `🎉 ¡Buenas noticias, {nombre}!\n\n` +
      `Se ha liberado una hora con {profesional} para el {fecha} a las {hora}.\n\n` +
      `Como estás en la lista de espera, tienes la prioridad para tomar esta hora.\n\n` +
      `⏰ *Tienes {minutosVigencia} minutos para aceptar esta hora.*\n\n` +
      `👉 Acepta aquí: {enlaceOferta}\n\n` +
      `Si no respondes a tiempo, la hora será ofrecida al siguiente paciente en la lista.`,
  },
};

// Eliminado: ya no se añade ninguna línea automática de confirmación.

const MensajesAutomaticos = ({ formData, onChange }) => {
  const { updatePerfil, user, esAdminSucursal } = useAuth();
  const { getSucursal, updateSucursal } = useSucursal();
  const { isBasic } = useSubscription();
  const [editing, setEditing] = useState(false); // edición local
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [sucursalData, setSucursalData] = useState(null);
  const [localData, setLocalData] = useState({
    defaultMessage: '',
    messageTemplates: {
      reminders: {
        registroInformativo: '',
        registroConfirmacion: '',
        recordatorio24h: '',
      },
      waitlist: {
        offer: '',
      },
    },
  });
  // Credenciales WhatsApp propias de la sucursal (opcional). El token solo se envía si se (re)escribe.
  const [waNumber, setWaNumber] = useState('');
  const [waIdInstance, setWaIdInstance] = useState('');
  const [waToken, setWaToken] = useState('');
  const [waConfigured, setWaConfigured] = useState(false);
  const [waMasked, setWaMasked] = useState('');
  const activeFieldRef = useRef(null);
  const [activeField, setActiveField] = useState('messageTemplates.reminders.registroInformativo');
  const [helpOpen, setHelpOpen] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testSnack, setTestSnack] = useState({ open: false, message: '', severity: 'success' });
  const [tab, setTab] = useState('reminders');
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testPhoneError, setTestPhoneError] = useState('');

  const isSucursalMember = !!(user?.sucursal?._id || user?.sucursal);
  const useSucursalConfig = isSucursalMember && !!esAdminSucursal;
  const canEditMessages = !isBasic;
  const editingEnabled = editing && canEditMessages;

  useEffect(() => {
    if (!canEditMessages && editing) setEditing(false);
  }, [canEditMessages, editing]);

  // Cargar sucursal si corresponde (admin de sucursal)
  useEffect(() => {
    const cargar = async () => {
      if (!useSucursalConfig) return;
      try {
        const s = await getSucursal();
        setSucursalData(s);
      } catch (e) {
        setSucursalData(null);
      }
    };
    cargar();
  }, [useSucursalConfig, getSucursal]);

  // Sync con props inicial y cuando cambia la fuente
  useEffect(() => {
    const source = useSucursalConfig ? sucursalData : formData;
    setLocalData({
      defaultMessage: source?.defaultMessage || '',
      messageTemplates: {
        reminders: {
          registroInformativo: source?.messageTemplates?.reminders?.registroInformativo || DEFAULT_TEMPLATES.reminders.registroInformativo,
          registroConfirmacion: source?.messageTemplates?.reminders?.registroConfirmacion || DEFAULT_TEMPLATES.reminders.registroConfirmacion,
          recordatorio24h: source?.messageTemplates?.reminders?.recordatorio24h || DEFAULT_TEMPLATES.reminders.recordatorio24h,
        },
        waitlist: {
          offer: source?.messageTemplates?.waitlist?.offer || DEFAULT_TEMPLATES.waitlist.offer,
        },
      },
    });
  }, [
    useSucursalConfig,
    sucursalData?.defaultMessage,
    sucursalData?.messageTemplates,
    formData?.defaultMessage,
    formData?.messageTemplates,
  ]);

  // Sincroniza las credenciales WhatsApp propias de la sucursal (si aplica)
  useEffect(() => {
    if (!useSucursalConfig) return;
    setWaNumber(sucursalData?.whatsappNumber || '');
    setWaIdInstance(sucursalData?.idInstance || '');
    setWaConfigured(!!sucursalData?.whatsappConfigured);
    setWaMasked(sucursalData?.apiTokenInstanceMasked || '');
    setWaToken('');
  }, [useSucursalConfig, sucursalData?.whatsappNumber, sucursalData?.idInstance, sucursalData?.whatsappConfigured, sucursalData?.apiTokenInstanceMasked]);

  const propagate = (name, value) => {
    // notificar al padre (PerfilPage) para mantener un solo origen de verdad
    if (!useSucursalConfig && onChange) {
      onChange({ target: { name, value } });
    }
  };

  const getByPath = (obj, path) => {
    const parts = String(path || '').split('.');
    let cur = obj;
    for (const p of parts) {
      if (!cur || typeof cur !== 'object') return undefined;
      cur = cur[p];
    }
    return cur;
  };

  const setByPath = (obj, path, value) => {
    const parts = String(path || '').split('.');
    const out = { ...(obj || {}) };
    let cur = out;
    for (let i = 0; i < parts.length; i++) {
      const key = parts[i];
      if (i === parts.length - 1) {
        cur[key] = value;
      } else {
        cur[key] = { ...(cur[key] || {}) };
        cur = cur[key];
      }
    }
    return out;
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setLocalData(prev => {
      const next = setByPath(prev, name, value);
      if (name.startsWith('messageTemplates')) {
        propagate('messageTemplates', next.messageTemplates);
      } else {
        propagate(name, value);
      }
      return next;
    });
  };

  const handlePlaceholderInsert = (placeholder) => {
    const key = `{${placeholder}}`;
    const field = activeField || 'messageTemplates.reminders.registroInformativo';
    setLocalData(prev => {
      const current = getByPath(prev, field) || '';
      const selectionStart = activeFieldRef.current?.selectionStart ?? current.length;
      const selectionEnd = activeFieldRef.current?.selectionEnd ?? current.length;
      const newValue = current.slice(0, selectionStart) + key + current.slice(selectionEnd);
      const updated = setByPath(prev, field, newValue);
      if (field.startsWith('messageTemplates')) {
        propagate('messageTemplates', updated.messageTemplates);
      } else {
        propagate(field, newValue);
      }
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

  const isActiveFieldInTab = (field, tabKey) => {
    if (!field) return false;
    if (tabKey === 'liberar') return field === 'defaultMessage';
    if (tabKey === 'waitlist') return field.startsWith('messageTemplates.waitlist');
    return field.startsWith('messageTemplates.reminders');
  };

  useEffect(() => {
    if (isActiveFieldInTab(activeField, tab)) return;
    if (tab === 'liberar') setActiveField('defaultMessage');
    else if (tab === 'waitlist') setActiveField('messageTemplates.waitlist.offer');
    else setActiveField('messageTemplates.reminders.registroInformativo');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const copyToClipboard = async (text, successMsg) => {
    try {
      if (!text || !String(text).trim()) {
        setTestSnack({ open: true, message: 'No hay contenido para copiar.', severity: 'warning' });
        return;
      }
      await navigator.clipboard.writeText(String(text));
      setTestSnack({ open: true, message: successMsg || 'Copiado al portapapeles.', severity: 'success' });
    } catch (e) {
      setTestSnack({ open: true, message: 'No se pudo copiar. Revisa permisos del navegador.', severity: 'error' });
    }
  };

  const TemplateCard = ({
    title,
    subtitle,
    name,
    value,
    minRows = 4,
    placeholder,
  }) => {
    const isActive = activeField === name;
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          borderColor: isActive ? '#21cbe6' : 'rgba(148, 163, 184, 0.55)',
          boxShadow: isActive ? '0 6px 16px rgba(33,203,230,0.12)' : 'none',
          transition: 'all 160ms ease',
        }}
      >
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="subtitle1" fontWeight={800}>
                {title}
              </Typography>
              {isActive && <Chip size="small" label="Activa" color="primary" variant="outlined" />}
              {!editingEnabled && <Chip size="small" label="Solo lectura" variant="outlined" />}
            </Stack>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title="Copiar plantilla">
              <span>
                <IconButton
                  size="small"
                  onClick={() => copyToClipboard(value, 'Plantilla copiada.')}
                  disabled={!value || !String(value).trim()}
                >
                  <ContentPasteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Box>

        <TextField
          inputRef={isActive ? activeFieldRef : null}
          onFocus={() => setActiveField(name)}
          name={name}
          value={value}
          onChange={handleFieldChange}
          fullWidth
          multiline
          minRows={minRows}
          disabled={!editingEnabled}
          placeholder={placeholder}
          sx={{ mt: 1 }}
        />

        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 0.75 }}>
          <Typography variant="caption" color="text.secondary">
            Haz clic en placeholders para insertarlos.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {(value || '').length} caracteres
          </Typography>
        </Box>
      </Paper>
    );
  };

  const startEdit = () => {
    setError(null);
    if (!canEditMessages) {
      setTestSnack({
        open: true,
        message: 'La edición de mensajes está disponible desde Plan Standard y Teams.',
        severity: 'info',
      });
      return;
    }
    setEditing(true);
  };

  const cancelEdit = () => {
    setError(null);
    setEditing(false);
    if (useSucursalConfig) {
      setWaNumber(sucursalData?.whatsappNumber || '');
      setWaIdInstance(sucursalData?.idInstance || '');
      setWaConfigured(!!sucursalData?.whatsappConfigured);
      setWaMasked(sucursalData?.apiTokenInstanceMasked || '');
      setWaToken('');
    }
    // revertir a props
    const source = useSucursalConfig ? sucursalData : formData;
    setLocalData({
      defaultMessage: source?.defaultMessage || '',
      messageTemplates: {
        reminders: {
          registroInformativo: source?.messageTemplates?.reminders?.registroInformativo || DEFAULT_TEMPLATES.reminders.registroInformativo,
          registroConfirmacion: source?.messageTemplates?.reminders?.registroConfirmacion || DEFAULT_TEMPLATES.reminders.registroConfirmacion,
          recordatorio24h: source?.messageTemplates?.reminders?.recordatorio24h || DEFAULT_TEMPLATES.reminders.recordatorio24h,
        },
        waitlist: {
          offer: source?.messageTemplates?.waitlist?.offer || DEFAULT_TEMPLATES.waitlist.offer,
        },
      },
    });
  };


  const handleSave = async () => {
    setError(null);
    const payload = {
      defaultMessage: localData.defaultMessage,
      messageTemplates: localData.messageTemplates,
    };

    // Credenciales WhatsApp propias (solo sucursal). El NÚMERO es el interruptor:
    // con número → se exige idInstance + token; sin número → se limpia (envío centralizado).
    if (useSucursalConfig) {
      const numero = waNumber.trim();
      const idIns = waIdInstance.trim();
      const tokenNuevo = waToken.trim();
      if (numero) {
        if (!idIns || !(tokenNuevo || waConfigured)) {
          setError('Para enviar desde un número propio completa el número, el idInstance y el token.');
          return;
        }
        payload.whatsappNumber = numero;
        payload.idInstance = idIns;
        if (tokenNuevo) payload.apiTokenInstance = tokenNuevo; // solo si se (re)escribió
      } else {
        if (idIns || tokenNuevo) {
          setError('Agrega también el número de WhatsApp para usar credenciales propias, o limpia los tres campos para usar el número centralizado.');
          return;
        }
        payload.whatsappNumber = '';
        payload.idInstance = '';
        payload.apiTokenInstance = '';
      }
    }

    try {
      setSaving(true);
      if (useSucursalConfig) {
        const sid = sucursalData?._id || user?.sucursal?._id || user?.sucursal;
        if (!sid) throw new Error('missing_sucursal_id');
        await updateSucursal(sid, payload);
        const refreshed = await getSucursal();
        setSucursalData(refreshed);
      } else {
        await updatePerfil(user.id || user._id, payload);
      }
      setEditing(false);
    } catch (e) {
      const msg = e?.response?.data?.message;
      setError(msg || 'Error al guardar cambios.');
    } finally {
      setSaving(false);
    }
  };

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
    // Vista previa sin añadir líneas automáticas; solo normaliza placeholder de enlace si lo incluyes
    const t = String(template).replace(/\{enlaceconfirmacion\}/gi, '{enlaceConfirmacion}');
    return t.replace(/\{(\w+)\}/g, (_, key) => previewSample[key] || `{${key}}`);
  };

  // Abre diálogo para ingresar número al que enviar la prueba
  const handleTestSend = () => {
    setError(null);
    if (!canEditMessages) {
      setTestSnack({
        open: true,
        message: 'Disponible desde Plan Standard y Teams.',
        severity: 'info',
      });
      return;
    }
    const currentTemplate = getByPath(localData, activeField) || '';
    if (!currentTemplate || !String(currentTemplate).trim()) {
      setTestSnack({ open: true, message: 'Selecciona una plantilla con contenido antes de probar.', severity: 'warning' });
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
    const currentTemplate = getByPath(localData, activeField) || '';
    const message = buildTestMessage(currentTemplate);
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
      <Card sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
        <CardHeader
          sx={{
            background: 'linear-gradient(135deg, rgba(37,150,190,0.12), rgba(33,203,230,0.10))',
            borderBottom: '1px solid rgba(148, 163, 184, 0.35)',
          }}
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
                    disabled={saving || !canEditMessages}
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
                <Tooltip title={canEditMessages ? '' : 'Disponible desde Plan Standard y Teams.'} disableHoverListener={canEditMessages}>
                  <span>
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
                      disabled={!canEditMessages}
                    >
                      Editar
                    </Button>
                  </span>
                </Tooltip>
              )}
              <Tooltip title={canEditMessages ? '' : 'Disponible desde Plan Standard y Teams.'} disableHoverListener={canEditMessages}>
                <span>
                  <Button
                    variant="outlined"
                    onClick={handleTestSend}
                    disabled={testSending || !canEditMessages}
                    sx={{
                      borderColor: '#2596be',
                      color: '#2596be',
                      '&:hover': { borderColor: '#21cbe6', color: '#21cbe6' }
                    }}
                  >
                    {testSending ? 'Enviando…' : 'Probar mensaje'}
                  </Button>
                </span>
              </Tooltip>
            </Box>
          }
          subheader="Configura y personaliza los mensajes que se enviarán a tus pacientes."
        />
        <CardContent>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {!canEditMessages && (
              <Alert severity="info">
                La personalización de mensajes automáticos está disponible desde Plan Standard y Teams.
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary">
              El envío de WhatsApp se realiza desde un único número de la plataforma.
            </Typography>
            <Divider />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '360px 1fr' },
                gap: 2,
                alignItems: 'start',
              }}
            >
              {/* Columna izquierda: herramientas */}
              <Stack spacing={2}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    borderColor: 'rgba(148, 163, 184, 0.55)',
                    background: 'rgba(255,255,255,0.75)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Typography variant="subtitle1" fontWeight={800}>Herramientas</Typography>
                    
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    Selecciona una pestaña y edita sus plantillas. Los placeholders se reemplazan automáticamente al enviar.
                  </Typography>

                  <Divider sx={{ my: 1.5 }} />

                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                    Placeholders
                  </Typography>

                  <Box display="flex" gap={1} flexWrap="wrap">
                    {PLACEHOLDERS.map(p => (
                      <Chip
                        key={p.key}
                        size="small"
                        label={`{${p.key}}`}
                        onClick={() => editingEnabled && handlePlaceholderInsert(p.key)}
                        onDoubleClick={() => copyToClipboard(`{${p.key}}`, 'Placeholder copiado.')}
                        color="primary"
                        variant="outlined"
                        sx={{ cursor: editingEnabled ? 'pointer' : 'default' }}
                      />
                    ))}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Tip: doble clic en un placeholder para copiarlo.
                  </Typography>

                  <Divider sx={{ my: 1.5 }} />


                </Paper>

                {/* Número propio de WhatsApp (solo sucursal) */}
                {useSucursalConfig && (
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 2, borderColor: 'rgba(148, 163, 184, 0.55)' }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} flexWrap="wrap">
                      <Typography variant="subtitle1" fontWeight={800}>Número de envío</Typography>
                      {waConfigured
                        ? <Chip size="small" label="Número propio" color="success" variant="outlined" />
                        : <Chip size="small" label="Centralizado" variant="outlined" />}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, mb: 1.5 }}>
                      Por defecto, los mensajes se envían desde el número centralizado de la plataforma.
                      Si agregas un número propio (Green API), debes completar también el idInstance y el token,
                      y todos los mensajes de esta sucursal se enviarán desde ese número.
                    </Typography>

                    <Stack spacing={1.5}>
                      <TextField
                        label="Número de WhatsApp"
                        placeholder="569XXXXXXXX"
                        value={waNumber}
                        onChange={(e) => setWaNumber(e.target.value)}
                        disabled={!editingEnabled}
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label="idInstance (Green API)"
                        value={waIdInstance}
                        onChange={(e) => setWaIdInstance(e.target.value)}
                        disabled={!editingEnabled}
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label="apiTokenInstance (token)"
                        type="password"
                        value={waToken}
                        onChange={(e) => setWaToken(e.target.value)}
                        disabled={!editingEnabled}
                        fullWidth
                        size="small"
                        placeholder={waConfigured ? `Actual: ${waMasked} (déjalo vacío para mantenerlo)` : ''}
                        helperText={waConfigured ? 'Escribe un token solo si quieres cambiarlo.' : ''}
                      />
                      {editingEnabled && (
                        <Typography variant="caption" color="text.secondary">
                          Para volver al número centralizado, borra el número (y los tres campos) y guarda.
                        </Typography>
                      )}
                    </Stack>
                  </Paper>
                )}
              </Stack>

              {/* Columna derecha: editor */}
              <Stack spacing={2}>
                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    borderColor: 'rgba(148, 163, 184, 0.55)',
                    overflow: 'hidden',
                  }}
                >
                  <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    variant="scrollable"
                    scrollButtons
                    allowScrollButtonsMobile
                    sx={{
                      background: 'linear-gradient(135deg, rgba(37,150,190,0.10), rgba(33,203,230,0.08))',
                      borderBottom: '1px solid rgba(148, 163, 184, 0.35)',
                      px: 1,
                    }}
                  >
                    
                    <Tab value="reminders" label="Recordatorios" />
                    <Tab value="waitlist" label="Lista de espera" />
                    <Tab value="liberar" label="Liberar horas" />
                  </Tabs>

                  <Box sx={{ p: 2 }}>
                    {tab === 'liberar' && (
                      <TemplateCard
                        title="Mensaje al liberar horas"
                        subtitle="Se usa cuando notificas pacientes al liberar/bloquear horas (si aplica)."
                        name="defaultMessage"
                        value={localData.defaultMessage}
                        minRows={4}
                        placeholder="Escribe tu mensaje..."
                      />
                    )}

                    {tab === 'reminders' && (
                      <Stack spacing={2}>
                        <TemplateCard
                          title="Registro informativo (24h o más)"
                          subtitle="Se envía de inmediato al agendar cuando faltan 24h o más. Solo informa; la confirmación llega después."
                          name="messageTemplates.reminders.registroInformativo"
                          value={localData.messageTemplates.reminders.registroInformativo}
                        />
                        <TemplateCard
                          title="Registro con confirmación (menos de 24h)"
                          subtitle="Se envía de inmediato al agendar cuando faltan menos de 24h. Incluye el enlace para confirmar."
                          name="messageTemplates.reminders.registroConfirmacion"
                          value={localData.messageTemplates.reminders.registroConfirmacion}
                        />
                        <TemplateCard
                          title="Confirmación 24h antes"
                          subtitle="Único recordatorio automático: se envía 24h antes para confirmar la asistencia (si la cita se agendó con más de 24h)."
                          name="messageTemplates.reminders.recordatorio24h"
                          value={localData.messageTemplates.reminders.recordatorio24h}
                        />
                      </Stack>
                    )}

                    {tab === 'waitlist' && (
                      <TemplateCard
                        title="Oferta de hora liberada"
                        subtitle="Se envía al primer paciente de lista de espera cuando se libera una hora."
                        name="messageTemplates.waitlist.offer"
                        value={localData.messageTemplates.waitlist.offer}
                        minRows={6}
                      />
                    )}
                  </Box>
                </Paper>
              </Stack>
            </Box>
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