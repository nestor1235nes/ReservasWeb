import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { AppBar, Toolbar, Typography, Box, Drawer, Slide, Stack, Chip, Paper, useMediaQuery, Button, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import es from 'date-fns/locale/es';
import { useReserva } from '../context/reservaContext';
import { useAuth } from '../context/authContext';
import { useNavigate } from "react-router-dom";
import DespliegueEventos from '../components/PanelDespliegue/DespliegueEventos';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/es';
import BotonFlotante from '../components/PanelDespliegue/BotonFlotante';
import SinDatos from '../components/Modales/SinDatos';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import VentanaNotificaciones from '../components/VentanaNotificaciones';
import { gapi } from 'gapi-script';
import { getBlockedDaysRequest } from '../api/funcion';
import { initClient, syncWithGoogle } from '../googleCalendarConfig';
import { useSucursal } from '../context/sucursalContext';
import FullPageLoader from '../components/ui/FullPageLoader';
import { useAlert } from '../context/AlertContext';
import SyncIcon from '@mui/icons-material/Sync';

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

export function CalendarioPage() {
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
      // 1. Agregar cita pendiente (siguienteCita) si existe
      if (reserva.siguienteCita) {
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

        // Determinar si coincide con el primer día de consulta (no duplicar)
        let isFirstConsultSameDay = false;
        if (reserva.diaPrimeraCita) {
          const d1 = dayjs(localStartDate).format('YYYY-MM-DD');
          const d2 = dayjs(reserva.diaPrimeraCita).format('YYYY-MM-DD');
          isFirstConsultSameDay = d1 === d2;
        }

        if (!isFirstConsultSameDay) {
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

      // 2. Agregar primera cita si existe diaPrimeraCita
      if (reserva.diaPrimeraCita) {
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

      // 3. Agregar todas las citas del historial (aplanando si es array de arrays)
      if (reserva.historial && reserva.historial.length > 0) {
        const sesiones = Array.isArray(reserva.historial[0])
          ? reserva.historial.flat()
          : reserva.historial;

        sesiones.forEach((sesion, index) => {
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
        await gapi.load('client:auth2', initClient);
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

  const handleFabClick = () => {
    // Acción al hacer clic en el botón flotante
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
      // Alinear cuenta preferida si existe
      if (user?.googleEmail) {
        try { await syncWithGoogle(user.googleEmail); } catch (e) { /* ignore */ }
      }
      if (!gapi?.auth2?.getAuthInstance?.() || !gapi.auth2.getAuthInstance().isSignedIn.get()) {
        showAlert('warning', 'Inicia sesión con Google Calendar para sincronizar');
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
          const [h, m] = String(horaStr).split(':');
          const horaFin = `${String(parseInt(h || '9', 10) + 1).padStart(2, '0')}:${m || '00'}`;

          const eventResource = {
            summary: `Cita con ${r?.paciente?.nombre || 'Paciente'}`,
            description: r?.diagnostico ? `Diagnóstico: ${r.diagnostico}` : 'Cita sincronizada automáticamente',
            start: {
              dateTime: `${fechaISO}T${horaStr}:00`,
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

  const feriadosSet = new Set(
    feriados
      ?.filter(f => f.date) // Asegúrate que cada feriado tenga la propiedad 'date'
      .map(f => dayjs(f.date).format("YYYY-MM-DD"))
  );

  const blockedDaysSet = new Set((blockedDays || []).map(d => dayjs(d).format("YYYY-MM-DD")));

  // Esta función se usa para cambiar el estilo de los días feriados
  const dayPropGetter = (date) => {
    const dateStr = dayjs(date).format("YYYY-MM-DD");
    if (blockedDaysSet.has(dateStr)) {
      return {
        style: {
          backgroundColor: "#ffe0b2", // naranja suave para distinguir de feriados
          color: "#e65100",
          cursor: "not-allowed",
        },
        className: "blocked-day"
      };
    }
    if (feriadosSet.has(dateStr)) {
      return {
        style: {
          backgroundColor: "#fbb4b5",
          color: "#b71c1c",
          cursor: "not-allowed",
        },
        className: "feriado-day"
      };
    }
    return {};
  };

  // Esta función se usa para dar estilo a los eventos según su tipo
  const eventStyleGetter = (event) => {
    let backgroundColor = '#2596be'; // Color por defecto
    let borderColor = '#2596be';
    let color = 'white';

    switch (event.tipo) {
      case 'pendiente':
        backgroundColor = '#2596be'; // Azul para citas pendientes
        borderColor = '#1e7a9b';
        break;
      case 'primera':
        backgroundColor = '#10b981'; // Verde para primera consulta
        borderColor = '#059669';
        break;
      case 'historial':
        backgroundColor = '#8b5cf6'; // Morado para sesiones del historial
        borderColor = '#7c3aed';
        break;
      default:
        backgroundColor = '#6b7280'; // Gris para otros casos
        borderColor = '#4b5563';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color,
        border: `2px solid ${borderColor}`,
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        padding: '2px 6px',
        opacity: event.tipo === 'historial' ? 0.8 : 1,
      }
    };
  };

  // Filtrar eventos según selección de tipos
  const filteredEvents = events.filter(ev => {
    if (ev.tipo === 'primera') return visibleTypes.primera;
    if (ev.tipo === 'pendiente') return visibleTypes.pendiente;
    if (ev.tipo === 'historial') return visibleTypes.historial;
    return true;
  });

  const toggleType = (key) => setVisibleTypes(prev => ({ ...prev, [key]: !prev[key] }));

  return (
  <Box display="flex" flexDirection="column" height="100%" backgroundColor="white" sx={{ position: 'relative', overflow: 'visible' }}>
    <FullPageLoader open={loading} withinContainer message="Cargando tu calendario" />
      <Stack p={2} borderRadius={1} sx={{ background: "linear-gradient(45deg, #2596be 30%, #21cbe6 90%)" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={1}>
          <Typography variant="h5" fontWeight={700} color="white">
            Calendario
          </Typography>
          {/* Leyenda de colores con filtros */}
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip 
              label="Pendientes" 
              size="small" 
              onClick={() => toggleType('pendiente')}
              sx={{ 
                bgcolor: '#2596be', 
                color: 'white',
                fontSize: '15px',
                height: '30px',
                m: 0.5,
                border: `${visibleTypes.pendiente ? 2 : 1}px solid ${visibleTypes.pendiente ? '#ffffff' : 'rgba(255,255,255,0.7)'}`,
                cursor: 'pointer'
              }} 
            />
            <Chip 
              label="Primera consulta" 
              size="small" 
              onClick={() => toggleType('primera')}
              sx={{ 
                bgcolor: '#10b981', 
                color: 'white',
                fontSize: '15px',
                height: '30px',
                m: 0.5,
                border: `${visibleTypes.primera ? 2 : 1}px solid ${visibleTypes.primera ? '#ffffff' : 'rgba(255,255,255,0.7)'}`,
                cursor: 'pointer'
              }} 
            />
            <Chip 
              label="Historial" 
              size="small" 
              onClick={() => toggleType('historial')}
              sx={{ 
                bgcolor: '#8b5cf6', 
                color: 'white',
                fontSize: '15px',
                height: '30px',
                m: 0.5,
                border: `${visibleTypes.historial ? 2 : 1}px solid ${visibleTypes.historial ? '#ffffff' : 'rgba(255,255,255,0.7)'}`,
                cursor: 'pointer'
              }} 
            />
            {!esAsistente && (
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
        </Box>
      </Stack>
      <Box flex="1" display="flex" justifyContent="center" alignItems="center" p={2}>
        <Calendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          culture="es"
          style={{ height: isMobile ? 'calc(100dvh - 220px)' : 'calc(100vh - 220px)', width: '100%' }}
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
        />
      </Box>

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

      {/* Botón flotante para liberar horas / agregar paciente / etc. */}
      {!esAsistente && (
        <BotonFlotante onClick={handleFabClick} fetchReservas={fetchReservas} gapi={gapi} />
      )}
    </Box>
  );
}

export default CalendarioPage;