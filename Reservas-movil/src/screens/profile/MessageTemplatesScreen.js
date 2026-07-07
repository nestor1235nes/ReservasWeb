import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { updateSucursalRequest } from '../../api/sucursales';
import { esAdminDeSucursal, hasActiveSubscription } from '../../utils/sucursal';
import Button from '../../components/Button';
import { colors } from '../../theme';
import {
  DEFAULT_MESSAGE_TEMPLATES,
  TEMPLATE_FIELDS,
  getTemplateValue,
} from '../../utils/messageTemplates';

export default function MessageTemplatesScreen() {
  const { user, updateMyProfile, refreshProfile } = useAuth();
  const { showAlert } = useAlert();
  const [saving, setSaving] = useState(false);

  const esSucursal = !!user?.sucursal;
  // El admin de la empresa edita las plantillas de la sucursal (aplican a todos
  // sus miembros); el resto de los miembros las ve en solo lectura.
  const esAdmin = esAdminDeSucursal(user);

  // El backend bloquea la edición de mensajes con plan Basic activo (403),
  // tanto en updateMe (independiente) como en actualizarSucursal (empresa).
  const isBasic = useMemo(() => {
    const planDoc = esSucursal ? user?.sucursal : user;
    const planName = planDoc?.suscriptionPlan?.name || null;
    return planName === 'Basic' && hasActiveSubscription(planDoc?.suscriptionEndDate);
  }, [esSucursal, user]);

  const readOnly = (esSucursal && !esAdmin) || isBasic;

  // Plantillas efectivas: las de la sucursal si pertenece a una; si no, las propias.
  const sourceTemplates = esSucursal ? user?.sucursal?.messageTemplates : user?.messageTemplates;
  const sourceDefaultMessage = esSucursal
    ? user?.sucursal?.defaultMessage || ''
    : user?.defaultMessage || '';

  const initialValues = useMemo(() => {
    const out = {};
    for (const f of TEMPLATE_FIELDS) {
      out[`${f.section}.${f.key}`] =
        getTemplateValue(sourceTemplates, f.section, f.key) ||
        DEFAULT_MESSAGE_TEMPLATES[f.section][f.key];
    }
    out.defaultMessage = sourceDefaultMessage;
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const [values, setValues] = useState(initialValues);

  const setValue = (fieldKey, text) =>
    setValues((prev) => ({ ...prev, [fieldKey]: text }));

  const appendPlaceholder = (fieldKey, token) => {
    if (readOnly) return;
    setValues((prev) => {
      const current = String(prev[fieldKey] || '');
      const sep = current && !current.endsWith(' ') && !current.endsWith('\n') ? ' ' : '';
      return { ...prev, [fieldKey]: `${current}${sep}${token}` };
    });
  };

  const restoreDefault = (f) =>
    setValue(`${f.section}.${f.key}`, DEFAULT_MESSAGE_TEMPLATES[f.section][f.key]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const messageTemplates = { reminders: {}, waitlist: {} };
      for (const f of TEMPLATE_FIELDS) {
        messageTemplates[f.section][f.key] = String(values[`${f.section}.${f.key}`] || '').trim();
      }
      const payload = {
        messageTemplates,
        defaultMessage: String(values.defaultMessage || '').trim(),
      };

      if (esSucursal && esAdmin) {
        // Guarda las plantillas de la EMPRESA. No incluir claves de credenciales
        // WhatsApp (whatsappNumber/idInstance/apiTokenInstance): el backend solo
        // valida credenciales si alguna de esas claves viene en el payload.
        const sucursalId = user?.sucursal?._id || user?.sucursal;
        await updateSucursalRequest(sucursalId, payload);
        await refreshProfile();
        showAlert('Plantillas de la empresa actualizadas', 'success');
      } else {
        await updateMyProfile(payload);
      }
    } catch (e) {
      if (esSucursal && esAdmin) {
        const msg = e?.response?.data?.message || 'No se pudieron guardar las plantillas';
        showAlert(Array.isArray(msg) ? msg[0] : msg, 'error');
      }
      // en el flujo personal, updateMyProfile ya muestra la alerta de error
    } finally {
      setSaving(false);
    }
  };

  const renderCard = ({ fieldKey, titulo, descripcion, placeholders, onRestore }) => (
    <View style={styles.card} key={fieldKey}>
      <Text style={styles.cardTitle}>{titulo}</Text>
      <Text style={styles.cardDescription}>{descripcion}</Text>

      <TextInput
        style={[styles.textArea, readOnly && styles.textAreaDisabled]}
        value={values[fieldKey]}
        onChangeText={(t) => setValue(fieldKey, t)}
        editable={!readOnly}
        multiline
        textAlignVertical="top"
        placeholder="Escribe la plantilla del mensaje..."
        placeholderTextColor="#9aa7ad"
      />

      <View style={styles.chipsWrap}>
        {placeholders.map((token) => (
          <TouchableOpacity
            key={token}
            style={[styles.chip, readOnly && styles.chipDisabled]}
            onPress={() => appendPlaceholder(fieldKey, token)}
            disabled={readOnly}
          >
            <Text style={styles.chipText}>{token}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!readOnly && onRestore ? (
        <TouchableOpacity style={styles.restoreBtn} onPress={onRestore}>
          <Ionicons name="refresh-outline" size={14} color={colors.primary} />
          <Text style={styles.restoreText}>Restaurar predeterminado</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        {esSucursal && !esAdmin ? (
          <View style={styles.notice}>
            <Ionicons name="business-outline" size={18} color={colors.primary} />
            <Text style={styles.noticeText}>
              Estas plantillas las administra tu empresa. Puedes verlas aquí; solo un
              administrador de la sucursal puede modificarlas.
            </Text>
          </View>
        ) : esSucursal && esAdmin && !isBasic ? (
          <View style={styles.notice}>
            <Ionicons name="business-outline" size={18} color={colors.primary} />
            <Text style={styles.noticeText}>
              Estás editando las plantillas de tu empresa: se aplican a todos los
              profesionales de la sucursal.
            </Text>
          </View>
        ) : isBasic ? (
          <View style={styles.notice}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
            <Text style={styles.noticeText}>
              La edición de mensajes automáticos está disponible desde el Plan Standard.
              Estas son las plantillas que se usarán con tu cuenta.
            </Text>
          </View>
        ) : (
          <Text style={styles.intro}>
            Personaliza los mensajes de WhatsApp que se envían a tus pacientes. Toca un
            marcador (por ejemplo {'{nombre}'}) para agregarlo a la plantilla.
          </Text>
        )}

        {TEMPLATE_FIELDS.map((f) =>
          renderCard({
            fieldKey: `${f.section}.${f.key}`,
            titulo: f.titulo,
            descripcion: f.descripcion,
            placeholders: f.placeholders,
            onRestore: () => restoreDefault(f),
          })
        )}

        {renderCard({
          fieldKey: 'defaultMessage',
          titulo: 'Mensaje al liberar horas',
          descripcion:
            'Mensaje por defecto que se ofrece al reagendar una cita o al bloquear un día u horarios con citas afectadas.',
          placeholders: ['{nombre}', '{dia}', '{fecha}', '{hora}', '{servicio}', '{profesional}', '{sucursal}', '{enlaceConfirmacion}'],
          onRestore: null,
        })}

        {!readOnly ? (
          <Button
            title={saving ? 'Guardando...' : 'Guardar plantillas'}
            onPress={handleSave}
            loading={saving}
            style={{ marginTop: 4 }}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 28 },
  intro: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    marginBottom: 10,
    lineHeight: 16,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    minHeight: 110,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: '#fff',
  },
  textAreaDisabled: {
    backgroundColor: '#f5f7f8',
    color: '#6b7a81',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  chip: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipDisabled: { opacity: 0.5 },
  chipText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  restoreText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
