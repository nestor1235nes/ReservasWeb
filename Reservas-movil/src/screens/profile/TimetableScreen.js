import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import { colors } from '../../theme';

export default function TimetableScreen({ navigation }) {
  const { user } = useAuth();
  const timetable = user?.timetable || [];

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.block}
      onPress={() => navigation.navigate('EditTimetableBlock', { block: item, index })}
    >
      <Text style={styles.day}>{item.days?.join(', ') || 'Sin días'}</Text>
      <Text style={styles.time}>{item.fromTime} - {item.toTime}</Text>
      {item.breakFrom && item.breakTo ? (
        <Text style={styles.break}>Receso: {item.breakFrom} - {item.breakTo}</Text>
      ) : null}
      <Text style={styles.interval}>Intervalo: {item.interval || 30} min</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={timetable}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No hay bloques de horario configurados.</Text>}
      />
      <Button title="Agregar bloque" onPress={() => navigation.navigate('EditTimetableBlock', { block: null })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  block: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },
  day: { fontWeight: 'bold', fontSize: 16, color: colors.primary },
  time: { fontSize: 15, marginTop: 2 },
  break: { fontSize: 13, color: '#888', marginTop: 2 },
  interval: { fontSize: 13, color: '#888', marginTop: 2 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
});
