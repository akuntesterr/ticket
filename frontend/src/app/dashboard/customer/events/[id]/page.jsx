"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Ticket,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  Minus,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price || 0);
}

function formatDate(date) {
  if (!date) return "Tanggal belum tersedia";

  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id;

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const token = localStorage.getItem("ztick_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    async function fetchEventDetail() {
      if (!eventId) return;
      try {
        setLoading(true);
        setError("");
        const result = await apiRequest(`/api/events/${eventId}`);
        if (result.success && result.data) {
          setEvent(result.data);
          // Auto select first available category
          const available = (result.data.ticket_categories || []).find(
            (c) => (c.quota - c.sold) > 0
          );
          if (available) {
            setSelectedCategory(available);
          }
        } else {
          setError("Event tidak ditemukan.");
        }
      } catch (err) {
        setError(err.message || "Gagal memuat detail event.");
      } finally {
        setLoading(false);
      }
    }

    fetchEventDetail();
  }, [eventId, router]);

  function handleQuantityChange(delta) {
    if (!selectedCategory) return;
    const maxAvailable = Math.max(1, selectedCategory.quota - selectedCategory.sold);
    const maxBuy = Math.min(5, maxAvailable);
    setQuantity((prev) => Math.max(1, Math.min(maxBuy, prev + delta)));
  }

  function handleProceedCheckout() {
    if (!event || !selectedCategory) return;
    router.push(
      `/dashboard/customer/checkout?event_id=${event.id}&ticket_category_id=${selectedCategory.id}&quantity=${quantity}`
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d1c] flex flex-col items-center justify-center text-blue-400">
        <LoaderCircle size={36} className="animate-spin mb-4" />
        <p className="text-sm text-gray-400">Memuat detail event...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#080d1c] text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Terjadi Kesalahan</h2>
        <p className="text-gray-400 max-w-md mb-6">{error || "Event tidak ditemukan."}</p>
        <Link
          href="/dashboard/customer/events"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold transition"
        >
          <ArrowLeft size={18} />
          Kembali ke Jelajahi Event
        </Link>
      </div>
    );
  }

  const categories = event.ticket_categories || [];
  const totalPrice = selectedCategory ? Number(selectedCategory.price) * quantity : 0;

  return (
    <main className="min-h-screen bg-[#080d1c] text-white pb-16">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 bg-[#080d1c]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard/customer">
            <h1 className="text-2xl font-extrabold tracking-wider text-blue-500">
              ZTICK<span className="text-white">.</span>
            </h1>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/dashboard/customer/events"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition"
            >
              <ArrowLeft size={16} />
              Semua Event
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-8">
        {/* EVENT BANNER & DETAILS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
          {/* POSTER */}
          <div className="lg:col-span-5">
            <div className="w-full h-80 sm:h-96 rounded-3xl overflow-hidden bg-[#111a30] border border-white/10 shadow-2xl relative">
              {event.poster_url ? (
                <img
                  src={event.poster_url}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                  <Ticket size={64} className="mb-2" />
                  <p className="text-sm">Poster tidak tersedia</p>
                </div>
              )}
            </div>
          </div>

          {/* EVENT INFO */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-4">
                <ShieldCheck size={14} />
                EVENT TERVERIFIKASI
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4">
                {event.title}
              </h1>

              <div className="space-y-3 text-sm text-gray-300 mb-6">
                <p className="flex items-center gap-3">
                  <CalendarDays size={18} className="text-blue-400 shrink-0" />
                  <span>{formatDate(event.start_date)}</span>
                </p>
                <p className="flex items-center gap-3">
                  <MapPin size={18} className="text-blue-400 shrink-0" />
                  <span>
                    {event.venue_name}
                    {event.venue_address ? `, ${event.venue_address}` : ""}
                    {event.city ? ` (${event.city})` : ""}
                  </span>
                </p>
              </div>

              {event.description && (
                <div className="mt-4 pt-4 border-t border-white/10 text-sm text-gray-400 leading-relaxed">
                  <h3 className="text-white font-semibold mb-2">Deskripsi Acara</h3>
                  <p className="whitespace-pre-line">{event.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TICKET CATEGORY SELECTION */}
        <section className="bg-[#111a30] border border-white/10 rounded-3xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold mb-2">Pilih Kategori Tiket</h2>
          <p className="text-sm text-gray-400 mb-6">
            Pilih jenis tiket yang ingin kamu pesan.
          </p>

          {categories.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Ticket size={40} className="mx-auto text-gray-600 mb-2" />
              <p>Belum ada kategori tiket yang dibuka untuk acara ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {categories.map((cat) => {
                const remaining = Math.max(0, cat.quota - cat.sold);
                const isSoldOut = remaining <= 0;
                const isSelected = selectedCategory?.id === cat.id;

                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      if (!isSoldOut) {
                        setSelectedCategory(cat);
                        setQuantity(1);
                      }
                    }}
                    className={`p-5 rounded-2xl border transition cursor-pointer relative ${
                      isSoldOut
                        ? "opacity-50 border-white/5 bg-[#080d1c] cursor-not-allowed"
                        : isSelected
                        ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                        : "border-white/10 bg-[#0c1428] hover:border-white/20"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{cat.name}</h3>
                      {isSelected && (
                        <CheckCircle2 size={20} className="text-blue-400" />
                      )}
                    </div>

                    <p className="text-2xl font-black text-blue-400 mb-4">
                      {formatPrice(cat.price)}
                    </p>

                    <div className="flex justify-between items-center text-xs">
                      <span className={isSoldOut ? "text-red-400 font-semibold" : "text-gray-400"}>
                        {isSoldOut ? "Habis Terjual" : `Sisa ${remaining} tiket`}
                      </span>
                      <span className="text-gray-500">Kapasitas {cat.quota}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* QUANTITY & CHECKOUT BAR */}
          {selectedCategory && (
            <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-300">Jumlah:</span>
                <div className="flex items-center gap-3 bg-[#080d1c] border border-white/10 rounded-xl px-3 py-1.5">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="font-bold w-6 text-center text-base">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={
                      quantity >= Math.min(5, selectedCategory.quota - selectedCategory.sold)
                    }
                    className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <span className="text-xs text-gray-500">(Maks. 5 tiket/pesanan)</span>
              </div>

              <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total Harga</p>
                  <p className="text-2xl font-extrabold text-blue-400">
                    {formatPrice(totalPrice)}
                  </p>
                </div>

                <button
                  onClick={handleProceedCheckout}
                  className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition shadow-lg shadow-blue-600/30 text-sm"
                >
                  Beli Tiket Sekarang
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
