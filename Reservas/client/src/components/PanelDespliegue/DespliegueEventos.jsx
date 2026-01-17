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
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';
import localeData from 'dayjs/plugin/localeData';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useDropzone } from 'react-dropzone';
import axios from '../../api/axios';
import PaymentButton from '../../pages/PaymentButton';
import { getPaymentStatusRequest } from '../../api/payment';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useSubscription } from '../../context/subscriptionContext';


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
  const { canUploadExamImages } = useSubscription();
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
  const [historialInitialClinicalCaseId, setHistorialInitialClinicalCaseId] = useState(null);
  const [historialAutoFocusSection, setHistorialAutoFocusSection] = useState(undefined);
  const [diasDeTrabajo, setDiasDeTrabajo] = useState([]);
  const [horasDisponibles, setHorasDisponibles] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [mensajePaciente, setMensajePaciente] = useState('');
  const [feriados, setFeriados] = useState([]);
  const [openNewDiagnosisDialog, setOpenNewDiagnosisDialog] = useState(false);
  const [isStartingNewDiagnosis, setIsStartingNewDiagnosis] = useState(false);
  const [openRefreshDialog, setOpenRefreshDialog] = useState(false);

  const [showMoreFichaData, setShowMoreFichaData] = useState(false);
  const [anamnesisPreviewOverflow, setAnamnesisPreviewOverflow] = useState(false);
  const anamnesisPreviewRef = useRef(null);

  const [openArchivosPacienteModal, setOpenArchivosPacienteModal] = useState(false);
  const [archivosSelectedCaseId, setArchivosSelectedCaseId] = useState(null);
  const [archivosImagenes, setArchivosImagenes] = useState([]);
  const [imagenesTargetClinicalCaseId, setImagenesTargetClinicalCaseId] = useState(null);
  
  // Estados para profesionales de la sucursal (para asistentes)
  const [profesionalesSucursal, setProfesionalesSucursal] = useState([]);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState(null);
  
  const profesionalActual = esAsistente ? (profesionalSeleccionado || event?.profesional) : user;

  const totalSesiones = (() => {
    const cases = Array.isArray(event?.clinicalCases) ? event.clinicalCases : [];
    if (cases.length > 0) {
      return cases.reduce((sum, c) => sum + (Array.isArray(c?.sesiones) ? c.sesiones.length : 0), 0);
    }
    return Array.isArray(event?.historial) ? event.historial.length : 0;
  })();

  const activeClinicalCase = (() => {
    const cases = Array.isArray(event?.clinicalCases) ? event.clinicalCases : [];
    const activeId = event?.activeClinicalCaseId;
    if (!activeId || cases.length === 0) return null;
    return cases.find((c) => String(c?._id) === String(activeId)) || null;
  })();

  const shouldShowPrimeraConsulta = (() => {
    // Nuevo modelo (clinicalCases): "primera consulta" = caso activo sin info inicial y sin sesiones
    if (activeClinicalCase) {
      const hasInitialInfo = Boolean(activeClinicalCase?.diagnostico || activeClinicalCase?.anamnesis);
      const activeSesionesCount = Array.isArray(activeClinicalCase?.sesiones) ? activeClinicalCase.sesiones.length : 0;
      return !hasInitialInfo && activeSesionesCount === 0;
    }

    // Fallback legacy
    const legacyHasInitialInfo = Boolean(event?.diagnostico || event?.anamnesis);
    const legacySesionesCount = Array.isArray(event?.historial) ? event.historial.length : 0;
    return !legacyHasInitialInfo && legacySesionesCount === 0;
  })();

  const handleOpenNewDiagnosisDialog = () => setOpenNewDiagnosisDialog(true);
  const handleCloseNewDiagnosisDialog = () => {
    if (!isStartingNewDiagnosis) setOpenNewDiagnosisDialog(false);
  };

  const handleConfirmNewDiagnosis = async () => {
    try {
      if (!event?.paciente?.rut) {
        showAlert('error', 'No se pudo iniciar un nuevo diagnóstico (RUT no disponible).');
        return;
      }
      setIsStartingNewDiagnosis(true);
      await updateReserva(event.paciente.rut, { startNewClinicalCase: true });
      setOpenNewDiagnosisDialog(false);
      // Cerrar cualquier modal abierto relacionado
      setOpenHistorialModal(false);
      setOpenSesionModal(false);
      setOpenModal(false);
      if (typeof fetchReservas === 'function') {
        await fetchReservas();
      }
      // Mostrar modal no cerrable indicando que se actualizará la página
      setOpenRefreshDialog(true);
    } catch (error) {
      console.error('Error iniciando nuevo diagnóstico:', error);
      showAlert('error', 'No se pudo iniciar el nuevo diagnóstico.');
    } finally {
      setIsStartingNewDiagnosis(false);
    }
  };

  // Nuevos estados para imágenes
  const [imagenes, setImagenes] = useState(event?.imagenes || []);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [openImageModal, setOpenImageModal] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState(null);
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showPlaceholdersHelp, setShowPlaceholdersHelp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!openImageModal) {
        setModalImageSrc(null);
        return;
      }

      const v = Array.isArray(imagenes) ? imagenes[currentImageIndex] : null;
      if (!v) {
        setModalImageSrc(null);
        return;
      }

      // Ya es URL absoluta (GCS público, Cloudinary, etc.)
      if (typeof v === 'string' && /^https?:\/\//i.test(v)) {
        setModalImageSrc(v);
        return;
      }

      // Objeto privado en GCS
      if (typeof v === 'string' && v.startsWith('pacientes/')) {
        const rut = event?.paciente?.rut;
        if (!rut) {
          setModalImageSrc(null);
          return;
        }
        try {
          const res = await axios.post('/imagenesPacientes/signed-read', { rut, objects: [v] });
          const url = res?.data?.urls?.[v] || null;
          if (!cancelled) setModalImageSrc(url);
        } catch (e) {
          console.error('Error obteniendo signed read URL (modal):', e);
          if (!cancelled) setModalImageSrc(null);
        }
        return;
      }

      // Legacy local path (Cloud Run dev/local)
      if (typeof v === 'string') {
        setModalImageSrc(resolveAssetUrl(v));
        return;
      }

      setModalImageSrc(null);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [openImageModal, currentImageIndex, imagenes, event?.paciente?.rut]);

  // Configuración del dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: true,
    disabled: !canUploadExamImages,
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
    setShowMoreFichaData(false);
    setAnamnesisPreviewOverflow(false);
  }, [event]);

  useEffect(() => {
    if (!showMoreFichaData) {
      setAnamnesisPreviewOverflow(false);
      return;
    }
    const t = setTimeout(() => {
      try {
        const el = anamnesisPreviewRef.current;
        if (!el) return;
        setAnamnesisPreviewOverflow(el.scrollHeight > el.clientHeight + 1);
      } catch {
        // no-op
      }
    }, 0);
    return () => clearTimeout(t);
  }, [showMoreFichaData, activeClinicalCase?._id, activeClinicalCase?.anamnesis]);

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

  const getClinicalCasesForArchivos = () => {
    const cases = Array.isArray(event?.clinicalCases) ? event.clinicalCases : [];
    // Fallback: si no hay casos pero sí imágenes legacy, mostrar una opción "General".
    if (cases.length === 0 && Array.isArray(imagenes) && imagenes.length > 0) {
      return [{ _id: '__legacy__', diagnostico: 'General', imagenes }];
    }
    return cases;
  };

  const syncArchivosFromCaseId = (caseId) => {
    const cases = getClinicalCasesForArchivos();
    const target = cases.find((c) => String(c?._id) === String(caseId));
    const imgs = Array.isArray(target?.imagenes) ? target.imagenes : [];
    setArchivosSelectedCaseId(target?._id || null);
    setArchivosImagenes(imgs);
  };

  const handleOpenArchivosPaciente = () => {
    const cases = getClinicalCasesForArchivos();
    if (cases.length === 0) {
      setArchivosSelectedCaseId(null);
      setArchivosImagenes([]);
    } else {
      const preferred = activeClinicalCase?._id ? String(activeClinicalCase._id) : null;
      const initialId = preferred && cases.some((c) => String(c?._id) === preferred)
        ? preferred
        : String(cases[0]?._id);
      syncArchivosFromCaseId(initialId);
    }
    setOpenArchivosPacienteModal(true);
  };

  const handleCloseArchivosPaciente = () => {
    setOpenArchivosPacienteModal(false);
    setArchivosSelectedCaseId(null);
    setArchivosImagenes([]);
    setImagenesTargetClinicalCaseId(null);
  };

  const handleUploadImages = async () => {
    if (uploadFiles.length === 0) return;

    setIsUploading(true);
    try {
      const rut = event?.paciente?.rut;
      const filesMeta = uploadFiles.map((f) => ({ name: f?.name || 'imagen', type: f?.type || 'application/octet-stream', size: f?.size || 0 }));
      const init = await axios.post('/imagenesPacientes/signed-upload', { rut, files: filesMeta });
      const uploads = init?.data?.uploads;
      if (!Array.isArray(uploads) || uploads.length !== uploadFiles.length) {
        throw new Error('No se recibieron URLs de subida');
      }

      await Promise.all(
        uploads.map((u, idx) =>
          fetch(u.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': uploadFiles[idx]?.type || 'application/octet-stream' },
            body: uploadFiles[idx],
          }).then(async (r) => {
            if (!r.ok) {
              const txt = await r.text().catch(() => '');
              throw new Error(`Error subiendo imagen (${r.status}): ${txt || 'falló'}`);
            }
          })
        )
      );

      const objects = uploads.map((u) => u.object);
      if (objects.length) {
        const targetCaseId = imagenesTargetClinicalCaseId;
        if (targetCaseId && String(targetCaseId) !== '__legacy__') {
          const newCaseImagenes = [...(Array.isArray(archivosImagenes) ? archivosImagenes : []), ...objects];
          setArchivosImagenes(newCaseImagenes);
          // Actualizar la reserva/caso clínico con las nuevas imágenes
          await updateReserva(event.paciente.rut, {
            imagenes: newCaseImagenes,
            clinicalCaseId: targetCaseId,
            profesionalOriginal: event.profesional?._id || event.profesional?.id
          });
        } else {
          const newImagenes = [...imagenes, ...objects];
          setImagenes(newImagenes);
          // Actualizar la reserva (legacy) con las nuevas imágenes
          await updateReserva(event.paciente.rut, {
            imagenes: newImagenes,
            profesionalOriginal: event.profesional?._id || event.profesional?.id
          });
        }

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
            profesionalOriginal: event.profesional?._id || event.profesional?.id, // asegurar que se edita la reserva correcta
            mensajePaciente: mensajePaciente,
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

            // WhatsApp-only: intenta enviar mensaje usando el texto ingresado o el mensaje por defecto (sucursal si aplica)
            const fallbackDefault = (user?.sucursal?.defaultMessage && user.sucursal.defaultMessage.trim()) || (user?.defaultMessage && user.defaultMessage.trim()) || '';
            const template = (mensajePaciente && mensajePaciente.trim()) || fallbackDefault || '';
            if (template) {
              const waId = user?.sucursal?.idInstance || user?.idInstance;
              const waToken = user?.sucursal?.apiTokenInstance || user?.apiTokenInstance;
              if (waId && waToken) {
                // Validación simple de teléfono antes de enviar
                const phone = event?.paciente?.telefono || '';
                const validPhone = /^569\d{8}$/.test(String(phone));
                if (!validPhone) {
                  showAlert('warning', `El número del paciente no es válido para WhatsApp: "${phone}". Formato esperado: 569XXXXXXXX.`);
                }
                const report = await sendWhatsAppMessage([event], template, user);
                if (report?.sent) {
                  const msg = `WhatsApp enviado a ${report.sent} paciente(s)` + (report.failed ? `, ${report.failed} fallo(s)` : '');
                  showAlert('success', msg);
                } else {
                  const detail = report?.details?.[0]?.reason || 'desconocido';
                  showAlert('warning', `No se pudo enviar WhatsApp (motivo: ${detail}). Revisa la configuración de WhatsApp de la plataforma y el formato de teléfono (569XXXXXXXX).`);
                  if (report?.details) console.warn('Detalles envío WhatsApp:', report.details);
                }
              } else {
                showAlert('warning', user?.sucursal ? 'Green API no está configurado en la sucursal (idInstance y apiTokenInstance).' : 'Green API no está configurado (idInstance y apiTokenInstance).');
              }
            } else {
              // No hay mensaje ni por defecto; informar pero no bloquear el guardado
              showAlert('info', user?.sucursal ? 'Cita actualizada. No se envió WhatsApp porque no hay mensaje definido. Configura el mensaje por defecto en la sucursal.' : 'Cita actualizada. No se envió WhatsApp porque no hay mensaje definido. Configura tu mensaje por defecto en tu perfil.');
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
  const handleOpenHistorialModal = (options = {}) => {
    setHistorialInitialClinicalCaseId(options?.initialClinicalCaseId ?? null);
    setHistorialAutoFocusSection(options?.autoFocusSection);
    setOpenHistorialModal(true);
  };
  const handleCloseHistorialModal = () => {
    setOpenHistorialModal(false);
    setHistorialInitialClinicalCaseId(null);
    setHistorialAutoFocusSection(undefined);
  };

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
            borderRadius: { xs: '9px 9px 0 0', md: 3 },
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
              px: 3,
              pt: 0,
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
              // Edge-to-edge dentro del contenedor con padding
              mx: -3,
              borderRadius: { xs: '16px 16px 0 0', md: '12px 12px 0 0' },
              px: 3,
              py: 3,
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
                  <Typography variant="h5" fontWeight={700} >
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

          <Box mb={1}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<ImageIcon />}
              onClick={handleOpenArchivosPaciente}
              sx={{
                borderRadius: 2,
                borderColor: '#2596be',
                color: '#2596be',
                backgroundColor: 'white',
                mt: -4.5,
                '&:hover': {
                  borderColor: '#1e7a9b',
                  backgroundColor: '#e0f2fe'
                }
              }}
            >
              Archivos del paciente
            </Button>
          </Box>

          <Dialog
            open={openArchivosPacienteModal}
            onClose={handleCloseArchivosPaciente}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
          >
            <DialogTitle sx={{
              background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1
            }}>
              <Box display="flex" alignItems="center" gap={1} minWidth={0}>
                <ImageIcon />
                <Typography variant="h6" fontWeight={800} noWrap>
                  Archivos del paciente
                </Typography>
              </Box>
              <IconButton onClick={handleCloseArchivosPaciente} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.16)', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' } }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, backgroundColor: '#f8fafc' }}>
              {getClinicalCasesForArchivos().length > 0 ? (
                <Stack spacing={2} mt={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Caso clínico</InputLabel>
                    <Select
                      label="Caso clínico"
                      value={archivosSelectedCaseId || ''}
                      onChange={(e) => syncArchivosFromCaseId(e.target.value)}
                    >
                      {getClinicalCasesForArchivos().map((c) => (
                        <MenuItem key={String(c?._id)} value={c?._id}>
                          {c?.diagnostico ? c.diagnostico : (String(c?._id) === '__legacy__' ? 'General' : 'Diagnóstico sin nombre')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <Stack spacing={1.5}>
                      {!esAsistente && (
                        <Box display="flex" justifyContent="flex-end">
                          <Tooltip title={canUploadExamImages ? 'Subir imágenes' : 'Disponible en Plan Avanzado y Teams'}>
                            <span style={{ width: '100%' }}>
                              <Button
                                variant="contained"
                                size="small"
                                fullWidth={window.innerWidth < 600}
                                startIcon={<AddPhotoAlternateIcon />}
                                disabled={!canUploadExamImages || !archivosSelectedCaseId}
                                onClick={() => {
                                  setImagenesTargetClinicalCaseId(archivosSelectedCaseId);
                                  setOpenUploadModal(true);
                                }}
                                sx={{
                                  background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)',
                                  '&:hover': {
                                    background: 'linear-gradient(135deg, #1e7a9b 0%, #1ba6c6 100%)'
                                  }
                                }}
                              >
                                Subir imágenes
                              </Button>
                            </span>
                          </Tooltip>
                        </Box>
                      )}

                      <Box
                        sx={{
                          borderRadius: 2,
                          border: '1px solid #e2e8f0',
                          bgcolor: '#f8fafc',
                          p: 1,
                          minHeight: 240,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <MostrarImagenes key={String(archivosSelectedCaseId || 'none')} imagenes={archivosImagenes} rut={event?.paciente?.rut} />
                      </Box>
                    </Stack>
                  </Paper>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" mt={3}>
                  No hay casos clínicos registrados para mostrar archivos.
                </Typography>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 2, backgroundColor: 'white', borderTop: '1px solid #e2e8f0' }}>
              <Button onClick={handleCloseArchivosPaciente} sx={{ borderRadius: 2, textTransform: 'none', color: "#656565ff" }}>
                Cerrar
              </Button>
            </DialogActions>
          </Dialog>

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
                <Typography variant="h6" fontWeight={600} sx={{color:"#2596be"}}>
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

              <Divider sx={{ my: 2 }} />

              <Box display="flex" justifyContent="flex-end">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowMoreFichaData((prev) => !prev)}
                  sx={{
                    borderRadius: 2,
                    borderColor: '#2596be',
                    color: '#2596be',
                    '&:hover': {
                      borderColor: '#1e7a9b',
                      backgroundColor: '#e0f2fe'
                    }
                  }}
                >
                  {showMoreFichaData ? 'Ocultar datos' : 'Ver más datos'}
                </Button>
              </Box>

              {showMoreFichaData && (
                <Box mt={2}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: '#f8fafc',
                      borderRadius: 2,
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, color:"#2596be" }}>
                      Datos del diagnóstico actual
                    </Typography>

                    {(() => {
                      const currentCase = activeClinicalCase || null;
                      const hasAny = Boolean(
                        currentCase?.diagnostico ||
                          currentCase?.anamnesis ||
                          currentCase?.motivoConsulta ||
                          currentCase?.antecedentesPersonales ||
                          currentCase?.antecedentesFamiliares ||
                          currentCase?.alergias ||
                          currentCase?.medicamentosActuales ||
                          currentCase?.examenFisico ||
                          currentCase?.planTratamiento ||
                          currentCase?.indicaciones ||
                          (currentCase?.signosVitales && Object.values(currentCase.signosVitales).some((v) => String(v || '').trim()))
                      );

                      if (!hasAny) {
                        return (
                          <Typography variant="body2" color="text.secondary">
                            No hay datos clínicos guardados para el diagnóstico activo.
                          </Typography>
                        );
                      }

                      const vital = currentCase?.signosVitales || {};
                      const renderField = (label, value) => {
                        const val = String(value || '').trim();
                        if (!val) return null;
                        return (
                          <Box sx={{ mb: 1.25 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>
                              {label}
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {val}
                            </Typography>
                          </Box>
                        );
                      };

                      return (
                        <Box>
                          {renderField('Diagnóstico', currentCase?.diagnostico)}

                          <Box sx={{ mb: 1.25 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>
                              Anamnesis
                            </Typography>
                            <Box
                              sx={{
                                bgcolor: 'white',
                                borderRadius: 1,
                                border: '1px solid #e2e8f0',
                                p: 1,
                                height: 140,
                                overflow: 'hidden',
                                position: 'relative'
                              }}
                            >
                              <Box
                                ref={anamnesisPreviewRef}
                                sx={{
                                  height: '100%',
                                  overflow: 'hidden'
                                }}
                              >
                                <ReactQuill value={currentCase?.anamnesis || 'Sin información registrada'} readOnly={true} theme="bubble" />
                              </Box>
                            </Box>

                            {anamnesisPreviewOverflow && (
                              <Box display="flex" justifyContent="flex-end" mt={1}>
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => {
                                    // Abrir VerHistorial y enfocar la sección Anamnesis del caso activo
                                    handleOpenHistorialModal({
                                      initialClinicalCaseId: activeClinicalCase?._id || null,
                                      autoFocusSection: 'anamnesis'
                                    });
                                  }}
                                  sx={{
                                    color: '#2596be',
                                    fontWeight: 700,
                                    textTransform: 'none'
                                  }}
                                >
                                  Ver más
                                </Button>
                              </Box>
                            )}
                          </Box>

                          {renderField('Motivo de consulta', currentCase?.motivoConsulta)}
                          {renderField('Antecedentes personales', currentCase?.antecedentesPersonales)}
                          {renderField('Antecedentes familiares', currentCase?.antecedentesFamiliares)}
                          {renderField('Alergias', currentCase?.alergias)}
                          {renderField('Medicamentos actuales', currentCase?.medicamentosActuales)}
                          {renderField('Examen físico', currentCase?.examenFisico)}
                          {renderField('Plan de tratamiento', currentCase?.planTratamiento)}
                          {renderField('Indicaciones', currentCase?.indicaciones)}

                          {(Object.values(vital).some((v) => String(v || '').trim())) && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="body2" fontWeight={700} sx={{ mb: 0.75 }}>
                                Signos vitales
                              </Typography>
                              <Grid container spacing={1.5}>
                                {vital?.presionArterial ? (
                                  <Grid item xs={12} sm={6}>
                                    {renderField('Presión arterial', vital.presionArterial)}
                                  </Grid>
                                ) : null}
                                {vital?.frecuenciaCardiaca ? (
                                  <Grid item xs={12} sm={6}>
                                    {renderField('Frecuencia cardíaca', vital.frecuenciaCardiaca)}
                                  </Grid>
                                ) : null}
                                {vital?.pesoKg ? (
                                  <Grid item xs={12} sm={6}>
                                    {renderField('Peso (kg)', vital.pesoKg)}
                                  </Grid>
                                ) : null}
                                {vital?.tallaCm ? (
                                  <Grid item xs={12} sm={6}>
                                    {renderField('Talla (cm)', vital.tallaCm)}
                                  </Grid>
                                ) : null}
                                {vital?.temperaturaC ? (
                                  <Grid item xs={12} sm={6}>
                                    {renderField('Temperatura (°C)', vital.temperaturaC)}
                                  </Grid>
                                ) : null}
                                {vital?.saturacionO2 ? (
                                  <Grid item xs={12} sm={6}>
                                    {renderField('Saturación O2 (%)', vital.saturacionO2)}
                                  </Grid>
                                ) : null}
                              </Grid>
                            </Box>
                          )}
                        </Box>
                      );
                    })()}
                  </Paper>
                </Box>
              )}
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
                <Typography variant="h6" fontWeight={600} sx={{color:"#2596be"}}>
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
                  label={`${totalSesiones || 0} Sesiones`} 
                  color="primary" 
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              </Stack>
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
        <Typography variant="h6" fontWeight={600} sx={{color:"#2596be"}}>
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
            paymentStatus === 'failed' ? 'Fallido' :
            paymentStatus === 'refunded' ? 'Reembolsado' :
            paymentStatus === 'waived' ? 'Exenta' :
            'Sin iniciar'
          }
          color={
            paymentStatus === 'completed' ? 'success' :
            paymentStatus === 'pending' ? 'warning' :
            paymentStatus === 'failed' ? 'error' :
            paymentStatus === 'waived' ? 'info' :
            'default'
          }
          size="small"
        />
      </Box>

      {paymentStatus !== 'completed' && paymentStatus !== 'waived' && !esAsistente && (
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
              (shouldShowPrimeraConsulta) ? (
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

                  <Tooltip
                    title="Cierra el diagnóstico/caso clínico actual y crea uno nuevo para empezar un historial separado. El historial anterior se conserva."
                    arrow
                  >
                    <Button
                      variant="outlined"
                      fullWidth
                      size="medium"
                      startIcon={<AddCircleOutlineIcon />}
                      onClick={handleOpenNewDiagnosisDialog}
                      sx={{
                        fontWeight: 600,
                        py: 1,
                        borderColor: '#f59e0b',
                        color: '#f59e0b',
                        '&:hover': {
                          borderColor: '#d97706',
                          backgroundColor: '#fffbeb',
                          transform: 'translateY(-1px)'
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Iniciar nuevo diagnóstico
                    </Button>
                  </Tooltip>
                </Stack>
              )
            )}
          </Box>

          <Dialog
            open={openNewDiagnosisDialog}
            onClose={handleCloseNewDiagnosisDialog}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.12)'
              }
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)',
                color: 'white',
                px: 3,
                py: 2.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2
              }}
            >
              <Box display="flex" alignItems="center" gap={1.25} minWidth={0}>
                <AddCircleOutlineIcon />
                <Box minWidth={0}>
                  <Typography variant="h6" fontWeight={800} noWrap>
                    Iniciar nuevo diagnóstico
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }} noWrap>
                    Se cerrará el caso clínico actual
                  </Typography>
                </Box>
              </Box>
              <IconButton
                onClick={handleCloseNewDiagnosisDialog}
                disabled={isStartingNewDiagnosis}
                sx={{
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.16)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            <DialogContent sx={{ p: 3, backgroundColor: '#f8fafc' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Esta acción cerrará el caso clínico/diagnóstico actual y creará uno nuevo para el paciente.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                El historial anterior no se elimina: quedará guardado en la lista de diagnósticos dentro de “Ver Historial”.
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                ¿Deseas continuar?
              </Typography>
            </DialogContent>

            <DialogActions
              sx={{
                p: 3,
                gap: 1,
                backgroundColor: 'white',
                borderTop: '1px solid #e2e8f0'
              }}
            >
              <Button
                onClick={handleCloseNewDiagnosisDialog}
                disabled={isStartingNewDiagnosis}
                sx={{ borderRadius: 2, textTransform: 'none', color: "#656565ff" }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmNewDiagnosis}
                disabled={isStartingNewDiagnosis}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1e7a9b 0%, #1ba6c6 100%)'
                  }
                }}
              >
                {isStartingNewDiagnosis ? 'Procesando…' : 'Sí, iniciar'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Modal no cerrable: aviso de actualización */}
          <Dialog
            open={openRefreshDialog}
            onClose={() => { /* no-op: modal no cerrable */ }}
            disableEscapeKeyDown
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>Actualización requerida</DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary">
                La página será actualizada para aplicar los cambios.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                variant="contained"
                onClick={() => window.location.reload()}
              >
                Aceptar
              </Button>
            </DialogActions>
          </Dialog>

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
                  <Typography id="upload-modal-title" variant="h6" fontWeight={600} >
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
                    disabled={uploadFiles.length === 0 || isUploading || !canUploadExamImages}
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
                    src={modalImageSrc || undefined}
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
          <VerHistorial
            open={openHistorialModal}
            onClose={handleCloseHistorialModal}
            paciente={event.paciente}
            profesionalId={esAsistente ? (profesionalActual?._id || profesionalActual?.id) : undefined}
            initialClinicalCaseId={historialInitialClinicalCaseId}
            autoFocusSection={historialAutoFocusSection}
          />

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