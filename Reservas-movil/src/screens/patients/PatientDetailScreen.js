import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWindowDimensions } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { useFocusEffect } from '@react-navigation/native';

import { getPacientePorRutRequest, getPacienteRequest } from '../../api/pacientes';
import { getHistorialRequest, updateReservaRequest } from '../../api/reservas';
import { colors } from '../../theme';

function formatDate(val) {
  try {
    if (!val) return '';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return '';
  }
}

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
  // Si ya viene como HTML (Quill), se renderiza tal cual.
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
  // Si viene texto plano, lo convertimos a HTML seguro.
  const safe = escapeHtml(raw).replace(/\n/g, '<br/>');
  return `<p>${safe}</p>`;
};

const formatYMD = (d) => {
  try {
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return '';
  }
};

const calcEdad = (fechaNacimiento) => {
  try {
    if (!fechaNacimiento) return '';
    const d = new Date(fechaNacimiento);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
    return age >= 0 ? String(age) : '';
  } catch {
    return '';
  }
};

const PatientDetailScreen = ({ route, navigation }) => {
  const rut = route?.params?.rut;
  const pacienteId = route?.params?.pacienteId;
  const showDxTab = route?.params?.showDxTab; // Flag para abrir directamente en pestaña de diagnóstico
  const isPrimeraConsulta = route?.params?.isPrimeraConsulta;

  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [historial, setHistorial] = useState({ clinicalCases: [], activeClinicalCaseId: null });
  const [errorMsg, setErrorMsg] = useState('');

  const [activeTab, setActiveTab] = useState(showDxTab ? 'dx' : 'info'); // 'info' | 'dx' | 'sessions'
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [selectedSessionKey, setSelectedSessionKey] = useState(null); // `${caseId}:${idx}`

  const title = useMemo(() => {
    const n = patient?.nombre || route?.params?.title;
    return n || 'Paciente';
  }, [patient?.nombre, route?.params?.title]);

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const fetchAll = useCallback(async () => {
    if (!rut && !pacienteId) {
      setErrorMsg('Falta rut/pacienteId para cargar detalle.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      let p = null;
      if (rut) {
        const res = await getPacientePorRutRequest(rut);
        p = res?.data;
      } else if (pacienteId) {
        const res = await getPacienteRequest(pacienteId);
        p = res?.data;
      }
      setPatient(p || null);

      const rutToUse = rut || p?.rut;
      if (rutToUse) {
        try {
          const hres = await getHistorialRequest(rutToUse);
          setHistorial(hres?.data || { clinicalCases: [], activeClinicalCaseId: null });
        } catch (e) {
          // Si no hay reserva/historial, el backend devuelve 404. Eso no es fatal.
          if (e?.response?.status === 404) {
            setHistorial({ clinicalCases: [], activeClinicalCaseId: null });
          } else {
            throw e;
          }
        }
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Error cargando paciente.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [rut, pacienteId]);

  const handleIniciarNuevoDiagnostico = async () => {
    try {
      if (!patient?.rut) return;
      await updateReservaRequest(patient.rut, { startNewClinicalCase: true });
      await fetchAll();
      // Navegar a PatientCreateScreen para agregar la información clínica del nuevo diagnóstico
      navigation.navigate('PatientCreate', {
        mode: 'editFromPatientDetail',
        rut: patient.rut,
        nombre: patient.nombre || '',
        telefono: patient.telefono || '',
        email: patient.email || '',
        isPrimeraConsulta: false,
        skipToStep: 1,
      });
    } catch (error) {
      console.error('Error iniciando nuevo diagnóstico:', error);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useFocusEffect(
    useCallback(() => {
      // Al volver desde pantallas hijas (p.ej. agregar sesión), refrescar.
      fetchAll();
    }, [fetchAll])
  );

  const clinicalCases = Array.isArray(historial?.clinicalCases) ? historial.clinicalCases : [];

  useEffect(() => {
    // Selección inicial del caso clínico: activeClinicalCaseId o el más reciente
    if (!clinicalCases.length) {
      setSelectedCaseId(null);
      setSelectedSessionKey(null);
      return;
    }
    const activeId = historial?.activeClinicalCaseId;
    const exists = activeId && clinicalCases.some((c) => String(c?._id) === String(activeId));
    const sorted = clinicalCases
      .slice()
      .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
    const fallbackId = sorted?.[0]?._id;
    const nextCaseId = exists ? activeId : fallbackId;
    setSelectedCaseId((prev) => prev || nextCaseId);
  }, [historial?.activeClinicalCaseId, clinicalCases.length]);

  const selectedCase = useMemo(() => {
    if (!clinicalCases.length) return null;
    if (selectedCaseId) {
      const found = clinicalCases.find((c) => String(c?._id) === String(selectedCaseId));
      if (found) return found;
    }
    return clinicalCases[0] || null;
  }, [clinicalCases, selectedCaseId]);

  const activeCase = useMemo(() => {
    const activeId = historial?.activeClinicalCaseId;
    if (!activeId) return null;
    return clinicalCases.find((c) => String(c?._id) === String(activeId)) || null;
  }, [clinicalCases, historial?.activeClinicalCaseId]);

  const selectedSession = useMemo(() => {
    if (!selectedCase || !selectedSessionKey) return null;
    const parts = String(selectedSessionKey).split(':');
    const caseId = parts[0];
    const idx = parseInt(parts[1], 10);
    if (Number.isNaN(idx)) return null;
    if (String(selectedCase?._id) !== String(caseId)) return null;
    const sesiones = Array.isArray(selectedCase?.sesiones) ? selectedCase.sesiones : [];
    return sesiones[idx] || null;
  }, [selectedCase, selectedSessionKey]);

  const InfoRow = ({ label, value }) => {
    const v = String(value || '').trim();
    if (!v) return null;
    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{v}</Text>
      </View>
    );
  };

  const TabButton = ({ id, title: t, icon }) => {
    const isActive = activeTab === id;
    return (
      <TouchableOpacity
        onPress={() => setActiveTab(id)}
        style={[styles.tabBtn, isActive && styles.tabBtnActive]}
      >
        <Ionicons name={icon} size={16} color={isActive ? '#fff' : colors.primary} />
        <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>{t}</Text>
      </TouchableOpacity>
    );
  };

  const htmlTagsStyles = useMemo(
    () => ({
      body: { color: '#444', fontSize: 13, lineHeight: 18 },
      p: { marginTop: 0, marginBottom: 8 },
      h1: { fontSize: 18, marginTop: 0, marginBottom: 8 },
      h2: { fontSize: 16, marginTop: 0, marginBottom: 8 },
      h3: { fontSize: 14, marginTop: 0, marginBottom: 8 },
      li: { marginBottom: 6 },
    }),
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : errorMsg ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={56} color="#d32f2f" />
          <Text style={styles.errorTitle}>No se pudo cargar</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAll}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(patient?.nombre || '?')
                    .split(' ')
                    .filter(Boolean)
                    .map((s) => s[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{patient?.nombre || 'Sin nombre'}</Text>
                <Text style={styles.sub}>RUT: {patient?.rut || '—'}</Text>
                {!!patient?.telefono && <Text style={styles.sub}>Tel: {patient.telefono}</Text>}
                {!!patient?.email && <Text style={styles.sub}>Email: {patient.email}</Text>}
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            <TabButton id="info" title="Información" icon="person-outline" />
            <TabButton id="dx" title="Diagnósticos" icon="medkit-outline" />
            <TabButton id="sessions" title="Sesiones" icon="time-outline" />
          </View>

          {/* INFO */}
          {activeTab === 'info' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Información</Text>

              <Text style={styles.subsectionTitle}>Datos personales</Text>
              <InfoRow label="Nombre" value={patient?.nombre} />
              <InfoRow label="RUT" value={patient?.rut} />
              <InfoRow label="Teléfono" value={patient?.telefono} />
              <InfoRow label="Email" value={patient?.email} />
              <InfoRow label="Dirección" value={patient?.direccion} />
              <InfoRow label="Sexo" value={patient?.sexo} />
              <InfoRow label="Previsión" value={patient?.prevision} />
              <InfoRow label="Tipo de sangre" value={patient?.tipoSangre} />
              <InfoRow
                label="Fecha nacimiento"
                value={patient?.fechaNacimiento ? formatYMD(patient.fechaNacimiento) : ''}
              />
              <InfoRow
                label="Edad"
                value={
                  patient?.edad ||
                  (patient?.fechaNacimiento ? calcEdad(patient.fechaNacimiento) : '')
                }
              />

              <Text style={[styles.subsectionTitle, { marginTop: 14 }]}>Alergias</Text>
              {Array.isArray(patient?.alergias) && patient.alergias.length > 0 ? (
                patient.alergias.map((a, idx) => (
                  <View key={idx} style={styles.pillRow}>
                    <Text style={styles.pillText}>{a?.nombre || 'Alergia'}</Text>
                    {!!a?.severidad && <Text style={styles.pillSub}>{a.severidad}</Text>}
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>Sin alergias registradas</Text>
              )}

              <Text style={[styles.subsectionTitle, { marginTop: 14 }]}>Medicamentos activos</Text>
              {Array.isArray(patient?.medicamentosActivos) && patient.medicamentosActivos.length > 0 ? (
                patient.medicamentosActivos.map((m, idx) => (
                  <View key={idx} style={styles.pillRow}>
                    <Text style={styles.pillText}>{m?.nombre || 'Medicamento'}</Text>
                    <Text style={styles.pillSub}>
                      {[m?.dosis, m?.frecuencia].filter(Boolean).join(' • ')}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>Sin medicamentos activos</Text>
              )}

              <Text style={[styles.subsectionTitle, { marginTop: 14 }]}>Contacto de emergencia</Text>
              <InfoRow label="Nombre" value={patient?.contactoEmergencia?.nombre} />
              <InfoRow label="Relación" value={patient?.contactoEmergencia?.relacion} />
              <InfoRow label="Teléfono" value={patient?.contactoEmergencia?.telefono} />

              <Text style={[styles.subsectionTitle, { marginTop: 14 }]}>Signos vitales (último registro)</Text>
              {Array.isArray(patient?.signosVitales) && patient.signosVitales.length > 0 ? (
                (() => {
                  const last = patient.signosVitales
                    .slice()
                    .sort((a, b) => new Date(b?.fecha || 0) - new Date(a?.fecha || 0))[0];
                  return (
                    <>
                      <InfoRow label="Fecha" value={formatDate(last?.fecha)} />
                      <InfoRow label="Presión" value={last?.presionArterial} />
                      <InfoRow label="FC" value={last?.frecuenciaCardiaca} />
                      <InfoRow label="Peso (kg)" value={last?.pesoKg} />
                      <InfoRow label="Talla (cm)" value={last?.tallaCm} />
                      <InfoRow label="Temp (°C)" value={last?.temperaturaC} />
                      <InfoRow label="Sat O2" value={last?.saturacionO2} />
                      <InfoRow label="Glucosa" value={last?.glucosaMgDl} />
                    </>
                  );
                })()
              ) : (
                <Text style={styles.muted}>Sin signos vitales</Text>
              )}
            </View>
          )}

          {/* DIAGNOSTICOS */}
          {activeTab === 'dx' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Diagnósticos</Text>
              {clinicalCases.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="document-text-outline" size={40} color="#999" />
                  <Text style={styles.emptyTitle}>Sin diagnósticos</Text>
                  <Text style={styles.emptyText}>Este paciente aún no tiene casos clínicos.</Text>
                  {isPrimeraConsulta && (
                    <View style={styles.primeraConsultaHint}>
                      <Ionicons name="information-circle" size={18} color="#2596be" />
                      <Text style={styles.primeraConsultaHintText}>
                        Para registrar la primera consulta, agregue una sesión usando el botón de abajo.
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.addFirstSessionBtn}
                    onPress={() => {
                      navigation.navigate('PatientAddSession', {
                        rut: patient?.rut,
                        pacienteNombre: patient?.nombre,
                        diagnostico: '',
                        isPrimeraConsulta: true,
                      });
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#fff" />
                    <Text style={styles.addFirstSessionBtnText}>Registrar Primera Consulta</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {clinicalCases
                    .slice()
                    .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
                    .map((c) => {
                      const isSelected = String(selectedCaseId) === String(c?._id);
                      return (
                        <TouchableOpacity
                          key={c._id}
                          style={[styles.caseCard, isSelected && styles.caseCardSelected]}
                          onPress={() => {
                            setSelectedCaseId(c?._id);
                            setSelectedSessionKey(null);
                          }}
                        >
                          <View style={styles.caseHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.caseDx}>{c.diagnostico || 'Sin diagnóstico'}</Text>
                              <Text style={styles.caseMeta}>
                                Inicio: {formatDate(c.createdAt) || '—'}
                                {c.closedAt ? ` • Cierre: ${formatDate(c.closedAt)}` : ''}
                              </Text>
                            </View>
                            <View style={styles.caseBadge}>
                              <Text style={styles.caseBadgeText}>{(c.sesiones || []).length} sesiones</Text>
                            </View>
                          </View>

                          {!!c.anamnesis && (
                            <View style={{ marginTop: 10 }}>
                              <RenderHTML
                                contentWidth={Math.max(320, width - 30)}
                                source={{ html: normalizeHtml(c.anamnesis) }}
                                tagsStyles={htmlTagsStyles}
                              />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  <TouchableOpacity
                    style={styles.addFirstSessionBtn}
                    onPress={handleIniciarNuevoDiagnostico}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#fff" />
                    <Text style={styles.addFirstSessionBtnText}>Iniciar Nuevo Diagnóstico</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* SESIONES */}
          {activeTab === 'sessions' && (
            <View style={styles.sectionCard}>
              <View style={styles.sessionsHeaderRow}>
                <Text style={styles.sectionTitle}>Sesiones</Text>
                {activeCase ? (
                  <TouchableOpacity
                    style={styles.addSessionBtn}
                    onPress={() => {
                      // Asegurar que la vista quede en el diagnóstico activo
                      if (historial?.activeClinicalCaseId) {
                        setSelectedCaseId(historial.activeClinicalCaseId);
                        setSelectedSessionKey(null);
                      }

                      navigation.navigate('PatientAddSession', {
                        rut: patient?.rut,
                        pacienteNombre: patient?.nombre,
                        diagnostico: activeCase?.diagnostico || 'Sin diagnóstico',
                      });
                    }}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addSessionBtnText}>Añadir sesión</Text>
                  </TouchableOpacity>
                ) : null}
                {selectedCase ? (
                  <View style={styles.caseBadge}>
                    <Text style={styles.caseBadgeText}>{(selectedCase?.sesiones || []).length} sesiones</Text>
                  </View>
                ) : null}
              </View>

              {!selectedCase ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="document-text-outline" size={40} color="#999" />
                  <Text style={styles.emptyTitle}>Sin diagnóstico seleccionado</Text>
                  <Text style={styles.emptyText}>Vuelve a Diagnósticos y elige uno.</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.sessionsSubtitle}>
                    {selectedCase?.diagnostico || 'Sin diagnóstico'}
                  </Text>

                  {Array.isArray(selectedCase?.sesiones) && selectedCase.sesiones.length > 0 ? (
                    <View style={styles.sessionsList}>
                      {selectedCase.sesiones
                        .slice()
                        .sort((a, b) => new Date(b?.fecha || 0) - new Date(a?.fecha || 0))
                        .map((s, idx) => {
                          const key = `${selectedCase._id}:${idx}`;
                          const isSel = selectedSessionKey === key;
                          return (
                            <TouchableOpacity
                              key={key}
                              style={[styles.sessionRow, isSel && styles.sessionRowSelected]}
                              onPress={() => setSelectedSessionKey(key)}
                            >
                              <Ionicons name="time-outline" size={16} color={isSel ? colors.primary : '#666'} />
                              <Text style={styles.sessionDate}>{formatDate(s?.fecha) || '—'}</Text>
                              <Text style={styles.sessionNotes} numberOfLines={1}>
                                {String(s?.notas || '').replace(/<[^>]*>/g, '').trim() || 'Ver detalle'}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  ) : (
                    <Text style={styles.muted}>Este diagnóstico aún no tiene sesiones.</Text>
                  )}

                  {selectedSession ? (
                    <View style={styles.sessionDetailCard}>
                      <Text style={styles.sessionDetailTitle}>Detalle de sesión</Text>
                      <Text style={styles.sessionDetailMeta}>Fecha: {formatDate(selectedSession?.fecha) || '—'}</Text>
                      <View style={{ marginTop: 10 }}>
                        <RenderHTML
                          contentWidth={Math.max(320, width - 30)}
                          source={{ html: normalizeHtml(selectedSession?.notas) }}
                          tagsStyles={htmlTagsStyles}
                        />
                      </View>
                    </View>
                  ) : (
                    <Text style={[styles.muted, { marginTop: 10 }]}>Selecciona una sesión para ver el detalle.</Text>
                  )}
                </>
              )}
            </View>
          )}
        </ScrollView>
      )}
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
    paddingBottom: 30,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primary,
  },
  tabBtnTextActive: {
    color: '#fff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  errorText: {
    marginTop: 6,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: '#222',
  },
  sub: {
    marginTop: 2,
    fontSize: 13,
    color: '#666',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#333',
    marginBottom: 10,
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#222',
    marginTop: 6,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  infoLabel: {
    width: 140,
    fontSize: 13,
    color: '#666',
    fontWeight: '800',
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    fontWeight: '700',
    textAlign: 'right',
  },
  muted: {
    fontSize: 13,
    color: '#777',
    marginTop: 6,
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#333',
  },
  pillSub: {
    fontSize: 12,
    color: '#666',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  caseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  caseCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundAlt,
  },
  caseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  caseDx: {
    fontSize: 15,
    fontWeight: '800',
    color: '#222',
  },
  caseMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  caseBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: 10,
  },
  caseBadgeText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  caseBody: {
    marginTop: 10,
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
  sessionsList: {
    marginTop: 10,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderRadius: 10,
    paddingHorizontal: 8,
    marginTop: 8,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
  },
  sessionRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  sessionDate: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    width: 100,
  },
  sessionNotes: {
    flex: 1,
    fontSize: 13,
    color: '#555',
  },
  sessionsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  addSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  addSessionBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  sessionsSubtitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#222',
    marginBottom: 8,
  },
  sessionDetailCard: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    padding: 12,
  },
  sessionDetailTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#222',
  },
  sessionDetailMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
    fontWeight: '700',
  },
  // Estilos para primera consulta
  primeraConsultaHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  primeraConsultaHintText: {
    flex: 1,
    fontSize: 13,
    color: '#0369a1',
    lineHeight: 18,
  },
  addFirstSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2596be',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
    elevation: 2,
    shadowColor: '#2596be',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addFirstSessionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default PatientDetailScreen;
