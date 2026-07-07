import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

import { useAlert } from '../../context/AlertContext';
import { getSucursalUsuarioRequest } from '../../api/sucursales';
import VitalinkLoader from '../../components/VitalinkLoader';
import { colors } from '../../theme';
import { WEB_BASE_URL } from '../../config';

export default function SucursalLinkScreen() {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(true);
  const [sucursal, setSucursal] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getSucursalUsuarioRequest();
        setSucursal(res?.data || null);
      } catch (e) {
        const msg = e?.response?.data?.message || 'No se pudo cargar la empresa';
        showAlert(Array.isArray(msg) ? msg[0] : msg, 'error');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Misma construcción que la web (EnlaceSucursal): raíz del dominio + slug (o _id).
  const enlace = useMemo(() => {
    if (!sucursal) return '';
    const key = sucursal.slug || sucursal._id;
    return key ? `${WEB_BASE_URL}/${encodeURIComponent(key)}` : '';
  }, [sucursal]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(enlace);
    showAlert('Enlace copiado', 'success');
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: enlace });
    } catch {
      // usuario canceló
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <VitalinkLoader />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Enlace público de {sucursal?.nombre || 'tu empresa'}</Text>
          <Text style={styles.cardDescription}>
            Esta página muestra a todos los profesionales de tu empresa para que los
            pacientes reserven con cualquiera de ellos.
          </Text>

          {enlace ? (
            <>
              <View style={styles.linkBox}>
                <Text style={styles.linkText} numberOfLines={2}>{enlace}</Text>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleCopy}>
                  <Ionicons name="copy-outline" size={18} color={colors.primary} />
                  <Text style={styles.actionText}>Copiar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                  <Ionicons name="share-social-outline" size={18} color={colors.primary} />
                  <Text style={styles.actionText}>Compartir</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.qrWrap}>
                <QRCode value={enlace} size={190} color="#000" backgroundColor="#fff" />
                <Text style={styles.qrCaption}>
                  Imprime o comparte este código para llevar pacientes a la página de tu empresa.
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.cardDescription}>No se encontró el enlace de la empresa.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  cardDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    marginBottom: 10,
    lineHeight: 16,
  },
  linkBox: { backgroundColor: colors.primarySoft, borderRadius: 10, padding: 12 },
  linkText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  qrWrap: { alignItems: 'center', marginTop: 16, gap: 10 },
  qrCaption: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
  },
});
