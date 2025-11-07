import React, { useEffect, useState } from "react";
import { Modal, Box, Typography, Button, Stack, Divider, Chip, Alert } from "@mui/material";
import GoogleIcon from '@mui/icons-material/Google';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DownloadIcon from '@mui/icons-material/Download';
import EventIcon from '@mui/icons-material/Event';
import { getCalendarsSync, setCalendarSync, clearCalendarSyncRequest } from "../../api/calendarsync"; // Debes crear estos métodos
import { syncWithGoogle } from '../../googleCalendarConfig';
import { getReservasParaExportacionRequest } from "../../api/reservas";
import dayjs from 'dayjs';
import { useAuth } from '../../context/authContext';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  borderRadius: 3,
  boxShadow: 24,
  p: 4,
};

const SincronizacionCalendarios = ({ open, onClose, user, onSynced }) => {
  const { updatePerfil } = useAuth();
  const [syncStatus, setSyncStatus] = useState({ google: null, ical: null });
  const [isGeneratingICS, setIsGeneratingICS] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' });
  useEffect(() => {
    if (open && user) {
      const userId = user.id || user._id;
      if (!userId) {
        setAlert({ show: true, message: 'No se pudo determinar el usuario para sincronizar.', severity: 'error' });
        return;
      }
      getCalendarsSync(userId).then(setSyncStatus).catch(err => {
        console.error('Error obteniendo estado de sincronización:', err);
        setAlert({ show: true, message: 'Error al consultar el estado de sincronización.', severity: 'error' });
      });
    }
  }, [open, user]);

  const handleGoogleSync = async () => {
    try {
      const userId = user?.id || user?._id;
      if (!userId) {
        setAlert({ show: true, message: 'No se pudo determinar el usuario para sincronizar.', severity: 'error' });
        return;
      }
      // Inicia autenticación de Google usando como sugerencia el correo de sincronización
      const loginHint = user?.googleEmail || undefined;
      const email = await syncWithGoogle(loginHint);
      if (!email) {
        setAlert({ show: true, message: 'No se pudo obtener el correo de Google. Vuelve a intentar.', severity: 'warning' });
        return;
      }
      await setCalendarSync(userId, "google", email);
      setSyncStatus(prev => ({ ...prev, google: email }));
      try {
        await updatePerfil(userId, { googleEmail: email });
      } catch (e) {
        console.warn('No se pudo actualizar googleEmail en el perfil:', e);
      }
      if (typeof onSynced === 'function') onSynced(email);
      setAlert({ show: true, message: `Cuenta sincronizada: ${email}`, severity: 'success' });
    } catch (err) {
      console.error('Error al sincronizar Google Calendar:', err);
      const msg = err?.response?.data?.message || err?.message || 'Error al sincronizar con Google Calendar';
      setAlert({ show: true, message: msg, severity: 'error' });
    }
  };

  const handleGoogleDesync = async () => {
    try {
      const userId = user?.id || user?._id;
      if (!userId) {
        setAlert({ show: true, message: 'No se pudo determinar el usuario.', severity: 'error' });
        return;
      }
      await clearCalendarSyncRequest(userId, 'google');
      setSyncStatus(prev => ({ ...prev, google: null }));
      try {
        await updatePerfil(userId, { googleEmail: '' });
      } catch(e) { /* silent */ }
      setAlert({ show: true, message: 'Cuenta de Google desincronizada.', severity: 'success' });
    } catch (err) {
      console.error('Error al desincronizar Google Calendar:', err);
      const msg = err?.response?.data?.message || err?.message || 'Error al desincronizar';
      setAlert({ show: true, message: msg, severity: 'error' });
    }
  };

  // Función para generar el contenido ICS
  const generateICSContent = (reservas) => {
    const icsHeader = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Reservas Médicas//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ].join('\r\n');

    const icsFooter = 'END:VCALENDAR';

    const events = reservas.map(reserva => {
      // Usar siguienteCita o diaPrimeraCita según disponibilidad
      const fechaCita = reserva.siguienteCita || reserva.diaPrimeraCita;
      const fechaInicio = dayjs(fechaCita).format('YYYY-MM-DD');
      const horaInicio = reserva.hora || '09:00';
      const [hora, minuto] = horaInicio.split(':');
      const startDateTime = dayjs(`${fechaInicio}T${horaInicio}:00`);
      const endDateTime = startDateTime.add(1, 'hour'); // Duración de 1 hora por defecto

      return [
        'BEGIN:VEVENT',
        `DTSTART:${startDateTime.format('YYYYMMDD[T]HHmmss')}`,
        `DTEND:${endDateTime.format('YYYYMMDD[T]HHmmss')}`,
        `SUMMARY:Cita con ${reserva.paciente?.nombre || 'Paciente'}`,
        `DESCRIPTION:Tipo: ${reserva.modalidad || 'Consulta'}\\nDiagnóstico: ${reserva.diagnostico || 'Sin diagnóstico'}`,
        `LOCATION:${reserva.modalidad === 'Presencial' ? 'Consulta médica' : 'Telemedicina'}`,
        `UID:${reserva._id}@reservasmedicas.com`,
        `CREATED:${dayjs().format('YYYYMMDD[T]HHmmss[Z]')}`,
        `LAST-MODIFIED:${dayjs().format('YYYYMMDD[T]HHmmss[Z]')}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      ].join('\r\n');
    }).join('\r\n');

    return [icsHeader, events, icsFooter].join('\r\n');
  };

  // Función para descargar las reservas como archivo ICS
  const handleDownloadICS = async () => {
    try {
      setIsGeneratingICS(true);
      
      // Obtener las reservas del profesional desde el backend (ya filtradas)
      const response = await getReservasParaExportacionRequest();
      const reservasProfesional = response.data;

      if (reservasProfesional.length === 0) {
        setAlert({
          show: true,
          message: 'No tienes citas programadas para exportar.',
          severity: 'info'
        });
        return;
      }

      // Generar contenido ICS
      const icsContent = generateICSContent(reservasProfesional);
      
      // Crear y descargar el archivo
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mis-citas-${dayjs().format('YYYY-MM-DD')}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setAlert({
        show: true,
        message: `Archivo ICS descargado exitosamente con ${reservasProfesional.length} cita(s).`,
        severity: 'success'
      });

    } catch (error) {
      console.error('Error al generar archivo ICS:', error);
      setAlert({
        show: true,
        message: 'Error al generar el archivo ICS. Intenta nuevamente.',
        severity: 'error'
      });
    } finally {
      setIsGeneratingICS(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        ...style,
        width: 500, // Aumentar el ancho para acomodar más contenido
      }}>
        <Typography variant="h6" mb={2}>Sincronización de Calendarios Externos</Typography>
        <Divider sx={{ mb: 2 }} />

        {/* Alert para mostrar mensajes */}
        {alert.show && (
          <Alert 
            severity={alert.severity} 
            sx={{ mb: 2 }}
            onClose={() => setAlert({ ...alert, show: false })}
          >
            {alert.message}
          </Alert>
        )}

        <Stack spacing={2}>
          {/* Botón para sincronizar con Google Calendar */}
          {syncStatus.google ? (
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={<GoogleIcon />}
                disabled
                sx={{
                  background: 'linear-gradient(45deg, #4285f4 30%, #34a853 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #3367d6 30%, #2d8e47 90%)',
                  }
                }}
              >
                {syncStatus.google}
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleGoogleDesync}
              >
                Desincronizar
              </Button>
            </Stack>
          ) : (
            <Button
              variant="contained"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSync}
              sx={{
                background: 'linear-gradient(45deg, #4285f4 30%, #34a853 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #3367d6 30%, #2d8e47 90%)',
                }
              }}
            >
              Sincronizar con Google Calendar
            </Button>
          )}

          {/* Botón para descargar archivo ICS */}
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadICS}
            disabled={isGeneratingICS}
            sx={{
              background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1e7a9b 30%, #1ba6c6 90%)',
              },
              color: 'white'
            }}
          >
            {isGeneratingICS ? 'Generando archivo...' : 'Descargar mis citas (.ics)'}
          </Button>
        </Stack>

        <Divider sx={{ my: 3 }} />
        
        {/* Información sobre el archivo ICS */}
        <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2, mb: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" mb={1} display="flex" alignItems="center">
            <EventIcon sx={{ mr: 1, color: '#2596be' }} />
            Sobre el archivo ICS
          </Typography>
          <Typography variant="body2" color="text.secondary">
            El archivo .ics incluye todas tus citas programadas y puede ser importado en:
          </Typography>
          <Typography variant="body2" color="text.secondary" component="ul" sx={{ mt: 1, pl: 2 }}>
            <li>Google Calendar</li>
            <li>Microsoft Outlook</li>
            <li>Thunderbird</li>
            <li>Celulares Andriod/Apple</li>
            <li>Cualquier aplicación compatible con iCalendar</li>
          </Typography>
        </Box>

        <Typography variant="subtitle2" mb={1}>Estado de sincronización:</Typography>
        <Stack direction="column" spacing={1}>
          <Chip
            icon={<GoogleIcon />}
            label={syncStatus.google ? `Google: ${syncStatus.google}` : "No sincronizado"}
            color={syncStatus.google ? "success" : "default"}
          />
          <Chip
            icon={<CalendarMonthIcon />}
            label="Archivo ICS disponible para descarga"
            color="info"
            variant="outlined"
          />
        </Stack>
      </Box>
    </Modal>
  );
};

export default SincronizacionCalendarios;