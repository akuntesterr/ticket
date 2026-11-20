import React, { useEffect, useState, useMemo } from 'react';
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

import { createOrder, createPayment, getEventDetail, type Event, type TicketCategory } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radii } from '@/constants/theme';

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'Tanggal diumumkan segera';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { event_id, category_id } = useLocalSearchParams<{
    event_id: string;
    category_id?: string;
  }>();

  const theme = useTheme();

  const [event, setEvent] = useState<Event | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!event_id) return;
    (async () => {
      try {
        const ev = await getEventDetail(event_id);
        setEvent(ev);

        const categories = ev.ticket_categories ?? [];
        if (categories.length > 0) {
          // Pilih kategori yang sesuai parameter URL, atau pilih yang pertama memiliki stok
          const preselected = category_id
            ? categories.find((c) => c.id === category_id)
            : null;
          const fallback = categories.find((c) => c.quota - (c.sold ?? 0) > 0) ?? categories[0];
          setSelectedCategory(preselected ?? fallback);
        }
      } catch (e: unknown) {
        const err = e as Error;
        Alert.alert('Gagal Memuat Event', err.message ?? 'Event tidak ditemukan.', [
          { text: 'Kembali', onPress: () => router.back() },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [event_id, category_id]);

  const stock = useMemo(() => {
    if (!selectedCategory) return 0;
    return Math.max(0, selectedCategory.quota - (selectedCategory.sold ?? 0));
  }, [selectedCategory]);

  const maxAllowed = useMemo(() => {
    return Math.min(stock, 10);
  }, [stock]);

  const totalAmount = useMemo(() => {
    if (!selectedCategory) return 0;
    return selectedCategory.price * quantity;
  }, [selectedCategory, quantity]);

  async function handleBayar() {
    if (!selectedCategory) {
      Alert.alert('Perhatian', 'Silakan pilih kategori tiket terlebih dahulu.');
      return;
    }
    if (stock <= 0) {
      Alert.alert('Tiket Habis', 'Maaf, kuota tiket untuk kategori ini sudah habis.');
      return;
    }

    setPaying(true);
    try {
      // 1. Buat order di backend
      const { order_id } = await createOrder(selectedCategory.id, quantity);

      // 2. Minta Snap Token pembayaran Midtrans
      const payment = await createPayment(order_id);

      // 3. Buka WebView pembayaran
      router.push({
        pathname: '/pembayaran',
        params: {
          redirect_url: payment.redirect_url,
          order_id,
          payment_id: payment.payment_id,
        },
      });
    } catch (e: unknown) {
      const err = e as Error;
      Alert.alert('Gagal Memproses Pesanan', err.message ?? 'Terjadi kesalahan saat memproses pesanan.');
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Menyiapkan informasi tiket...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event || !selectedCategory) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={[styles.errorTitle, { color: theme.text }]}>Tiket Tidak Ditemukan</Text>
          <Text style={[styles.errorSubtitle, { color: theme.textSecondary }]}>
            Informasi kategori tiket tidak tersedia untuk event ini.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
            <Text style={[styles.retryBtnText, { color: theme.primaryText }]}>Kembali</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const categories = event.ticket_categories ?? [];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.primary }]}>← Kembali</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Checkout Tiket</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Event Overview Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.primary }]}>INFORMASI EVENT</Text>
          <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaIcon}>📅</Text>
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              {formatDate(event.start_date)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaIcon}>📍</Text>
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              {event.venue_name}, {event.city}
            </Text>
          </View>
        </View>

        {/* Category Selector */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.primary }]}>PILIH KATEGORI TIKET</Text>
          <View style={styles.categoryList}>
            {categories.map((cat) => {
              const isSelected = selectedCategory.id === cat.id;
              const catStock = Math.max(0, cat.quota - (cat.sold ?? 0));
              const isSoldOut = catStock <= 0;

              return (
                <Pressable
                  key={cat.id}
                  disabled={isSoldOut}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setQuantity(1);
                  }}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: isSelected
                        ? theme.primaryMuted
                        : theme.backgroundSelected,
                      borderColor: isSelected ? theme.primary : theme.border,
                      opacity: isSoldOut ? 0.5 : 1,
                    },
                  ]}>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryName, { color: theme.text }]}>{cat.name}</Text>
                    <Text style={[styles.categoryPrice, { color: theme.primary }]}>
                      {formatRupiah(cat.price)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.stockPill,
                      {
                        backgroundColor: isSoldOut
                          ? theme.dangerBg
                          : catStock < 10
                          ? theme.warningBg
                          : theme.successBg,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.stockPillText,
                        {
                          color: isSoldOut
                            ? theme.danger
                            : catStock < 10
                            ? theme.warning
                            : theme.success,
                        },
                      ]}>
                      {isSoldOut ? 'Habis' : `Sisa ${catStock}`}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Quantity Stepper Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.stepperHeader}>
            <View>
              <Text style={[styles.sectionLabel, { color: theme.primary }]}>JUMLAH TIKET</Text>
              <Text style={[styles.stepperSubtext, { color: theme.textSecondary }]}>
                Maksimal {maxAllowed} tiket per transaksi
              </Text>
            </View>

            <View style={styles.stepperControls}>
              <Pressable
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || stock === 0}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.stepperBtn,
                  {
                    backgroundColor: theme.backgroundSelected,
                    borderColor: theme.border,
                    opacity: quantity <= 1 || stock === 0 ? 0.4 : 1,
                  },
                ]}>
                <Text style={[styles.stepperBtnText, { color: theme.text }]}>−</Text>
              </Pressable>

              <Text style={[styles.quantityNumber, { color: theme.text }]}>{quantity}</Text>

              <Pressable
                onPress={() => setQuantity((q) => Math.min(maxAllowed, q + 1))}
                disabled={quantity >= maxAllowed || stock === 0}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.stepperBtn,
                  {
                    backgroundColor: theme.backgroundSelected,
                    borderColor: theme.border,
                    opacity: quantity >= maxAllowed || stock === 0 ? 0.4 : 1,
                  },
                ]}>
                <Text style={[styles.stepperBtnText, { color: theme.text }]}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Payment Summary Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.primary }]}>RINGKASAN PEMBAYARAN</Text>
          <View style={styles.summaryLine}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              {selectedCategory.name} ({quantity}x)
            </Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {formatRupiah(totalAmount)}
            </Text>
          </View>

          <View style={styles.summaryLine}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Biaya Layanan</Text>
            <Text style={[styles.summaryFree, { color: theme.success }]}>Gratis (Rp 0)</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.summaryLine}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>Total Pembayaran</Text>
            <Text style={[styles.totalValue, { color: theme.primary }]}>
              {formatRupiah(totalAmount)}
            </Text>
          </View>
        </View>

        {/* Security & Guarantee Box */}
        <View
          style={[
            styles.guaranteeBox,
            {
              backgroundColor: theme.primaryMuted,
              borderColor: theme.border,
            },
          ]}>
          <Text style={styles.guaranteeIcon}>🛡️</Text>
          <View style={styles.guaranteeContent}>
            <Text style={[styles.guaranteeTitle, { color: theme.text }]}>
              Pembayaran Aman & Terverifikasi
            </Text>
            <Text style={[styles.guaranteeDesc, { color: theme.textSecondary }]}>
              Diproses langsung melalui gerbang pembayaran resmi Midtrans. Mendukung QRIS, GoPay, ShopeePay, Transfer Bank, dan Kartu Kredit.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
          },
        ]}>
        <View style={styles.bottomBarInfo}>
          <Text style={[styles.bottomBarLabel, { color: theme.textMuted }]}>Total Tagihan</Text>
          <Text style={[styles.bottomBarAmount, { color: theme.primary }]}>
            {formatRupiah(totalAmount)}
          </Text>
        </View>

        <Pressable
          onPress={handleBayar}
          disabled={paying || stock === 0}
          style={({ pressed }) => [
            styles.payButton,
            {
              backgroundColor: theme.primary,
              opacity: paying || stock === 0 ? 0.6 : pressed ? 0.9 : 1,
            },
          ]}>
          {paying ? (
            <ActivityIndicator color={theme.primaryText} />
          ) : (
            <Text style={[styles.payButtonText, { color: theme.primaryText }]}>
              {stock === 0 ? 'Tiket Habis' : 'Bayar Sekarang'}
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

  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: Spacing.one,
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

  categoryList: {
    gap: Spacing.two,
  },
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    minHeight: 52,
  },
  categoryInfo: {
    gap: 2,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
  },
  categoryPrice: {
    fontSize: 14,
    fontWeight: '800',
  },
  stockPill: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  stockPillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  stepperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperSubtext: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 24,
  },
  quantityNumber: {
    fontSize: 20,
    fontWeight: '800',
    minWidth: 28,
    textAlign: 'center',
  },

  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryFree: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.two,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  totalValue: {
    fontSize: 19,
    fontWeight: '800',
  },

  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  guaranteeIcon: {
    fontSize: 22,
    marginTop: 2,
  },
  guaranteeContent: {
    flex: 1,
    gap: 2,
  },
  guaranteeTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  guaranteeDesc: {
    fontSize: 12,
    lineHeight: 18,
  },

  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
  },
  bottomBarInfo: {
    gap: 2,
  },
  bottomBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bottomBarAmount: {
    fontSize: 18,
    fontWeight: '800',
  },
  payButton: {
    minHeight: 48,
    paddingHorizontal: Spacing.five,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    fontSize: 15,
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
  errorEmoji: {
    fontSize: 48,
    marginBottom: Spacing.two,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.two,
  },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.five,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
