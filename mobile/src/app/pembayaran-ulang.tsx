import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { retryPayment, cancelOrder } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radii } from '@/constants/theme';

export default function PembayaranUlangScreen() {
  const router = useRouter();
  const { order_id } = useLocalSearchParams<{ order_id: string }>();
  const theme = useTheme();

  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleRetry = useCallback(async () => {
    if (!order_id) return;
    setLoading(true);
    try {
      const data = await retryPayment(order_id);
      const { redirect_url, payment_id } = data;
      router.replace({
        pathname: '/pembayaran',
        params: { redirect_url, order_id, payment_id },
      });
    } catch (e: unknown) {
      const err = e as Error;
      Alert.alert('Gagal Membuka Pembayaran', err.message ?? 'Terjadi kesalahan saat memuat pembayaran.');
    } finally {
      setLoading(false);
    }
  }, [order_id, router]);

  const handleCancel = useCallback(async () => {
    if (!order_id) return;
    Alert.alert(
      'Konfirmasi Pembatalan',
      'Apakah kamu yakin ingin membatalkan pesanan tiket ini? Tiket yang dipesan akan dikembalikan ke kuota.',
      [
        { text: 'Tidak', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelOrder(order_id);
              router.replace('/');
            } catch (e: unknown) {
              const err = e as Error;
              Alert.alert('Gagal Membatalkan', err.message ?? 'Tidak dapat membatalkan pesanan.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  }, [order_id, router]);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.primary }]}>← Kembali</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Lanjutkan Pembayaran</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Body */}
      <View style={styles.body}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={styles.cardEmoji}>💳</Text>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Selesaikan Pembayaran</Text>
          <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
            Pesanan tiketmu telah tercatat di sistem. Silakan lanjutkan ke gerbang pembayaran Midtrans untuk memilih metode bayar yang kamu inginkan.
          </Text>

          {order_id ? (
            <View style={[styles.idBox, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
              <Text style={[styles.idLabel, { color: theme.textMuted }]}>NOMOR PESANAN</Text>
              <Text style={[styles.idValue, { color: theme.text }]} selectable>
                {order_id}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Footer Actions */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
          },
        ]}>
        <Pressable
          onPress={handleRetry}
          disabled={loading || cancelling}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: theme.primary,
              opacity: loading || cancelling ? 0.6 : pressed ? 0.9 : 1,
            },
          ]}>
          {loading ? (
            <ActivityIndicator color={theme.primaryText} />
          ) : (
            <Text style={[styles.primaryBtnText, { color: theme.primaryText }]}>
              Buka Halaman Pembayaran
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleCancel}
          disabled={loading || cancelling}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => [
            styles.cancelBtn,
            {
              backgroundColor: theme.dangerBg,
              borderColor: theme.dangerBorder,
              opacity: cancelling ? 0.5 : pressed ? 0.8 : 1,
            },
          ]}>
          {cancelling ? (
            <ActivityIndicator size="small" color={theme.danger} />
          ) : (
            <Text style={[styles.cancelBtnText, { color: theme.danger }]}>
              Batalkan Pesanan Ini
            </Text>
          )}
        </Pressable>
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
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
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

  body: {
    flex: 1,
    padding: Spacing.four,
    justifyContent: 'center',
  },
  card: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardEmoji: {
    fontSize: 54,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  cardSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  idBox: {
    width: '100%',
    padding: Spacing.three,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.one,
  },
  idLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  idValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },

  footer: {
    padding: Spacing.four,
    gap: Spacing.two + 4,
    borderTopWidth: 1,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    minHeight: 48,
    borderRadius: Radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
