import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Chip, IconButton, Tooltip, FormControl, FormControlLabel, Radio, RadioGroup, Divider } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { StaticDatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useAuth } from '../../context/authContext';
import { useAlert } from '../../context/AlertContext';
import { useSubscription } from '../../context/subscriptionContext';
import sendWhatsAppMessage, { PLACEHOLDERS } from '../../sendWhatsAppMessage';
import { CSSTransition } from 'react-transition-group';
import '../ui/LiberarHoras.css';
import { getReservasRequest } from '../../api/reservas';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

dayjs.locale('es');

const LiberarHoras = ({ open, onClose, fetchReservas, gapi }) => {
    const [fecha, setFecha] = useState('');
    const { user, liberarHoras } = useAuth();
    const showAlert = useAlert();
    const { isAdvanced, isTeams } = useSubscription();
    const canBlockHours = isAdvanced || isTeams;
    const [diasDeTrabajo, setDiasDeTrabajo] = useState([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [showCalendar, setShowCalendar] = useState(true);
    const [customMessage, setCustomMessage] = useState('');
    const [showPlaceholdersHelp, setShowPlaceholdersHelp] = useState(false);
    const [blockMode, setBlockMode] = useState('day'); // 'day' | 'times'
    const [selectedTimes, setSelectedTimes] = useState([]);
    const [reservasDelDia, setReservasDelDia] = useState([]);
    const [loadingReservas, setLoadingReservas] = useState(false);

    const hasWhatsApp = Boolean((user?.sucursal?.idInstance || user?.idInstance) && (user?.sucursal?.apiTokenInstance || user?.apiTokenInstance));
    const reservasAfectadas = blockMode === 'times'
        ? reservasDelDia.filter(r => selectedTimes.includes(r?.hora))
        : reservasDelDia;
    const hasReservas = reservasAfectadas.length > 0;
    const mustWriteMessage = hasReservas && hasWhatsApp;
    const messageError = mustWriteMessage && (!customMessage || customMessage.trim() === '');

    const toggleTime = (t) => {
        setSelectedTimes(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]));
    };

    const getTimesForDate = () => {
        if (!user?.timetable || !fecha) return [];
        const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const [y, m, d] = (fecha || '').split('-').map(Number);
        const localDate = new Date(y, (m || 1) - 1, d || 1);
        const diaSemana = dias[localDate.getDay()];

        const toMinutes = (hhmm) => {
            if (!hhmm || typeof hhmm !== 'string') return null;
            const parts = hhmm.split(':');
            if (parts.length < 2) return null;
            const h = parseInt(parts[0], 10);
            const mm2 = parseInt(parts[1], 10);
            if (Number.isNaN(h) || Number.isNaN(mm2)) return null;
            return h * 60 + mm2;
        };
        const fmt = (mins) => {
            const hh = String(Math.floor(mins / 60)).padStart(2, '0');
            const mm3 = String(mins % 60).padStart(2, '0');
            return `${hh}:${mm3}`;
        };
        const generateTimes = (fromTime, toTime, breakFrom, breakTo, interval) => {
            const start = toMinutes(fromTime);
            const end = toMinutes(toTime);
            const brFrom = toMinutes(breakFrom);
            const brTo = toMinutes(breakTo);
            const step = parseInt(interval || 30, 10);
            if (start == null || end == null || !step || step <= 0) return [];
            const times = [];
            let t = start;
            while (t < end) {
                if (brFrom != null && brTo != null && t >= brFrom && t < brTo) {
                    t = brTo;
                    continue;
                }
                times.push(fmt(t));
                t += step;
            }
            return times;
        };

        const bloquesDia = (user.timetable || []).filter(b => Array.isArray(b?.days) && b.days.includes(diaSemana));
        const all = bloquesDia.flatMap(b => {
            if (Array.isArray(b?.times) && b.times.length) {
                const norm = b.times
                    .map(t => {
                        const mins = toMinutes(t);
                        return mins == null ? null : fmt(mins);
                    })
                    .filter(Boolean);
                return norm;
            }
            return generateTimes(b?.fromTime, b?.toTime, b?.breakFrom, b?.breakTo, b?.interval || 30);
        });

        return Array.from(new Set(all)).sort();
    };

    const timesForSelectedDate = getTimesForDate();

    const handleFechaChange = (newValue) => {
        const valid = newValue && typeof newValue.isValid === 'function' && newValue.isValid();
        setFecha(valid ? newValue.format('YYYY-MM-DD') : '');
        setShowCalendar(false);
        setBlockMode('day');
        setSelectedTimes([]);
    };

    const handleLiberarHoras = async () => {
        try {
            if (!canBlockHours) {
                showAlert('info', 'Esta funcionalidad está disponible solo en el Plan Avanzado o Teams.');
                return;
            }

            if (blockMode === 'times' && selectedTimes.length === 0) {
                showAlert('error', 'Debes seleccionar al menos un horario para bloquear.');
                return;
            }

            // Validación: si hay horas agendadas y tiene WhatsApp, debe escribir mensaje
            if (mustWriteMessage && (!customMessage || customMessage.trim() === '')) {
                showAlert('error', 'Debes escribir un mensaje para notificar por WhatsApp a los pacientes de este día.');
                return;
            }
            const data = {
                fecha,
                blockDay: blockMode === 'day',
                mode: blockMode,
                blockedTimes: blockMode === 'times' ? selectedTimes : undefined,
                customMessage,
            };
            const reservasLiberadas = await liberarHoras(data);
            showAlert('success', blockMode === 'day' ? 'Día bloqueado correctamente' : 'Horarios bloqueados correctamente');
            fetchReservas();
            onClose();
            console.log(user);
    
            // Eliminar eventos en Google Calendar
            
            if (gapi.auth2.getAuthInstance().isSignedIn.get()) {
                for (const reserva of reservasLiberadas.reservasLiberadas) {
                    if (reserva.eventId) {
                        console.log(reserva);
                        const request = gapi.client.calendar.events.delete({
                            calendarId: 'primary',
                            eventId: reserva.eventId,
                        });
    
                        request.execute((response) => {
                            if (response.error) {
                                console.error('Error deleting event: ', response.error);
                            } else {
                                console.log('Event deleted: ', reserva.eventId);
                            }
                        });
                    }
                }
            }
    
                        if (hasWhatsApp) {
                // Enviar WhatsApp a todos los afectados (política WhatsApp-only)
                const waList = (reservasLiberadas?.reservasLiberadas || []);
                if (waList.length > 0) {
                  if (customMessage && customMessage.trim() !== '') {
                    const report = await sendWhatsAppMessage(waList, customMessage, user, { suppressConfirmLine: true });
                    if (report?.sent) {
                        showAlert('success', `WhatsApp enviado a ${report.sent} paciente(s). ${report.failed ? report.failed + ' fallos' : ''}`);
                    } else {
                        showAlert('warning', 'No se pudo enviar WhatsApp. Revisa tus credenciales y el formato de teléfono (ej. 569XXXXXXXX).');
                    }
                  }
                }             
            } else {
                showAlert('warning', user?.sucursal ? 'Green API no está configurado en la sucursal (idInstance y apiTokenInstance).' : 'Green API no está configurado (idInstance y apiTokenInstance). Ve a tu Perfil para configurarlo.');
            }
        } catch (error) {
            console.error(error);
            showAlert('error', 'Error al liberar las horas');
        }
    };

    const handleConfirmOpen = () => {
        if (!canBlockHours) {
            showAlert('info', 'Esta funcionalidad está disponible solo en el Plan Avanzado o Teams.');
            return;
        }

        if (blockMode === 'times' && selectedTimes.length === 0) {
            showAlert('error', 'Debes seleccionar al menos un horario para bloquear.');
            return;
        }

        // Evitar abrir confirmación si debe escribir mensaje y está vacío
        if (mustWriteMessage && (!customMessage || customMessage.trim() === '')) {
            showAlert('error', 'Debes escribir un mensaje para notificar por WhatsApp a los pacientes de este día.');
            return;
        }
        setConfirmOpen(true);
    };

    const handleConfirmClose = (confirmed) => {
        setConfirmOpen(false);
        if (confirmed) {
            handleLiberarHoras();
        }
    };

    useEffect(() => {
        if (user && user.timetable && user.timetable.length > 0) {
            const dias = user.timetable[0].days;
            setDiasDeTrabajo(dias);
        }
    }, [user]);

    // Inserta placeholder en posición del cursor
    const handleInsertPlaceholder = (token) => {
        setCustomMessage(prev => (prev || '') + (prev?.endsWith(' ') || prev === '' ? '' : ' ') + token + ' ');
    };

    // Cargar reservas del día seleccionado para validar reglas
    useEffect(() => {
        const fetchReservasDia = async () => {
            if (!fecha) { setReservasDelDia([]); return; }
            try {
                setLoadingReservas(true);
                const { data } = await getReservasRequest();
                const target = dayjs(fecha);
                const reservas = (data || []).filter(r => {
                    const d = r?.siguienteCita || r?.diaPrimeraCita;
                    if (!d) return false;
                    const dj = dayjs(d);
                    return dj.isValid() && dj.format('YYYY-MM-DD') === target.format('YYYY-MM-DD');
                });
                setReservasDelDia(reservas);
            } catch (e) {
                console.error('Error obteniendo reservas del día:', e);
                setReservasDelDia([]);
            } finally {
                setLoadingReservas(false);
            }
        };
        fetchReservasDia();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fecha]);

    // Descargar PDF con pacientes del día (fallback sin WhatsApp)
    const handleDescargarPDF = () => {
        try {
            const doc = new jsPDF();
            const title = blockMode === 'times'
                ? `Pacientes afectados - ${dayjs(fecha).format('DD/MM/YYYY')}`
                : `Pacientes con reserva - ${dayjs(fecha).format('DD/MM/YYYY')}`;
            doc.setFontSize(14);
            doc.text(title, 14, 18);

            const rows = reservasAfectadas.map((r, idx) => [
                idx + 1,
                r?.paciente?.nombre || '-',
                r?.paciente?.rut || '-',
                r?.paciente?.telefono || '-',
                r?.hora || '-',
                r?.servicio || '-',
            ]);

            // @ts-ignore - autotable extend
            doc.autoTable({
                startY: 24,
                head: [['#', 'Nombre', 'RUT', 'Teléfono', 'Hora', 'Servicio']],
                body: rows,
                styles: { fontSize: 10 },
                headStyles: { fillColor: [37, 150, 190] },
            });

            doc.save(`contactos_${fecha}.pdf`);
        } catch (e) {
            console.error('Error generando PDF:', e);
            showAlert('error', 'No se pudo generar el PDF.');
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: { xs: '92vw', sm: 560 },
                    maxHeight: { xs: '90vh', sm: '90vh' },
                    bgcolor: 'transparent',
                    borderRadius: 2,
                    boxShadow: 8,
                    overflow: 'hidden',
                }}
            >
                {/* Header con gradiente como el de Calendario */}
                <Box
                    sx={{
                        background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
                        color: 'white',
                        px: 2,
                        py: 1.2,
                    }}
                >
                    <Typography variant="h6" fontWeight={700} textAlign="center">Bloquear día / Liberar horas</Typography>
                </Box>

                {/* Contenido en tarjeta blanca con scroll */}
                <Box sx={{ backgroundColor: 'white', p: { xs: 1.5, sm: 2 }, maxHeight: { xs: 'calc(90vh - 58px)', sm: 'calc(90vh - 58px)' }, overflowY: 'auto' }}>
                    <Box p={1} mb={0}>
                        <Typography variant="body1" gutterBottom>
                            Seleccione el día que desea bloquear
                        </Typography>
                    </Box>
                    <Box p={1} mb={1}>
                        {(user && hasWhatsApp) ? (
                            <Box>
                                <Typography variant="body2" gutterBottom sx={{ fontWeight: 700, opacity: 0.7 }}>
                                    ¡Importante!
                                </Typography>
                                <Typography variant="body2" gutterBottom sx={{ opacity: 0.7 }}>
                                    • Las reservas del día seleccionado no aparecerán en el calendario, pero sí en 'Pacientes'.
                                </Typography>
                                <Typography variant="body2" gutterBottom sx={{ opacity: 0.7 }}>
                                    • Al confirmar, se bloqueará el día seleccionado y se eliminarán todas las reservas agendadas para ese día.
                                </Typography>
                                <Typography variant="body2" gutterBottom sx={{ opacity: 0.7 }}>
                                    • Se notificará por WhatsApp a cada paciente afectado (si tienes Green API configurado).
                                </Typography>
                            </Box>
                        ) : (
                            <Box>
                                <Typography variant="body2" gutterBottom sx={{ fontWeight: 700, opacity: 0.7 }}>
                                    ¡Importante!
                                </Typography>
                                <Typography variant="body2" gutterBottom sx={{ opacity: 0.7 }}>
                                    • Las reservas del día seleccionado no aparecerán en el calendario, pero sí en 'Pacientes'.
                                </Typography>
                                <Typography variant="body2" gutterBottom sx={{ opacity: 0.7 }}>
                                    • Al confirmar, se bloqueará el día seleccionado y se eliminarán todas las reservas agendadas para ese día.
                                </Typography>
                                <Typography variant="body2" gutterBottom sx={{ opacity: 0.7 }}>
                                    • No se enviarán WhatsApps si no tienes Green API configurado.
                                </Typography>
                            </Box>
                        )}
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <CSSTransition
                        in={showCalendar}
                        timeout={300}
                        classNames="fade"
                        unmountOnExit
                    >
                        <LocalizationProvider dateAdapter={AdapterDayjs} locale="es">
                            <StaticDatePicker
                                displayStaticWrapperAs="desktop"
                                label="Fecha"
                                value={fecha ? dayjs(fecha) : null}
                                onChange={handleFechaChange}
                                shouldDisableDate={(date) => {
                                    const dayName = date.format('dddd');
                                    const translatedDays = {
                                        Monday: "Lunes",
                                        Tuesday: "Martes",
                                        Wednesday: "Miércoles",
                                        Thursday: "Jueves",
                                        Friday: "Viernes",
                                        Saturday: "Sábado",
                                        Sunday: "Domingo",
                                    };
                                    const translatedDayName = translatedDays[dayName];
                                    return !diasDeTrabajo.includes(translatedDayName);
                                }}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        margin: 'normal',
                                        required: true,
                                        inputProps: { readOnly: true }
                                    }
                                }}
                            />
                        </LocalizationProvider>
                    </CSSTransition>
                    <CSSTransition
                        in={!showCalendar}
                        timeout={300}
                        classNames="fade"
                        unmountOnExit
                    >
                        <Box>
                            {/* Sección de placeholders y mensaje personalizado */}
                            {!showCalendar && (
                                <Box>
                                    <FormControl component="fieldset" sx={{ mt: 0.5 }}>
                                        <RadioGroup
                                            row
                                            value={blockMode}
                                            onChange={(e) => {
                                                const next = e.target.value;
                                                setBlockMode(next);
                                                if (next === 'day') setSelectedTimes([]);
                                            }}
                                        >
                                            <FormControlLabel value="day" control={<Radio />} label="Día completo" />
                                            <FormControlLabel value="times" control={<Radio />} label="Horarios específicos" />
                                        </RadioGroup>
                                    </FormControl>

                                    {blockMode === 'times' && (
                                        <Box mt={1}>
                                            <Typography variant="body2" sx={{ fontWeight: 700, opacity: 0.8 }}>
                                                Selecciona los horarios a bloquear
                                            </Typography>
                                            <Box mt={1} display="flex" flexWrap="wrap" gap={0.8}>
                                                {timesForSelectedDate.length === 0 ? (
                                                    <Typography variant="body2" color="text.secondary">
                                                        No hay horarios configurados para este día.
                                                    </Typography>
                                                ) : (
                                                    timesForSelectedDate.map(t => (
                                                        <Chip
                                                            key={t}
                                                            label={t}
                                                            clickable
                                                            onClick={() => toggleTime(t)}
                                                            color={selectedTimes.includes(t) ? 'primary' : 'default'}
                                                            variant={selectedTimes.includes(t) ? 'filled' : 'outlined'}
                                                            size="small"
                                                        />
                                                    ))
                                                )}
                                            </Box>
                                        </Box>
                                    )}

                                    {mustWriteMessage && hasWhatsApp && (
                                        <Box mb={1} display="flex" alignItems="center" flexWrap="wrap" gap={0.5}>
                                            {PLACEHOLDERS.map(ph => (
                                                <Chip key={ph.token} size="small" label={ph.token} onClick={() => handleInsertPlaceholder(ph.token)} clickable />
                                            ))}
                                            <Tooltip title="Ayuda placeholders">
                                                <IconButton size="small" onClick={() => setShowPlaceholdersHelp(true)}>
                                                    <HelpOutlineIcon fontSize="inherit" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    )}
                                    {mustWriteMessage && (
                                        <TextField
                                            label="Mensaje general para notificar por WhatsApp (obligatorio)"
                                            multiline
                                            rows={8}
                                            value={customMessage}
                                            onChange={(e) => setCustomMessage(e.target.value)}
                                            fullWidth
                                            margin="normal"
                                            error={messageError}
                                            helperText={messageError ? 'Debes escribir un mensaje para notificar a los pacientes afectados.' : `Se enviará por WhatsApp a ${reservasAfectadas.length} paciente(s).`}
                                        />
                                    )}
                                    {hasReservas && !hasWhatsApp && (
                                        <Button
                                            variant="outlined"
                                            onClick={handleDescargarPDF}
                                            sx={{
                                                mt: 1,
                                                borderColor: '#2596be',
                                                color: '#2596be',
                                                fontWeight: 700,
                                                '&:hover': { borderColor: '#21cbe6', color: '#21cbe6' }
                                            }}
                                        >
                                            Descargar PDF de contactos
                                        </Button>
                                    )}
                                    <Button
                                        variant="contained"
                                        onClick={handleConfirmOpen}
                                        fullWidth
                                        sx={{
                                            mt: 1,
                                            py: 1,
                                            background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
                                            color: 'white',
                                            fontWeight: 700,
                                            '&:hover': {
                                                filter: 'brightness(0.95)'
                                            }
                                        }}
                                        disabled={!canBlockHours || (mustWriteMessage && messageError) || loadingReservas || (blockMode === 'times' && selectedTimes.length === 0)}
                                    >
                                        Confirmar
                                    </Button>
                                </Box>
                            )}

                            <Dialog open={showPlaceholdersHelp} onClose={() => setShowPlaceholdersHelp(false)} maxWidth="sm" fullWidth>
                                <DialogTitle>Placeholders disponibles</DialogTitle>
                                <DialogContent dividers>
                                    {PLACEHOLDERS.map(p => (
                                        <Box key={p.token} mb={1}>
                                            <Typography variant="subtitle2" component="span" sx={{ mr: 1 }}>{p.token}</Typography>
                                            <Typography variant="body2" component="span" color="text.secondary">{p.descripcion}</Typography>
                                        </Box>
                                    ))}
                                    <Box mt={2}>
                                        <Typography variant="body2" color="text.secondary">
                                            Si utilizas {'{enlaceConfirmacion}'} se generará y enviará un link único para que el paciente confirme o cancele su cita.
                                        </Typography>
                                    </Box>
                                </DialogContent>
                                <DialogActions>
                                    <Button onClick={() => setShowPlaceholdersHelp(false)}>Cerrar</Button>
                                </DialogActions>
                            </Dialog>
                        </Box>
                    </CSSTransition>
                </Box>
                <Dialog
                    open={confirmOpen}
                    onClose={() => handleConfirmClose(false)}
                >
                    <DialogTitle>Confirmar Liberación de Horas</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            {blockMode === 'day'
                                ? '¿Está seguro que desea bloquear el día completo?'
                                : `¿Está seguro que desea bloquear ${selectedTimes.length} horario(s) seleccionado(s)?`}
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => handleConfirmClose(false)} sx={{ color: 'text.primary' }}>
                            Cancelar
                        </Button>
                        <Button onClick={() => handleConfirmClose(true)} sx={{ background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)', color: 'white' }}>
                            Confirmar
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Modal>
    );
};

export default LiberarHoras;