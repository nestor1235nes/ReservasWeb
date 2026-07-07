import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAlert } from '../../context/AlertContext';
import { crearOcupacionRequest, actualizarOcupacionRequest } from '../../api/boxes';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { colors } from '../../theme';
import { TIPO_LABELS } from './BoxAgendaScreen';

// Slots cada 30 minutos entre 07:00 y 21:00 (igual que la web).
const generarSlots = (desde = '07:00', hasta = '21:00', paso = 30) => {
  const [h0, m0] = desde.split(':').map(Number);
  const [h1, m1] = hasta.split(':').map(Number);
  const out = [];
  for (let t = h0 * 60 + m0; t <= h1 * 60 + m1; t += paso) {
    out.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  }
  return out;
};

const SLOTS = generarSlots();

const toMin = (hhmm) => {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const ymdToLocalDate = (ymd) => {
  const [y, m, d] = String(ymd).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export default function BoxOcupacionFormScreen({ navigation, route }) {
  const { showAlert } = useAlert();
  const [saving, setSaving] = useState(false);

  const box = route.params?.box;
  const mode = route.params?.mode || 'create';
  const existing = route.params?.ocupacion || null;

  const fechaInicial =
    (existing?.fecha ? String(existing.fecha).slice(0, 10) : route.params?.fecha) ||
    new Date().toISOString().slice(0, 10);

  const [fecha] = useState(fechaInicial);
  const [horaInicio, setHoraInicio] = useState(existing?.horaInicio || '');
  const [horaFin, setHoraFin] = useState(existing?.horaFin || '');
  const [tipo, setTipo] = useState(existing?.tipo || 'atencion');
  const [motivo, setMotivo] = useState(existing?.motivo || '');
  const [notas, setNotas] = useState(existing?.notas || '');

  const finOptions = useMemo(
    () => (horaInicio ? SLOTS.filter((s) => toMin(s) > toMin(horaInicio)) : SLOTS),
    [horaInicio]
  );

  const pickInicio = (slot) => {
    setHoraInicio(slot);
    // Ajustar el fin si quedó inválido: por defecto inicio + 30 min.
    if (!horaFin || toMin(horaFin) <= toMin(slot)) {
      const next = SLOTS.find((s) => toMin(s) > toMin(slot));
      setHoraFin(next || '');
    }
  };

  const handleSave = async () => {
    if (!horaInicio || !horaFin) {
      showAlert('Selecciona hora de inicio y de término', 'warning');
      return;
    }
    if (toMin(horaFin) <= toMin(horaInicio)) {
      showAlert('La hora de término debe ser posterior al inicio', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fecha,
        horaInicio,
        horaFin,
        tipo,
        motivo: motivo.trim(),
        notas: notas.trim(),
      };
      if (mode === 'edit' && existing?._id) {
        await actualizarOcupacionRequest(existing._id, payload);
        showAlert('Reserva actualizada', 'success');
      } else {
        await crearOcupacionRequest(box._id, payload);
        showAlert('Box reservado', 'success');
      }
      navigation.goBack();
    } catch (e) {
      // 409 = conflicto de horario; el backend explica el motivo.
      const msg = e?.response?.data?.message || 'No se pudo guardar la reserva';
      showAlert(Array.isArray(msg) ? msg[0] : msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const fechaLabel = ymdToLocalDate(fecha).toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const renderSlots = (options, value, onSelect) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotsRow}>
      {options.map((slot) => {
        const active = slot === value;
        return (
          <TouchableOpacity
            key={slot}
            style={[styles.slot, active && styles.slotActive]}
            onPress={() => onSelect(slot)}
          >
            <Text style={[styles.slotText, active && styles.slotTextActive]}>{slot}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={[styles.boxDot, { backgroundColor: box?.color || '#2596be' }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.boxName}>{box?.nombre}{box?.codigo ? ` · ${box.codigo}` : ''}</Text>
            <Text style={styles.fechaText}>{fechaLabel}</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>Hora de inicio</Text>
        {renderSlots(SLOTS, horaInicio, pickInicio)}

        <Text style={styles.fieldLabel}>Hora de término</Text>
        {renderSlots(finOptions, horaFin, setHoraFin)}

        <Text style={styles.fieldLabel}>Tipo de uso</Text>
        <View style={styles.chipsWrap}>
          {Object.entries(TIPO_LABELS).map(([value, label]) => {
            const active = tipo === value;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setTipo(value)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Input
          label="Motivo (opcional)"
          icon="chatbox-ellipses-outline"
          value={motivo}
          onChangeText={setMotivo}
          placeholder="Ej: Consulta con paciente"
        />
        <Input
          label="Notas internas (opcional)"
          icon="reader-outline"
          value={notas}
          onChangeText={setNotas}
          multiline
          inputStyle={{ minHeight: 70, textAlignVertical: 'top' }}
        />

        <Button
          title={saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Reservar box'}
          onPress={handleSave}
          loading={saving}
          style={{ marginTop: 10 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 28 },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 16,
  },
  boxDot: { width: 12, height: 12, borderRadius: 6 },
  boxName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  fechaText: { fontSize: 12, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  slotsRow: { gap: 8, paddingBottom: 14 },
  slot: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  slotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { fontSize: 13, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  slotTextActive: { color: '#fff', fontWeight: '700' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textPrimary },
  chipTextActive: { color: colors.primary, fontWeight: '700' },
});
