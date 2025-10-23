import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, IconButton, Slide, Button, TextField, Card, CardContent, CardHeader,
  FormControl, InputLabel, Select, MenuItem, Divider, Chip, Stack, Tooltip, Avatar,
  Grid, Paper, Badge, Modal, Fab, Fade, Skeleton
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { usePaciente } from '../../context/pacienteContext';
import { useAuth } from '../../context/authContext';
import { useReserva } from '../../context/reservaContext';
import { useSucursal } from '../../context/sucursalContext';
import { syncWithGoogle } from '../../googleCalendarConfig';
import { useAlert } from '../../context/AlertContext';
import AgregarPaciente from '../Modales/AgregarPaciente';
import AgregarSesion from './AgregarSesion';
import VerHistorial from './VerHistorial';
import sendWhatsAppMessage, { PLACEHOLDERS } from '../../sendWhatsAppMessage';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ImageIcon from '@mui/icons-material/Image';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import PaymentIcon from '@mui/icons-material/Payment';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/es';
import ReactQuill from 'react-quill';
import '../ui/AgregarSesionCSS.css';
import MostrarImagenes from '../MostrarImagenes';
import { ASSETS_BASE } from '../../config';
import localeData from 'dayjs/plugin/localeData';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useDropzone } from 'react-dropzone';
import axios from '../../api/axios';
import PaymentButton from '../../pages/PaymentButton';
import { getPaymentStatusRequest } from '../../api/payment';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';


dayjs.extend(localeData);
dayjs.locale('es');

function getInitialDate(event) {
  // Preferir fecha desde start si existe
  if (event?.start) return dayjs(event.start).format('YYYY-MM-DD');
  // Luego intentar con siguienteCita en la reserva
  const fecha = event?.siguienteCita || event?.paciente?.siguienteCita;
  if (fecha) {
    if (typeof fecha === 'string' && fecha.endsWith('Z') && fecha.includes('T00:00:00')) {
      // Evitar desfase: usar solo la parte de fecha (local)
      return fecha.slice(0, 10);
    }
    return dayjs(fecha).format('YYYY-MM-DD');
  }
  // Como último recurso, usar diaPrimeraCita si existe
  if (event?.diaPrimeraCita) {
    const f = event.diaPrimeraCita;
    if (typeof f === 'string' && f.endsWith('Z') && f.includes('T00:00:00')) {
      return f.slice(0, 10);
    }
    return dayjs(f).format('YYYY-MM-DD');
  }
  // Fallback específico: si no hay fecha pero sí hay hora (caso TodayPage), usar hoy
  if (event?.hora) {
    return dayjs().format('YYYY-MM-DD');
  }
  return '';
}
function getInitialHour(event) {
  if (event?.hora) return event.hora;
  if (event?.start instanceof Date) return dayjs(event.start).format('HH:mm');
  if (event?.paciente?.hora) return event.paciente.hora;
  return '';
}

