import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';
import { requestPasswordResetRequest, resetPasswordRequest } from '../../api/auth';

function validatePassword(pw) {
  return {
    length: pw.length >= 6,
    uppercase: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
}

export default function PrivacySecurityScreen() {
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState(user?.email || '');
  const [phoneMasked, setPhoneMasked] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const rules = useMemo(() => validatePassword(password), [password]);

  const canRequest = useMemo(() => Boolean(email && /.+@.+\..+/.test(email)), [email]);
  const canReset = useMemo(() => {
    if (!canRequest) return false;
    if (!/^\d{6}$/.test(code)) return false;
    if (!password || !confirmPassword) return false;
    if (password !== confirmPassword) return false;
    return true;
  }, [canRequest, code, password, confirmPassword]);

  const handleRequest = async () => {
    setLoading(true);
    try {
      const resp = await requestPasswordResetRequest(String(email || '').trim());
      setPhoneMasked(resp?.data?.phoneMasked || '');
      setStep(2);
      Alert.alert('Código enviado', 'Revisa tu WhatsApp para ver el código.');
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'No se pudo enviar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordRequest({
        email: String(email || '').trim(),
        code: String(code || '').trim(),
        password,
      });
      setPassword('');
      setConfirmPassword('');
      setCode('');
      setStep(1);
      Alert.alert('Listo', 'Tu contraseña fue actualizada.');
    } catch (e) {
      const msg = e?.response?.data?.message;
      Alert.alert('Error', Array.isArray(msg) ? msg.join('\n') : (msg || 'No se pudo actualizar la contraseña'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.content}>
        <Text style={styles.title}>Privacidad y seguridad</Text>
        <Text style={styles.subtitle}>Cambia tu contraseña con un código enviado por WhatsApp.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="correo@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {step === 1 && (
            <TouchableOpacity
              style={[styles.button, (!canRequest || loading) && styles.buttonDisabled]}
              disabled={!canRequest || loading}
              onPress={handleRequest}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar código</Text>}
            </TouchableOpacity>
          )}

          {step === 2 && (
            <>
              <Text style={styles.helper}>{phoneMasked ? `Código enviado a ${phoneMasked}.` : 'Código enviado.'}</Text>

              <Text style={styles.label}>Código (6 dígitos)</Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={(t) => setCode(String(t || '').replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Nueva contraseña</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Nueva contraseña"
                secureTextEntry
              />

              <View style={styles.rulesBox}>
                <Text style={styles.rulesTitle}>Requisitos:</Text>
                <Text style={[styles.rule, rules.length ? styles.ruleOk : null]}>• Al menos 6 caracteres</Text>
                <Text style={[styles.rule, rules.uppercase ? styles.ruleOk : null]}>• Al menos una mayúscula</Text>
                <Text style={[styles.rule, rules.number ? styles.ruleOk : null]}>• Al menos un número</Text>
                <Text style={[styles.rule, rules.symbol ? styles.ruleOk : null]}>• Al menos un símbolo</Text>
              </View>

              <Text style={styles.label}>Confirmar nueva contraseña</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirmar"
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.button, (!canReset || loading) && styles.buttonDisabled]}
                disabled={!canReset || loading}
                onPress={handleReset}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Cambiar contraseña</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.linkBtn, loading && { opacity: 0.6 }]}
                disabled={loading}
                onPress={handleRequest}
              >
                <Text style={styles.linkText}>Reenviar código</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  subtitle: { marginTop: 6, color: '#666' },
  card: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eef2f6',
  },
  label: { marginTop: 10, marginBottom: 6, fontWeight: '600', color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  helper: { marginTop: 10, color: '#666' },
  button: {
    marginTop: 14,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#9bbdca' },
  buttonText: { color: '#fff', fontWeight: '700' },
  linkBtn: { marginTop: 12, alignItems: 'center' },
  linkText: { color: colors.primary, fontWeight: '600' },
  rulesBox: { marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: '#f7fbfd' },
  rulesTitle: { fontWeight: '700', marginBottom: 6, color: '#333' },
  rule: { color: '#666', marginBottom: 2 },
  ruleOk: { color: '#1b7f3a' },
});
