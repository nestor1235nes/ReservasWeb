import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';

const DAYS = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
];

export default function EditTimetableBlockScreen({ route, navigation }) {
  const { block, index } = route.params || {};
  const { user, updateMyProfile } = useAuth();

  const defaultValues = useMemo(() => ({
    days: block?.days || [],
    fromTime: block?.fromTime || '',
    toTime: block?.toTime || '',
    breakFrom: block?.breakFrom || '',
    breakTo: block?.breakTo || '',
    interval: block?.interval?.toString() || '30',
  }), [block]);

  const { control, handleSubmit, setValue, watch } = useForm({ defaultValues });
  const days = watch('days');

  const onToggleDay = (day) => {
    setValue('days', days.includes(day) ? days.filter(d => d !== day) : [...days, day]);
  };

  const onSubmit = async (values) => {
    const timetable = [...(user.timetable || [])];
    const blockData = {
      ...values,
      interval: parseInt(values.interval, 10) || 30,
    };
    if (typeof index === 'number') {
      timetable[index] = blockData;
    } else {
      timetable.push(blockData);
    }
    await updateMyProfile({ timetable });
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.label}>Días de atención</Text>
      <View style={styles.daysRow}>
        {DAYS.map(day => (
          <Text
            key={day}
            style={[styles.day, days.includes(day) && styles.daySelected]}
            onPress={() => onToggleDay(day)}
          >
            {day.slice(0, 3)}
          </Text>
        ))}
      </View>
      <Controller
        control={control}
        name="fromTime"
        render={({ field: { onChange, value } }) => (
          <Input label="Hora inicio (HH:mm)" value={value} onChangeText={onChange} keyboardType="numeric" />
        )}
      />
      <Controller
        control={control}
        name="toTime"
        render={({ field: { onChange, value } }) => (
          <Input label="Hora fin (HH:mm)" value={value} onChangeText={onChange} keyboardType="numeric" />
        )}
      />
      <Controller
        control={control}
        name="breakFrom"
        render={({ field: { onChange, value } }) => (
          <Input label="Receso desde (opcional)" value={value} onChangeText={onChange} keyboardType="numeric" />
        )}
      />
      <Controller
        control={control}
        name="breakTo"
        render={({ field: { onChange, value } }) => (
          <Input label="Receso hasta (opcional)" value={value} onChangeText={onChange} keyboardType="numeric" />
        )}
      />
      <Controller
        control={control}
        name="interval"
        render={({ field: { onChange, value } }) => (
          <Input label="Intervalo (minutos)" value={value} onChangeText={onChange} keyboardType="numeric" />
        )}
      />
      <Button title="Guardar bloque" onPress={handleSubmit(onSubmit)} style={{ marginTop: 18 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  label: { fontWeight: 'bold', fontSize: 15, marginBottom: 8, color: colors.textPrimary },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  day: {
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    color: colors.textPrimary,
  },
  daySelected: {
    backgroundColor: colors.primary,
    color: '#fff',
  },
});