const DespliegueEventos = ({ event, onClose, fetchReservas, gapi, esAsistente }) => {
  const { updatePaciente } = usePaciente();
  const { updateReserva, getFeriados } = useReserva();
  const { getProfesionalesSucursal } = useSucursal();
  const showAlert = useAlert();
  const { user, obtenerHorasDisponibles } = useAuth();
  const [paymentStatus, setPaymentStatus] = useState('not_initiated');


  // Estados existentes
  const [editSection, setEditSection] = useState(null);
  const [editableFields, setEditableFields] = useState({
    email: event?.paciente?.email || '',
    telefono: event?.paciente?.telefono || '',
    fecha: getInitialDate(event),
    hora: getInitialHour(event),
    profesional: event?.profesional || ''
  });

  const [openModal, setOpenModal] = useState(false);
  const [openSesionModal, setOpenSesionModal] = useState(false);
  const [openHistorialModal, setOpenHistorialModal] = useState(false);
  const [diasDeTrabajo, setDiasDeTrabajo] = useState([]);
  const [horasDisponibles, setHorasDisponibles] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [mensajePaciente, setMensajePaciente] = useState('');
  const [feriados, setFeriados] = useState([]);
  
  // Estados para profesionales de la sucursal (para asistentes)
  const [profesionalesSucursal, setProfesionalesSucursal] = useState([]);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState(null);
  
  const profesionalActual = esAsistente ? (profesionalSeleccionado || event?.profesional) : user;

  // Nuevos estados para imágenes
  const [imagenes, setImagenes] = useState(event?.imagenes || []);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [openImageModal, setOpenImageModal] = useState(false);
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showPlaceholdersHelp, setShowPlaceholdersHelp] = useState(false);

  // Configuración del dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: true,
    onDrop: (acceptedFiles) => {
      setUploadFiles(acceptedFiles);
    }
  });

  useEffect(() => {
    const loadPaymentStatus = async () => {
      if (event._id) {
        try {
          const response = await getPaymentStatusRequest(event._id);
          setPaymentStatus(response.data.paymentStatus);
        } catch (error) {
          console.error('Error cargando estado de pago:', error);
        }
      }
    };

    loadPaymentStatus();
  }, [event._id]);

  // Cargar profesionales de la sucursal si es asistente
  useEffect(() => {
    const fetchProfesionalesSucursal = async () => {
      if (esAsistente && user?.sucursal?._id) {
        try {
          const profesionales = await getProfesionalesSucursal(user.sucursal._id);
          if (profesionales && profesionales.length > 0) {
            setProfesionalesSucursal(profesionales);
            // Establecer el profesional actual como seleccionado por defecto
            if (event?.profesional) {
              const profesionalActual = profesionales.find(p => p._id === event.profesional._id);
              if (profesionalActual) {
                setProfesionalSeleccionado(profesionalActual);
              }
            }
          }
        } catch (error) {
          console.error('Error al cargar profesionales de la sucursal:', error);
        }
      }
    };
    fetchProfesionalesSucursal();
  }, [esAsistente, user?.sucursal?._id, event?.profesional, getProfesionalesSucursal]);

  // Recargar profesionales cuando se abre el modo de edición de cita
  useEffect(() => {
    if (editSection === 'cita' && esAsistente && user?.sucursal?._id) {
      const fetchProfesionalesSucursal = async () => {
        try {
          const profesionales = await getProfesionalesSucursal(user.sucursal._id);
          if (profesionales && profesionales.length > 0) {
            setProfesionalesSucursal(profesionales);
            // Establecer el profesional actual como seleccionado por defecto
            if (event?.profesional) {
              const profesionalActual = profesionales.find(p => p._id === event.profesional._id);
              if (profesionalActual) {
                setProfesionalSeleccionado(profesionalActual);
              }
            }
          }
        } catch (error) {
          console.error('Error al recargar profesionales:', error);
        }
      };
      fetchProfesionalesSucursal();
    }
  }, [editSection, esAsistente, user?.sucursal?._id, event?.profesional, getProfesionalesSucursal]);

  useEffect(() => {
    if (profesionalActual && profesionalActual.timetable) {
      // Unifica todos los días de todos los bloques de horario
      const dias = Array.from(
        new Set(
          profesionalActual.timetable.flatMap(bloque => bloque.days)
        )
      );
      setDiasDeTrabajo(dias);
    }
  }, [profesionalActual]);

  useEffect(() => {
    const fetchHorasDisponibles = async () => {
      if (profesionalActual && editableFields.fecha) {
        const response = await obtenerHorasDisponibles(profesionalActual.id || profesionalActual._id, editableFields.fecha);
        const horas = response.times || [];
        setHorasDisponibles(horas);
      }
  const feriados = await getFeriados();
  setFeriados(Array.isArray(feriados) ? feriados : (feriados?.data || []));
    };
    fetchHorasDisponibles();
  }, [profesionalActual, editableFields.fecha, obtenerHorasDisponibles]);

  useEffect(() => {
    // Si cambia el evento (por ejemplo, desde PatientsPage), actualiza los campos editables
    setEditableFields({
      email: event?.paciente?.email || '',
      telefono: event?.paciente?.telefono || '',
      fecha: getInitialDate(event),
      hora: getInitialHour(event),
      profesional: event?.profesional || ''
    });
    setImagenes(event?.imagenes || []);
  }, [event]);

  // Funciones para manejar imágenes
  const handlePrevImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? imagenes.length - 1 : prevIndex - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === imagenes.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handleImageClick = (index) => {
    setCurrentImageIndex(index);
    setOpenImageModal(true);
  };

  const handleUploadImages = async () => {
    if (uploadFiles.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      
      // Agregar el RUT del paciente ANTES de agregar los archivos
      formData.append('rut', event.paciente.rut);
      // Debug: RUT enviado
      
      // Agregar los archivos
      uploadFiles.forEach((file, index) => {
        formData.append('files', file);
        // Debug: Archivo preparado
      });

      // Debug: FormData preparado para envío

      const response = await axios.post('/imagenesPacientes', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Debug: Respuesta del servidor recibida

      if (response.data.urls) {
        const newImagenes = [...imagenes, ...response.data.urls];
        setImagenes(newImagenes);
        
        // Actualizar la reserva con las nuevas imágenes
        await updateReserva(event.paciente.rut, {
          imagenes: newImagenes
        });

        showAlert('success', 'Imágenes subidas correctamente');
        setUploadFiles([]);
        setOpenUploadModal(false);
        fetchReservas();
      }
    } catch (error) {
      console.error('Error al subir imágenes:', error);
      console.error('Detalles del error:', error.response?.data);
      showAlert('error', 'Error al subir las imágenes: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditClick = (section) => setEditSection(section);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setEditableFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfesionalChange = (e) => {
    const profesionalId = e.target.value;
    const profesional = profesionalesSucursal.find(p => p._id === profesionalId);
    if (profesional) {
      setProfesionalSeleccionado(profesional);
      // Limpiar la hora seleccionada cuando cambie el profesional
      setEditableFields((prev) => ({ ...prev, hora: '' }));
    }
  };

  const handleSaveClick = () => {
    if (editSection === 'cita' && (user.idInstance || esAsistente)) {
      setOpenDialog(true);
    } else {
      handleDialogClose(true);
    }
  };

  const handleDialogClose = async (confirm) => {
    if (confirm) {
      try {
        if (editSection === 'paciente') {
          await updatePaciente(event.paciente._id, {
            email: editableFields.email,
            telefono: editableFields.telefono,
          });
          event.paciente.email = editableFields.email;
          event.paciente.telefono = editableFields.telefono;
        } else if (editSection === 'cita') {
          // Determinar qué profesional usar
          const profesionalParaGuardar = esAsistente 
            ? (profesionalSeleccionado?._id || profesionalSeleccionado?.id || event.profesional?._id || event.profesional?.id)
            : (profesionalActual._id || profesionalActual.id);
          
          await updateReserva(event.paciente.rut, {
            siguienteCita: new Date(editableFields.fecha),
            hora: editableFields.hora,
            profesional: profesionalParaGuardar,
            mensaje: mensajePaciente,
          });
          event.diaPrimeraCita = new Date(editableFields.fecha);
          event.hora = editableFields.hora;
          // Asegurar que el objeto usado para construir el WhatsApp tenga la fecha actualizada
          event.siguienteCita = editableFields.fecha;
          
          // Actualizar el profesional en el evento
          if (esAsistente && profesionalSeleccionado) {
            event.profesional = profesionalSeleccionado;
          } else if (!esAsistente) {
            event.profesional = profesionalActual;
          }

          if (mensajePaciente) {
            sendWhatsAppMessage([event], mensajePaciente, user);
          }

          // Verificar si la reserva tiene eventId y actualizar Google Calendar
          if (event.eventId && gapi?.auth2?.getAuthInstance?.()) {
            try {
              if (user?.googleEmail) {
                try { await syncWithGoogle(user.googleEmail); } catch (e) { /* ignore */ }
              }
              if (!gapi.auth2.getAuthInstance().isSignedIn.get()) throw new Error('No Google auth');
              // Actualizando evento en Google Calendar
              
              const [hora, minuto] = editableFields.hora.split(':');
              const horaFin = `${String(parseInt(hora) + 1).padStart(2, '0')}:${minuto}`;
              
              const eventToUpdate = {
                start: {
                  dateTime: `${editableFields.fecha}T${editableFields.hora}:00`,
                  timeZone: 'America/Santiago',
                },
                end: {
                  dateTime: `${editableFields.fecha}T${horaFin}:00`,
                  timeZone: 'America/Santiago',
                },
                summary: `Cita con ${event.paciente.nombre}`,
                description: event.diagnostico || 'Consulta médica',
              };

              const response = await gapi.client.calendar.events.update({
                calendarId: 'primary',
                eventId: event.eventId,
                resource: eventToUpdate,
              });

              if (response.error) {
                console.error('Error updating Google Calendar event:', response.error);
                showAlert('warning', 'Cita actualizada localmente, pero hubo un error al sincronizar con Google Calendar');
              } else {
                // Google Calendar event updated successfully
                showAlert('success', 'Cita actualizada correctamente y sincronizada con Google Calendar');
              }
            } catch (error) {
              console.error('Error al actualizar evento en Google Calendar:', error);
              showAlert('warning', 'Cita actualizada localmente, pero hubo un error al sincronizar con Google Calendar');
            }
          } else if (!event.eventId) {
            // La reserva no tiene eventId, no se actualizará Google Calendar
            showAlert('success', 'Cita actualizada correctamente');
          } else {
            // Usuario no autenticado con Google Calendar
            showAlert('success', 'Cita actualizada correctamente');
          }
        }
        setEditSection(null);
        fetchReservas();
        // Solo mostrar alert de éxito general si no se mostró uno específico para Google Calendar
        if (editSection === 'paciente') {
          showAlert('success', 'Cambios guardados correctamente');
        }
      } catch (error) {
        console.error(error);
        showAlert('error', 'Error al guardar los cambios');
      }
    }
    setOpenDialog(false);
  };

  const handleCancelClick = () => {
    setEditableFields({
      email: event.paciente.email,
      telefono: event.paciente.telefono,
      fecha: getInitialDate(event),
      hora: getInitialHour(event),
      profesional: event.profesional
    });
    setEditSection(null);
  };

  // Traducción de días en inglés a español para comparación
  const diasSemana = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
  ];

  // Modal handlers
  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);
  const handleOpenSesionModal = () => setOpenSesionModal(true);
  const handleCloseSesionModal = () => setOpenSesionModal(false);
  const handleOpenHistorialModal = () => setOpenHistorialModal(true);
  const handleCloseHistorialModal = () => setOpenHistorialModal(false);

  // Inserta placeholder en mensajePaciente
  const handleInsertPlaceholder = (token) => {
    setMensajePaciente(prev => (prev || '') + (prev?.endsWith(' ') || prev === '' ? '' : ' ') + token + ' ');
  };

  const scrollRef = useRef(null);
  const touchStartYRef = useRef(null);
  const draggingRef = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAnimatingBack, setIsAnimatingBack] = useState(false);

  const handleTouchStart = (e) => {
    if (window.innerWidth >= 600) return;
    if (!scrollRef.current) return;
    if (scrollRef.current.scrollTop <= 0) {
      touchStartYRef.current = e.touches[0].clientY;
      draggingRef.current = true;
      setIsAnimatingBack(false);
    }
  };

  const handleTouchMove = (e) => {
    if (!draggingRef.current || touchStartYRef.current == null) return;
    const delta = e.touches[0].clientY - touchStartYRef.current;
    if (delta > 0) {
      // mover hoja mientras se arrastra (limitamos para no separarla demasiado)
      const limited = Math.min(delta, 200);
      setDragOffset(limited);
      // Si el arrastre supera un umbral, cerrar
      if (limited > 140) {
        draggingRef.current = false;
        onClose && onClose();
      }
    }
  };

  const handleTouchEnd = () => {
    draggingRef.current = false;
    touchStartYRef.current = null;
    // si no se cerró, animar retorno
    if (dragOffset > 0) {
      setIsAnimatingBack(true);
      setDragOffset(0);
      setTimeout(() => setIsAnimatingBack(false), 200);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <Slide direction={window.innerWidth < 600 ? 'up' : 'right'} in={Boolean(event)} mountOnEnter unmountOnExit timeout={500}>
        <Box
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          width={window.innerWidth < 600 ? '100%' : 520}
          sx={{
            background: '#e9f3f4',
            borderRadius: { xs: '16px 16px 0 0', md: 3 },
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            position: { xs: 'fixed', md: 'relative' },
            left: { xs: 0, md: 'auto' },
            right: { xs: 0, md: 'auto' },
            bottom: { xs: 0, md: 'auto' },
            top: { xs: '8vh', md: 'auto' },
            margin: { xs: 0, md: 0 },
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: { xs: '92vh', md: '100%' },
            transform: { xs: `translateY(${dragOffset}px)`, md: 'none' },
            transition: { xs: isAnimatingBack ? 'transform 0.2s ease' : 'none', md: 'none' }
          }}
        >
          {/* Drag handle (mobile) */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', pt: 1 }}>
            <Box sx={{ width: 44, height: 5, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 3 }} />
          </Box>
          {/* Contenido scrolleable */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 3,
              pb: { xs: '96px', md: 1 }, // espacio para el footer sticky en mobile
            }}
            ref={scrollRef}
          >
          {/* Encabezado moderno */}
          <Paper
            elevation={0}
            sx={{
              background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)',
              color: 'white',
              borderRadius: 2,
              p: 2.5,
              mb: 3,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                transform: 'translate(30px, -30px)'
              }
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar 
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    width: 48, 
                    height: 48,
                    border: '2px solid rgba(255,255,255,0.3)'
                  }}
                >
                  <CalendarTodayIcon sx={{ fontSize: 24 }} />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                    Detalles de la Cita
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {event.paciente?.nombre}
                  </Typography>
                </Box>
              </Box>
              <Tooltip title="Cerrar">
                <IconButton 
                  onClick={onClose} 
                  sx={{ 
                    color: 'white', 
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Paper>

          {/* Carrusel de imágenes mejorado */}
          <Card 
            sx={{ 
              mb: 3, 
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: '#2596be', width: 40, height: 40 }}>
                  <ImageIcon />
                </Avatar>
              }
              title={
                <Typography variant="h6" fontWeight={600} color="text.primary">
                  Imágenes del Paciente
                </Typography>
              }
              action={
                <Stack direction="row" spacing={1}>
                  <Chip 
                    label={`${imagenes.length} imagen${imagenes.length !== 1 ? 'es' : ''}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  {!esAsistente && (
                    <Tooltip title="Agregar imágenes">
                      <IconButton 
                        onClick={() => setOpenUploadModal(true)}
                        sx={{ 
                          bgcolor: '#f0f9ff',
                          color: '#2596be',
                          '&:hover': { bgcolor: '#e0f2fe' }
                        }}
                      >
                        <AddPhotoAlternateIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              }
              sx={{ pb: 1 }}
            />
            <CardContent sx={{ pt: 0 }}>
              {imagenes.length > 0 ? (
                <Box>
                  {/* Imagen principal */}
                  <Box 
                    sx={{ 
                      position: 'relative',
                      borderRadius: 2,
                      overflow: 'hidden',
                      bgcolor: '#f8fafc',
                      mb: 2
                    }}
                  >
                    <Box
                      component="img"
                      src={`${ASSETS_BASE}${imagenes[currentImageIndex]}`}
                      alt={`Imagen ${currentImageIndex + 1}`}
                      className="image-carousel-fade"
                      sx={{
                        width: '100%',
                        height: 250,
                        objectFit: 'cover',
                        cursor: 'pointer',
                        transition: 'transform 0.3s ease',
                        '&:hover': { transform: 'scale(1.02)' }
                      }}
                      onClick={() => handleImageClick(currentImageIndex)}
                    />
                    
                    {/* Controles de navegación */}
                    {imagenes.length > 1 && (
                      <>
                        <IconButton
                          onClick={handlePrevImage}
                          sx={{
                            position: 'absolute',
                            left: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            bgcolor: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                          }}
                        >
                          <ArrowBackIosIcon />
                        </IconButton>
                        <IconButton
                          onClick={handleNextImage}
                          sx={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            bgcolor: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                          }}
                        >
                          <ArrowForwardIosIcon />
                        </IconButton>
                      </>
                    )}
                    
                    {/* Indicador de zoom */}
                    <Chip
                      icon={<ZoomInIcon />}
                      label="Click para ampliar"
                      size="small"
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        bgcolor: 'rgba(0,0,0,0.7)',
                        color: 'white'
                      }}
                    />
                  </Box>

                  {/* Miniaturas */}
                  {imagenes.length > 1 && (
                    <Grid container spacing={1}>
                      {imagenes.map((imagen, index) => (
                        <Grid item xs={3} key={index}>
                          <Box
                            component="img"
                            src={`${ASSETS_BASE}${imagen}`}
                            alt={`Miniatura ${index + 1}`}
                            className={`thumbnail-image ${index === currentImageIndex ? 'active' : ''}`}
                            sx={{
                              width: '100%',
                              height: 60,
                              objectFit: 'cover',
                              borderRadius: 1,
                              cursor: 'pointer',
                              border: index === currentImageIndex ? '3px solid #2596be' : '2px solid transparent',
                              transition: 'all 0.3s ease',
                              '&:hover': { 
                                transform: 'scale(1.05)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                              }
                            }}
                            onClick={() => setCurrentImageIndex(index)}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              ) : (
                <Box 
                  sx={{ 
                    textAlign: 'center', 
                    py: 4,
                    bgcolor: '#f8fafc',
                    borderRadius: 2,
                    border: '2px dashed #cbd5e1'
                  }}
                >
                  <ImageIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    No hay imágenes disponibles
                  </Typography>
                  {!esAsistente && (
                    <Button
                      variant="contained"
                      startIcon={<AddPhotoAlternateIcon />}
                      onClick={() => setOpenUploadModal(true)}
                      sx={{ 
                        bgcolor: '#2596be',
                        '&:hover': { bgcolor: '#1e7a9b' }
                      }}
                    >
                      Agregar Imágenes
                    </Button>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Modal mensaje paciente mejorado */}
          <Dialog 
            open={openDialog} 
            onClose={() => handleDialogClose(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3,
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
              }
            }}
          >
            <DialogTitle sx={{ 
              background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <PhotoCameraIcon />
              {esAsistente ? 'Notificar Reagendamiento' : 'Mensaje para el Paciente'}
            </DialogTitle>
            <DialogContent sx={{ p: 3 }}>
              <TextField
                label="Escribe un mensaje personalizado"
                multiline
                rows={4}
                fullWidth
                margin="normal"
                name="mensajePaciente"
                value={mensajePaciente}
                onChange={(e) => setMensajePaciente(e.target.value)}
                placeholder={esAsistente 
                  ? "Ej: Hola, hemos reagendado tu cita para el..." 
                  : "Ej: Hola, tu cita ha sido reagendada para el..."
                }
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
              {user?.idInstance && (
                <Box mb={1} display="flex" flexWrap="wrap" gap={0.5} alignItems="center">
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
            </DialogContent>
            <DialogActions sx={{ p: 3, gap: 1 }}>
              <Button 
                onClick={() => handleDialogClose(false)} 
                variant="outlined"
                sx={{ borderRadius: 2 }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => handleDialogClose(true)} 
                variant="contained"
                sx={{
                  background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)',
                  borderRadius: 2,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1e7a9b 0%, #1ba6c6 100%)'
                  }
                }}
              >
                {esAsistente ? 'Reagendar y Notificar' : 'Enviar y Confirmar'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Datos del paciente - Diseño mejorado */}
          <Card 
            className="info-card"
            sx={{ 
              mb: 3, 
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: '#10b981', width: 40, height: 40 }}>
                  <PersonIcon />
                </Avatar>
              }
              title={
                <Typography variant="h6" fontWeight={600} color="text.primary">
                  Información del Paciente
                </Typography>
              }
              action={
                editSection === 'paciente' ? (
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Guardar cambios">
                      <IconButton 
                        onClick={handleSaveClick} 
                        sx={{ 
                          bgcolor: '#dcfce7', 
                          color: '#16a34a',
                          '&:hover': { bgcolor: '#bbf7d0' }
                        }}
                      >
                        <CheckIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Cancelar">
                      <IconButton 
                        onClick={handleCancelClick} 
                        sx={{ 
                          bgcolor: '#fef2f2', 
                          color: '#dc2626',
                          '&:hover': { bgcolor: '#fee2e2' }
                        }}
                      >
                        <CloseIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ) : (
                  !esAsistente && (
                    <Tooltip title="Editar información">
                      <IconButton 
                        onClick={() => handleEditClick('paciente')}
                        sx={{ 
                          bgcolor: '#f0f9ff',
                          color: '#2596be',
                          '&:hover': { bgcolor: '#e0f2fe' }
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  )
                )
              }
              sx={{ pb: 1 }}
            />
            <CardContent sx={{ pt: 0 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      bgcolor: '#f8fafc',
                      borderRadius: 2,
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Nombre Completo
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {event.paciente.nombre}
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={6}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      bgcolor: '#f8fafc',
                      borderRadius: 2,
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      RUT
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {event.paciente.rut}
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={6}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      bgcolor: '#f8fafc',
                      borderRadius: 2,
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Teléfono
                    </Typography>
                    {editSection === 'paciente' ? (
                      <TextField
                        name="telefono"
                        value={editableFields.telefono}
                        onChange={handleFieldChange}
                        size="small"
                        fullWidth
                        variant="outlined"
                      />
                    ) : (
                      <Typography variant="body1" fontWeight={600}>
                        {event.paciente.telefono}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      bgcolor: '#f8fafc',
                      borderRadius: 2,
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Email
                    </Typography>
                    {editSection === 'paciente' ? (
                      <TextField
                        name="email"
                        value={editableFields.email}
                        onChange={handleFieldChange}
                        size="small"
                        fullWidth
                        variant="outlined"
                      />
                    ) : (
                      <Typography variant="body1" fontWeight={600}>
                        {event.paciente.email || 'No especificado'}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Detalles de la cita - Diseño mejorado */}
          <Card 
            className="info-card"
            sx={{ 
              mb: 3, 
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: '#8b5cf6', width: 40, height: 40 }}>
                  <ManageAccountsIcon />
                </Avatar>
              }
              title={
                <Typography variant="h6" fontWeight={600} color="text.primary">
                  Información de la Cita
                </Typography>
              }
              action={
                editSection === 'cita' ? (
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Guardar cambios">
                      <IconButton 
                        onClick={handleSaveClick} 
                        sx={{ 
                          bgcolor: '#dcfce7', 
                          color: '#16a34a',
                          '&:hover': { bgcolor: '#bbf7d0' }
                        }}
                      >
                        <CheckIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Cancelar">
                      <IconButton 
                        onClick={handleCancelClick} 
                        sx={{ 
                          bgcolor: '#fef2f2', 
                          color: '#dc2626',
                          '&:hover': { bgcolor: '#fee2e2' }
                        }}
                      >
                        <CloseIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ) : (
                  <Tooltip title="Reagendar cita">
                    <IconButton 
                      onClick={() => handleEditClick('cita')}
                      sx={{ 
                        bgcolor: '#f0f9ff',
                        color: '#2596be',
                        '&:hover': { bgcolor: '#e0f2fe' }
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                )
              }
              sx={{ pb: 1 }}
            />
            <CardContent sx={{ pt: 0 }}>
              {editSection === 'cita' ? (
                <Stack spacing={2}>
                  {esAsistente && (
                    <FormControl fullWidth>
                      <InputLabel>Profesional</InputLabel>
                      <Select
                        name="profesional"
                        value={profesionalSeleccionado?._id || ''}
                        onChange={handleProfesionalChange}
                      >
                        {profesionalesSucursal.length > 0 ? (
                          profesionalesSucursal.map((profesional) => (
                            <MenuItem key={profesional._id} value={profesional._id}>
                              {profesional.username}
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem disabled>
                            No hay profesionales disponibles
                          </MenuItem>
                        )}
                      </Select>
                      {/* Debug info */}
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                        Debug: {profesionalesSucursal.length} profesionales cargados
                      </Typography>
                    </FormControl>
                  )}
                  <DatePicker
                    label="Fecha de Cita"
                    value={editableFields.fecha ? dayjs(editableFields.fecha) : null}
                    onChange={(newValue) => {
                      const valid = newValue && typeof newValue.isValid === 'function' && newValue.isValid();
                      setEditableFields({ ...editableFields, fecha: valid ? newValue.format('YYYY-MM-DD') : '' });
                    }}
                    minDate={dayjs().startOf('day')}
                    shouldDisableDate={(date) => {
                      // Bloquear días pasados
                      if (dayjs(date).isBefore(dayjs().startOf('day'), 'day')) return true;
                      const dayName = diasSemana[date.day()];
                      const noTrabaja = !diasDeTrabajo.includes(dayName);
                      const esFeriado = feriados.some(f => f.date && dayjs(f.date).isSame(date, 'day'));
                      return noTrabaja || esFeriado;
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        inputProps: { readOnly: true }
                      }
                    }}
                  />
                  <FormControl fullWidth>
                    <InputLabel>Hora de Cita</InputLabel>
                    <Select
                      name="hora"
                      value={editableFields.hora}
                      onChange={handleFieldChange}
                    >
                      {horasDisponibles.map((hora) => (
                        <MenuItem key={hora} value={hora}>{hora}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              ) : (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper 
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        bgcolor: '#f8fafc',
                        borderRadius: 2,
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Fecha
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {getInitialDate(event) ? dayjs(getInitialDate(event)).format('DD/MM/YYYY') : 'No especificada'}
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Paper 
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        bgcolor: '#f8fafc',
                        borderRadius: 2,
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Hora
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {getInitialHour(event)} hrs.
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Paper 
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        bgcolor: '#f8fafc',
                        borderRadius: 2,
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Profesional
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {event.profesional?.username || 'No asignado'}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip 
                  icon={<HistoryEduIcon />} 
                  label={`${event.historial?.length || 0} Sesiones`} 
                  color="primary" 
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
                <Chip 
                  label={event.diagnostico || "Primera consulta"} 
                  color={event.diagnostico ? "success" : "warning"} 
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Anamnesis - Diseño mejorado */}
          <Card 
            className="info-card"
            sx={{ 
              mb: 3, 
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: '#f59e0b', width: 40, height: 40 }}>
                  <ListAltIcon />
                </Avatar>
              }
              title={
                <Typography variant="h6" fontWeight={600} color="text.primary">
                  Anamnesis
                </Typography>
              }
              sx={{ pb: 1 }}
            />
            <CardContent sx={{ pt: 0 }}>
              <Paper
                elevation={0}
                sx={{
                  background: '#f8fafc',
                  borderRadius: 2,
                  minHeight: 120,
                  border: '1px solid #e2e8f0',
                  p: 2
                }}
              >
                <ReactQuill 
                  value={event.anamnesis || 'Sin información registrada'} 
                  readOnly 
                  theme="bubble"
                  style={{ minHeight: '80px' }}
                />
              </Paper>
            </CardContent>
          </Card>
          <Card 
    className="info-card"
    sx={{ 
      mb: 3, 
      borderRadius: 3,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      border: '1px solid #e2e8f0',
      overflow: 'hidden'
    }}
  >
    <CardHeader
      avatar={
        <Avatar sx={{ bgcolor: '#059669', width: 40, height: 40 }}>
          <PaymentIcon />
        </Avatar>
      }
      title={
        <Typography variant="h6" fontWeight={600} color="text.primary">
          Estado de Pago
        </Typography>
      }
      sx={{ pb: 1 }}
    />
    <CardContent sx={{ pt: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="body2">Estado:</Typography>
        <Chip 
          label={
            paymentStatus === 'completed' ? 'Pagado' :
            paymentStatus === 'pending' ? 'Pendiente' :
            paymentStatus === 'failed' ? 'Fallido' : 'Sin iniciar'
          }
          color={
            paymentStatus === 'completed' ? 'success' :
            paymentStatus === 'pending' ? 'warning' :
            paymentStatus === 'failed' ? 'error' : 'default'
          }
          size="small"
        />
      </Box>

      {paymentStatus !== 'completed' && !esAsistente && (
        <PaymentButton 
          reserva={event}
          onPaymentSuccess={() => setPaymentStatus('completed')}
        />
      )}
    </CardContent>
  </Card>
          </Box>

          {/* Panel de acciones fijo en la parte inferior */}
          <Box 
            sx={{
              flexShrink: 0,
              p: 1,
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
              borderTop: '1px solid #e2e8f0',
              borderRadius: { xs: 0, md: '0 0 12px 12px' },
              boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
              position: 'sticky',
              bottom: 0,
              width: '100%',
              pb: 'max(env(safe-area-inset-bottom), 8px)'
            }}
          >
            {esAsistente ? (
              // Solo mostrar Ver Historial para asistentes
              <Stack spacing={1.5} alignItems="center">
                <Box textAlign="center">
                  <Typography variant="subtitle1" color="text.primary" sx={{ mb: 0.5, fontWeight: 600 }}>
                    Consulta de Información
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Como asistente, puedes consultar el historial del paciente
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  size="medium"
                  startIcon={<HistoryEduIcon />}
                  onClick={handleOpenHistorialModal}
                  sx={{ 
                    fontWeight: 600,
                    py: 1,
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                    boxShadow: '0 3px 10px rgba(139, 92, 246, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
                      boxShadow: '0 4px 15px rgba(139, 92, 246, 0.5)',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Ver Historial del Paciente
                </Button>
              </Stack>
            ) : (
              // Mostrar botones normales para profesionales
              ((!event.historial || event.historial.length === 0) && !event.diagnostico && !event.anamnesis) ? (
                <Stack spacing={1.5} alignItems="center">
                  <Box textAlign="center">
                    <Typography variant="subtitle1" color="text.primary" sx={{ mb: 0.5, fontWeight: 600 }}>
                      Primera Consulta
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Registra la información inicial del paciente
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    fullWidth
                    size="medium"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={handleOpenModal}
                    sx={{ 
                      fontWeight: 600,
                      py: 1,
                      background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)',
                      boxShadow: '0 3px 10px rgba(37, 150, 190, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1e7a9b 0%, #1ba6c6 100%)',
                        boxShadow: '0 4px 15px rgba(37, 150, 190, 0.5)',
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Registrar Ficha Inicial
                  </Button>
                </Stack>
              ) : (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="contained"
                    fullWidth
                    size="medium"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={handleOpenSesionModal}
                    sx={{ 
                      fontWeight: 600,
                      py: 1,
                      background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)',
                      boxShadow: '0 3px 10px rgba(37, 150, 190, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1e7a9b 0%, #1ba6c6 100%)',
                        boxShadow: '0 4px 15px rgba(37, 150, 190, 0.5)',
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Agregar Sesión
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    size="medium"
                    startIcon={<HistoryEduIcon />}
                    onClick={handleOpenHistorialModal}
                    sx={{ 
                      fontWeight: 600,
                      py: 1,
                      borderColor: '#8b5cf6',
                      color: '#8b5cf6',
                      '&:hover': {
                        borderColor: '#7c3aed',
                        backgroundColor: '#faf5ff',
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Ver Historial
                  </Button>
                </Stack>
              )
            )}
          </Box>

          {/* Modal para subir imágenes */}
          <Modal
            open={openUploadModal}
            onClose={() => setOpenUploadModal(false)}
            aria-labelledby="upload-modal-title"
          >
            <Fade in={openUploadModal}>
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: { xs: '90%', sm: 500 },
                  bgcolor: 'background.paper',
                  borderRadius: 3,
                  boxShadow: 24,
                  p: 3
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography id="upload-modal-title" variant="h6" fontWeight={600}>
                    Agregar Imágenes del Paciente
                  </Typography>
                  <IconButton 
                    onClick={() => setOpenUploadModal(false)}
                    size="small"
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>

                <Box
                  {...getRootProps()}
                  className={isDragActive ? 'dropzone-hover' : ''}
                  sx={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: 2,
                    p: 4,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    bgcolor: isDragActive ? '#f0f9ff' : '#f8fafc',
                    borderColor: isDragActive ? '#2596be' : '#cbd5e1',
                    '&:hover': {
                      borderColor: '#2596be',
                      bgcolor: '#f0f9ff'
                    }
                  }}
                >
                  <input {...getInputProps()} />
                  <CloudUploadIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 2 }} />
                  <Typography variant="h6" color="text.primary" sx={{ mb: 1 }}>
                    {isDragActive ? 'Suelta las imágenes aquí' : 'Arrastra imágenes aquí'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    o haz clic para seleccionar archivos
                  </Typography>
                  <Chip 
                    label="JPG, PNG, GIF, WEBP" 
                    variant="outlined" 
                    size="small"
                    color="primary"
                  />
                </Box>

                {uploadFiles.length > 0 && (
                  <Box mt={3}>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                      Archivos seleccionados ({uploadFiles.length}):
                    </Typography>
                    <Stack spacing={1} sx={{ maxHeight: 200, overflowY: 'auto' }}>
                      {uploadFiles.map((file, index) => (
                        <Paper 
                          key={index} 
                          elevation={0}
                          sx={{ 
                            p: 2, 
                            bgcolor: '#f8fafc',
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <ImageIcon color="primary" />
                            <Box flex={1}>
                              <Typography variant="body2" fontWeight={500}>
                                {file.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </Typography>
                            </Box>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                )}

                <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => {
                      setUploadFiles([]);
                      setOpenUploadModal(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleUploadImages}
                    disabled={uploadFiles.length === 0 || isUploading}
                    startIcon={isUploading ? <Skeleton width={20} height={20} /> : <CloudUploadIcon />}
                    sx={{
                      background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1e7a9b 0%, #1ba6c6 100%)'
                      }
                    }}
                  >
                    {isUploading ? 'Subiendo...' : 'Subir Imágenes'}
                  </Button>
                </Stack>
              </Box>
            </Fade>
          </Modal>

          {/* Modal para ver imagen en grande */}
          <Modal
            open={openImageModal}
            onClose={() => setOpenImageModal(false)}
            aria-labelledby="image-modal"
          >
            <Fade in={openImageModal}>
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  maxWidth: '90vw',
                  maxHeight: '90vh',
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  boxShadow: 24,
                  p: 1
                }}
              >
                <IconButton
                  onClick={() => setOpenImageModal(false)}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                  }}
                >
                  <CloseIcon />
                </IconButton>
                {imagenes.length > 0 && (
                  <Box
                    component="img"
                    src={`${ASSETS_BASE}${imagenes[currentImageIndex]}`}
                    alt={`Imagen ${currentImageIndex + 1}`}
                    sx={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: '85vh',
                      objectFit: 'contain',
                      borderRadius: 1
                    }}
                  />
                )}
              </Box>
            </Fade>
          </Modal>

          {/* Modales */}
          <AgregarPaciente open={openModal} onClose={handleCloseModal} data={event.paciente} fetchReservas={fetchReservas} gapi={gapi} />
          <AgregarSesion open={openSesionModal} close={onClose} onClose={handleCloseSesionModal} paciente={event.paciente} fetchReservas={fetchReservas} gapi={gapi} eventId={event.eventId} />
          <VerHistorial open={openHistorialModal} onClose={handleCloseHistorialModal} paciente={event.paciente} />

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
      </Slide>
    </LocalizationProvider>
  );
};

export default DespliegueEventos;