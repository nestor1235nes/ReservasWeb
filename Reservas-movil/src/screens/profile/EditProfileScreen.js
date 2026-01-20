import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';

import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { colors } from '../../theme';

export default function EditProfileScreen() {
  const { user, updateMyProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const defaults = useMemo(
    () => ({
      username: user?.username || '',
      celular: user?.celular || '',
      direccion: user?.direccion || '',
      especialidad_principal: user?.especialidad_principal || '',
      especialidad: user?.especialidad || '',
      experiencia: user?.experiencia || '',
      descripcion: user?.descripcion || '',
      celularEsWhatsApp: !!user?.celularEsWhatsApp,
      cita_presencial: !!user?.cita_presencial,
      cita_virtual: !!user?.cita_virtual,
      cita_domicilio: !!user?.cita_domicilio,
      adminAtiendePersonas: !!user?.adminAtiendePersonas,
    }),
    [user]
  );

  const { control, handleSubmit } = useForm({
    defaultValues: defaults,
  });

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      await updateMyProfile({
        username: values.username,
        celular: values.celular,
        direccion: values.direccion,
        especialidad_principal: values.especialidad_principal,
        especialidad: values.especialidad,
        experiencia: values.experiencia,
        descripcion: values.descripcion,
        celularEsWhatsApp: values.celularEsWhatsApp,
        cita_presencial: values.cita_presencial,
        cita_virtual: values.cita_virtual,
        cita_domicilio: values.cita_domicilio,
        adminAtiendePersonas: values.adminAtiendePersonas,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Información Personal</Text>
        <Controller
          control={control}
          name="username"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Nombre"
              icon="person-outline"
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <Input
          label="Email (solo lectura)"
          icon="mail-outline"
          value={user.email || ''}
          editable={false}
          inputStyle={{ color: '#999' }}
        />

        <Controller
          control={control}
          name="celular"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Celular"
              icon="call-outline"
              value={value}
              onChangeText={onChange}
              keyboardType="phone-pad"
            />
          )}
        />

        <Controller
          control={control}
          name="direccion"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Dirección"
              icon="location-outline"
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Celular es WhatsApp</Text>
          <Controller
            control={control}
            name="celularEsWhatsApp"
            render={({ field: { onChange, value } }) => (
              <Switch value={value} onValueChange={onChange} />
            )}
          />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Información Profesional</Text>
        <Controller
          control={control}
          name="especialidad_principal"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Especialidad principal"
              icon="briefcase-outline"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="especialidad"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Especialidad"
              icon="briefcase-outline"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="experiencia"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Experiencia"
              icon="school-outline"
              value={value}
              onChangeText={onChange}
            />
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

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Modalidades</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Atención presencial</Text>
          <Controller
            control={control}
            name="cita_presencial"
            render={({ field: { onChange, value } }) => (
              <Switch value={value} onValueChange={onChange} />
            )}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Atención virtual</Text>
          <Controller
            control={control}
            name="cita_virtual"
            render={({ field: { onChange, value } }) => (
              <Switch value={value} onValueChange={onChange} />
            )}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Atención domicilio</Text>
          <Controller
            control={control}
            name="cita_domicilio"
            render={({ field: { onChange, value } }) => (
              <Switch value={value} onValueChange={onChange} />
            )}
          />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Administración</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Admin atiende personas</Text>
          <Controller
            control={control}
            name="adminAtiendePersonas"
            render={({ field: { onChange, value } }) => (
              <Switch value={value} onValueChange={onChange} />
            )}
          />
        </View>

        <Button
          title={saving ? 'Guardando...' : 'Guardar cambios'}
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 10,
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
