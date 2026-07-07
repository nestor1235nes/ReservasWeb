import React, { useMemo, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { colors } from '../../theme';

const DURACIONES_BASE = ['15 minutos', '20 minutos', '30 minutos', '40 minutos', '45 minutos', '60 minutos', '90 minutos', '120 minutos'];

// Misma derivación que la web (ModalServicio.jsx): las modalidades disponibles
// salen de los flags del perfil, incluyendo combinaciones.
const computeAllowedModalidades = (user) => {
  const enabled = [];
  if (user?.cita_presencial) enabled.push('Presencial');
  if (user?.cita_virtual) enabled.push('Telemedicina');
  if (user?.cita_domicilio) enabled.push('Domicilio');

  const options = [...enabled];
  if (enabled.length >= 2) {
    for (let i = 0; i < enabled.length; i += 1) {
      for (let j = i + 1; j < enabled.length; j += 1) {
        options.push(`${enabled[i]} y ${enabled[j]}`);
      }
    }
  }
  if (enabled.length === 3) {
    options.push('Presencial, Telemedicina y Domicilio');
  }
  return { enabled, options };
};

export default function ServiceFormScreen({ navigation, route }) {
  const { user, updateMyProfile } = useAuth();
  const { showAlert } = useAlert();
  const [saving, setSaving] = useState(false);

  const mode = route.params?.mode || 'create';
  const index = route.params?.index;
  const existing = route.params?.servicio || null;

  const { enabled: modalidadesHabilitadas, options: modalidadOptions } = useMemo(
    () => computeAllowedModalidades(user),
    [user]
  );

  // Igual que la web: con un solo bloque de horario, la duración queda fijada al intervalo.
  const fixedDuracion = useMemo(() => {
    const blocks = Array.isArray(user?.timetable) ? user.timetable : [];
    if (blocks.length === 1 && blocks[0]?.interval) return `${blocks[0].interval} minutos`;
    return null;
  }, [user?.timetable]);

  const duracionOptions = fixedDuracion ? [fixedDuracion] : DURACIONES_BASE;

  const [tipo, setTipo] = useState(existing?.tipo || '');
  const [modalidad, setModalidad] = useState(existing?.modalidad || modalidadOptions[0] || '');
  const [duracion, setDuracion] = useState(fixedDuracion || existing?.duracion || '60 minutos');
  const [precio, setPrecio] = useState(String(existing?.precio || '').replace(/\D/g, ''));
  const [descripcion, setDescripcion] = useState(existing?.descripcion || '');

  const onSubmit = async () => {
    if (!tipo.trim()) {
      showAlert('Indica el nombre del servicio', 'warning');
      return;
    }
    if (!precio.trim()) {
      showAlert('Indica el precio del servicio', 'warning');
      return;
    }
    if (!modalidadesHabilitadas.length) {
      showAlert('Habilita al menos una modalidad de atención en tu perfil antes de crear servicios.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const servicios = Array.isArray(user?.servicios) ? [...user.servicios] : [];
      const nextServicio = {
        tipo: tipo.trim(),
        duracion,
        precio: precio.replace(/\D/g, ''),
        modalidad,
        descripcion: descripcion.trim(),
      };

      if (mode === 'edit' && typeof index === 'number') {
        servicios[index] = nextServicio;
      } else {
        servicios.push(nextServicio);
      }

      await updateMyProfile({ servicios });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const renderChips = (options, value, onSelect, disabled = false) => (
    <View style={styles.chipsWrap}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
            onPress={() => onSelect(opt)}
            disabled={disabled}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Input label="Tipo" icon="briefcase-outline" value={tipo} onChangeText={setTipo} placeholder="Ej: Consulta General" />

        <Text style={styles.fieldLabel}>Modalidad</Text>
        {modalidadesHabilitadas.length ? (
          renderChips(modalidadOptions, modalidad, setModalidad)
        ) : (
          <Text style={styles.warnText}>
            No tienes modalidades habilitadas. Actívalas en Editar perfil → Modalidades.
          </Text>
        )}

        <Text style={styles.fieldLabel}>Duración</Text>
        {renderChips(duracionOptions, duracion, setDuracion, !!fixedDuracion)}
        {fixedDuracion ? (
          <Text style={styles.hintText}>
            La duración queda fijada al intervalo de tu único bloque de horario.
          </Text>
        ) : null}

        <Input
          label="Precio (CLP)"
          icon="cash-outline"
          value={precio}
          onChangeText={(t) => setPrecio(String(t).replace(/\D/g, ''))}
          placeholder="Ej: 30000"
          keyboardType="number-pad"
        />

        <Input
          label="Descripción (opcional)"
          icon="document-text-outline"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          inputStyle={{ minHeight: 90, textAlignVertical: 'top' }}
        />

        <Button
          title={saving ? 'Guardando...' : 'Guardar'}
          onPress={onSubmit}
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipDisabled: { opacity: 0.6 },
  chipText: { fontSize: 13, color: colors.textPrimary },
  chipTextActive: { color: colors.primary, fontWeight: '700' },
  warnText: {
    color: '#8a5a00',
    fontSize: 13,
    marginBottom: 14,
  },
  hintText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 14,
  },
});
