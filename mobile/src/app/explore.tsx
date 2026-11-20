import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { getEvents, getToken, type Event } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radii } from '@/constants/theme';

function formatDate(dateStr: string): string {
  if (!dateStr) return 'Tanggal segera';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
}

export default function ExploreScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Semua');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      setIsLoggedIn(!!token);
    })();
    loadEvents();
  }, []);

  const loadEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getEvents();
      setEvents(data);
    } catch {
      // Abaikan error saat refresh
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Extract unique cities from events
  const cityFilters = useMemo(() => {
    const cities = new Set<string>();
    events.forEach((ev) => {
      if (ev.city) cities.add(ev.city.trim());
    });
    return ['Semua', ...Array.from(cities)];
  }, [events]);

  // Filter events based on search query and city
  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return events.filter((ev) => {
      const matchCity = selectedCity === 'Semua' || ev.city?.toLowerCase() === selectedCity.toLowerCase();
      const matchQuery =
        !q ||
        ev.title.toLowerCase().includes(q) ||
        ev.venue_name.toLowerCase().includes(q) ||
        (ev.city && ev.city.toLowerCase().includes(q));
      return matchCity && matchQuery;
    });
  }, [events, searchQuery, selectedCity]);

  function getLowestPrice(event: Event): number | null {
    if (!event.ticket_categories || event.ticket_categories.length === 0) return null;
    const prices = event.ticket_categories.map((c) => c.price);
    return Math.min(...prices);
  }

  function renderEventItem({ item }: { item: Event }) {
    const lowestPrice = getLowestPrice(item);
    const hasStock = item.ticket_categories?.some((c) => c.quota - (c.sold ?? 0) > 0);

    return (
      <Pressable
        onPress={() => {
          if (!isLoggedIn) {
            router.push('/login');
            return;
          }
          router.push({ pathname: '/checkout', params: { event_id: item.id } });
        }}
        style={({ pressed }) => [
          styles.eventCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity: pressed ? 0.92 : 1,
            transform: pressed ? [{ scale: 0.99 }] : [{ scale: 1 }],
          },
        ]}>
        {/* Poster Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {item.poster_url ? (
            <Image source={{ uri: item.poster_url }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={[styles.thumbnail, { backgroundColor: theme.primaryMuted }, styles.thumbnailFallback]}>
              <Text style={styles.thumbnailEmoji}>🎵</Text>
            </View>
          )}
        </View>

        {/* Content Info */}
        <View style={styles.cardInfo}>
          <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={[styles.metaText, { color: theme.textSecondary }]}>
            📅 {formatDate(item.start_date)} • 📍 {item.city}
          </Text>

          <View style={styles.priceRow}>
            {lowestPrice !== null ? (
              <Text style={[styles.priceText, { color: theme.primary }]}>
                {formatPrice(lowestPrice)}
              </Text>
            ) : (
              <Text style={[styles.priceText, { color: theme.textSecondary }]}>
                Hubungi Penyelenggara
              </Text>
            )}

            <View
              style={[
                styles.stockBadge,
                {
                  backgroundColor: hasStock ? theme.successBg : theme.dangerBg,
                  borderColor: hasStock ? theme.successBorder : theme.dangerBorder,
                },
              ]}>
              <Text style={[styles.stockBadgeText, { color: hasStock ? theme.success : theme.danger }]}>
                {hasStock ? 'Tersedia' : 'Habis'}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Eksplorasi Konser</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Input Bar */}
      <View style={[styles.searchSection, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
          ]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Cari judul konser, artis, atau venue..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.clearBtn, { color: theme.textMuted }]}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* City Filter Pills */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={cityFilters}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.cityFilterList}
          renderItem={({ item }) => {
            const isSelected = selectedCity === item;
            return (
              <Pressable
                onPress={() => setSelectedCity(item)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={[
                  styles.cityPill,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.backgroundSelected,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.cityPillText,
                    { color: isSelected ? theme.primaryText : theme.textSecondary },
                  ]}>
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Mencari jadwal konser...
          </Text>
        </View>
      ) : filteredEvents.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>🔎</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Tidak Ada Konser yang Cocok</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            {searchQuery
              ? `Tidak ditemukan konser untuk kata kunci "${searchQuery}". Coba kata kunci lain atau ubah filter kota.`
              : 'Belum ada jadwal konser untuk kategori atau kota ini.'}
          </Text>
          {(searchQuery || selectedCity !== 'Semua') && (
            <Pressable
              onPress={() => {
                setSearchQuery('');
                setSelectedCity('Semua');
              }}
              style={[styles.resetBtn, { backgroundColor: theme.primaryMuted }]}>
              <Text style={[styles.resetBtnText, { color: theme.primary }]}>Reset Filter</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderEventItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadEvents(true)}
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

  searchSection: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  searchIcon: {
    fontSize: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    minHeight: 44,
  },
  clearBtn: {
    fontSize: 14,
    paddingHorizontal: 4,
  },

  cityFilterList: {
    gap: Spacing.two,
    paddingVertical: 4,
  },
  cityPill: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityPillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  listContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  eventCard: {
    flexDirection: 'row',
    borderRadius: Radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  thumbnailContainer: {
    width: 90,
    height: 90,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailEmoji: {
    fontSize: 28,
  },

  cardInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
  },
  stockBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  stockBadgeText: {
    fontSize: 10,
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
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
    marginBottom: Spacing.two,
  },
  resetBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.four,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
