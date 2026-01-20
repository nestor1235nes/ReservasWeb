import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { LocaleConfig } from 'react-native-calendars';

import { createPacienteRequest, getPacientePorRutRequest } from '../../api/pacientes';
import { createReservaRequest } from '../../api/reservas';
import { obtenerHorasDisponiblesRequest } from '../../api/funciones';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';

const steps = ['Datos', 'Clínico', 'Consulta', 'Cita'];

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
  monthNamesShort: [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

const isValidDateYMD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '').trim());
const isValidHourHHMM = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || '').trim());

const hasNonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;

const PatientCreateScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [timesLoading, setTimesLoading] = useState(false);
  const [timesError, setTimesError] = useState('');
  const [availableTimes, setAvailableTimes] = useState([]);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const [agendarNuevaCita, setAgendarNuevaCita] = useState(false);
  const [cobrarNuevaCita, setCobrarNuevaCita] = useState(true);
  const [cambiarDiaPrimera, setCambiarDiaPrimera] = useState(false);

  const [form, setForm] = useState({
    nombre: '',
    rut: '',
    telefono: '',
    email: '',

    diagnostico: '',
    anamnesis: '',

    motivoConsulta: '',
    antecedentesPersonales: '',
    antecedentesFamiliares: '',
    alergias: '',
    medicamentosActuales: '',
    examenFisico: '',
    planTratamiento: '',
    indicaciones: '',

    presionArterial: '',
    frecuenciaCardiaca: '',
    pesoKg: '',
    tallaCm: '',
    temperaturaC: '',
    saturacionO2: '',

    // Para agendar
    diaPrimeraCita: '', // YYYY-MM-DD (usado como siguienteCita si se agenda)
    hora: '', // HH:mm

    // Override (primer día de consulta independiente)
    diaPrimeraCitaOverride: '', // YYYY-MM-DD
  });

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const necesitaReserva = useMemo(() => {
    const tieneInformacionMedica = hasNonEmpty(form.diagnostico) || hasNonEmpty(form.anamnesis);
    const tieneDatosClinicos = [
      form.motivoConsulta,
      form.antecedentesPersonales,
      form.antecedentesFamiliares,
      form.alergias,
      form.medicamentosActuales,
      form.examenFisico,
      form.planTratamiento,
      form.indicaciones,
      form.presionArterial,
      form.frecuenciaCardiaca,
      form.pesoKg,
      form.tallaCm,
      form.temperaturaC,
      form.saturacionO2,
    ].some(hasNonEmpty);

    return agendarNuevaCita || tieneInformacionMedica || tieneDatosClinicos;
  }, [agendarNuevaCita, form]);

  const validateStep = () => {
    const rut = String(form.rut || '').trim();
    const nombre = String(form.nombre || '').trim();

    if (activeStep === 0) {
      if (!nombre) return 'El nombre es obligatorio.';
      if (!rut) return 'El RUT es obligatorio.';
    }

    if (activeStep === 3) {
      if (agendarNuevaCita) {
        if (!isValidDateYMD(form.diaPrimeraCita)) return 'Fecha inválida. Usa YYYY-MM-DD.';
        if (!isValidHourHHMM(form.hora)) return 'Hora inválida. Usa HH:mm.';
      }
      if (cambiarDiaPrimera && !isValidDateYMD(form.diaPrimeraCitaOverride)) {
        return 'Primer día de consulta inválido. Usa YYYY-MM-DD.';
      }
    }

    return '';
  };

  const handleNext = () => {
    const msg = validateStep();
    if (msg) {
      setErrorMsg(msg);
      return;
    }
    setErrorMsg('');
    setActiveStep((s) => Math.min(steps.length - 1, s + 1));
  };

  const handleBack = () => {
    setErrorMsg('');
    setActiveStep((s) => Math.max(0, s - 1));
  };

  const todayYmd = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleSubmit = async () => {
    const msg = validateStep();
    if (msg) {
      setErrorMsg(msg);
      return;
    }

    const rut = String(form.rut || '').trim();

    setSubmitting(true);
    setErrorMsg('');

    try {
      // 1) Crear/asegurar paciente (idempotente como en web)
      let pacienteId = null;
      try {
        const resp = await createPacienteRequest(form);
        pacienteId = resp?.data?._id || resp?._id || null;
      } catch (e) {
        const status = e?.response?.status;
        const msg2 = e?.response?.data?.message || '';
        if (status === 400 && /ya existe/i.test(msg2)) {
          const existing = await getPacientePorRutRequest(rut);
          pacienteId = existing?.data?._id || null;
        } else {
          throw e;
        }
      }

      // 2) Crear reserva si corresponde (para diagnóstico/historial/cita)
      if (necesitaReserva) {
        const hoy = todayYmd();
        const diaPrimeraCitaValue = cambiarDiaPrimera
          ? (form.diaPrimeraCitaOverride || hoy)
          : hoy;

        const reservaPayload = {
          ...form,
          diaPrimeraCita: diaPrimeraCitaValue,
          siguienteCita: agendarNuevaCita ? (form.diaPrimeraCita || '') : '',
          hora: agendarNuevaCita ? (form.hora || '') : null,
          ...(agendarNuevaCita ? { requiresPayment: Boolean(cobrarNuevaCita) } : {}),
        };

        await createReservaRequest(rut, reservaPayload);
      }

      navigation.goBack();
    } catch (e) {
      const msg3 = e?.response?.data?.message || e?.message || 'Error creando paciente.';
      setErrorMsg(msg3);
    } finally {
      setSubmitting(false);
    }
  };

  const profesionalId = useMemo(() => user?.id || user?._id || null, [user?.id, user?._id]);

  const toYMD = (d) => {
    try {
      const dt = d instanceof Date ? d : new Date(d);
      if (Number.isNaN(dt.getTime())) return '';
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return '';
    }
  };

  // Backend compara blockedDays por YYYY-MM-DD usando UTC, así que normalizamos igual
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

  const workingWeekdays = useMemo(() => {
    const set = new Set();
    const timetable = Array.isArray(user?.timetable) ? user.timetable : [];
    timetable.forEach((block) => {
      (Array.isArray(block?.days) ? block.days : []).forEach((d) => {
        const idx = weekdayMap[String(d || '').trim()];
        if (Number.isInteger(idx)) set.add(idx);
      });
    });
    return set;
  }, [user?.timetable]);

  const blockedDaysSet = useMemo(() => {
    const set = new Set();
    const blockedDays = Array.isArray(user?.blockedDays) ? user.blockedDays : [];
    blockedDays.forEach((d) => {
      const ymd = toYMDUtc(d);
      if (ymd) set.add(ymd);
    });
    return set;
  }, [user?.blockedDays]);

  const markedDates = useMemo(() => {
    // Deshabilitar días del mes visible donde no hay horario (y días bloqueados)
    const year = visibleMonth.year;
    const month = visibleMonth.month; // 1-12
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    const daysInMonth = last.getDate();

    const out = {};
    for (let d = 1; d <= daysInMonth; d += 1) {
      const date = new Date(year, month - 1, d);
      const ymd = toYMD(date);
      const weekday = date.getDay(); // 0=Dom

      const noSchedule = workingWeekdays.size > 0 ? !workingWeekdays.has(weekday) : true;
      const isBlocked = blockedDaysSet.has(ymd) || blockedDaysSet.has(toYMDUtc(date));

      if (noSchedule || isBlocked) {
        out[ymd] = {
          disabled: true,
          disableTouchEvent: true,
        };
      }
    }

    if (form.diaPrimeraCita) {
      const existing = out[form.diaPrimeraCita] || {};
      // Si por alguna razón quedó como disabled, mantenemos el estilo de disabled.
      out[form.diaPrimeraCita] = {
        ...existing,
        selected: true,
        selectedColor: colors.primary,
      };
    }

    return out;
  }, [visibleMonth.year, visibleMonth.month, workingWeekdays, blockedDaysSet, form.diaPrimeraCita]);

  const fetchAvailableTimes = async (fechaYmd) => {
    if (!fechaYmd || !profesionalId) return;
    setTimesLoading(true);
    setTimesError('');
    try {
      const res = await obtenerHorasDisponiblesRequest({ profesionalId, fecha: fechaYmd });
      const times = res?.data?.times;
      setAvailableTimes(Array.isArray(times) ? times : []);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'No se pudieron cargar horas disponibles.';
      setTimesError(msg);
      setAvailableTimes([]);
    } finally {
      setTimesLoading(false);
    }
  };

  const StepPill = ({ idx, label }) => {
    const isActive = idx === activeStep;
    const isDone = idx < activeStep;
    return (
      <View
        style={[
          styles.stepPill,
          isActive && styles.stepPillActive,
          isDone && styles.stepPillDone,
        ]}
      >
        <Text
          style={[
            styles.stepPillText,
            (isActive || isDone) && styles.stepPillTextActive,
          ]}
        >
          {label}
        </Text>
      </View>
    );
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Datos del paciente</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              value={form.nombre}
              onChangeText={(v) => setField('nombre', v)}
            />
            <TextInput
              style={styles.input}
              placeholder="RUT (ej: 12345678-9)"
              autoCapitalize="none"
              value={form.rut}
              onChangeText={(v) => setField('rut', v)}
            />
            <TextInput
              style={styles.input}
              placeholder="Teléfono"
              keyboardType="phone-pad"
              value={form.telefono}
              onChangeText={(v) => setField('telefono', v)}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={form.email}
              onChangeText={(v) => setField('email', v)}
            />
          </View>
        );
      case 1:
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Datos clínicos</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Diagnóstico"
              value={form.diagnostico}
              onChangeText={(v) => setField('diagnostico', v)}
              multiline
            />
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Anamnesis"
              value={form.anamnesis}
              onChangeText={(v) => setField('anamnesis', v)}
              multiline
            />
          </View>
        );
      case 2:
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Consulta</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Motivo de consulta"
              value={form.motivoConsulta}
              onChangeText={(v) => setField('motivoConsulta', v)}
              multiline
            />
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Plan de tratamiento"
              value={form.planTratamiento}
              onChangeText={(v) => setField('planTratamiento', v)}
              multiline
            />
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Indicaciones"
              value={form.indicaciones}
              onChangeText={(v) => setField('indicaciones', v)}
              multiline
            />
          </View>
        );
      case 3:
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fecha y hora de la cita</Text>

            <View style={styles.rowBetween}>
              <Text style={styles.label}>Agendar nueva cita</Text>
              <Switch value={agendarNuevaCita} onValueChange={setAgendarNuevaCita} />
            </View>

            {agendarNuevaCita && (
              <>
                <View style={styles.calendarBox}>
                  <Calendar
                    onDayPress={(day) => {
                      const ymd = day?.dateString;
                      setField('diaPrimeraCita', ymd);
                      setField('hora', '');
                      setAvailableTimes([]);
                      if (ymd) fetchAvailableTimes(ymd);
                    }}
                    markedDates={markedDates}
                    firstDay={1}
                    disableAllTouchEventsForDisabledDays
                    onMonthChange={(m) => {
                      if (m?.year && m?.month) setVisibleMonth({ year: m.year, month: m.month });
                    }}
                    theme={{
                      todayTextColor: colors.primary,
                      selectedDayBackgroundColor: colors.primary,
                      arrowColor: colors.primary,
                      textDayFontWeight: '600',
                      textMonthFontWeight: '900',
                      textDayHeaderFontWeight: '800',
                    }}
                  />

                  {!profesionalId ? (
                    <View style={styles.inlineWarn}>
                      <Ionicons name="alert-circle-outline" size={16} color="#d32f2f" />
                      <Text style={styles.inlineWarnText}>No se pudo identificar el profesional para cargar horas.</Text>
                    </View>
                  ) : null}

                  {form.diaPrimeraCita ? (
                    <View style={styles.hoursHeaderRow}>
                      <Text style={styles.hoursTitle}>Horas disponibles</Text>
                      <TouchableOpacity
                        style={styles.refreshBtn}
                        onPress={() => fetchAvailableTimes(form.diaPrimeraCita)}
                        disabled={timesLoading}
                      >
                        <Ionicons name="refresh" size={16} color={colors.primary} />
                        <Text style={styles.refreshText}>Actualizar</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.muted}>Selecciona un día para ver las horas disponibles.</Text>
                  )}

                  {timesLoading ? (
                    <View style={styles.centerRow}>
                      <ActivityIndicator color={colors.primary} />
                      <Text style={styles.muted}>Cargando horas…</Text>
                    </View>
                  ) : timesError ? (
                    <Text style={styles.errorInline}>{timesError}</Text>
                  ) : form.diaPrimeraCita ? (
                    availableTimes.length > 0 ? (
                      <View style={styles.timesWrap}>
                        {availableTimes.map((t) => {
                          const selected = form.hora === t;
                          return (
                            <TouchableOpacity
                              key={t}
                              style={[styles.timePill, selected && styles.timePillSelected]}
                              onPress={() => setField('hora', t)}
                            >
                              <Text style={[styles.timePillText, selected && styles.timePillTextSelected]}>{t}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={styles.muted}>No hay horas disponibles para este día.</Text>
                    )
                  ) : null}

                  {!!form.hora && (
                    <View style={styles.selectedSummary}>
                      <Ionicons name="checkmark-circle" size={18} color="#2e7d32" />
                      <Text style={styles.selectedSummaryText}>
                        Seleccionado: {form.diaPrimeraCita} a las {form.hora}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.rowBetween}>
                  <Text style={styles.label}>Cobrar esta cita</Text>
                  <Switch value={cobrarNuevaCita} onValueChange={setCobrarNuevaCita} />
                </View>
              </>
            )}

            <View style={[styles.rowBetween, { marginTop: 12 }]}>
              <Text style={styles.label}>Cambiar primer día de consulta</Text>
              <Switch value={cambiarDiaPrimera} onValueChange={setCambiarDiaPrimera} />
            </View>
            {cambiarDiaPrimera && (
              <View style={styles.calendarCard}>
                <Text style={styles.sectionSubtitle}>Selecciona el primer día de consulta</Text>
                <Calendar
                  firstDay={1}
                  onDayPress={(day) => {
                    if (day?.dateString) setField('diaPrimeraCitaOverride', day.dateString);
                  }}
                  markedDates={
                    form.diaPrimeraCitaOverride
                      ? {
                          [form.diaPrimeraCitaOverride]: {
                            selected: true,
                            selectedColor: colors.primary,
                          },
                        }
                      : {}
                  }
                  theme={{
                    todayTextColor: colors.primary,
                    selectedDayBackgroundColor: colors.primary,
                    arrowColor: colors.primary,
                  }}
                />

                {!!form.diaPrimeraCitaOverride && (
                  <View style={styles.selectedSummary}>
                    <Ionicons name="checkmark-circle" size={18} color="#2e7d32" />
                    <Text style={styles.selectedSummaryText}>Seleccionado: {form.diaPrimeraCitaOverride}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.footerBtn, styles.footerBtnSecondary, { marginTop: 10 }]}
                  onPress={() => setField('diaPrimeraCitaOverride', '')}
                >
                  <Text style={styles.footerBtnSecondaryText}>Limpiar</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.hintBox}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.hintText}>
                Si completas diagnóstico/anamnesis o datos clínicos, se creará una reserva para guardar el historial.
              </Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.stepRow}>
          {steps.map((s, idx) => (
            <StepPill key={s} idx={idx} label={s} />
          ))}
        </View>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#d32f2f" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {renderStep()}

        <View style={styles.footerRow}>
          <TouchableOpacity
            style={[styles.footerBtn, styles.footerBtnSecondary, activeStep === 0 && styles.footerBtnDisabled]}
            onPress={handleBack}
            disabled={activeStep === 0 || submitting}
          >
            <Text style={styles.footerBtnSecondaryText}>Atrás</Text>
          </TouchableOpacity>

          {activeStep < steps.length - 1 ? (
            <TouchableOpacity
              style={[styles.footerBtn, styles.footerBtnPrimary]}
              onPress={handleNext}
              disabled={submitting}
            >
              <Text style={styles.footerBtnPrimaryText}>Siguiente</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.footerBtn, styles.footerBtnPrimary]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.footerBtnPrimaryText}>Guardar</Text>
              )}
            </TouchableOpacity>
          )}
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
  stepRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  stepPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#e0e0e0',
  },
  stepPillActive: {
    backgroundColor: colors.primary,
  },
  stepPillDone: {
    backgroundColor: '#b3e5fc',
  },
  stepPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#333',
  },
  stepPillTextActive: {
    color: '#fff',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffebee',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    color: '#b71c1c',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#222',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    marginBottom: 10,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#333',
    fontWeight: '700',
  },
  hintBox: {
    marginTop: 12,
    backgroundColor: colors.primarySoft,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  hintText: {
    flex: 1,
    color: colors.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  calendarBox: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  hoursHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  hoursTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#222',
  },
  refreshBtn: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  refreshText: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 12,
  },
  timesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  calendarCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  sectionSubtitle: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
    fontSize: 13,
    fontWeight: '900',
    color: '#333',
  },
  timePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timePillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timePillText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#333',
  },
  timePillTextSelected: {
    color: '#fff',
  },
  selectedSummary: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  selectedSummaryText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2e7d32',
  },
  centerRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  errorInline: {
    color: '#b71c1c',
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  inlineWarn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  inlineWarnText: {
    flex: 1,
    color: '#b71c1c',
    fontWeight: '800',
    fontSize: 12,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnPrimary: {
    backgroundColor: colors.primary,
  },
  footerBtnPrimaryText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },
  footerBtnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  footerBtnSecondaryText: {
    color: '#333',
    fontWeight: '900',
    fontSize: 15,
  },
  footerBtnDisabled: {
    opacity: 0.5,
  },
});

export default PatientCreateScreen;
