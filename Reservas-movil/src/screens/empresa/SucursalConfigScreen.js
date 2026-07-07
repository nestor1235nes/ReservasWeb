import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAlert } from '../../context/AlertContext';
import { getSucursalUsuarioRequest, updateSucursalRequest } from '../../api/sucursales';
import Input from '../../components/Input';
import Button from '../../components/Button';
import VitalinkLoader from '../../components/VitalinkLoader';
import { colors } from '../../theme';

const splitCsv = (s) =>
  String(s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

const isHex = (s) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(s || '').trim());

export default function SucursalConfigScreen() {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sucursal, setSucursal] = useState(null);
  const [form, setForm] = useState(null);

  const load = async () => {
    try {
      const res = await getSucursalUsuarioRequest();
      const s = res?.data;
      setSucursal(s);
      setForm({
        nombre: s?.nombre || '',
        descripcion: s?.descripcion || '',
        brandPrimary: s?.publicBrand?.primary || '#2596be',
        brandSecondary: s?.publicBrand?.secondary || '#21cbe6',
        contactoEmail: s?.contacto?.email || '',
        contactoCelulares: (s?.contacto?.celulares || []).join(', '),
        contactoTelefonos: (s?.contacto?.telefonos || []).join(', '),
        instagram: s?.contacto?.instagram || '',
        facebook: s?.contacto?.facebook || '',
        twitter: s?.contacto?.twitter || '',
        linkedin: s?.contacto?.linkedin || '',
      });
    } catch (e) {
      const msg = e?.response?.data?.message || 'No se pudo cargar la configuración de la empresa';
      showAlert(Array.isArray(msg) ? msg[0] : msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      showAlert('El nombre de la empresa es obligatorio', 'warning');
      return;
    }
    if (!isHex(form.brandPrimary) || !isHex(form.brandSecondary)) {
      showAlert('Los colores deben ser HEX válidos, por ejemplo #2596be', 'warning');
      return;
    }

    setSaving(true);
    try {
      // Solo los campos que esta pantalla edita. Logo, dirección (Mapbox) y
      // credenciales WhatsApp NO se incluyen para no tocarlos.
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion,
        publicBrand: {
          primary: form.brandPrimary.trim(),
          secondary: form.brandSecondary.trim(),
        },
        contacto: {
          email: form.contactoEmail.trim(),
          celulares: splitCsv(form.contactoCelulares),
          telefonos: splitCsv(form.contactoTelefonos),
          instagram: form.instagram.trim(),
          facebook: form.facebook.trim(),
          twitter: form.twitter.trim(),
          linkedin: form.linkedin.trim(),
        },
      };
      const res = await updateSucursalRequest(sucursal._id, payload);
      setSucursal(res?.data || sucursal);
      showAlert('Configuración de la empresa actualizada', 'success');
    } catch (e) {
      const msg = e?.response?.data?.message || 'No se pudo guardar la configuración';
      showAlert(Array.isArray(msg) ? msg[0] : msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <View style={styles.center}>
        <VitalinkLoader />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Datos generales</Text>
        <Input label="Nombre" icon="business-outline" value={form.nombre} onChangeText={set('nombre')} />
        <Input
          label="Descripción"
          icon="document-text-outline"
          value={form.descripcion}
          onChangeText={set('descripcion')}
          multiline
          inputStyle={{ minHeight: 90, textAlignVertical: 'top' }}
        />

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.infoText}>
            El logo y la dirección (con mapa) se configuran desde la versión web.
            {sucursal?.direccion ? `\nDirección actual: ${sucursal.direccion}` : ''}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Colores de la página pública</Text>
        <View style={styles.colorRow}>
          <View style={styles.colorField}>
            <Input label="Primario" icon="color-palette-outline" value={form.brandPrimary} onChangeText={set('brandPrimary')} autoCapitalize="none" />
          </View>
          <View style={[styles.swatch, isHex(form.brandPrimary) && { backgroundColor: form.brandPrimary.trim() }]} />
        </View>
        <View style={styles.colorRow}>
          <View style={styles.colorField}>
            <Input label="Secundario" icon="color-palette-outline" value={form.brandSecondary} onChangeText={set('brandSecondary')} autoCapitalize="none" />
          </View>
          <View style={[styles.swatch, isHex(form.brandSecondary) && { backgroundColor: form.brandSecondary.trim() }]} />
        </View>

        <Text style={styles.sectionTitle}>Contacto</Text>
        <Input label="Email" icon="mail-outline" value={form.contactoEmail} onChangeText={set('contactoEmail')} keyboardType="email-address" autoCapitalize="none" />
        <Input label="Celulares (separados por coma)" icon="call-outline" value={form.contactoCelulares} onChangeText={set('contactoCelulares')} keyboardType="phone-pad" />
        <Input label="Teléfonos (separados por coma)" icon="call-outline" value={form.contactoTelefonos} onChangeText={set('contactoTelefonos')} keyboardType="phone-pad" />
        <Input label="Instagram" icon="logo-instagram" value={form.instagram} onChangeText={set('instagram')} autoCapitalize="none" />
        <Input label="Facebook" icon="logo-facebook" value={form.facebook} onChangeText={set('facebook')} autoCapitalize="none" />
        <Input label="Twitter / X" icon="logo-twitter" value={form.twitter} onChangeText={set('twitter')} autoCapitalize="none" />
        <Input label="LinkedIn" icon="logo-linkedin" value={form.linkedin} onChangeText={set('linkedin')} autoCapitalize="none" />

        <Button
          title={saving ? 'Guardando...' : 'Guardar cambios'}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  infoText: { flex: 1, color: colors.textPrimary, fontSize: 12, lineHeight: 17 },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorField: { flex: 1 },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f0f0f0',
    marginTop: 6,
  },
});
