import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { getPaymentStatus } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radii } from '@/constants/theme';

type PaymentStatus = 'success' | 'pending' | 'failed' | 'cancel';

interface StatusConfig {
  emoji: string;
  title: string;
  subtitle: string;
  statusType: 'success' | 'warning' | 'danger' | 'neutral';
}

const STATUS_MAP: Record<PaymentStatus, StatusConfig> = {
  success: {
    emoji: '🎉',
    title: 'Pembayaran Berhasil!',
    subtitle: 'Selamat! Tiket konser kamu sudah diterbitkan dan barcode siap digunakan.',
    statusType: 'success',
  },
  pending: {
    emoji: '⏳',
    title: 'Menunggu Pembayaran',
    subtitle:
      'Pembayaran sedang menunggu transfer atau verifikasi dari bank/e-wallet kamu. Selesaikan sebelum waktu habis.',
    statusType: 'warning',
  },
  failed: {
    emoji: '❌',
    title: 'Pembayaran Gagal',
    subtitle: 'Transaksi tidak berhasil diproses atau waktu pembayaran telah kedaluwarsa.',
    statusType: 'danger',
  },
  cancel: {
    emoji: '⏸️',
    title: 'Pembayaran Dibatalkan',
    subtitle: 'Halaman pembayaran telah ditutup. Pesananmu masih tersimpan dan dapat dilanjutkan.',
    statusType: 'neutral',
  },
};

export default function StatusPembayaranScreen() {
  const router = useRouter();
  const { status, order_id, payment_id } = useLocalSearchParams<{
    status: PaymentStatus;
    order_id: string;
    payment_id: string;
  }>();

  const theme = useTheme();
  const [checking, setChecking] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);

  async function checkLiveStatus() {
    if (!order_id) return;
    setChecking(true);
    try {
      const res = await getPaymentStatus(order_id);
      setLiveStatus(res.status);
    } catch {
      // Abaikan error jaringan saat polling status
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!order_id || status === 'success' || status === 'cancel') return;
    checkLiveStatus();
  }, [order_id, status]);

  const resolvedStatus: PaymentStatus =
    liveStatus === 'success'
      ? 'success'
      : liveStatus === 'failed'
      ? 'failed'
      : (status as PaymentStatus) ?? 'pending';

  const cfg = STATUS_MAP[resolvedStatus] ?? STATUS_MAP.pending;

  const statusColors = {
    success: { bg: theme.successBg, border: theme.successBorder, text: theme.success },
    warning: { bg: theme.warningBg, border: theme.warningBorder, text: theme.warning },
    danger: { bg: theme.dangerBg, border: theme.dangerBorder, text: theme.danger },
    neutral: { bg: theme.neutralBg, border: theme.neutralBorder, text: theme.neutral },
  }[cfg.statusType];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Hero Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: statusColors.bg,
              borderColor: statusColors.border,
            },
          ]}>
          <Text style={styles.heroEmoji}>{cfg.emoji}</Text>
          <Text style={[styles.heroTitle, { color: statusColors.text }]}>{cfg.title}</Text>
          <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>{cfg.subtitle}</Text>
        </View>

        {/* Live Status Checker Bar (if pending) */}
        {resolvedStatus === 'pending' && (
          <Pressable
            onPress={checkLiveStatus}
            disabled={checking}
            style={[
              styles.checkStatusBtn,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}>
            {checking ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text style={styles.checkIcon}>🔄</Text>
            )}
            <Text style={[styles.checkText, { color: theme.text }]}>
              {checking ? 'Memeriksa status ke bank...' : 'Perbarui Status Pembayaran'}
            </Text>
          </Pressable>
        )}

        {/* Transaction Detail Card */}
        {order_id ? (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.primary }]}>DETAIL TRANSAKSI</Text>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>ID Pesanan</Text>
              <Text style={[styles.detailValue, { color: theme.text }]} selectable>
                {order_id}
              </Text>
            </View>

            {payment_id ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>ID Pembayaran</Text>
                <Text style={[styles.detailValue, { color: theme.text }]} selectable>
                  {payment_id}
                </Text>
              </View>
            ) : null}

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Metode</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>Midtrans Snap</Text>
            </View>
          </View>
        ) : null}

        {/* Action Buttons Section */}
        <View style={styles.actionsContainer}>
          {resolvedStatus === 'success' ? (
            <>
              <Pressable
                onPress={() => router.replace('/tiket')}
                style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
                <Text style={[styles.primaryBtnText, { color: theme.primaryText }]}>
                  🎟️ Lihat E-Tiket Saya
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.replace('/')}
                style={[styles.secondaryBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.secondaryBtnText, { color: theme.text }]}>
                  Kembali ke Beranda
                </Text>
              </Pressable>
            </>
          ) : resolvedStatus === 'pending' ? (
            <>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/pembayaran-ulang',
                    params: { order_id },
                  })
                }
                style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
                <Text style={[styles.primaryBtnText, { color: theme.primaryText }]}>
                  💳 Lanjutkan Pembayaran
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.replace('/')}
                style={[styles.secondaryBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.secondaryBtnText, { color: theme.text }]}>
                  Kembali ke Beranda
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/pembayaran-ulang',
                    params: { order_id },
                  })
                }
                style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
                <Text style={[styles.primaryBtnText, { color: theme.primaryText }]}>
                  🔄 Coba Bayar Lagi
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.replace('/')}
                style={[styles.secondaryBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.secondaryBtnText, { color: theme.text }]}>
                  Kembali ke Beranda
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  heroCard: {
    borderRadius: Radii.xl,
    borderWidth: 1.5,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
  },
  heroEmoji: {
    fontSize: 54,
    marginBottom: Spacing.one,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },

  checkStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.two,
  },
  checkIcon: {
    fontSize: 16,
  },
  checkText: {
    fontSize: 14,
    fontWeight: '700',
  },

  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },

  actionsContainer: {
    gap: Spacing.three,
    marginTop: Spacing.two,
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
  secondaryBtn: {
    minHeight: 48,
    borderRadius: Radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
