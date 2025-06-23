import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { AppBar, Toolbar, Typography, Box, Drawer, Slide, Stack } from '@mui/material';
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

    const transformedEvents = data.map(reserva => {
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

        return {
          title: reserva.paciente.nombre,
          start: localStartDate,
          end: dayjs(localStartDate).add(interval, 'minute').toDate(),
          ...reserva,
        };
      }
    });

    const feriados = await getFeriados();
    setFeriados(feriados.data);

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
    console.log('Botón flotante clickeado');
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

  return (
    <Box display="flex" flexDirection="column" height="100%" backgroundColor="white">
      <Stack p={2} borderRadius={1} sx={{ background: "linear-gradient(45deg, #2596be 30%, #21cbe6 90%)" }}>
        <Typography variant="h5" fontWeight={700} color="white">
          Calendario
        </Typography>
      </Stack>
      <Box flex="1" display="flex" justifyContent="center" alignItems="center" p={2}>
        <Calendar
          localizer={localizer}
          events={events}
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