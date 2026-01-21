import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';

import { addHistorialRequest, updateReservaRequest } from '../../api/reservas';
import { obtenerHorasDisponiblesRequest } from '../../api/funciones';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';

// Calendar locale (es)
LocaleConfig.locales.es = LocaleConfig.locales.es || {
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

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const normalizeHtml = (val) => {
  const raw = String(val || '').trim();
  if (!raw) return '';
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
  const safe = escapeHtml(raw).replace(/\n/g, '<br/>');
  return `<p>${safe}</p>`;
};

const todayYmd = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

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

const AddSessionScreen = ({ route, navigation }) => {
  const { user } = useAuth();

  const rut = route?.params?.rut;
  const pacienteNombre = route?.params?.pacienteNombre || 'Paciente';
  const diagnostico = route?.params?.diagnostico || '';

  const profesionalId = useMemo(() => user?.id || user?._id || null, [user?.id, user?._id]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [notas, setNotas] = useState('');
  const [fechaSesion, setFechaSesion] = useState(todayYmd());

  const [agendarNuevaCita, setAgendarNuevaCita] = useState(false);
  const [cobrarNuevaCita, setCobrarNuevaCita] = useState(true);
  const [fechaCita, setFechaCita] = useState('');
  const [horaCita, setHoraCita] = useState('');

  const [timesLoading, setTimesLoading] = useState(false);
  const [timesError, setTimesError] = useState('');
  const [availableTimes, setAvailableTimes] = useState([]);

  const blockedDaysSet = useMemo(() => {
    const raw = Array.isArray(user?.blockedDays) ? user.blockedDays : [];
    const out = new Set();
    raw.forEach((d) => {
      const key = toYMDUtc(d);
      if (key) out.add(key);
    });
    return out;
  }, [user?.blockedDays]);

  const workingWeekdays = useMemo(() => {
    const map = {
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
    const blocks = Array.isArray(user?.timetable) ? user.timetable : [];
    const days = new Set();
    blocks.forEach((b) => {
      (b?.days || []).forEach((name) => {
        const idx = map[String(name || '').trim()];
        if (typeof idx === 'number') days.add(idx);
      });
    });
    return days;
  }, [user?.timetable]);

  const isDisabledDay = (ymd) => {
    if (!ymd) return false;
    if (blockedDaysSet.has(ymd)) return true;
    // Si no hay timetable, no bloqueamos por horario
    if (!workingWeekdays || workingWeekdays.size === 0) return false;
    const d = new Date(`${ymd}T00:00:00`);
    if (Number.isNaN(d.getTime())) return false;
    return !workingWeekdays.has(d.getDay());
  };

  useEffect(() => {
    navigation.setOptions({ title: 'Agregar sesión' });
  }, [navigation]);

  useEffect(() => {
    const run = async () => {
      if (!agendarNuevaCita || !fechaCita || !profesionalId) return;
      setTimesLoading(true);
      setTimesError('');
      setAvailableTimes([]);
      try {
        const resp = await obtenerHorasDisponiblesRequest({ profesionalId, fecha: fechaCita });
        const times = resp?.data?.times || resp?.times || [];
        setAvailableTimes(Array.isArray(times) ? times : []);
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || 'No se pudieron cargar horas.';
        setTimesError(msg);
      } finally {
        setTimesLoading(false);
      }
    };
    run();
  }, [agendarNuevaCita, fechaCita, profesionalId]);

  const markedSesion = useMemo(
    () => ({
      [fechaSesion]: { selected: true, selectedColor: colors.primary },
    }),
    [fechaSesion]
  );

  const markedCita = useMemo(() => {
    const marked = {};
    if (fechaCita) {
      marked[fechaCita] = { selected: true, selectedColor: colors.primary };
    }
    return marked;
  }, [fechaCita]);

  // Filtrar horas que ya pasaron si se selecciona hoy
  const filteredAvailableTimes = useMemo(() => {
    if (!Array.isArray(availableTimes) || availableTimes.length === 0) return [];
    
    const today = todayYmd();
    if (fechaCita !== today) return availableTimes;
    
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    
    return availableTimes.filter((timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours > currentHours || (hours === currentHours && minutes > currentMinutes);
    });
  }, [availableTimes, fechaCita]);

  const handleSave = async () => {
    if (!rut) {
      setErrorMsg('Falta RUT del paciente.');
      return;
    }
    if (!String(notas || '').trim()) {
      setErrorMsg('Por favor ingresa el detalle de la sesión.');
      return;
    }
    if (agendarNuevaCita) {
      if (!fechaCita) {
        setErrorMsg('Selecciona una fecha para la nueva cita.');
        return;
      }
      if (isDisabledDay(fechaCita)) {
        setErrorMsg('Ese día está bloqueado o fuera de horario.');
        return;
      }
      if (!horaCita) {
        setErrorMsg('Selecciona una hora para la nueva cita.');
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      // 1) Guardar sesión
      await addHistorialRequest(rut, {
        fecha: fechaSesion,
        notas: normalizeHtml(notas),
        siguienteCita: agendarNuevaCita ? fechaCita : null,
        hora: agendarNuevaCita ? horaCita : null,
        profesionalOriginal: profesionalId,
      });

      // 2) Si agenda nueva cita, aplicar lógica de pago como en web
      if (agendarNuevaCita) {
        await updateReservaRequest(rut, {
          siguienteCita: new Date(fechaCita),
          hora: horaCita,
          profesional: profesionalId,
          profesionalOriginal: profesionalId,
          resetPaymentForNextAppointment: true,
          requiresPayment: Boolean(cobrarNuevaCita),
        });
      } else {
        // Cerrar ciclo (limpiar próxima cita/hora) para evitar que quede una vieja activa
        try {
          await updateReservaRequest(rut, {
            siguienteCita: null,
            hora: null,
            profesional: profesionalId,
            profesionalOriginal: profesionalId,
          });
        } catch {
          // no bloquear
        }
      }

      navigation.goBack();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Error guardando la sesión.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerCard}>
          <Text style={styles.title}>{pacienteNombre}</Text>
          {!!diagnostico && <Text style={styles.subtitle}>Diagnóstico activo: {diagnostico}</Text>}
        </View>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#d32f2f" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Detalles de la sesión</Text>

          <Text style={styles.label}>Fecha de la sesión</Text>
          <View style={styles.calendarCard}>
            <Calendar
              firstDay={1}
              onDayPress={(day) => day?.dateString && setFechaSesion(day.dateString)}
              markedDates={markedSesion}
              theme={{
                todayTextColor: colors.primary,
                selectedDayBackgroundColor: colors.primary,
                arrowColor: colors.primary,
              }}
            />
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Notas</Text>
          <TextInput
            style={styles.textArea}
            value={notas}
            onChangeText={setNotas}
            placeholder="¿Qué se hizo en la sesión?"
            multiline
          />
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Agendar nueva cita</Text>
            <Switch value={agendarNuevaCita} onValueChange={(v) => {
              setAgendarNuevaCita(v);
              if (!v) {
                setFechaCita('');
                setHoraCita('');
                setAvailableTimes([]);
                setTimesError('');
                setCobrarNuevaCita(true);
              }
            }} />
          </View>

          {!agendarNuevaCita ? (
            <Text style={styles.muted}>Solo se guardará la sesión.</Text>
          ) : (
            <>
              <View style={[styles.rowBetween, { marginTop: 8, marginBottom: 10 }]}>
                <Text style={styles.label}>Cobrar esta nueva cita</Text>
                <Switch value={cobrarNuevaCita} onValueChange={setCobrarNuevaCita} />
              </View>

              <Text style={styles.label}>Fecha</Text>
              <View style={styles.calendarCard}>
                <Calendar
                  firstDay={1}
                  onDayPress={(day) => {
                    const ds = day?.dateString;
                    if (!ds) return;
                    if (isDisabledDay(ds)) return;
                    setFechaCita(ds);
                    setHoraCita('');
                  }}
                  markedDates={markedCita}
                  dayComponent={({ date, state }) => {
                    const ds = date?.dateString;
                    const disabled = state === 'disabled' || isDisabledDay(ds);
                    const selected = ds && ds === fechaCita;
                    return (
                      <TouchableOpacity
                        disabled={disabled}
                        onPress={() => {
                          if (!ds) return;
                          if (isDisabledDay(ds)) return;
                          setFechaCita(ds);
                          setHoraCita('');
                        }}
                        style={{
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: selected ? colors.primary : 'transparent',
                          opacity: disabled ? 0.35 : 1,
                        }}
                      >
                        <Text style={{ color: selected ? '#fff' : '#333', fontWeight: selected ? '900' : '600' }}>
                          {date?.day}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                  theme={{
                    todayTextColor: colors.primary,
                    selectedDayBackgroundColor: colors.primary,
                    arrowColor: colors.primary,
                  }}
                />
              </View>

              {timesLoading ? (
                <View style={styles.centerRow}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.muted}>Cargando horas…</Text>
                </View>
              ) : timesError ? (
                <Text style={styles.errorInline}>{timesError}</Text>
              ) : fechaCita ? (
                availableTimes.length > 0 ? (
                  <View style={styles.timesWrap}>
                    {filteredAvailableTimes.map((t) => {
                      const selected = horaCita === t;
                      return (
                        <TouchableOpacity
                          key={t}
                          style={[styles.timePill, selected && styles.timePillSelected]}
                          onPress={() => setHoraCita(t)}
                        >
                          <Text style={[styles.timePillText, selected && styles.timePillTextSelected]}>{t}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.muted}>No hay horas disponibles para este día.</Text>
                )
              ) : (
                <Text style={styles.muted}>Selecciona un día para ver horas disponibles.</Text>
              )}

              {!!fechaCita && !!horaCita && (
                <View style={styles.selectedSummary}>
                  <Ionicons name="checkmark-circle" size={18} color="#2e7d32" />
                  <Text style={styles.selectedSummaryText}>Seleccionado: {fechaCita} a las {horaCita}</Text>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.footerRow}>
          <TouchableOpacity style={[styles.footerBtn, styles.footerBtnSecondary]} onPress={() => navigation.goBack()} disabled={submitting}>
            <Text style={styles.footerBtnSecondaryText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.footerBtn, styles.footerBtnPrimary]} onPress={handleSave} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.footerBtnPrimaryText}>Guardar sesión</Text>}
          </TouchableOpacity>
        </View>

        <View style={{ height: 14 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 15,
    paddingBottom: 26,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#222',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#333',
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#444',
    marginBottom: 8,
  },
  muted: {
    color: '#666',
    fontSize: 13,
  },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ffcdd2',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    color: '#b71c1c',
    fontWeight: '700',
  },
  errorInline: {
    marginTop: 8,
    color: '#b71c1c',
    fontWeight: '700',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    minHeight: 110,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  calendarCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  timesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  timePill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  timePillSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  timePillText: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 13,
  },
  timePillTextSelected: {
    color: '#fff',
  },
  selectedSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  selectedSummaryText: {
    color: '#2e7d32',
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnPrimary: {
    backgroundColor: colors.primary,
  },
  footerBtnPrimaryText: {
    color: '#fff',
    fontWeight: '900',
  },
  footerBtnSecondary: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  footerBtnSecondaryText: {
    color: colors.primary,
    fontWeight: '900',
  },
});

export default AddSessionScreen;
