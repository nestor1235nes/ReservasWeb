import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, LocaleConfig } from 'react-native-calendars';

import { getReservasRequest } from '../api/reservas';
import { updateConfirmStatusRequest } from '../api/confirmation';
import { updateReservaRequest } from '../api/reservas';
import { obtenerHorasDisponiblesRequest, liberarHorasRequest } from '../api/funciones';
import { sendWhatsAppRequest } from '../api/notifications';
import { addMinutesToHHMM, getReservaDateKey, toYmdLocal } from '../utils/helpers';
import { buildWhatsAppMessage, fetchConfirmationLink, normalizePhoneCL, PLACEHOLDERS } from '../utils/whatsapp';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { colors } from '../theme';

// Calendar locale
LocaleConfig.locales.es = {
  monthNames: [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

const CalendarScreen = ({ navigation }) => {
  const { user, refreshProfile } = useAuth();
  const { showAlert } = useAlert();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [reservasAll, setReservasAll] = useState([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editDateYmd, setEditDateYmd] = useState('');
  const [editHour, setEditHour] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [sendWA, setSendWA] = useState(true);
  const [timesLoading, setTimesLoading] = useState(false);
  const [timesError, setTimesError] = useState('');
  const [availableTimes, setAvailableTimes] = useState([]);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  // Bloquear día / horarios
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockDateYmd, setBlockDateYmd] = useState('');
  const [blockMode, setBlockMode] = useState('day'); // 'day' | 'times'
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const selectedYmd = useMemo(() => toYmdLocal(selectedDate), [selectedDate]);

  const hasActiveSubscription = (endDate) => {
    try {
      if (!endDate) return false;
      const dt = new Date(endDate);
      if (Number.isNaN(dt.getTime())) return false;
      return dt > new Date();
    } catch {
      return false;
    }
  };

  const subscription = useMemo(() => {
    const userPlanName = user?.suscriptionPlan?.name || null;
    const userActive = hasActiveSubscription(user?.suscriptionEndDate);
    const sucPlanName = user?.sucursal?.suscriptionPlan?.name || null;
    const sucActive = hasActiveSubscription(user?.sucursal?.suscriptionEndDate);
    return {
      userPlanName,
      userActive,
      sucPlanName,
      sucActive,
      effectivePlanName: (userActive && userPlanName) || (sucActive && sucPlanName) || null,
      canBlockHours:
        (userActive && (userPlanName === 'Standard' || userPlanName === 'Teams')) ||
        (sucActive && (sucPlanName === 'Standard' || sucPlanName === 'Teams')),
    };
  }, [user?.suscriptionPlan?.name, user?.suscriptionEndDate, user?.sucursal?.suscriptionPlan?.name, user?.sucursal?.suscriptionEndDate]);

  const reservas = useMemo(() => {
    const list = Array.isArray(reservasAll) ? reservasAll : [];
    return list
      .filter((r) => getReservaDateKey(r?.siguienteCita) === selectedYmd)
      .slice()
      .sort((a, b) => String(a?.hora || '').localeCompare(String(b?.hora || '')));
  }, [reservasAll, selectedYmd]);

  const reservasDelBloqueo = useMemo(() => {
    const ymd = String(blockDateYmd || '').trim();
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(ymd)) return [];
    const list = Array.isArray(reservasAll) ? reservasAll : [];
    return list.filter((r) => getReservaDateKey(r?.siguienteCita) === ymd);
  }, [reservasAll, blockDateYmd]);

  // Credenciales centralizadas en la plataforma: el backend resuelve idInstance/apiTokenInstance
  // (sanitizeUser ya no expone esos campos al cliente).
  const hasWhatsApp = true;

  const reservasAfectadas = useMemo(() => {
    if (blockMode === 'times') {
      const sel = new Set((Array.isArray(selectedTimes) ? selectedTimes : []).map(String));
      return reservasDelBloqueo.filter((r) => sel.has(String(r?.hora || '')));
    }
    return reservasDelBloqueo;
  }, [reservasDelBloqueo, blockMode, selectedTimes]);

  const mustWriteMessage = useMemo(() => {
    return hasWhatsApp && (Array.isArray(reservasAfectadas) ? reservasAfectadas.length > 0 : false);
  }, [hasWhatsApp, reservasAfectadas]);

  const getTimesForBlockDate = useCallback(() => {
    const fecha = String(blockDateYmd || '').trim();
    if (!user?.timetable || !fecha) return [];

    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const [y, m, d] = fecha.split('-').map(Number);
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

    const bloquesDia = (Array.isArray(user.timetable) ? user.timetable : []).filter((b) => {
      const days = Array.isArray(b?.days) ? b.days : [];
      return days.includes(diaSemana);
    });

    const all = bloquesDia.flatMap((b) => {
      if (Array.isArray(b?.times) && b.times.length) {
        return b.times
          .map((t) => {
            const mins = toMinutes(t);
            return mins == null ? null : fmt(mins);
          })
          .filter(Boolean);
      }
      return generateTimes(b?.fromTime, b?.toTime, b?.breakFrom, b?.breakTo, b?.interval || 30);
    });

    return Array.from(new Set(all)).sort();
  }, [user?.timetable, blockDateYmd]);

  const timesForSelectedBlockDate = useMemo(() => getTimesForBlockDate(), [getTimesForBlockDate]);

  const toggleBlockedTime = (t) => {
    const key = String(t);
    setSelectedTimes((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.includes(key) ? list.filter((x) => x !== key) : [...list, key];
    });
  };

  const openBlockModal = () => {
    setBlockDateYmd(selectedYmd);
    setBlockMode('day');
    setSelectedTimes([]);
    setCustomMessage('');
    setShowPlaceholders(false);
    setBlockOpen(true);
  };

  const closeBlockModal = () => {
    if (blocking) return;
    setBlockOpen(false);
  };

  const handleConfirmBlock = () => {
    if (!subscription.canBlockHours) {
      showAlert('Esta funcionalidad está disponible solo en Plan Standard o Teams.', 'info');
      return;
    }

    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(blockDateYmd || '').trim())) {
      showAlert('Selecciona una fecha válida', 'warning');
      return;
    }

    if (blockMode === 'times' && (Array.isArray(selectedTimes) ? selectedTimes.length : 0) === 0) {
      showAlert('Debes seleccionar al menos un horario para bloquear.', 'warning');
      return;
    }

    if (mustWriteMessage && (!customMessage || !String(customMessage).trim())) {
      showAlert('Debes escribir un mensaje para notificar por WhatsApp a los pacientes afectados.', 'warning');
      return;
    }

    const affectedCount = Array.isArray(reservasAfectadas) ? reservasAfectadas.length : 0;
    const msg =
      blockMode === 'day'
        ? `Se bloqueará el día completo. ${affectedCount ? `Se liberarán ${affectedCount} cita(s).` : 'No hay citas agendadas ese día.'}`
        : `Se bloquearán ${selectedTimes.length} horario(s). ${affectedCount ? `Se liberarán ${affectedCount} cita(s).` : 'No hay citas en esos horarios.'}`;

    Alert.alert('Confirmar bloqueo', msg, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', style: 'destructive', onPress: () => handleBlock() },
    ]);
  };

  const handleBlock = async () => {
    setBlocking(true);
    try {
      const payload = {
        fecha: String(blockDateYmd).trim(),
        blockDay: blockMode === 'day',
        mode: blockMode,
        blockedTimes: blockMode === 'times' ? (Array.isArray(selectedTimes) ? selectedTimes : []) : undefined,
        customMessage: customMessage || '',
      };

      const resp = await liberarHorasRequest(payload);
      const reservasLiberadas = resp?.data?.reservasLiberadas || [];

      await fetchReservas();
      try {
        await refreshProfile();
      } catch {
        // ignore
      }

      showAlert(blockMode === 'day' ? 'Día bloqueado correctamente' : 'Horarios bloqueados correctamente', 'success');

      if (hasWhatsApp && Array.isArray(reservasLiberadas) && reservasLiberadas.length > 0 && customMessage && String(customMessage).trim()) {
        let sent = 0;
        let failed = 0;
        const needsLink = /\{enlaceconfirmacion\}/i.test(customMessage) || /\{enlaceConfirmacion\}/.test(customMessage);

        for (const reserva of reservasLiberadas) {
          const rawPhone = reserva?.paciente?.telefono;
          const phoneNumber = normalizePhoneCL(rawPhone);
          const validPhone = /^569\d{8}$/.test(String(phoneNumber));
          if (!validPhone) {
            failed += 1;
            continue;
          }
          let link = '';
          if (needsLink && reserva?._id) {
            link = await fetchConfirmationLink(reserva._id);
          }
          const finalMessage = buildWhatsAppMessage(customMessage, reserva, link);
          if (!finalMessage) {
            failed += 1;
            continue;
          }
          try {
            const wa = await sendWhatsAppRequest({ phoneNumber, message: finalMessage });
            if (wa?.data?.ok) sent += 1;
            else failed += 1;
          } catch {
            failed += 1;
          }
        }

        if (sent > 0) {
          showAlert(`WhatsApp enviado a ${sent} paciente(s).${failed ? ` ${failed} fallo(s).` : ''}`, failed ? 'warning' : 'success');
        } else {
          showAlert('No se pudo enviar WhatsApp. Revisa credenciales y formato 569XXXXXXXX.', 'warning');
        }
      } else if (!hasWhatsApp && (Array.isArray(reservasLiberadas) ? reservasLiberadas.length > 0 : false)) {
        showAlert('Se liberaron citas, pero WhatsApp no está configurado (Green API).', 'warning');
      }

      setBlockOpen(false);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'No se pudo bloquear el día/horarios.';
      showAlert(Array.isArray(msg) ? msg[0] : msg, 'error');
    } finally {
      setBlocking(false);
    }
  };

  // Generar días de la semana actual
  const getWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const weekDays = useMemo(() => getWeekDays(), [selectedDate]);

  const fetchReservas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getReservasRequest();
      const data = res?.data || [];
      setReservasAll(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error cargando reservas:', e);
      setReservasAll([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const openDetail = (reserva) => {
    setSelectedReserva(reserva || null);
    setDetailOpen(true);

    const ymd = getReservaDateKey(reserva?.siguienteCita) || '';
    setEditDateYmd(ymd);
    setEditHour(String(reserva?.hora || ''));
    setEditOpen(false);
    setTimesError('');
    setAvailableTimes([]);

    const fallbackDefault =
      (user?.sucursal?.defaultMessage && String(user.sucursal.defaultMessage).trim()) ||
      (user?.defaultMessage && String(user.defaultMessage).trim()) ||
      '';
    setEditMessage(fallbackDefault);
    setSendWA(Boolean(fallbackDefault));
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedReserva(null);
    setEditOpen(false);
    setSavingEdit(false);
  };

  const parseYmdToDate = (ymd) => {
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || '').trim())) return null;
      const [y, m, d] = ymd.split('-').map((n) => Number(n));
      const dt = new Date(y, m - 1, d);
      return Number.isNaN(dt.getTime()) ? null : dt;
    } catch {
      return null;
    }
  };

  // Determinar si es primera consulta para mostrar botón de registrar ficha
  const activeClinicalCase = useMemo(() => {
    if (!selectedReserva) return null;
    const cases = Array.isArray(selectedReserva?.paciente?.clinicalCases) 
      ? selectedReserva.paciente.clinicalCases 
      : [];
    const activeId = selectedReserva?.activeClinicalCaseId;
    if (!activeId || cases.length === 0) return null;
    return cases.find((c) => String(c?._id) === String(activeId)) || null;
  }, [selectedReserva]);

  // Determinar si es primera consulta o si puede iniciar nuevo diagnóstico
  const shouldShowFichaButtons = useMemo(() => {
    if (!selectedReserva?.paciente) return null;
    
    const cases = Array.isArray(selectedReserva?.paciente?.clinicalCases)
      ? selectedReserva.paciente.clinicalCases
      : [];
    const activeId = selectedReserva?.activeClinicalCaseId;
    
    // Si hay un activeClinicalCaseId O si hay casos clínicos, el paciente YA TIENE diagnóstico
    if (activeId || cases.length > 0) {
      return { type: 'newDiagnosis', hasExisting: true };
    }
    
    // Si no hay casos ni ID activo, pero activeClinicalCase existe y sin info inicial
    if (activeClinicalCase) {
      const hasInitialInfo = Boolean(activeClinicalCase?.diagnostico || activeClinicalCase?.anamnesis);
      const activeSesionesCount = Array.isArray(activeClinicalCase?.sesiones) ? activeClinicalCase.sesiones.length : 0;
      if (!hasInitialInfo && activeSesionesCount === 0) {
        return { type: 'primeraConsulta', hasExisting: false };
      }
    }
    
    // Fallback legacy
    const legacyHasInitialInfo = Boolean(selectedReserva?.paciente?.diagnostico || selectedReserva?.paciente?.anamnesis);
    const legacySesionesCount = Array.isArray(selectedReserva?.paciente?.historial) ? selectedReserva.paciente.historial.length : 0;
    if (!legacyHasInitialInfo && legacySesionesCount === 0) {
      return { type: 'primeraConsulta', hasExisting: false };
    }
    
    return null;
  }, [activeClinicalCase, selectedReserva?.paciente]);

  const handleRegistrarFichaInicial = () => {
    const paciente = selectedReserva?.paciente;
    if (!paciente?.rut) return;
    
    closeDetail();
    navigation.navigate('Patients', {
      screen: 'PatientCreate',
      params: {
        mode: 'editFromReserva',
        rut: paciente.rut,
        nombre: paciente.nombre || '',
        telefono: paciente.telefono || '',
        email: paciente.email || '',
        isPrimeraConsulta: true,
        reservaId: selectedReserva?._id,
        activeClinicalCaseId: selectedReserva?.activeClinicalCaseId,
        skipToStep: 1,
      },
    });
  };

  const handleIniciarNuevoDiagnostico = async () => {
    try {
      const paciente = selectedReserva?.paciente;
      if (!paciente?.rut) {
        showAlert('RUT del paciente no disponible', 'error');
        return;
      }
      
      console.log('Iniciando nuevo diagnóstico para:', paciente.rut);
      
      // Iniciar nuevo caso clínico en el backend
      await updateReservaRequest(paciente.rut, { startNewClinicalCase: true });
      console.log('Nuevo diagnóstico iniciado en backend');
      
      // Cerrar el detalle ANTES de navegar
      closeDetail();
      
      // Navegar a PatientCreateScreen para agregar la información clínica
      setTimeout(() => {
        navigation.navigate('Patients', {
          screen: 'PatientCreate',
          params: {
            mode: 'editFromReserva',
            rut: paciente.rut,
            nombre: paciente.nombre || '',
            telefono: paciente.telefono || '',
            email: paciente.email || '',
            isPrimeraConsulta: false,
            reservaId: selectedReserva?._id,
            skipToStep: 1,
          },
        });
      }, 300); // Pequeño delay para asegurar que el modal se cierre primero
    } catch (error) {
      console.error('Error iniciando nuevo diagnóstico:', error);
      showAlert('No se pudo iniciar el nuevo diagnóstico', 'error');
    }
  };

  const selectedProfesionalId = useMemo(() => {
    return (
      selectedReserva?.profesional?._id ||
      selectedReserva?.profesional?.id ||
      user?.id ||
      user?._id ||
      null
    );
  }, [selectedReserva?.profesional, user?.id, user?._id]);

  const fetchAvailableTimes = useCallback(
    async (fechaYmd) => {
      if (!fechaYmd || !selectedProfesionalId) return;
      setTimesLoading(true);
      setTimesError('');
      try {
        const res = await obtenerHorasDisponiblesRequest({ profesionalId: selectedProfesionalId, fecha: fechaYmd });
        const times = res?.data?.times;
        setAvailableTimes(Array.isArray(times) ? times : []);
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || 'No se pudieron cargar horas disponibles.';
        setTimesError(msg);
        setAvailableTimes([]);
      } finally {
        setTimesLoading(false);
      }
    },
    [selectedProfesionalId]
  );

  const weekdayMap = {
    Domingo: 0,
    Lunes: 1,
    Martes: 2,
    Miércoles: 3,
    Miercoles: 3,
    Jueves: 4,
    Viernes: 5,
    Sábado: 6,
    Sabado: 6,
  };

  // Filtrar horas disponibles que ya pasaron si es hoy
  const filteredAvailableTimes = useMemo(() => {
    if (!Array.isArray(availableTimes) || availableTimes.length === 0) return [];
    
    // Obtener la fecha actual en formato YYYY-MM-DD local
    const today = new Date();
    const todayYmd = toYmdLocal(today);
    
    // Si el día seleccionado NO es hoy, mostrar todas las horas
    if (editDateYmd !== todayYmd) {
      return availableTimes;
    }
    
    // Si es hoy, filtrar horas que ya pasaron
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    return availableTimes.filter((timeStr) => {
      try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        // Si la hora es mayor que la actual, o si es igual pero los minutos son mayores, incluir
        if (hours > currentHour || (hours === currentHour && minutes > currentMinute)) {
          return true;
        }
        return false;
      } catch {
        return true; // Si hay error al parsear, incluir la hora
      }
    });
  }, [availableTimes, editDateYmd]);

  const toYMDUtc = (d) => {
    try {
      const dt = d instanceof Date ? d : new Date(d);
      if (Number.isNaN(dt.getTime())) return '';
      const yyyy = dt.getUTCFullYear();
      const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dt.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return '';
    }
  };

  const workingWeekdays = useMemo(() => {
    const set = new Set();
    const timetable = Array.isArray(selectedReserva?.profesional?.timetable)
      ? selectedReserva.profesional.timetable
      : Array.isArray(user?.timetable)
        ? user.timetable
        : [];
    timetable.forEach((block) => {
      (Array.isArray(block?.days) ? block.days : []).forEach((d) => {
        const idx = weekdayMap[String(d || '').trim()];
        if (Number.isInteger(idx)) set.add(idx);
      });
    });
    return set;
  }, [selectedReserva?.profesional?.timetable, user?.timetable]);

  const blockedDaysSet = useMemo(() => {
    const set = new Set();
    const blockedDays = Array.isArray(selectedReserva?.profesional?.blockedDays)
      ? selectedReserva.profesional.blockedDays
      : Array.isArray(user?.blockedDays)
        ? user.blockedDays
        : [];
    blockedDays.forEach((d) => {
      const ymd = toYMDUtc(d);
      if (ymd) set.add(ymd);
    });
    return set;
  }, [selectedReserva?.profesional?.blockedDays, user?.blockedDays]);

  const myBlockedDaysMarks = useMemo(() => {
    const out = {};
    const blockedDays = Array.isArray(user?.blockedDays) ? user.blockedDays : [];
    blockedDays.forEach((d) => {
      const ymd = toYMDUtc(d);
      if (!ymd) return;
      out[ymd] = { marked: true, dotColor: '#c62828' };
    });
    return out;
  }, [user?.blockedDays]);

  const editMarkedDates = useMemo(() => {
    const year = visibleMonth.year;
    const month = visibleMonth.month;
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    const daysInMonth = last.getDate();

    const out = {};
    for (let d = 1; d <= daysInMonth; d += 1) {
      const date = new Date(year, month - 1, d);
      const ymd = toYmdLocal(date);
      const weekday = date.getDay();
      const noSchedule = workingWeekdays.size > 0 ? !workingWeekdays.has(weekday) : false;
      const isBlocked = blockedDaysSet.has(ymd) || blockedDaysSet.has(toYMDUtc(date));
      if (noSchedule || isBlocked) {
        out[ymd] = { disabled: true, disableTouchEvent: true };
      }
    }

    if (editDateYmd) {
      const existing = out[editDateYmd] || {};
      out[editDateYmd] = { ...existing, selected: true, selectedColor: colors.primary };
    }
    return out;
  }, [visibleMonth.year, visibleMonth.month, workingWeekdays, blockedDaysSet, editDateYmd]);

  const handleSaveEdit = async () => {
    const rut = selectedReserva?.paciente?.rut;
    if (!rut) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(editDateYmd || '').trim())) {
      showAlert('Selecciona una fecha válida', 'warning');
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(editHour || '').trim())) {
      showAlert('Selecciona una hora válida', 'warning');
      return;
    }

    setSavingEdit(true);
    try {
      await updateReservaRequest(rut, {
        siguienteCita: editDateYmd,
        hora: editHour,
        mensajePaciente: editMessage,
        profesionalOriginal: selectedReserva?.profesional?._id || selectedReserva?.profesional?.id,
      });

      // Refrescar lista + UI local
      await fetchReservas();

      const dt = parseYmdToDate(editDateYmd);
      if (dt) setSelectedDate(dt);

      // WhatsApp: enviar si corresponde
      if (sendWA) {
        const fallbackDefault =
          (user?.sucursal?.defaultMessage && String(user.sucursal.defaultMessage).trim()) ||
          (user?.defaultMessage && String(user.defaultMessage).trim()) ||
          '';
        const template = (editMessage && String(editMessage).trim()) || fallbackDefault;

        if (!template) {
          showAlert('Cita actualizada. No se envió WhatsApp (sin mensaje definido).', 'info');
        } else {
          const rawPhone = selectedReserva?.paciente?.telefono;
          const phoneNumber = normalizePhoneCL(rawPhone);
          const validPhone = /^569\d{8}$/.test(String(phoneNumber));
          if (!validPhone) {
            showAlert(`Cita actualizada. Teléfono no válido para WhatsApp: "${rawPhone || ''}"`, 'warning');
          } else {
            // La cita ya se actualizó; un fallo del WhatsApp no debe reportarse como error del reagendado.
            try {
              const needsLink = /\{enlaceconfirmacion\}/i.test(template) || /\{enlaceConfirmacion\}/.test(template);
              const link = needsLink ? await fetchConfirmationLink(selectedReserva?._id) : '';
              const reservaForMsg = {
                ...selectedReserva,
                siguienteCita: editDateYmd,
                hora: editHour,
              };
              const finalMessage = buildWhatsAppMessage(template, reservaForMsg, link);
              if (finalMessage) {
                const resp = await sendWhatsAppRequest({ phoneNumber, message: finalMessage });
                if (resp?.data?.ok) {
                  showAlert('WhatsApp enviado al paciente', 'success');
                } else {
                  showAlert('Cita actualizada, pero WhatsApp falló', 'warning');
                }
              }
            } catch (waError) {
              const waMsg = waError?.response?.data?.message || 'no se pudo enviar el mensaje';
              showAlert(`Cita actualizada, pero WhatsApp falló: ${waMsg}`, 'warning');
            }
          }
        }
      } else {
        showAlert('Cita actualizada', 'success');
      }

      // Mantener el modal abierto, pero cerrar la edición
      setEditOpen(false);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'No se pudo actualizar la cita.';
      showAlert(msg, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const setConfirmStatus = async (status) => {
    if (!selectedReserva?._id) return;
    setUpdatingStatus(true);
    try {
      await updateConfirmStatusRequest(selectedReserva._id, status);
      // Optimistic update in list
      setReservasAll((prev) =>
        (Array.isArray(prev) ? prev : []).map((r) =>
          String(r?._id) === String(selectedReserva._id) ? { ...r, confirmStatus: status } : r
        )
      );
      setSelectedReserva((prev) => (prev ? { ...prev, confirmStatus: status } : prev));
    } catch (e) {
      console.error('Error actualizando estado:', e);
      // fallback refresh
      try {
        await fetchReservas();
      } catch {
        // ignore
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReservas();
    }, [fetchReservas])
  );

  const DayButton = ({ date }) => {
    const isSelected = isSameDay(date, selectedDate);
    const isToday = isSameDay(date, new Date());
    
    return (
      <TouchableOpacity
        style={[
          styles.dayButton,
          isSelected && styles.dayButtonSelected,
          isToday && !isSelected && styles.dayButtonToday,
        ]}
        onPress={() => setSelectedDate(date)}
      >
        <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
          {format(date, 'EEE', { locale: es }).toUpperCase()}
        </Text>
        <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
          {format(date, 'd')}
        </Text>
      </TouchableOpacity>
    );
  };

  const statusMap = {
    confirmed: { bg: '#e8f5e9', fg: '#2e7d32', label: 'Confirmada' },
    pending: { bg: '#fff3e0', fg: '#ef6c00', label: 'Pendiente' },
    cancelled: { bg: '#ffebee', fg: '#c62828', label: 'Cancelada' },
    reschedule_requested: { bg: colors.primarySoft, fg: colors.primary, label: 'Solicitud cambio' },
    completed: { bg: '#e3f2fd', fg: '#1565c0', label: 'Completada' },
  };

  const ReservaCard = ({ reserva }) => {
    const horaInicio = reserva?.hora || '';
    const horaFin = horaInicio ? addMinutesToHHMM(horaInicio, 30) : '';
    const estadoRaw = String(reserva?.confirmStatus || 'pending').toLowerCase().trim();
    const st = statusMap[estadoRaw] || statusMap.pending;
    const tipo = reserva?.tipoCita || 'Consulta';
    const modalidad = reserva?.tipoAtencion || reserva?.modalidad || '';

    return (
      <TouchableOpacity style={styles.reservaCard} onPress={() => openDetail(reserva)}>
      <View style={[styles.reservaColorBar, { backgroundColor: colors.primary }]} />
      <View style={styles.reservaContent}>
        <View style={styles.reservaHeader}>
          <Text style={styles.reservaTime}>
            {horaInicio || '—'}{horaFin ? ` - ${horaFin}` : ''}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
          </View>
        </View>
        <Text style={styles.reservaPaciente}>
          {reserva.paciente?.nombre || 'Paciente'}
        </Text>
        <Text style={styles.reservaServicio}>
          {tipo}{modalidad ? ` · ${modalidad}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Modal: Bloquear día u horarios */}
      <Modal visible={blockOpen} transparent animationType="slide" onRequestClose={closeBlockModal}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeBlockModal} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bloquear día u horarios</Text>
              <TouchableOpacity onPress={closeBlockModal} style={styles.modalCloseBtn} disabled={blocking}>
                <Ionicons name="close" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {!subscription.canBlockHours ? (
                <View style={[styles.modalCard, { borderColor: '#ffe7bf', backgroundColor: '#fff7e6' }]}>
                  <Text style={[styles.modalRowValue, { color: '#8a5a00' }]}>Disponible solo en Plan Standard o Teams.</Text>
                </View>
              ) : null}

              <View style={styles.modalCard}>
                <Text style={styles.modalSectionTitle}>Fecha</Text>
                <Calendar
                  current={blockDateYmd || undefined}
                  markedDates={(() => {
                    const merged = { ...myBlockedDaysMarks };
                    if (blockDateYmd) {
                      const existing = merged[blockDateYmd] || {};
                      merged[blockDateYmd] = { ...existing, selected: true, selectedColor: colors.primary };
                    }
                    return merged;
                  })()}
                  firstDay={1}
                  onDayPress={(day) => {
                    const ymd = day?.dateString;
                    if (!ymd) return;
                    setBlockDateYmd(ymd);
                    setSelectedTimes([]);
                  }}
                  theme={{
                    selectedDayBackgroundColor: colors.primary,
                    todayTextColor: colors.primary,
                    arrowColor: colors.primary,
                  }}
                  style={styles.editCalendar}
                />

                <View style={styles.legendRow}>
                  <View style={styles.legendDot} />
                  <Text style={styles.legendText}>Día ya bloqueado</Text>
                </View>
              </View>

              <View style={styles.modalCard}>
                <Text style={styles.modalSectionTitle}>Modo</Text>
                <View style={styles.segmentRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setBlockMode('day');
                      setSelectedTimes([]);
                    }}
                    style={[styles.segmentBtn, blockMode === 'day' && styles.segmentBtnActive]}
                  >
                    <Text style={[styles.segmentText, blockMode === 'day' && styles.segmentTextActive]}>Día completo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setBlockMode('times')}
                    style={[styles.segmentBtn, blockMode === 'times' && styles.segmentBtnActive]}
                  >
                    <Text style={[styles.segmentText, blockMode === 'times' && styles.segmentTextActive]}>Horarios</Text>
                  </TouchableOpacity>
                </View>

                {blockMode === 'times' ? (
                  <>
                    {timesForSelectedBlockDate.length === 0 ? (
                      <Text style={styles.muted}>No hay horarios definidos en tu agenda para este día.</Text>
                    ) : null}

                    <View style={styles.timesWrap}>
                      {timesForSelectedBlockDate.map((t) => {
                        const isSelected = (Array.isArray(selectedTimes) ? selectedTimes : []).includes(String(t));
                        return (
                          <TouchableOpacity
                            key={t}
                            style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                            onPress={() => toggleBlockedTime(t)}
                          >
                            <Text style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}>{t}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                ) : null}
              </View>

              <View style={styles.modalCard}>
                <Text style={styles.modalSectionTitle}>Citas afectadas</Text>
                <Text style={styles.modalMuted}>
                  {Array.isArray(reservasAfectadas) && reservasAfectadas.length
                    ? `Se liberarán ${reservasAfectadas.length} cita(s).`
                    : 'No hay citas afectadas.'}
                </Text>

                {mustWriteMessage ? (
                  <Text style={[styles.modalMuted, { marginTop: 6, color: '#8a5a00' }]}>Debe enviar un mensaje por WhatsApp.</Text>
                ) : !hasWhatsApp && (Array.isArray(reservasAfectadas) ? reservasAfectadas.length > 0 : false) ? (
                  <Text style={[styles.modalMuted, { marginTop: 6, color: '#8a5a00' }]}>
                    WhatsApp no está configurado (Green API).
                  </Text>
                ) : null}
              </View>

              <View style={styles.modalCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.modalSectionTitle}>Mensaje WhatsApp</Text>
                  <TouchableOpacity onPress={() => setShowPlaceholders((v) => !v)} style={styles.helpBtn}>
                    <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
                    <Text style={styles.helpBtnText}>Placeholders</Text>
                  </TouchableOpacity>
                </View>

                {showPlaceholders ? (
                  <View style={styles.placeholderWrap}>
                    {PLACEHOLDERS.map((p) => (
                      <TouchableOpacity
                        key={p.token}
                        style={styles.placeholderChip}
                        onPress={() => setCustomMessage((prev) => `${String(prev || '').trim()}${String(prev || '').trim() ? ' ' : ''}${p.token} `)}
                      >
                        <Text style={styles.placeholderChipText}>{p.token}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}

                <TextInput
                  value={customMessage}
                  onChangeText={setCustomMessage}
                  placeholder={mustWriteMessage ? 'Es obligatorio escribir un mensaje para notificar a pacientes.' : 'Opcional (solo si quieres notificar por WhatsApp)'}
                  multiline
                  style={[styles.messageInput, mustWriteMessage && (!customMessage || !String(customMessage).trim()) && styles.messageInputError]}
                />
              </View>

              <TouchableOpacity
                disabled={blocking}
                style={[styles.saveBtn, (!subscription.canBlockHours || blocking) && { opacity: 0.7 }]}
                onPress={handleConfirmBlock}
              >
                {blocking ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Bloquear</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalClosePrimary} onPress={closeBlockModal} disabled={blocking}>
                <Text style={styles.modalClosePrimaryText}>Cerrar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Panel detalle (tipo DespliegueEventos) */}
      <Modal
        visible={detailOpen}
        transparent
        animationType="slide"
        onRequestClose={closeDetail}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeDetail} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle cita</Text>
              <TouchableOpacity onPress={closeDetail} style={styles.modalCloseBtn}>
                        <Ionicons name="close" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {selectedReserva ? (
              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={styles.modalBodyContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.modalCard}>
                  <Text style={styles.modalPatientName}>{selectedReserva?.paciente?.nombre || 'Paciente'}</Text>
                  {!!selectedReserva?.paciente?.rut && (
                    <Text style={styles.modalMuted}>RUT: {selectedReserva.paciente.rut}</Text>
                  )}
                  {!!selectedReserva?.paciente?.telefono && (
                    <Text style={styles.modalMuted}>Tel: {selectedReserva.paciente.telefono}</Text>
                  )}
                  {!!selectedReserva?.paciente?.email && (
                    <Text style={styles.modalMuted}>Email: {selectedReserva.paciente.email}</Text>
                  )}
                </View>

                {/* Botón Primera Consulta o Nuevo Diagnóstico */}
                {shouldShowFichaButtons && (
                  <View style={styles.primeraConsultaCard}>
                    <View style={styles.primeraConsultaHeader}>
                      <Ionicons
                        name={shouldShowFichaButtons.type === 'newDiagnosis' ? 'add-circle-outline' : 'document-text'}
                        size={24}
                        color="#2596be"
                      />
                      <View style={styles.primeraConsultaTextContainer}>
                        <Text style={styles.primeraConsultaTitle}>
                          {shouldShowFichaButtons.type === 'newDiagnosis' ? 'Nuevo Diagnóstico' : 'Primera Consulta'}
                        </Text>
                        <Text style={styles.primeraConsultaSubtitle}>
                          {shouldShowFichaButtons.type === 'newDiagnosis'
                            ? 'Inicia un nuevo caso clínico para el paciente'
                            : 'Registra la información inicial del paciente'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.primeraConsultaBtn}
                      onPress={shouldShowFichaButtons.type === 'newDiagnosis'
                        ? handleIniciarNuevoDiagnostico
                        : handleRegistrarFichaInicial}
                    >
                      <Ionicons name="add-circle-outline" size={18} color="#fff" />
                      <Text style={styles.primeraConsultaBtnText}>
                        {shouldShowFichaButtons.type === 'newDiagnosis' ? 'Iniciar Nuevo Diagnóstico' : 'Registrar Ficha Inicial'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.modalCard}>
                  <Text style={styles.modalRowLabel}>Fecha</Text>
                  <Text style={styles.modalRowValue}>
                    {format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}
                  </Text>

                  <Text style={[styles.modalRowLabel, { marginTop: 10 }]}>Hora</Text>
                  <Text style={styles.modalRowValue}>
                    {selectedReserva?.hora || '—'}
                    {selectedReserva?.hora ? ` - ${addMinutesToHHMM(selectedReserva.hora, 30)}` : ''}
                  </Text>

                  <Text style={[styles.modalRowLabel, { marginTop: 10 }]}>Tipo</Text>
                  <Text style={styles.modalRowValue}>{selectedReserva?.tipoCita || 'Consulta'}</Text>

                  <Text style={[styles.modalRowLabel, { marginTop: 10 }]}>Modalidad</Text>
                  <Text style={styles.modalRowValue}>
                    {selectedReserva?.tipoAtencion || selectedReserva?.modalidad || '—'}
                  </Text>
                </View>

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnSecondary]}
                    onPress={() => {
                      const rut = selectedReserva?.paciente?.rut;
                      if (!rut) return;
                      closeDetail();
                      navigation?.navigate('Patients', {
                        screen: 'PatientDetail',
                        params: { rut, title: selectedReserva?.paciente?.nombre || 'Paciente' },
                      });
                    }}
                  >
                    <Ionicons name="person-outline" size={16} color={colors.primary} />
                    <Text style={styles.actionBtnSecondaryText}>Ver paciente</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnSecondary, { marginLeft: 10 }]}
                    onPress={() => {
                      const next = !editOpen;
                      setEditOpen(next);
                      if (next && editDateYmd) {
                        fetchAvailableTimes(editDateYmd);
                      }
                    }}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                    <Text style={styles.actionBtnSecondaryText}>Editar cita</Text>
                  </TouchableOpacity>
                </View>

                {editOpen ? (
                  <View style={styles.modalCard}>
                    <Text style={styles.modalSectionTitle}>Reagendar</Text>

                    <Calendar
                      current={editDateYmd || undefined}
                      markedDates={editMarkedDates}
                      firstDay={1}
                      onMonthChange={(m) => setVisibleMonth({ year: m.year, month: m.month })}
                      onDayPress={(day) => {
                        const ymd = day?.dateString;
                        if (!ymd) return;
                        setEditDateYmd(ymd);
                        setEditHour('');
                        fetchAvailableTimes(ymd);
                      }}
                      theme={{
                        selectedDayBackgroundColor: colors.primary,
                        todayTextColor: colors.primary,
                        arrowColor: colors.primary,
                      }}
                      style={styles.editCalendar}
                    />

                    {timesLoading ? (
                      <View style={styles.centerRow}>
                        <ActivityIndicator color={colors.primary} />
                        <Text style={styles.muted}>Cargando horas…</Text>
                      </View>
                    ) : timesError ? (
                      <Text style={styles.errorText}>{timesError}</Text>
                    ) : null}

                    <View style={styles.timesWrap}>
                      {(Array.isArray(filteredAvailableTimes) ? filteredAvailableTimes : []).map((t) => {
                        const isSelected = String(editHour) === String(t);
                        return (
                          <TouchableOpacity
                            key={t}
                            style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                            onPress={() => setEditHour(String(t))}
                          >
                            <Text style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}>{t}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={[styles.modalRowLabel, { marginTop: 8 }]}>Mensaje WhatsApp (opcional)</Text>
                    <TextInput
                      value={editMessage}
                      onChangeText={setEditMessage}
                      placeholder="Escribe un mensaje o usa el por defecto"
                      multiline
                      style={styles.messageInput}
                    />

                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>Enviar WhatsApp al guardar</Text>
                      <Switch value={sendWA} onValueChange={setSendWA} />
                    </View>

                    <TouchableOpacity
                      disabled={savingEdit}
                      style={[styles.saveBtn, savingEdit && { opacity: 0.7 }]}
                      onPress={handleSaveEdit}
                    >
                      {savingEdit ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.saveBtnText}>Guardar cambios</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null}

                <Text style={styles.modalSectionTitle}>Estado</Text>
                <View style={styles.statusButtonsRow}>
                  <TouchableOpacity
                    disabled={updatingStatus}
                    style={[styles.statusBtn, styles.statusBtnSuccess]}
                    onPress={() => setConfirmStatus('confirmed')}
                  >
                    <Text style={styles.statusBtnText}>Confirmar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={updatingStatus}
                    style={[styles.statusBtn, styles.statusBtnWarn]}
                    onPress={() => setConfirmStatus('pending')}
                  >
                    <Text style={styles.statusBtnText}>Pendiente</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={updatingStatus}
                    style={[styles.statusBtn, styles.statusBtnInfo]}
                    onPress={() => setConfirmStatus('reschedule_requested')}
                  >
                    <Text style={styles.statusBtnText}>Cambio</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={updatingStatus}
                    style={[styles.statusBtn, styles.statusBtnDanger]}
                    onPress={() => setConfirmStatus('cancelled')}
                  >
                    <Text style={styles.statusBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>

                {updatingStatus ? (
                  <View style={styles.centerRow}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.muted}>Actualizando estado…</Text>
                  </View>
                ) : null}

                <TouchableOpacity style={styles.modalClosePrimary} onPress={closeDetail}>
                  <Text style={styles.modalClosePrimaryText}>Cerrar</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Week Selector */}
      <View style={styles.weekContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekScroll}
        >
          {weekDays.map((date, index) => (
            <DayButton key={index} date={date} />
          ))}
        </ScrollView>
      </View>

      {/* Selected Date Header */}
      <View style={styles.dateHeader}>
        <Text style={styles.selectedDateText}>
          {format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}
        </Text>
      </View>

      {/* Reservas List */}
      <ScrollView style={styles.reservasList}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : reservas.length > 0 ? (
          reservas.map((reserva, index) => (
            <ReservaCard key={reserva._id || index} reserva={reserva} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>Sin citas</Text>
            <Text style={styles.emptyStateText}>
              No hay citas programadas para este día
            </Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={fetchReservas}>
              <Text style={styles.refreshBtnText}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bloquear día / horarios */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={openBlockModal}
        accessibilityLabel="Bloquear día u horarios"
      >
        <Ionicons name="lock-closed" size={22} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  weekContainer: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  weekScroll: {
    paddingHorizontal: 10,
  },
  dayButton: {
    width: 50,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  dayButtonSelected: {
    backgroundColor: colors.primary,
  },
  dayButtonToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayName: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  dayNameSelected: {
    color: '#fff',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  dayNumberSelected: {
    color: '#fff',
  },
  dateHeader: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedDateText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  reservasList: {
    flex: 1,
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  reservaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  reservaColorBar: {
    width: 4,
    height: '100%',
  },
  reservaContent: {
    flex: 1,
    padding: 15,
  },
  reservaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reservaTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reservaPaciente: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  reservaServicio: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  refreshBtn: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  refreshBtnText: {
    color: colors.primary,
    fontWeight: '800',
  },

  // Modal panel
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    maxHeight: '85%',
  },
  modalBody: {
    flexGrow: 0,
  },
  modalBodyContent: {
    paddingBottom: 22,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#222',
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  modalCard: {
    backgroundColor: '#fafafa',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 12,
  },
  modalPatientName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
  },
  modalMuted: {
    marginTop: 4,
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  modalRowLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '800',
  },
  modalRowValue: {
    marginTop: 3,
    fontSize: 14,
    color: '#222',
    fontWeight: '800',
  },
  modalSectionTitle: {
    marginTop: 6,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '900',
    color: '#333',
  },
  statusButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 10,
  },
  statusBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  statusBtnSuccess: { backgroundColor: '#2e7d32' },
  statusBtnWarn: { backgroundColor: '#ef6c00' },
  statusBtnInfo: { backgroundColor: colors.primary },
  statusBtnDanger: { backgroundColor: '#c62828' },
  modalClosePrimary: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalClosePrimaryText: {
    color: '#fff',
    fontWeight: '900',
  },

  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  actionBtnSecondary: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  actionBtnSecondaryText: {
    marginLeft: 8,
    color: colors.primary,
    fontWeight: '900',
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  muted: {
    marginLeft: 10,
    color: '#666',
    fontWeight: '700',
  },

  editCalendar: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  timesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  timeChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 10,
    marginBottom: 10,
  },
  timeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeChipText: {
    color: '#333',
    fontWeight: '800',
  },
  timeChipTextSelected: {
    color: '#fff',
  },
  messageInput: {
    marginTop: 6,
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  messageInputError: {
    borderColor: '#ef6c00',
    backgroundColor: '#fff7e6',
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  segmentText: {
    fontWeight: '900',
    color: '#666',
  },
  segmentTextActive: {
    color: colors.primary,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  helpBtnText: {
    marginLeft: 6,
    color: colors.primary,
    fontWeight: '900',
    fontSize: 12,
  },
  placeholderWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  placeholderChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 10,
    marginBottom: 10,
  },
  placeholderChipText: {
    color: '#333',
    fontWeight: '900',
    fontSize: 12,
  },
  legendRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#c62828',
    marginRight: 8,
  },
  legendText: {
    color: '#666',
    fontWeight: '800',
    fontSize: 12,
  },
  switchRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    color: '#333',
    fontWeight: '800',
  },
  saveBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '900',
  },
  errorText: {
    marginTop: 8,
    color: '#c62828',
    fontWeight: '800',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Estilos Primera Consulta
  primeraConsultaCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  primeraConsultaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  primeraConsultaTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  primeraConsultaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0c4a6e',
  },
  primeraConsultaSubtitle: {
    fontSize: 13,
    color: '#0369a1',
    marginTop: 2,
  },
  primeraConsultaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2596be',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#2596be',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  primeraConsultaBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CalendarScreen;
