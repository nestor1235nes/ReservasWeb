import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { crearBoxRequest, actualizarBoxRequest } from '../../api/boxes';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { colors } from '../../theme';

// Mismos presets que la web (GestionarBoxes).
const COLORES_PRESET = [
  '#2596be', '#21cbe6', '#0d9488', '#16a34a', '#ca8a04',
  '#dc2626', '#9333ea', '#db2777', '#f97316', '#6366f1',
];

export default function BoxFormScreen({ navigation, route }) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [saving, setSaving] = useState(false);

  const mode = route.params?.mode || 'create';
  const existing = route.params?.box || null;
  const sucursalId = user?.sucursal?._id || user?.sucursal;

  const [nombre, setNombre] = useState(existing?.nombre || '');
  const [codigo, setCodigo] = useState(existing?.codigo || '');
  const [piso, setPiso] = useState(existing?.piso || '');
  const [capacidad, setCapacidad] = useState(String(existing?.capacidad || 1));
  const [descripcion, setDescripcion] = useState(existing?.descripcion || '');
  const [notas, setNotas] = useState(existing?.notas || '');
  const [color, setColor] = useState(existing?.color || '#2596be');
  const [activo, setActivo] = useState(existing ? !!existing.activo : true);
  const [equipamiento, setEquipamiento] = useState(
    Array.isArray(existing?.equipamiento) ? existing.equipamiento : []
  );
  const [nuevoEquipo, setNuevoEquipo] = useState('');

  const addEquipo = () => {
    const item = nuevoEquipo.trim();
    if (!item) return;
    if (equipamiento.some((e) => e.toLowerCase() === item.toLowerCase())) {
      setNuevoEquipo('');
      return;
    }
    setEquipamiento((prev) => [...prev, item]);
    setNuevoEquipo('');
  };

  const removeEquipo = (item) =>
    setEquipamiento((prev) => prev.filter((e) => e !== item));

  const handleSave = async () => {
    if (!nombre.trim()) {
      showAlert('El nombre del box es obligatorio', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        codigo: codigo.trim(),
        piso: piso.trim(),
        capacidad: Math.max(1, parseInt(capacidad, 10) || 1),
        descripcion: descripcion.trim(),
        notas: notas.trim(),
        color,
        activo,
        equipamiento,
      };

      if (mode === 'edit' && existing?._id) {
        await actualizarBoxRequest(existing._id, payload);
        showAlert('Box actualizado', 'success');
      } else {
        await crearBoxRequest(sucursalId, payload);
        showAlert('Box creado', 'success');
      }
      navigation.goBack();
    } catch (e) {
      const msg = e?.response?.data?.message || 'No se pudo guardar el box';
      showAlert(Array.isArray(msg) ? msg[0] : msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Input label="Nombre" icon="cube-outline" value={nombre} onChangeText={setNombre} placeholder="Ej: Box 1" />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input label="Código" icon="pricetag-outline" value={codigo} onChangeText={setCodigo} placeholder="Ej: B1" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Piso" icon="layers-outline" value={piso} onChangeText={setPiso} placeholder="Ej: 2" />
          </View>
        </View>
        <Input
          label="Capacidad"
          icon="people-outline"
          value={capacidad}
          onChangeText={(t) => setCapacidad(String(t).replace(/\D/g, ''))}
          keyboardType="number-pad"
        />
        <Input
          label="Descripción (opcional)"
          icon="document-text-outline"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          inputStyle={{ minHeight: 70, textAlignVertical: 'top' }}
        />

        <Text style={styles.fieldLabel}>Equipamiento</Text>
        <View style={styles.equipoRow}>
          <TextInput
            style={styles.equipoInput}
            value={nuevoEquipo}
            onChangeText={setNuevoEquipo}
            placeholder="Ej: Camilla"
            placeholderTextColor="#9aa7ad"
            onSubmitEditing={addEquipo}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.equipoAddBtn} onPress={addEquipo}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {equipamiento.length ? (
          <View style={styles.chipsWrap}>
            {equipamiento.map((eq) => (
              <View key={eq} style={styles.chip}>
                <Text style={styles.chipText}>{eq}</Text>
                <TouchableOpacity onPress={() => removeEquipo(eq)}>
                  <Ionicons name="close-circle" size={15} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.fieldLabel}>Color</Text>
        <View style={styles.colorsWrap}>
          {COLORES_PRESET.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
              onPress={() => setColor(c)}
            >
              {color === c ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Notas internas (opcional)"
          icon="reader-outline"
          value={notas}
          onChangeText={setNotas}
          multiline
          inputStyle={{ minHeight: 70, textAlignVertical: 'top' }}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Box activo</Text>
          <Switch value={activo} onValueChange={setActivo} />
        </View>

        <Button
          title={saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Crear box'}
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
  row: { flexDirection: 'row', gap: 10 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  equipoRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  equipoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: '#fff',
  },
  equipoAddBtn: {
    width: 42,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  colorsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: '#333',
  },
  switchRow: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  switchLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: '500' },
});
