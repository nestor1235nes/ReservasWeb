import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';

export default function ServicesScreen({ navigation }) {
  const { user, updateMyProfile } = useAuth();

  const servicios = useMemo(() => (Array.isArray(user?.servicios) ? user.servicios : []), [user]);

  const handleDelete = (index) => {
    Alert.alert('Eliminar servicio', '¿Eliminar este servicio?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const next = servicios.filter((_, i) => i !== index);
          await updateMyProfile({ servicios: next });
        },
      },
    ]);
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ServiceForm', { mode: 'edit', index, servicio: item })}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item?.tipo || 'Servicio'}</Text>
        <Text style={styles.meta}>
          {item?.modalidad ? `Modalidad: ${item.modalidad}` : 'Modalidad: -'}
          {item?.duracion ? `  •  Duración: ${item.duracion}` : ''}
        </Text>
        {!!item?.precio && <Text style={styles.meta}>Precio: {item.precio}</Text>}
        {!!item?.descripcion && <Text style={styles.desc} numberOfLines={2}>{item.descripcion}</Text>}
      </View>
      <TouchableOpacity onPress={() => handleDelete(index)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={20} color="#f44336" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <FlatList
        data={servicios}
        keyExtractor={(_, idx) => String(idx)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="briefcase-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Sin servicios</Text>
            <Text style={styles.emptyText}>Agrega los servicios que ofreces para que aparezcan en tu perfil.</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ServiceForm', { mode: 'create' })}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 90 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  desc: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  deleteBtn: { padding: 6, alignSelf: 'flex-start' },
  empty: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: 14 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
});
