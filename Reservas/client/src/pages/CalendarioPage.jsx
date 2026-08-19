import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Box, Card, Drawer, Slide, Stack, Chip, useMediaQuery, Button, IconButton, Typography, ToggleButton, ToggleButtonGroup, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useReserva } from '../context/reservaContext';
import { useAuth } from '../context/authContext';
import { useNavigate, useLocation } from "react-router-dom";
import DespliegueEventos from '../components/PanelDespliegue/DespliegueEventos';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/es';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LiberarHoras from '../components/Modales/LiberarHoras';
import SinDatos from '../components/Modales/SinDatos';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import VentanaNotificaciones from '../components/VentanaNotificaciones';
import { gapi } from 'gapi-script';
import { getBlockedDaysRequest } from '../api/funcion';
import { initClient, ensureGoogleToken } from '../googleCalendarConfig';
import { useSucursal } from '../context/sucursalContext';
import FullPageLoader from '../components/ui/FullPageLoader';
import { useAlert } from '../context/AlertContext';
import SyncIcon from '@mui/icons-material/Sync';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PageHeader from '../components/ui/PageHeader';
import PageLayout from '../components/ui/PageLayout';

dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('es')

const locales = { es: es };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export const ETIQUETAS_VISTA = { month: 'Mes', week: 'Semana', day: 'Día', agenda: 'Agenda' };

// Reemplaza la toolbar de fábrica de react-big-calendar, que trae botones grises
// con borde y desentona dentro del sistema MUI del resto de la app.
function CalendarToolbar({ label, onNavigate, onView, view, views }) {
  const vistas = Array.isArray(views) ? views : Object.keys(views || {});

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="space-between"
      spacing={1.5}
      sx={{ mb: 2 }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
        <IconButton size="small" onClick={() => onNavigate('PREV')} aria-label="Período anterior">
          <ChevronLeftIcon />
        </IconButton>
        <IconButton size="small" onClick={() => onNavigate('NEXT')} aria-label="Período siguiente">
          <ChevronRightIcon />
        </IconButton>
        <Button size="small" variant="outlined" onClick={() => onNavigate('TODAY')} sx={{ ml: 0.5 }}>
          Hoy
        </Button>
      </Stack>

      <Typography
        variant="h6"
        sx={(t) => ({
          color: t.palette.custom.header.text,
          textTransform: 'capitalize',
          textAlign: 'center',
          flexShrink: 0,
        })}
      >
        {label}
      </Typography>

      <Stack direction="row" justifyContent={{ xs: 'stretch', sm: 'flex-end' }} sx={{ flex: 1, minWidth: 0 }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(e, v) => v && onView(v)}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {vistas.map((v) => (
            <ToggleButton key={v} value={v} sx={{ px: 1.75, flex: { xs: 1, sm: 'none' } }}>
              {ETIQUETAS_VISTA[v] || v}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
    </Stack>
  );
}

// Overrides acotados al calendario: apuntan a las clases .rbc-* pero viven dentro
// del sx de su contenedor, asi que no hay CSS global ni fuga a otras paginas.
const estiloCalendario = (t) => ({
  '& .rbc-month-view, & .rbc-time-view, & .rbc-agenda-view table.rbc-agenda-table': {
    border: `1px solid ${t.palette.divider}`,
    borderRadius: '10px',
    overflow: 'hidden',
  },
  '& .rbc-header': {
    padding: '10px 6px',
    borderBottom: `1px solid ${t.palette.divider}`,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontSize: 11,
    fontWeight: 700,
    color: t.palette.text.secondary,
  },
  '& .rbc-header + .rbc-header': { borderLeft: `1px solid ${t.palette.divider}` },
  '& .rbc-day-bg + .rbc-day-bg': { borderLeft: `1px solid ${t.palette.divider}` },
  '& .rbc-month-row + .rbc-month-row': { borderTop: `1px solid ${t.palette.divider}` },
  '& .rbc-time-content, & .rbc-time-header-content, & .rbc-timeslot-group, & .rbc-time-content > * + * > *': {
    borderColor: t.palette.divider,
  },

  // Fuera de mes: se atenua el numero, no se inunda la celda de gris.
  '& .rbc-off-range-bg': { backgroundColor: 'transparent' },
  '& .rbc-off-range .rbc-button-link': { color: t.palette.text.secondary, opacity: 0.45 },

  '& .rbc-date-cell': { padding: '6px 8px', fontSize: 13, fontWeight: 600 },
  '& .rbc-date-cell .rbc-button-link': { color: t.palette.text.primary },

  '& .rbc-today': { backgroundColor: t.palette.custom.tint[100] },
  '& .rbc-now .rbc-button-link': { color: t.palette.primary.main, fontWeight: 800 },

  '& .rbc-event': {
    borderRadius: '6px',
    border: 'none',
    padding: '3px 8px',
    fontSize: 12,
    fontWeight: 600,
    boxShadow: 'none',
  },
  '& .rbc-event:focus-visible': { outline: `2px solid ${t.palette.primary.light}`, outlineOffset: 1 },
  '& .rbc-show-more': {
    color: t.palette.primary.main,
    fontWeight: 700,
    fontSize: 11,
    backgroundColor: 'transparent',
  },
  '& .rbc-agenda-view table.rbc-agenda-table tbody > tr > td': {
    borderColor: t.palette.divider,
    color: t.palette.text.primary,
  },
});

// La hora es el dato más útil de una celda de mes y RBC no la muestra ahí por
// defecto. Va delante del nombre, en tabular-nums para que las filas se alineen.
function EventoCalendario({ event, title }) {
  const hora = event?.start ? dayjs(event.start).format('HH:mm') : null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, minWidth: 0 }}>
      {hora && (
        <Box component="span" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', flexShrink: 0, opacity: 0.85 }}>
          {hora}
        </Box>
      )}
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </Box>
    </Box>
  );
}

function CalendarioPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [reservas, setReservas] = useState([]);
  const [events, setEvents] = useState([]);
  const [visibleTypes, setVisibleTypes] = useState({ primera: true, pendiente: true, historial: true });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { getReservas, getFeriados, updateReserva } = useReserva();
  const { getReservasSucursal } = useSucursal();
  const { logout, user, esAsistente } = useAuth();
  const showAlert = useAlert();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [feriados, setFeriados] = useState([]);
  const [blockedDays, setBlockedDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const interval = user?.timetable?.[0]?.interval || 60; // valor por defecto 60 minutos

  const fetchReservas = async () => {
    setLoading(true);
    try {
      let data = [];
      if (esAsistente && user?.sucursal?._id) {
        // Si es asistente, obtiene reservas de la sucursal
        data = await getReservasSucursal(user.sucursal._id);
      } else {
        // Si no, obtiene reservas propias
        data = await getReservas();
      }
      setReservas(data);

    const transformedEvents = [];
    
    data.forEach(reserva => {
      const historialLegacyPlano = Array.isArray(reserva.historial)
        ? (Array.isArray(reserva.historial[0]) ? reserva.historial.flat() : reserva.historial)
        : [];

      // NUEVO: soporte para historial por casos clínicos (clinicalCases)
      const sesionesDesdeCasos = Array.isArray(reserva.clinicalCases)
        ? reserva.clinicalCases.flatMap((c) => (Array.isArray(c?.sesiones) ? c.sesiones : []))
        : [];

      // Fuente de verdad para pintar sesiones en el calendario
      const historialPlano = [...historialLegacyPlano, ...sesionesDesdeCasos];

      const hasFicha = historialPlano.length > 0
        || (typeof reserva.diagnostico === 'string' && reserva.diagnostico.trim().length > 0)
        || (typeof reserva.anamnesis === 'string' && reserva.anamnesis.trim().length > 0)
        || (Array.isArray(reserva.clinicalCases) && reserva.clinicalCases.some((c) => {
          const hasDx = typeof c?.diagnostico === 'string' && c.diagnostico.trim().length > 0;
          const hasAna = typeof c?.anamnesis === 'string' && c.anamnesis.trim().length > 0;
          const hasSes = Array.isArray(c?.sesiones) && c.sesiones.length > 0;
          return hasDx || hasAna || hasSes;
        }));

      // 1. Agregar cita pendiente (siguienteCita) si existe y NO está cancelada
      const estaCancelada = reserva.confirmStatus === 'cancelled';
      if (reserva.siguienteCita && !estaCancelada) {
        let localStartDate;
        const [hours, minutes] = reserva.hora.split(":").map(Number);

        if (reserva.siguienteCita.endsWith('Z') && reserva.siguienteCita.includes('T00:00:00')) {
          // Caso especial: fecha UTC a medianoche, construir fecha local
          const dateOnly = reserva.siguienteCita.slice(0, 10); // "YYYY-MM-DD"
          localStartDate = dayjs(`${dateOnly}T${reserva.hora}:00`).toDate();
        } else if (reserva.siguienteCita.endsWith('Z')) {
          // Si viene en UTC pero no es medianoche, ajustar zona
          let startDate = dayjs(reserva.siguienteCita).utc().tz('America/Santiago');
          localStartDate = startDate.hour(hours).minute(minutes).second(0).toDate();
        } else {
          // Fecha local
          let startDate = dayjs(reserva.siguienteCita);
          localStartDate = startDate.hour(hours).minute(minutes).second(0).toDate();
        }

        const sameDayAsFirstVisit = Boolean(
          hasFicha && reserva.diaPrimeraCita &&
          dayjs(localStartDate).format('YYYY-MM-DD') === dayjs(reserva.diaPrimeraCita).format('YYYY-MM-DD')
        );

        if (!sameDayAsFirstVisit) {
          transformedEvents.push({
            id: `${reserva._id}-siguiente`,
            title: `${reserva.paciente.nombre}`,
            start: localStartDate,
            end: dayjs(localStartDate).add(interval, 'minute').toDate(),
            tipo: 'pendiente',
            color: '#2596be', // Azul para citas pendientes
            ...reserva,
          });
        }
      }

      // 2. Agregar primera cita solo si existe ficha registrada
      if (hasFicha && reserva.diaPrimeraCita) {
        let primeraCitaDate;

        if (typeof reserva.diaPrimeraCita === 'string') {
          if (reserva.diaPrimeraCita.endsWith('Z') && reserva.diaPrimeraCita.includes('T00:00:00')) {
            // Fecha en UTC a medianoche: construir fecha local usando la hora de la reserva
            const dateOnly = reserva.diaPrimeraCita.slice(0, 10);
            primeraCitaDate = dayjs(`${dateOnly}T00:00:00`).utc().tz('America/Santiago');
          } else if (reserva.diaPrimeraCita.endsWith('Z')) {
            primeraCitaDate = dayjs(reserva.diaPrimeraCita).utc().tz('America/Santiago');
          } else {
            primeraCitaDate = dayjs(reserva.diaPrimeraCita);
          }
        } else {
          primeraCitaDate = dayjs(reserva.diaPrimeraCita);
        }

        // Usar hora por defecto si no tiene hora específica para la primera cita
        const hora = reserva.hora || '09:00';
        const [hours, minutes] = hora.split(":").map(Number);
        primeraCitaDate = primeraCitaDate.hour(hours).minute(minutes).second(0);

        transformedEvents.push({
          id: `${reserva._id}-primera`,
          title: `📋 ${reserva.paciente.nombre} (Primera consulta)`,
          start: primeraCitaDate.toDate(),
          end: primeraCitaDate.add(interval, 'minute').toDate(),
          tipo: 'primera',
          color: '#10b981', // Verde para primera consulta
          ...reserva,
        });
      }

      // 3. Agregar todas las citas del historial (legacy + clinicalCases)
      if (historialPlano.length > 0) {
        // Orden estable por fecha (si existe)
        const historialOrdenado = [...historialPlano].sort((a, b) => {
          const aTime = a?.fecha ? new Date(a.fecha).getTime() : 0;
          const bTime = b?.fecha ? new Date(b.fecha).getTime() : 0;
          return aTime - bTime;
        });

        historialOrdenado.forEach((sesion, index) => {
          if (!sesion || !sesion.fecha) return;

          // Usar hora de la sesión si existiera, si no hora de reserva o por defecto
          const horaSesion = sesion.hora || reserva.hora || '09:00';
          const [hH, hM] = String(horaSesion).split(":").map(Number);

          let startDate;
          if (typeof sesion.fecha === 'string' && sesion.fecha.endsWith('Z') && sesion.fecha.includes('T00:00:00')) {
            // Caso especial: fecha en UTC a medianoche => construir local con la hora
            const dateOnly = sesion.fecha.slice(0, 10);
            startDate = dayjs(`${dateOnly}T${String(hH).padStart(2,'0')}:${String(hM).padStart(2,'0')}:00`);
          } else if (typeof sesion.fecha === 'string' && sesion.fecha.endsWith('Z')) {
            // Fecha UTC no medianoche => ajustar a zona y luego fijar hora
            startDate = dayjs(sesion.fecha).utc().tz('America/Santiago').hour(hH || 9).minute(hM || 0).second(0);
          } else {
            // Fecha local o Date => usar directamente y fijar hora
            startDate = dayjs(sesion.fecha).hour(hH || 9).minute(hM || 0).second(0);
          }

          transformedEvents.push({
            id: `${reserva._id}-historial-${index}`,
            title: `📝 ${reserva.paciente?.nombre || 'Paciente'} (Sesión ${index + 1})`,
            start: startDate.toDate(),
            end: startDate.add(interval, 'minute').toDate(),
            tipo: 'historial',
            color: '#8b5cf6', // Morado para sesiones del historial
            sesion,
            ...reserva,
          });
        });
      }
    });

  const feriadosResp = await getFeriados();
  setFeriados(Array.isArray(feriadosResp) ? feriadosResp : (feriadosResp?.data || []));

    // Cargar días bloqueados del profesional actual si no es asistente
    if (!esAsistente && (user?.id || user?._id)) {
      try {
        const res = await getBlockedDaysRequest(user.id || user._id);
        setBlockedDays(res?.data?.blockedDays || []);
      } catch (e) {
        setBlockedDays([]);
      }
    }

    setEvents(transformedEvents);
    } catch (e) {
      // Silenciar errores y mantener experiencia
      console.error('Error cargando reservas/calendario:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReservas();
    }
  }, [user, getReservas]);

  useEffect(() => {
    if (user && (!user.timetable || user.timetable.length === 0)) {
      setShowModal(true);
    }
  }, [user]);

  useEffect(() => {
      const initGapi = async () => {
        await gapi.load('client', initClient);
      };
      initGapi();
    }, []);

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setOpen(true);
  };

  const handleCloseDrawer = () => {
    setOpen(false);
    setTimeout(() => setSelectedEvent(null), 500); // Espera que termine la animación antes de desmontar
  };

  const handleProfileClick = () => {
    navigate('/perfil');
  };
  
  const handleLogoutClick = async () => {
    await logout();
    navigate('/login');
  };

  const handleNotificationClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setAnchorEl(null);
  };

  const handleSyncPending = async () => {
    try {
      if (esAsistente) return; // asistentes no sincronizan
      if (!reservas || reservas.length === 0) {
        showAlert('info', 'No hay reservas para sincronizar');
        return;
      }
      setSyncing(true);
      // Asegurar gapi client listo
      try {
        if (!gapi?.client?.calendar) {
          await gapi.load('client', initClient);
        }
      } catch (_) {}
      // Obtener token de forma silenciosa usando la cuenta que ya fue sincronizada en Perfil
      try {
        await ensureGoogleToken(user?.googleEmail, { silent: true });
      } catch (e) {
        showAlert('warning', 'Debes sincronizar tu cuenta desde Perfil > Horarios antes de enviar eventos.');
        return;
      }
      const intervalMinutes = interval || 60;
      const pendientes = reservas.filter(r => !r.eventId && (r.siguienteCita || r.diaPrimeraCita));
      if (pendientes.length === 0) {
        showAlert('info', 'No hay eventos pendientes de sincronizar');
        return;
      }
      let success = 0;
      let failed = 0;
      for (const r of pendientes) {
        try {
          // Determinar fecha/hora
          let fechaISO = '';
          let horaStr = r.hora || '09:00';
          if (r.siguienteCita) {
            // usar siguienteCita
            if (typeof r.siguienteCita === 'string') {
              fechaISO = r.siguienteCita.slice(0, 10);
            } else {
              fechaISO = dayjs(r.siguienteCita).format('YYYY-MM-DD');
            }
          } else if (r.diaPrimeraCita) {
            if (typeof r.diaPrimeraCita === 'string') {
              fechaISO = r.diaPrimeraCita.slice(0, 10);
            } else {
              fechaISO = dayjs(r.diaPrimeraCita).format('YYYY-MM-DD');
            }
          } else {
            continue;
          }
          // Calcular hora de término según el intervalo configurado del profesional
          const startDateLocal = dayjs(`${fechaISO}T${String(horaStr).padStart(5, '0')}:00`);
          const endDateLocal = startDateLocal.add(intervalMinutes, 'minute');
          const horaFin = endDateLocal.format('HH:mm');

          const eventResource = {
            summary: `Cita con ${r?.paciente?.nombre || 'Paciente'}`,
            description: r?.diagnostico ? `Diagnóstico: ${r.diagnostico}` : 'Cita sincronizada automáticamente',
            start: {
              dateTime: `${fechaISO}T${String(horaStr).padStart(5, '0')}:00`,
              timeZone: 'America/Santiago',
            },
            end: {
              dateTime: `${fechaISO}T${horaFin}:00`,
              timeZone: 'America/Santiago',
            },
          };

          const response = await gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource: eventResource,
          });

          const createdId = response?.result?.id || response?.id;
          if (createdId) {
            try {
              await updateReserva(r.paciente.rut, { eventId: createdId });
              success += 1;
            } catch (e) {
              failed += 1;
            }
          } else {
            failed += 1;
          }
        } catch (e) {
          // Log detallado del error de Google para depurar 400
          try {
            const gerr = e?.result?.error || e?.body || e;
            console.error('[Calendar][insert] Error:', gerr);
            const msg = e?.result?.error?.message || e?.message || 'Error desconocido al crear evento';
            // Muestra solo el primer error encontrado para no saturar
            if (failed === 0) {
              showAlert('error', `No se pudo crear un evento en Google Calendar: ${msg}`);
            }
          } catch (_) {}
          // fallo con este registro, continuar con siguientes
          failed += 1;
        }
      }
      if (success > 0) {
        showAlert('success', `Sincronización completa: ${success}/${pendientes.length} eventos creados`);
        await fetchReservas();
      } else {
        showAlert('info', 'No se crearon nuevos eventos');
      }
      if (failed > 0 && success > 0) {
        showAlert('warning', `${failed} eventos no pudieron sincronizarse`);
      }
    } finally {
      setSyncing(false);
    }
  };

  const { feriadosSet, feriadosMap } = useMemo(() => {
    const set = new Set();
    const map = new Map();
    (Array.isArray(feriados) ? feriados : []).forEach((feriado) => {
      const rawDate = feriado?.date || feriado?.fecha;
      if (!rawDate) return;
      const dateStr = dayjs(rawDate).format('YYYY-MM-DD');
      set.add(dateStr);
      const labelSource = [
        feriado?.title,
        feriado?.name,
        feriado?.localName,
        feriado?.motivo,
        feriado?.description,
        feriado?.holiday,
        feriado?.summary,
      ].find((text) => typeof text === 'string' && text.trim().length > 0);
      if (labelSource) {
        map.set(dateStr, labelSource.trim());
      }
    });
    return { feriadosSet: set, feriadosMap: map };
  }, [feriados]);

  const blockedDaysSet = useMemo(() => {
    const set = new Set();
    (blockedDays || []).forEach((date) => {
      if (!date) return;
      set.add(dayjs(date).format('YYYY-MM-DD'));
    });
    return set;
  }, [blockedDays]);

  const DateCellWrapper = ({ value, children }) => {
    const dateStr = dayjs(value).format('YYYY-MM-DD');
    let tooltip;
    if (blockedDaysSet.has(dateStr)) {
      tooltip = 'Día bloqueado por el profesional';
    } else if (feriadosSet.has(dateStr)) {
      const motivo = feriadosMap.get(dateStr);
      tooltip = motivo ? `Feriado: ${motivo}` : 'Feriado';
    }

    if (!tooltip || !React.isValidElement(children)) {
      return children;
    }

    return React.cloneElement(children, { title: tooltip });
  };

  // Esta función se usa para cambiar el estilo de los días feriados
  const dayPropGetter = (date) => {
    const dateStr = dayjs(date).format("YYYY-MM-DD");
    if (blockedDaysSet.has(dateStr)) {
      return {
        style: {
          backgroundColor: "#fdf1e3", // ambar atenuado: dia bloqueado
          color: "#8a5a1a",
          cursor: "not-allowed",
        },
        className: "blocked-day"
      };
    }
    if (feriadosSet.has(dateStr)) {
      return {
        style: {
          backgroundColor: "#fdecec", // rojo atenuado: feriado
          color: "#a33a3a",
          cursor: "not-allowed",
        },
        className: "feriado-day"
      };
    }
    return {};
  };

  // Esta función se usa para dar estilo a los eventos según su tipo
  // Paleta por tipo de cita. Se conserva el mismo color semántico que ya usaban
  // los chips del header; cambia cómo se aplica: acento + tinte en vez de relleno
  // sólido, que a 12px se leía como un bloque de color con texto encima.
  const PALETA_EVENTO = {
    pendiente: { acento: '#2596be', tinte: 'rgba(37,150,190,0.14)', texto: '#14607d' },
    primera:   { acento: '#10b981', tinte: 'rgba(16,185,129,0.14)', texto: '#0a6e4d' },
    historial: { acento: '#8b5cf6', tinte: 'rgba(139,92,246,0.14)', texto: '#5b3aa8' },
    otro:      { acento: '#6b7280', tinte: 'rgba(107,114,128,0.14)', texto: '#40464f' },
  };

  const eventStyleGetter = (event) => {
    const c = PALETA_EVENTO[event.tipo] || PALETA_EVENTO.otro;
    return {
      style: {
        backgroundColor: c.tinte,
        color: c.texto,
        border: 'none',
        borderLeft: `3px solid ${c.acento}`,
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
        padding: '3px 8px',
      },
    };
  };

  // Filtrar eventos según selección de tipos y ocultar cualquier evento en días bloqueados
  const filteredEvents = events
    .filter(ev => {
      if (ev.tipo === 'primera') return visibleTypes.primera;
      if (ev.tipo === 'pendiente') return visibleTypes.pendiente;
      if (ev.tipo === 'historial') return visibleTypes.historial;
      return true;
    })
    .filter(ev => {
      const dateStr = dayjs(ev.start).format('YYYY-MM-DD');
      return !blockedDaysSet.has(dateStr);
    });

  const toggleType = (key) => setVisibleTypes(prev => ({ ...prev, [key]: !prev[key] }));

  return (
  <PageLayout sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'visible' }}>
      <FullPageLoader open={loading} withinContainer message="Cargando tu calendario" />
      <PageHeader
        icon={<CalendarMonthIcon />}
        title="Calendario"
        subtitle="Tu agenda completa"
        actions={
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label="Pendientes"
              size="small"
              onClick={() => toggleType('pendiente')}
              sx={{
                bgcolor: visibleTypes.pendiente ? '#2596be' : 'transparent',
                color: visibleTypes.pendiente ? 'white' : '#2596be',
                fontSize: '15px',
                height: '30px',
                m: 0.5,
                border: '1px solid #2596be',
                cursor: 'pointer',
                '&:hover': { bgcolor: visibleTypes.pendiente ? '#2596be' : 'rgba(37,150,190,0.10)' }
              }}
            />
            <Chip
              label="Primera consulta"
              size="small"
              onClick={() => toggleType('primera')}
              sx={{
                bgcolor: visibleTypes.primera ? '#10b981' : 'transparent',
                color: visibleTypes.primera ? 'white' : '#10b981',
                fontSize: '15px',
                height: '30px',
                m: 0.5,
                border: '1px solid #10b981',
                cursor: 'pointer',
                '&:hover': { bgcolor: visibleTypes.primera ? '#10b981' : 'rgba(37,150,190,0.10)' }
              }}
            />
            <Chip
              label="Historial"
              size="small"
              onClick={() => toggleType('historial')}
              sx={{
                bgcolor: visibleTypes.historial ? '#8b5cf6' : 'transparent',
                color: visibleTypes.historial ? 'white' : '#8b5cf6',
                fontSize: '15px',
                height: '30px',
                m: 0.5,
                border: '1px solid #8b5cf6',
                cursor: 'pointer',
                '&:hover': { bgcolor: visibleTypes.historial ? '#8b5cf6' : 'rgba(37,150,190,0.10)' }
              }}
            />
            {!esAsistente && Boolean(user?.googleEmail) && (
              <Button
                size="small"
                variant="contained"
                onClick={handleSyncPending}
                disabled={syncing}
                startIcon={syncing ? <CircularProgress size={14} sx={{ color: '#2596be' }} /> : <SyncIcon />}
                sx={{
                  ml: 1,
                  bgcolor: 'white',
                  color: '#2596be',
                  '&:hover': { bgcolor: '#f0f9ff' }
                }}
              >
                {syncing ? 'Sincronizando…' : 'Sincronizar pendientes'}
              </Button>
            )}
          </Stack>
        }
      />
      <Card sx={(t) => ({ flex: 1, display: "flex", flexDirection: "column", p: 2, overflow: "visible", ...estiloCalendario(t) })}>
        <Calendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          culture="es"
          style={{ height: isMobile ? 'calc(100dvh - 240px)' : 'calc(100vh - 240px)', minHeight: 520, width: '100%' }}
          messages={{
            next: "Siguiente",
            previous: "Anterior",
            today: "Hoy",
            month: "Mes",
            week: "Semana",
            day: "Día"
          }}
          onSelectEvent={handleSelectEvent}
          dayPropGetter={dayPropGetter}
          eventPropGetter={eventStyleGetter}
          min={new Date(0, 0, 0, 8, 0, 0)}  // Limitar a las 8:00 AM
          max={new Date(0, 0, 0, 21, 0, 0)}
          components={{
            toolbar: CalendarToolbar,
            event: EventoCalendario,
            dateCellWrapper: DateCellWrapper,
          }}
        />
      </Card>

      <Drawer
        anchor={isMobile ? 'bottom' : 'right'}
        open={open}
        onClose={handleCloseDrawer}
      >
        <Slide
          direction={isMobile ? 'down' : 'left'}
          in={open}
          mountOnEnter
          unmountOnExit
          timeout={500}
        >
          <Box>
            <DespliegueEventos event={selectedEvent} onClose={handleCloseDrawer} fetchReservas={fetchReservas} gapi={gapi} esAsistente={esAsistente} />
          </Box>
        </Slide>
      </Drawer>

      <VentanaNotificaciones
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleNotificationClose}
        notifications={user?.notifications || []}
      />
      {!esAsistente && (
        <SinDatos open={showModal} />)
        }

      {/* Bloquear días: vive en el sidebar (AGENDA) y se abre por la ruta */}
      {!esAsistente && (
        <LiberarHoras
          open={location.pathname === '/calendario/bloquear'}
          onClose={() => navigate('/calendario')}
          fetchReservas={fetchReservas}
          gapi={gapi}
        />
      )}
    </PageLayout>
  );
}

export default CalendarioPage;