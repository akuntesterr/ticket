import { router } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getToken, getEvents, removeToken, type Event } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radii } from '@/constants/theme';

export default function HomeScreen() {
  const theme = useTheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchEvents();
  }, []);

  async function checkAuth() {
    const token = await getToken();
    setIsLoggedIn(!!token);
  }

  const fetchEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat daftar event.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  function handleLogoutConfirm() {
    Alert.alert(
      'Konfirmasi Keluar',
      'Apakah kamu yakin ingin keluar dari akun ZTICK?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            await removeToken();
            setIsLoggedIn(false);
          },
        },
      ]
    );
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return 'Tanggal diumumkan segera';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  }

  function getLowestPrice(event: Event): number | null {
    if (!event.ticket_categories || event.ticket_categories.length === 0) return null;
    const prices = event.ticket_categories.map((c) => c.price);
    return Math.min(...prices);
  }

  function renderEvent({ item }: { item: Event }) {
    const lowestPrice = getLowestPrice(item);
    const hasStock = item.ticket_categories?.some((c) => (c.quota - (c.sold ?? 0)) > 0);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity: pressed ? 0.92 : 1,
            transform: pressed ? [{ scale: 0.99 }] : [{ scale: 1 }],
          },
        ]}
        onPress={() => {
          if (!isLoggedIn) {
            router.push('/login');
            return;
          }
          router.push({ pathname: '/checkout', params: { event_id: item.id } });
        }}>
        {/* Poster Image / Fallback */}
        <View style={styles.posterContainer}>
          {item.poster_url ? (
            <Image source={{ uri: item.poster_url }} style={styles.poster} resizeMode="cover" />
          ) : (
            <View style={[styles.poster, { backgroundColor: theme.primaryMuted }, styles.posterFallback]}>
              <Text style={styles.posterFallbackIcon}>🎵</Text>
              <Text style={[styles.posterFallbackText, { color: theme.primary }]}>ZTICK LIVE</Text>
            </View>
          )}

          {/* Stock availability badge overlay */}
          <View
            style={[
              styles.stockBadgeOverlay,
              {
                backgroundColor: hasStock ? theme.successBg : theme.dangerBg,
                borderColor: hasStock ? theme.successBorder : theme.dangerBorder,
              },
            ]}>
            <Text
              style={[
                styles.stockBadgeText,
                { color: hasStock ? theme.success : theme.danger },
              ]}>
              {hasStock ? 'Tersedia' : 'Tiket Habis'}
            </Text>
          </View>
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.metaRow}>
            <Text style={[styles.metaIcon]}>📅</Text>
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              {formatDate(item.start_date)}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.metaIcon]}>📍</Text>
            <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.venue_name}, {item.city}
            </Text>
          </View>

          {/* Divider */}
          <View style={[styles.cardDivider, { backgroundColor: theme.border }]} />

          {/* Card Footer */}
          <View style={styles.cardFooter}>
            <View>
              <Text style={[styles.pricePrefix, { color: theme.textMuted }]}>Harga Tiket</Text>
              {lowestPrice !== null ? (
                <Text style={[styles.priceValue, { color: theme.primary }]}>
                  Mulai {formatPrice(lowestPrice)}
                </Text>
              ) : (
                <Text style={[styles.priceValue, { color: theme.textSecondary }]}>
                  Hubungi Penyelenggara
                </Text>
              )}
            </View>

            <View
              style={[
                styles.ctaPill,
                {
                  backgroundColor: hasStock ? theme.primary : theme.backgroundSelected,
                },
              ]}>
              <Text
                style={[
                  styles.ctaPillText,
                  { color: hasStock ? theme.primaryText : theme.textMuted },
                ]}>
                {hasStock ? 'Pesan Tiket' : 'Habis'}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.brandContainer}>
          <View style={[styles.logoIconBadge, { backgroundColor: theme.primaryMuted }]}>
            <Text style={styles.logoIconText}>🎫</Text>
          </View>
          <View>
            <Text style={[styles.brandTitle, { color: theme.text }]}>ZTICK</Text>
            <Text style={[styles.brandTagline, { color: theme.textMuted }]}>Tiket Konser Resmi</Text>
          </View>
        </View>

        <View style={styles.navActions}>
          <Pressable
            onPress={() => router.push('/explore')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [
              styles.headerActionBtn,
              { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.75 : 1 },
            ]}>
            <Text style={[styles.headerActionText, { color: theme.text }]}>🔍 Cari</Text>
          </Pressable>

          {isLoggedIn ? (
            <>
              <Pressable
                onPress={() => router.push('/tiket')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={({ pressed }) => [
                  styles.headerActionBtn,
                  { backgroundColor: theme.primaryMuted, opacity: pressed ? 0.75 : 1 },
                ]}>
                <Text style={[styles.headerActionText, { color: theme.primary }]}>Tiket Saya</Text>
              </Pressable>

              <Pressable
                onPress={handleLogoutConfirm}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={({ pressed }) => [
                  styles.headerActionBtn,
                  { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.75 : 1 },
                ]}>
                <Text style={[styles.headerActionText, { color: theme.textSecondary }]}>Keluar</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => router.push('/login')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={({ pressed }) => [
                styles.loginBtn,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}>
              <Text style={[styles.loginBtnText, { color: theme.primaryText }]}>Masuk</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Memuat konser terbaru...
          </Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerContainer}>
          <Text style={styles.stateEmoji}>⚠️</Text>
          <Text style={[styles.stateTitle, { color: theme.text }]}>Gagal Memuat Event</Text>
          <Text style={[styles.stateDesc, { color: theme.textSecondary }]}>{errorMessage}</Text>
          <Pressable
            onPress={() => fetchEvents()}
            style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
            <Text style={[styles.retryBtnText, { color: theme.primaryText }]}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.stateEmoji}>🎪</Text>
          <Text style={[styles.stateTitle, { color: theme.text }]}>Belum Ada Event Konser</Text>
          <Text style={[styles.stateDesc, { color: theme.textSecondary }]}>
            Saat ini belum ada event aktif yang tersedia. Silakan tarik ke bawah untuk memperbarui daftar.
          </Text>
          <Pressable
            onPress={() => fetchEvents()}
            style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
            <Text style={[styles.retryBtnText, { color: theme.primaryText }]}>Perbarui</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchEvents(true)}
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
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 4,
    borderBottomWidth: 1,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  logoIconBadge: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIconText: {
    fontSize: 20,
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 11,
    fontWeight: '500',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerActionBtn: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  loginBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.four,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  listContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  card: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  posterContainer: {
    position: 'relative',
    width: '100%',
    height: 190,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
  },
  posterFallbackIcon: {
    fontSize: 44,
  },
  posterFallbackText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  stockBadgeOverlay: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 5,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  cardBody: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  cardDivider: {
    height: 1,
    marginVertical: Spacing.one,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  pricePrefix: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  ctaPill: {
    minHeight: 44,
    minWidth: 100,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPillText: {
    fontSize: 13,
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
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.five,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
