import React, { useMemo, useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';

import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { colors } from '../../theme';

export default function ServiceFormScreen({ navigation, route }) {
  const { user, updateMyProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const mode = route.params?.mode || 'create';
  const index = route.params?.index;
  const existing = route.params?.servicio || null;

  const defaults = useMemo(
    () => ({
      tipo: existing?.tipo || '',
      duracion: existing?.duracion || '',
      precio: existing?.precio || '',
      modalidad: existing?.modalidad || '',
      descripcion: existing?.descripcion || '',
    }),
    [existing]
  );

  const { control, handleSubmit } = useForm({ defaultValues: defaults });

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const servicios = Array.isArray(user?.servicios) ? [...user.servicios] : [];
      const nextServicio = {
        tipo: values.tipo,
        duracion: values.duracion,
        precio: values.precio,
        modalidad: values.modalidad,
        descripcion: values.descripcion,
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

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Controller
          control={control}
          name="tipo"
          render={({ field: { onChange, value } }) => (
            <Input label="Tipo" icon="briefcase-outline" value={value} onChangeText={onChange} />
          )}
        />
        <Controller
          control={control}
          name="modalidad"
          render={({ field: { onChange, value } }) => (
            <Input label="Modalidad" icon="options-outline" value={value} onChangeText={onChange} />
          )}
        />
        <Controller
          control={control}
          name="duracion"
          render={({ field: { onChange, value } }) => (
            <Input label="Duración" icon="time-outline" value={value} onChangeText={onChange} placeholder="Ej: 30 min" />
          )}
        />
        <Controller
          control={control}
          name="precio"
          render={({ field: { onChange, value } }) => (
            <Input label="Precio" icon="cash-outline" value={value} onChangeText={onChange} placeholder="Ej: $20.000" />
          )}
        />
        <Controller
          control={control}
          name="descripcion"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Descripción"
              icon="document-text-outline"
              value={value}
              onChangeText={onChange}
              multiline
              inputStyle={{ minHeight: 90, textAlignVertical: 'top' }}
            />
          )}
        />

        <Button
          title={saving ? 'Guardando...' : 'Guardar'}
          onPress={handleSubmit(onSubmit)}
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
});
