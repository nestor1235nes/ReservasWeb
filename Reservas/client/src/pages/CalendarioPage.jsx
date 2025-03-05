import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { AppBar, Toolbar, Typography, Box, Drawer, Slide, IconButton, Button, Tooltip } from '@mui/material';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import es from 'date-fns/locale/es';
import { useReserva } from '../context/reservaContext';
import { useAuth } from '../context/authContext';
import { Link, useNavigate } from "react-router-dom";
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
  const { getReservas } = useReserva();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchReservas = async () => {
    const data = await getReservas();
    setReservas(data);
    console.log(data);

    const transformedEvents = data.map(reserva => {
      if(reserva.siguienteCita){
        const startDate = dayjs(reserva.siguienteCita).tz('America/Santiago');
        const [hours, minutes] = reserva.hora.split(":").map(Number);
        const localStartDate = startDate.hour(hours).minute(minutes).second(0).toDate();
      
        return {
          title: reserva.paciente.nombre,
          start: localStartDate,
          end: dayjs(localStartDate).add(1, 'hour').toDate(),
          ...reserva,
        };
      }
      
    });

    setEvents(transformedEvents);
  };

  useEffect(() => {
    fetchReservas();
  }, []);

  useEffect(() => {
    if (user && (!user.timetable || user.timetable.length === 0)) {
      setShowModal(true);
    }
  }, [user]);

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

  return (
    <Box display="flex" flexDirection="column" height="100vh" backgroundColor="white">
      <AppBar position="static" style={{ borderEndEndRadius: '5px', borderEndStartRadius: '5px' }}>
        <Toolbar>
          <Typography variant="h6" style={{ flexGrow: 1 }}>Calendario</Typography>
          <Tooltip title="Ver mi Perfil" arrow>
            <Button color="inherit" onClick={handleProfileClick} startIcon={<AccountCircleIcon />}>
              Perfil
            </Button>
          </Tooltip>
          <Tooltip title="Cerrar sesión" arrow>
            <IconButton color="inherit" onClick={handleLogoutClick}>
              <ExitToAppIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
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
            <DespliegueEventos event={selectedEvent} onClose={handleCloseDrawer} fetchReservas={fetchReservas} />
          </Box>
        </Slide>
      </Drawer>

      <BotonFlotante onClick={handleFabClick} fetchReservas={fetchReservas} />
      <SinDatos open={showModal} />
    </Box>
  );
}