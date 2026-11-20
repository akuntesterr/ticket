import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { login, saveToken } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radii } from '@/constants/theme';

export default function LoginScreen() {
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Perhatian', 'Email dan password wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      await saveToken(result.access_token);
      router.replace('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login gagal. Silakan periksa kembali email dan password.';
      Alert.alert('Login Gagal', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Back to Home Link */}
          <Pressable
            onPress={() => router.replace('/')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.backBtn}>
            <Text style={[styles.backBtnText, { color: theme.textSecondary }]}>
              ← Kembali ke Beranda
            </Text>
          </Pressable>

          {/* Form Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}>
            {/* Header Badge & Title */}
            <View style={styles.cardHeader}>
              <View style={[styles.logoBadge, { backgroundColor: theme.primaryMuted }]}>
                <Text style={styles.logoBadgeText}>🎫</Text>
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Masuk ke ZTICK</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Akses tiket konser dan riwayat pemesanan kamu
              </Text>
            </View>

            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Alamat Email</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundSelected,
                    borderColor: focusedInput === 'email' ? theme.primary : theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="nama@email.com"
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Kata Sandi</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    {
                      backgroundColor: theme.backgroundSelected,
                      borderColor: focusedInput === 'password' ? theme.primary : theme.border,
                      color: theme.text,
                    },
                  ]}
                  placeholder="Masukkan kata sandi"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                />
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.eyeBtn}>
                  <Text style={[styles.eyeBtnText, { color: theme.textSecondary }]}>
                    {showPassword ? 'Sembunyikan' : 'Lihat'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                {
                  backgroundColor: theme.primary,
                  opacity: loading ? 0.7 : pressed ? 0.9 : 1,
                },
              ]}
              onPress={handleLogin}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={theme.primaryText} />
              ) : (
                <Text style={[styles.submitBtnText, { color: theme.primaryText }]}>Masuk Sekarang</Text>
              )}
            </Pressable>

            {/* Link to Register */}
            <View style={styles.registerLinkRow}>
              <Text style={[styles.registerPromptText, { color: theme.textSecondary }]}>
                Belum memiliki akun ZTICK?
              </Text>
              <Pressable
                onPress={() => router.push('/register')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.inlineLinkBtn}>
                <Text style={[styles.inlineLinkText, { color: theme.primary }]}>Daftar Akun Baru</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  backBtn: {
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.five,
    gap: Spacing.four,
  },
  cardHeader: {
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  logoBadgeText: {
    fontSize: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 2,
  },
  fieldGroup: {
    gap: Spacing.one + 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 100,
  },
  eyeBtn: {
    position: 'absolute',
    right: Spacing.three,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  eyeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  submitBtn: {
    minHeight: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  registerLinkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  registerPromptText: {
    fontSize: 13,
  },
  inlineLinkBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  inlineLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
