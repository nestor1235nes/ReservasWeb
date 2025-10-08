import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { AppBar, Toolbar, Typography, Box, Drawer, Slide, Stack, Chip, Paper } from '@mui/material';
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
import { initClient } from '../googleCalendarConfig';
import { useSucursal } from '../context/sucursalContext';

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
  const [reservas, setReservas] = useState([]);
  const [events, setEvents] = useState([]);
  const [visibleTypes, setVisibleTypes] = useState({ primera: true, pendiente: true, historial: true });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { getReservas, getFeriados } = useReserva();
  const { getReservasSucursal } = useSucursal();
  const { logout, user, esAsistente } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [feriados, setFeriados] = useState([]);
  const interval = user?.timetable?.[0]?.interval || 60; // valor por defecto 60 minutos

  const fetchReservas = async () => {
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

    setEvents(transformedEvents);
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

  const feriadosSet = new Set(
    feriados
      ?.filter(f => f.date) // Asegúrate que cada feriado tenga la propiedad 'date'
      .map(f => dayjs(f.date).format("YYYY-MM-DD"))
  );

  // Esta función se usa para cambiar el estilo de los días feriados
  const dayPropGetter = (date) => {
    const dateStr = dayjs(date).format("YYYY-MM-DD");
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
    <Box display="flex" flexDirection="column" height="100%" backgroundColor="white">
      <Stack p={2} borderRadius={1} sx={{ background: "linear-gradient(45deg, #2596be 30%, #21cbe6 90%)" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h5" fontWeight={700} color="white">
            Calendario
          </Typography>
          {/* Leyenda de colores con filtros */}
          <Stack direction="row" spacing={1}>
            <Chip 
              label="Pendientes" 
              size="small" 
              onClick={() => toggleType('pendiente')}
              sx={{ 
                bgcolor: '#2596be', 
                color: 'white',
                fontSize: '15px',
                height: '30px',
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
                border: `${visibleTypes.historial ? 2 : 1}px solid ${visibleTypes.historial ? '#ffffff' : 'rgba(255,255,255,0.7)'}`,
                cursor: 'pointer'
              }} 
            />
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
          style={{ height: '80vh', width: '100%' }}
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
        anchor={window.innerWidth < 600 ? 'bottom' : 'right'}
        open={open}
        onClose={handleCloseDrawer}
      >
        <Slide
          direction={window.innerWidth < 600 ? 'down' : 'left'}
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
    </Box>
  );
}

export default CalendarioPage;