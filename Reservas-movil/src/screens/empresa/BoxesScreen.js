import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import {
  getBoxesSucursalRequest,
  eliminarBoxRequest,
  toggleActivoBoxRequest,
} from '../../api/boxes';
import { esAdminDeSucursal, sucursalPlanName } from '../../utils/sucursal';
import VitalinkLoader from '../../components/VitalinkLoader';
import { colors } from '../../theme';

export default function BoxesScreen({ navigation }) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [boxes, setBoxes] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const sucursalId = user?.sucursal?._id || user?.sucursal;
  // Igual que la web (GestionarBoxes): gestiona solo el admin con plan Teams.
  const puedeGestionar = esAdminDeSucursal(user) && sucursalPlanName(user) === 'Teams';

  const load = useCallback(async () => {
    if (!sucursalId) return;
    try {
      const res = await getBoxesSucursalRequest(sucursalId);
      setBoxes(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      const msg = e?.response?.data?.message || 'No se pudieron cargar los boxes';
      showAlert(Array.isArray(msg) ? msg[0] : msg, 'error');
      setBoxes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursalId]);

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

  const handleToggle = async (box) => {
    try {
      const res = await toggleActivoBoxRequest(box._id);
      setBoxes((prev) =>
        (prev || []).map((b) => (b._id === box._id ? { ...b, activo: res?.data?.activo ?? !b.activo } : b))
      );
    } catch (e) {
      const msg = e?.response?.data?.message || 'No se pudo cambiar el estado del box';
      showAlert(Array.isArray(msg) ? msg[0] : msg, 'error');
    }
  };

  const handleDelete = (box) => {
    Alert.alert(
      'Eliminar box',
      `¿Eliminar "${box.nombre}"? Esto eliminará también todas sus reservas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarBoxRequest(box._id);
              setBoxes((prev) => (prev || []).filter((b) => b._id !== box._id));
              showAlert('Box eliminado', 'success');
            } catch (e) {
              const msg = e?.response?.data?.message || 'No se pudo eliminar el box';
              showAlert(Array.isArray(msg) ? msg[0] : msg, 'error');
            }
          },
        },
      ]
    );
  };

  const renderBox = ({ item: box }) => (
    <View style={[styles.card, !box.activo && styles.cardInactive]}>
      <View style={[styles.accent, { backgroundColor: box.color || '#2596be' }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.boxName}>
              {box.nombre}
              {box.codigo ? <Text style={styles.boxCode}>  ·  {box.codigo}</Text> : null}
            </Text>
            <Text style={styles.boxMeta}>
              {[
                box.piso ? `Piso ${box.piso}` : null,
                `Capacidad ${box.capacidad || 1}`,
                box.activo ? 'Activo' : 'Inactivo',
              ]
                .filter(Boolean)
                .join('  ·  ')}
            </Text>
          </View>
          {puedeGestionar ? (
            <Switch value={!!box.activo} onValueChange={() => handleToggle(box)} />
          ) : null}
        </View>

        {box.descripcion ? (
          <Text style={styles.boxDescription} numberOfLines={2}>{box.descripcion}</Text>
        ) : null}

        {Array.isArray(box.equipamiento) && box.equipamiento.length ? (
          <View style={styles.chipsWrap}>
            {box.equipamiento.slice(0, 4).map((eq) => (
              <View key={eq} style={styles.chip}>
                <Text style={styles.chipText}>{eq}</Text>
              </View>
            ))}
            {box.equipamiento.length > 4 ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>+{box.equipamiento.length - 4}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('BoxAgenda', { box })}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={styles.actionText}>Ver agenda</Text>
          </TouchableOpacity>
          {puedeGestionar ? (
            <>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate('BoxForm', { mode: 'edit', box })}
              >
                <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                <Text style={styles.actionText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(box)}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>Eliminar</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );

  if (boxes === null) {
    return (
      <View style={styles.center}>
        <VitalinkLoader />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {!puedeGestionar ? (
        <View style={styles.notice}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.primary} />
          <Text style={styles.noticeText}>
            La gestión de boxes está disponible para administradores con Plan Teams.
            Aquí puedes ver las salas de tu empresa.
          </Text>
        </View>
      ) : null}

      <FlatList
        data={boxes}
        keyExtractor={(b) => String(b._id)}
        renderItem={renderBox}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={40} color="#b8c4c9" />
            <Text style={styles.emptyText}>Aún no hay boxes creados.</Text>
          </View>
        }
      />

      {puedeGestionar ? (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('BoxForm', { mode: 'create' })}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  listContent: { padding: 16, paddingBottom: 90 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  noticeText: { flex: 1, color: colors.textPrimary, fontSize: 12, lineHeight: 17 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardInactive: { opacity: 0.65 },
  accent: { width: 5 },
  cardBody: { flex: 1, padding: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  boxName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  boxCode: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  boxMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  boxDescription: { fontSize: 13, color: colors.textSecondary, marginTop: 8, lineHeight: 17 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  chipText: { color: colors.primary, fontSize: 11, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 14, marginTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
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
