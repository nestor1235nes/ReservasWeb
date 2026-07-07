import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { generateEnlaceRequest } from '../../api/auth';
import Button from '../../components/Button';
import { colors } from '../../theme';
import { WEB_BASE_URL } from '../../config';

const TEMPLATES = [
  { value: 'template1', label: 'Plantilla 1' },
  { value: 'template2', label: 'Plantilla 2' },
  { value: 'template3', label: 'Plantilla 3' },
  { value: 'custom', label: 'Personalizada' },
];

// Mismo gate que la web (LinkPage): el enlace se comparte solo con
// al menos un servicio y un bloque de horario válido.
const computeCanShare = (user) => {
  const hasServicios = Array.isArray(user?.servicios) && user.servicios.length > 0;
  const blocks = Array.isArray(user?.timetable) ? user.timetable : [];
  const hasHorario = blocks.some((b) => {
    const hasDays = Array.isArray(b?.days) && b.days.length > 0;
    if (!hasDays) return false;
    if (Array.isArray(b?.times) && b.times.length > 0) return true;
    return !!b?.fromTime && !!b?.toTime && b.fromTime !== b.toTime;
  });
  return { hasServicios, hasHorario, ok: hasServicios && hasHorario };
};

export default function MyLinkScreen() {
  const { user, refreshProfile, updateMyProfile } = useAuth();
  const { showAlert } = useAlert();
  const [generating, setGenerating] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const enlace = useMemo(() => {
    if (user?.slug) return `${WEB_BASE_URL}/p/${encodeURIComponent(user.slug)}`;
    return user?.miEnlace || '';
  }, [user?.slug, user?.miEnlace]);

  const share = useMemo(() => computeCanShare(user), [user]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateEnlaceRequest(user?._id || user?.id);
      await refreshProfile();
      showAlert('Enlace generado', 'success');
    } catch (e) {
      const msg = e?.response?.data?.message || 'No se pudo generar el enlace';
      showAlert(Array.isArray(msg) ? msg[0] : msg, 'error');
    } finally {
      setGenerating(false);
    }
  };

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

  const handleTemplate = async (value) => {
    if (value === (user?.bookingTemplate || 'template1')) return;
    setSavingTemplate(true);
    try {
      await updateMyProfile({ bookingTemplate: value });
    } finally {
      setSavingTemplate(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        {!share.ok ? (
          <View style={styles.warnBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#8a5a00" />
            <Text style={styles.warnText}>
              Para compartir tu enlace necesitas{' '}
              {!share.hasServicios ? 'al menos un servicio' : ''}
              {!share.hasServicios && !share.hasHorario ? ' y ' : ''}
              {!share.hasHorario ? 'un bloque de horario configurado' : ''}.
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tu enlace público</Text>
          <Text style={styles.cardDescription}>
            Compártelo con tus pacientes para que reserven directamente contigo.
          </Text>

          {enlace ? (
            <>
              <View style={styles.linkBox}>
                <Text style={styles.linkText} numberOfLines={2}>{enlace}</Text>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, !share.ok && styles.actionBtnDisabled]}
                  onPress={handleCopy}
                  disabled={!share.ok}
                >
                  <Ionicons name="copy-outline" size={18} color={colors.primary} />
                  <Text style={styles.actionText}>Copiar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, !share.ok && styles.actionBtnDisabled]}
                  onPress={handleShare}
                  disabled={!share.ok}
                >
                  <Ionicons name="share-social-outline" size={18} color={colors.primary} />
                  <Text style={styles.actionText}>Compartir</Text>
                </TouchableOpacity>
              </View>

              {share.ok ? (
                <View style={styles.qrWrap}>
                  <QRCode value={enlace} size={190} color="#000" backgroundColor="#fff" />
                  <Text style={styles.qrCaption}>
                    Tus pacientes pueden escanear este código para abrir tu página de reservas.
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <Button
              title={generating ? 'Generando...' : 'Generar mi enlace'}
              onPress={handleGenerate}
              loading={generating}
              style={{ marginTop: 8 }}
            />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Plantilla de tu página</Text>
          <Text style={styles.cardDescription}>
            Elige el diseño de tu página pública de reservas. Los colores de la plantilla
            personalizada se configuran desde la versión web.
          </Text>
          <View style={styles.chipsWrap}>
            {TEMPLATES.map((t) => {
              const active = (user?.bookingTemplate || 'template1') === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => handleTemplate(t.value)}
                  disabled={savingTemplate}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 28 },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fff7e6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  warnText: { flex: 1, color: '#8a5a00', fontSize: 13, lineHeight: 18 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  cardDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    marginBottom: 10,
    lineHeight: 16,
  },
  linkBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    padding: 12,
  },
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
  actionBtnDisabled: { opacity: 0.5 },
  actionText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  qrWrap: { alignItems: 'center', marginTop: 16, gap: 10 },
  qrCaption: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
