import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { getTicketDetail, type Ticket } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radii } from '@/constants/theme';

function formatDate(iso: string): string {
  if (!iso) return 'Tanggal diumumkan segera';
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function TiketDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const t = await getTicketDetail(id);
        setTicket(t);
      } catch (e: unknown) {
        setError((e as Error).message ?? 'Gagal memuat detail tiket.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function handleCopyCode() {
    if (!ticket) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Menyiapkan barcode tiket...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !ticket) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <Text style={styles.stateEmoji}>⚠️</Text>
          <Text style={[styles.stateTitle, { color: theme.text }]}>Tiket Tidak Ditemukan</Text>
          <Text style={[styles.stateDesc, { color: theme.textSecondary }]}>
            {error ?? 'Tiket ini tidak tersedia atau telah dipindahkan.'}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.actionBtn, { backgroundColor: theme.primary }]}>
            <Text style={[styles.actionBtnText, { color: theme.primaryText }]}>Kembali</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const ev = ticket.ticket_categories?.events;
  const isActive = ticket.status === 'active' || ticket.status === 'valid';

  // URL QR Code
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    ticket.qr_token
  )}`;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.primary }]}>← Tiket Saya</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>E-Tiket Resmi</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Ticket Outer Pass Card */}
        <View style={[styles.ticketPassCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Status Header */}
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isActive
                    ? theme.successBg
                    : ticket.status === 'used'
                    ? theme.backgroundSelected
                    : theme.dangerBg,
                  borderColor: isActive
                    ? theme.successBorder
                    : ticket.status === 'used'
                    ? theme.border
                    : theme.dangerBorder,
                },
              ]}>
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color: isActive
                      ? theme.success
                      : ticket.status === 'used'
                      ? theme.textSecondary
                      : theme.danger,
                  },
                ]}>
                {isActive
                  ? '✅ Tiket Aktif • Siap Masuk'
                  : ticket.status === 'used'
                  ? '☑️ Sudah Digunakan'
                  : '❌ Tiket Dibatalkan'}
              </Text>
            </View>
          </View>

          {/* QR Code Container (Always crisp white background for optical scanning) */}
          <View style={styles.qrContainer}>
            {isActive ? (
              <View style={styles.qrWhiteBox}>
                <Image source={{ uri: qrUrl }} style={styles.qrImage} contentFit="contain" />
                <Text style={styles.qrScanGuide}>
                  Tunjukkan barcode ini kepada petugas tiket saat tiba di pintu masuk venue
                </Text>
              </View>
            ) : (
              <View style={[styles.qrDisabledBox, { backgroundColor: theme.backgroundSelected }]}>
                <Text style={styles.qrDisabledEmoji}>
                  {ticket.status === 'used' ? '🎫' : '🚫'}
                </Text>
                <Text style={[styles.qrDisabledTitle, { color: theme.text }]}>
                  {ticket.status === 'used'
                    ? 'Tiket Telah Digunakan'
                    : 'Tiket Telah Dibatalkan'}
                </Text>
                <Text style={[styles.qrDisabledSubtitle, { color: theme.textSecondary }]}>
                  Barcode ini sudah tidak dapat dipindai ulang
                </Text>
              </View>
            )}
          </View>

          {/* Perforation Separator */}
          <View style={styles.perforationWrapper}>
            <View style={[styles.notchLeft, { backgroundColor: theme.background, borderColor: theme.border }]} />
            <View style={[styles.dashedLine, { borderColor: theme.borderStrong }]} />
            <View style={[styles.notchRight, { backgroundColor: theme.background, borderColor: theme.border }]} />
          </View>

          {/* Ticket Information Section */}
          <View style={styles.passDetails}>
            {/* Ticket Code Box */}
            <View style={[styles.codeCard, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
              <View>
                <Text style={[styles.codeLabel, { color: theme.textMuted }]}>KODE TIKET</Text>
                <Text style={[styles.codeValue, { color: theme.text }]} selectable>
                  {ticket.ticket_code}
                </Text>
              </View>
              <Pressable
                onPress={handleCopyCode}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[styles.copyBtn, { backgroundColor: copied ? theme.successBg : theme.primaryMuted }]}>
                <Text style={[styles.copyBtnText, { color: copied ? theme.success : theme.primary }]}>
                  {copied ? 'Tersalin!' : 'Salin'}
                </Text>
              </Pressable>
            </View>

            {/* Event Name */}
            {ev && (
              <View style={styles.infoGroup}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>EVENT</Text>
                <Text style={[styles.eventTitle, { color: theme.text }]}>{ev.title}</Text>
              </View>
            )}

            {/* Date & Time */}
            {ev && (
              <View style={styles.infoGroup}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>WAKTU & TANGGAL</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  📅 {formatDate(ev.start_date)}
                </Text>
              </View>
            )}

            {/* Venue & Location */}
            {ev && (
              <View style={styles.infoGroup}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>LOKASI & VENUE</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  📍 {ev.venue_name}, {ev.city}
                </Text>
                {ev.venue_address ? (
                  <Text style={[styles.addressText, { color: theme.textSecondary }]}>
                    {ev.venue_address}
                  </Text>
                ) : null}
              </View>
            )}

            {/* Ticket Tier */}
            <View style={styles.infoGroup}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>KATEGORI TIKET</Text>
              <Text style={[styles.categoryValue, { color: theme.primary }]}>
                {ticket.ticket_categories?.name ?? 'Kategori Standar'}
              </Text>
            </View>
          </View>
        </View>

        {/* Back to Home Action */}
        <Pressable
          onPress={() => router.replace('/')}
          style={[styles.homeBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.homeBtnText, { color: theme.text }]}>
            Kembali ke Beranda
          </Text>
        </Pressable>
      </ScrollView>
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

  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  ticketPassCard: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statusRow: {
    alignItems: 'center',
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  statusBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  qrContainer: {
    padding: Spacing.four,
    alignItems: 'center',
  },
  qrWhiteBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.lg,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  qrScanGuide: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },

  qrDisabledBox: {
    borderRadius: Radii.lg,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
    width: '100%',
  },
  qrDisabledEmoji: {
    fontSize: 48,
  },
  qrDisabledTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  qrDisabledSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },

  perforationWrapper: {
    position: 'relative',
    height: 20,
    justifyContent: 'center',
  },
  notchLeft: {
    position: 'absolute',
    left: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    zIndex: 2,
  },
  notchRight: {
    position: 'absolute',
    right: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    zIndex: 2,
  },
  dashedLine: {
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },

  passDetails: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  codeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  codeValue: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  copyBtn: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  infoGroup: {
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  addressText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  categoryValue: {
    fontSize: 15,
    fontWeight: '800',
  },

  homeBtn: {
    minHeight: 48,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.five,
    gap: Spacing.two,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: Spacing.two,
  },
  stateEmoji: {
    fontSize: 48,
    marginBottom: Spacing.two,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  stateDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.two,
  },
  actionBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.five,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
