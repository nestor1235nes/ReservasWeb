import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import {
  getOcupacionesBoxRequest,
  cambiarEstadoOcupacionRequest,
  cancelarOcupacionRequest,
} from '../../api/boxes';
import { esAdminDeSucursal } from '../../utils/sucursal';
import VitalinkLoader from '../../components/VitalinkLoader';
import { colors } from '../../theme';

// Mismos labels/colores que la web (AgendaBox).
export const TIPO_LABELS = {
  atencion: 'Atención',
  reunion: 'Reunión',
  mantenimiento: 'Mantenimiento',
  capacitacion: 'Capacitación',
  otro: 'Otro',
};

export const ESTADO_CONFIG = {
  reservado: { label: 'Reservado', color: '#f59e0b', bg: '#fef3c7' },
  en_curso: { label: 'En curso', color: '#2596be', bg: '#dbeafe' },
  completado: { label: 'Completado', color: '#16a34a', bg: '#dcfce7' },
  cancelado: { label: 'Cancelado', color: '#9e9e9e', bg: '#f5f5f5' },
};

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const toYmd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatDia = (d) => `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;

export default function BoxAgendaScreen({ navigation, route }) {
  const box = route.params?.box;
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [fecha, setFecha] = useState(() => new Date());
  const [ocupaciones, setOcupaciones] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const esAdmin = esAdminDeSucursal(user);
  // Cualquier miembro de la sucursal puede reservar (el backend lo valida igual).
  const puedeReservar = !!user?.sucursal && !!box?.activo;
  const uid = String(user?._id || user?.id || '');

  const fechaYmd = toYmd(fecha);
  const esHoy = fechaYmd === toYmd(new Date());

  const load = useCallback(async () => {
    if (!box?._id) return;
    try {
      const res = await getOcupacionesBoxRequest(box._id, { fecha: fechaYmd });
      setOcupaciones(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      const msg = e?.response?.data?.message || 'No se pudo cargar la agenda';
      showAlert(Array.isArray(msg) ? msg[0] : msg, 'error');
      setOcupaciones([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box?._id, fechaYmd]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const moveDay = (delta) => {
    setOcupaciones(null);
    setFecha((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  };

  const puedeGestionarOcupacion = (oc) =>
    esAdmin || String(oc?.solicitadoPor?._id || oc?.solicitadoPor || '') === uid;

  const handleEstado = async (oc, estado) => {
    try {
      await cambiarEstadoOcupacionRequest(oc._id, { estado });
      await load();
    } catch (e) {
      const msg = e?.response?.data?.message || 'No se pudo cambiar el estado';
      showAlert(Array.isArray(msg) ? msg[0] : msg, 'error');
    }
  };

  const handleCancel = (oc) => {
    Alert.alert('Cancelar reserva', `¿Cancelar la reserva de ${oc.horaInicio} a ${oc.horaFin}?`, [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Cancelar reserva',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelarOcupacionRequest(oc._id);
            await load();
            showAlert('Reserva cancelada', 'success');
          } catch (e) {
            const msg = e?.response?.data?.message || 'No se pudo cancelar';
            showAlert(Array.isArray(msg) ? msg[0] : msg, 'error');
          }
        },
      },
    ]);
  };

  const activas = useMemo(
    () => (ocupaciones || []).filter((o) => o.estado !== 'cancelado'),
    [ocupaciones]
  );
  const canceladas = useMemo(
    () => (ocupaciones || []).filter((o) => o.estado === 'cancelado'),
    [ocupaciones]
  );

  const renderOcupacion = ({ item: oc }) => {
    const estado = ESTADO_CONFIG[oc.estado] || ESTADO_CONFIG.reservado;
    const gestiona = puedeGestionarOcupacion(oc);
    const cancelada = oc.estado === 'cancelado';

    return (
      <View style={[styles.ocCard, cancelada && { opacity: 0.6 }]}>
        <View style={styles.ocHeader}>
          <Text style={styles.ocHora}>{oc.horaInicio} – {oc.horaFin}</Text>
          <View style={[styles.estadoPill, { backgroundColor: estado.bg }]}>
            <Text style={[styles.estadoText, { color: estado.color }]}>{estado.label}</Text>
          </View>
        </View>

        <Text style={styles.ocMeta}>
          {TIPO_LABELS[oc.tipo] || 'Atención'}
          {oc.solicitadoPor?.username ? `  ·  ${oc.solicitadoPor.username}` : ''}
          {oc.paciente?.nombre ? `  ·  Paciente: ${oc.paciente.nombre}` : ''}
        </Text>
        {oc.motivo ? <Text style={styles.ocMotivo}>{oc.motivo}</Text> : null}

        {gestiona && !cancelada ? (
          <View style={styles.ocActions}>
            {oc.estado === 'reservado' ? (
              <TouchableOpacity style={styles.ocBtn} onPress={() => handleEstado(oc, 'en_curso')}>
                <Ionicons name="play-outline" size={15} color={colors.primary} />
                <Text style={styles.ocBtnText}>Iniciar</Text>
              </TouchableOpacity>
            ) : null}
            {oc.estado === 'en_curso' ? (
              <TouchableOpacity style={styles.ocBtn} onPress={() => handleEstado(oc, 'completado')}>
                <Ionicons name="checkmark-done-outline" size={15} color="#16a34a" />
                <Text style={[styles.ocBtnText, { color: '#16a34a' }]}>Completar</Text>
              </TouchableOpacity>
            ) : null}
            {oc.estado !== 'completado' ? (
              <>
                <TouchableOpacity
                  style={styles.ocBtn}
                  onPress={() => navigation.navigate('BoxOcupacionForm', { box, ocupacion: oc, mode: 'edit' })}
                >
                  <Ionicons name="pencil-outline" size={15} color={colors.primary} />
                  <Text style={styles.ocBtnText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ocBtn} onPress={() => handleCancel(oc)}>
                  <Ionicons name="close-outline" size={16} color={colors.error} />
                  <Text style={[styles.ocBtnText, { color: colors.error }]}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Encabezado del box + navegación por día */}
      <View style={styles.header}>
        <View style={[styles.boxDot, { backgroundColor: box?.color || '#2596be' }]} />
        <Text style={styles.boxName} numberOfLines={1}>
          {box?.nombre}{box?.codigo ? ` · ${box.codigo}` : ''}
        </Text>
        {!box?.activo ? <Text style={styles.inactiveTag}>Inactivo</Text> : null}
      </View>

      <View style={styles.dayNav}>
        <TouchableOpacity style={styles.dayArrow} onPress={() => moveDay(-1)}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setOcupaciones(null); setFecha(new Date()); }}>
          <Text style={styles.dayLabel}>{formatDia(fecha)}{esHoy ? '  (hoy)' : ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dayArrow} onPress={() => moveDay(1)}>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {ocupaciones === null ? (
        <View style={styles.center}>
          <VitalinkLoader caption={null} size="sm" />
        </View>
      ) : (
        <FlatList
          data={[...activas, ...canceladas]}
          keyExtractor={(o) => String(o._id)}
          renderItem={renderOcupacion}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-clear-outline" size={40} color="#b8c4c9" />
              <Text style={styles.emptyText}>Sin reservas para este día.</Text>
            </View>
          }
        />
      )}

      {puedeReservar ? (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('BoxOcupacionForm', { box, fecha: fechaYmd, mode: 'create' })}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  boxDot: { width: 12, height: 12, borderRadius: 6 },
  boxName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, flexShrink: 1 },
  inactiveTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9e9e9e',
    backgroundColor: '#f5f5f5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  dayArrow: { padding: 6 },
  dayLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  listContent: { padding: 16, paddingBottom: 90 },
  ocCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  ocHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ocHora: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  estadoPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  estadoText: { fontSize: 11, fontWeight: '700' },
  ocMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 5 },
  ocMotivo: { fontSize: 13, color: colors.textPrimary, marginTop: 5 },
  ocActions: { flexDirection: 'row', gap: 14, marginTop: 10, flexWrap: 'wrap' },
  ocBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ocBtnText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
