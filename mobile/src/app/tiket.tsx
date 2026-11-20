import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { getMyTickets, type Ticket } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radii } from '@/constants/theme';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  valid: { label: 'Aktif', bg: '#DCFCE7', color: '#15803D', border: '#86EFAC' },
  active: { label: 'Aktif', bg: '#DCFCE7', color: '#15803D', border: '#86EFAC' },
  used: { label: 'Sudah Digunakan', bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1' },
  cancelled: { label: 'Dibatalkan', bg: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5' },
};

function formatDate(iso: string): string {
  if (!iso) return 'Tanggal diumumkan segera';
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function TiketScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await getMyTickets();
      setTickets(data);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message ?? 'Gagal memuat tiket.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const renderItem = ({ item }: { item: Ticket }) => {
    const ev = item.ticket_categories?.events;
    const statusCfg = STATUS_CONFIG[item.status] ?? {
      label: item.status,
      bg: theme.backgroundSelected,
      color: theme.textSecondary,
      border: theme.border,
    };

    return (
      <Pressable
        onPress={() => router.push({ pathname: '/tiket/[id]', params: { id: item.id } })}
        style={({ pressed }) => [
          styles.ticketCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity: pressed ? 0.92 : 1,
            transform: pressed ? [{ scale: 0.99 }] : [{ scale: 1 }],
          },
        ]}>
        {/* Ticket Header */}
        <View style={styles.cardHeader}>
          <View style={styles.eventInfo}>
            <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={2}>
              {ev?.title ?? 'Event ZTICK'}
            </Text>
            {ev && (
              <>
                <View style={styles.metaRow}>
                  <Text style={styles.metaIcon}>📅</Text>
                  <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                    {formatDate(ev.start_date)}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaIcon}>📍</Text>
                  <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
                    {ev.venue_name}, {ev.city}
                  </Text>
                </View>
              </>
            )}
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusCfg.bg,
                borderColor: statusCfg.border,
              },
            ]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        {/* Perforation Separator */}
        <View style={styles.perforationWrapper}>
          <View style={[styles.notchLeft, { backgroundColor: theme.background, borderColor: theme.border }]} />
          <View style={[styles.dashedLine, { borderColor: theme.borderStrong }]} />
          <View style={[styles.notchRight, { backgroundColor: theme.background, borderColor: theme.border }]} />
        </View>

        {/* Ticket Stub Footer */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={[styles.stubLabel, { color: theme.textMuted }]}>KATEGORI TIKET</Text>
            <Text style={[styles.categoryName, { color: theme.primary }]}>
              {item.ticket_categories?.name ?? 'Umum'}
            </Text>
          </View>

          <View style={styles.ticketCodeBlock}>
            <Text style={[styles.stubLabel, { color: theme.textMuted }]}>KODE TIKET</Text>
            <Text style={[styles.ticketCode, { color: theme.text }]}>{item.ticket_code}</Text>
          </View>

          <View style={[styles.openActionBadge, { backgroundColor: theme.primaryMuted }]}>
            <Text style={[styles.openActionText, { color: theme.primary }]}>Buka QR →</Text>
          </View>
        </View>
      </Pressable>
    );
  };

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
        <Text style={[styles.headerTitle, { color: theme.text }]}>E-Tiket Saya</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Memuat daftar tiket kamu...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.stateEmoji}>⚠️</Text>
          <Text style={[styles.stateTitle, { color: theme.text }]}>Gagal Memuat Tiket</Text>
          <Text style={[styles.stateDesc, { color: theme.textSecondary }]}>{error}</Text>
          <Pressable
            onPress={() => load()}
            style={[styles.actionBtn, { backgroundColor: theme.primary }]}>
            <Text style={[styles.actionBtnText, { color: theme.primaryText }]}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.stateEmoji}>🎟️</Text>
          <Text style={[styles.stateTitle, { color: theme.text }]}>Belum Memiliki E-Tiket</Text>
          <Text style={[styles.stateDesc, { color: theme.textSecondary }]}>
            Semua tiket konser yang kamu beli di ZTICK akan muncul di sini lengkap dengan QR Code resmi.
          </Text>
          <Pressable
            onPress={() => router.replace('/')}
            style={[styles.actionBtn, { backgroundColor: theme.primary }]}>
            <Text style={[styles.actionBtnText, { color: theme.primaryText }]}>Jelajahi Konser</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        />
      )}
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

  listContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  ticketCard: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  eventInfo: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  metaIcon: {
    fontSize: 13,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 5,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
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

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  stubLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '800',
  },
  ticketCodeBlock: {
    alignItems: 'center',
  },
  ticketCode: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  openActionBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  openActionText: {
    fontSize: 12,
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
    textAlign: 'center',
  },
  stateDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: Spacing.two,
  },
  actionBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.five,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
