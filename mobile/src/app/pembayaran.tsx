import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Lazy import WebView agar aman saat bundling di web / node SSR
let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch {}
}

import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radii } from '@/constants/theme';

const FINISH_PATTERNS = [
  'transaction_status=settlement',
  'transaction_status=capture',
  'transaction_status=pending',
  'transaction_status=expire',
  'transaction_status=cancel',
  'transaction_status=deny',
  'transaction_status=failure',
  '/finish',
  '/error',
  '/cancel',
];

function detectStatus(url: string): 'success' | 'pending' | 'failed' | 'cancel' | null {
  const lower = url.toLowerCase();
  if (lower.includes('transaction_status=settlement') || lower.includes('transaction_status=capture')) return 'success';
  if (lower.includes('transaction_status=pending')) return 'pending';
  if (lower.includes('transaction_status=expire') || lower.includes('transaction_status=failure') || lower.includes('transaction_status=deny')) return 'failed';
  if (lower.includes('transaction_status=cancel') || lower.includes('/cancel')) return 'cancel';
  return null;
}

export default function PembayaranScreen() {
  const router = useRouter();
  const { redirect_url, order_id, payment_id } = useLocalSearchParams<{
    redirect_url: string;
    order_id: string;
    payment_id: string;
  }>();

  const theme = useTheme();
  const webviewRef = useRef<any>(null);
  const [webLoading, setWebLoading] = useState(true);
  const [done, setDone] = useState(false);

  const handleNavChange = useCallback(
    (nav: any) => {
      if (done) return;

      const url = nav.url ?? '';
      const isFinishPage = FINISH_PATTERNS.some((p) => url.includes(p));

      if (!isFinishPage) return;
      setDone(true);

      const status = detectStatus(url);

      router.replace({
        pathname: '/status-pembayaran',
        params: {
          status: status ?? 'pending',
          order_id,
          payment_id,
        },
      });
    },
    [done, order_id, payment_id, router]
  );

  function handleClose() {
    Alert.alert(
      'Batalkan Pembayaran?',
      'Halaman pembayaran akan ditutup. Pesanan masih tersimpan dan dapat dilanjutkan nanti.',
      [
        { text: 'Lanjutkan Bayar', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: () =>
            router.replace({
              pathname: '/status-pembayaran',
              params: { status: 'cancel', order_id, payment_id },
            }),
        },
      ]
    );
  }

  if (!redirect_url) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={[styles.errorTitle, { color: theme.text }]}>URL Pembayaran Tidak Tersedia</Text>
          <Text style={[styles.errorSubtitle, { color: theme.textSecondary }]}>
            Tidak dapat menemukan link pembayaran Midtrans.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: theme.primary }]}>
            <Text style={[styles.backBtnText, { color: theme.primaryText }]}>Kembali</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Pressable
          onPress={handleClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.closeBtn}>
          <Text style={[styles.closeText, { color: theme.danger }]}>✕ Tutup</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Pembayaran Tiket</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Security Banner */}
      <View
        style={[
          styles.safeBadge,
          {
            backgroundColor: theme.successBg,
            borderColor: theme.successBorder,
          },
        ]}>
        <Text style={[styles.safeBadgeText, { color: theme.success }]}>
          🔒 Jalur Pembayaran Resmi & Terenkripsi Midtrans
        </Text>
      </View>

      {/* WebView Container */}
      <View style={styles.flex}>
        {Platform.OS === 'web' ? (
          <iframe
            src={redirect_url}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Midtrans Payment"
          />
        ) : WebView ? (
          <WebView
            ref={webviewRef}
            source={{ uri: redirect_url }}
            style={styles.flex}
            onNavigationStateChange={handleNavChange}
            onLoadStart={() => setWebLoading(true)}
            onLoadEnd={() => setWebLoading(false)}
            onError={(e: any) => {
              Alert.alert('Gagal Memuat', 'Halaman pembayaran tidak dapat dimuat: ' + e.nativeEvent.description);
            }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={[styles.loadingOverlay, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  Menghubungkan ke gerbang pembayaran Midtrans...
                </Text>
              </View>
            )}
          />
        ) : (
          <View style={[styles.loadingOverlay, { backgroundColor: theme.background }]}>
            <Text style={[styles.errorTitle, { color: theme.text }]}>
              WebView tidak didukung pada platform ini.
            </Text>
          </View>
        )}

        {/* Loading Progress Bar */}
        {webLoading && (
          <View style={[styles.progressBar, { backgroundColor: theme.backgroundSelected }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.primary }]} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 4,
    borderBottomWidth: 1,
  },
  closeBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 60,
  },

  safeBadge: {
    paddingVertical: 7,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  progressFill: {
    width: '65%',
    height: '100%',
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.five,
    gap: Spacing.two,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: Spacing.two,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.two,
  },
  backBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.five,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
