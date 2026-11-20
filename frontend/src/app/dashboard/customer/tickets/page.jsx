"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Ticket as TicketIcon,
  LoaderCircle,
  RefreshCw,
  QrCode,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_MAP = {
  valid: {
    label: "Siap Digunakan",
    className: "bg-green-500/10 text-green-400 border-green-500/20",
    icon: CheckCircle2,
  },
  active: {
    label: "Aktif",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: CheckCircle2,
  },
  used: {
    label: "Sudah Dipakai",
    className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    icon: Clock,
  },
  cancelled: {
    label: "Dibatalkan",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: XCircle,
  },
};

export default function CustomerTicketsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("ztick_token");
    const savedUser = localStorage.getItem("ztick_user");

    if (!token || !savedUser) {
      router.replace("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.role !== "customer") {
        router.replace("/login");
        return;
      }
      setUser(parsedUser);
    } catch {
      localStorage.removeItem("ztick_token");
      localStorage.removeItem("ztick_user");
      router.replace("/login");
    }
  }, [router]);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/api/tickets/my-tickets");
      if (result.success && Array.isArray(result.data)) {
        setTickets(result.data);
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error("GET TICKETS ERROR:", err);
      setError(err.message || "Gagal mengambil daftar tiket.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchTickets();
  }, [user, fetchTickets]);

  function handleLogout() {
    localStorage.removeItem("ztick_token");
    localStorage.removeItem("ztick_user");
    router.replace("/login");
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#080d1c] flex items-center justify-center text-blue-400">
        <LoaderCircle className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#080d1c] text-white">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 bg-[#080d1c]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <Link href="/dashboard/customer">
            <h1 className="text-2xl font-extrabold tracking-wider text-blue-500">
              ZTICK<span className="text-white">.</span>
            </h1>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm">
            <Link
              href="/dashboard/customer"
              className="text-gray-400 hover:text-white transition"
            >
              Beranda
            </Link>
            <Link
              href="/dashboard/customer/events"
              className="text-gray-400 hover:text-white transition"
            >
              Jelajahi Event
            </Link>
            <Link
              href="/dashboard/customer/orders"
              className="text-gray-400 hover:text-white transition"
            >
              Riwayat Pesanan
            </Link>
            <Link
              href="/dashboard/customer/tickets"
              className="text-blue-400 font-semibold"
            >
              Tiket Saya
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-gray-400">
              {user.full_name || "Customer"}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-400 hover:text-red-300 transition"
            >
              Keluar
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* HEADER */}
        <div className="mb-8">
          <Link
            href="/dashboard/customer"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-blue-400 transition mb-6"
          >
            <ArrowLeft size={17} />
            Kembali ke Dashboard
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
            <div>
              <p className="text-blue-400 text-sm font-semibold">CUSTOMER AREA</p>
              <h2 className="text-3xl md:text-4xl font-extrabold mt-2">Tiket Saya</h2>
              <p className="text-gray-400 mt-3">
                Simpan dan tunjukkan QR Code tiket saat masuk ke venue acara.
              </p>
            </div>

            <button
              onClick={fetchTickets}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 bg-[#111a30] hover:border-blue-500/50 transition text-sm"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-blue-400">
            <LoaderCircle size={35} className="animate-spin mb-3" />
            <p className="text-sm text-gray-400">Memuat tiket Anda...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
            <AlertCircle className="mx-auto text-red-400 mb-3" size={35} />
            <p className="font-semibold">Gagal memuat tiket</p>
            <p className="text-sm text-gray-400 mt-2">{error}</p>
            <button
              onClick={fetchTickets}
              className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold"
            >
              Coba Lagi
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-[#111a30] border border-white/10 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-5">
              <TicketIcon size={32} />
            </div>
            <h3 className="text-xl font-bold">Belum Ada Tiket</h3>
            <p className="text-sm text-gray-400 mt-3 max-w-md mx-auto">
              Anda belum memiliki tiket konser. Pesan tiket acara favorit Anda sekarang!
            </p>
            <Link
              href="/dashboard/customer/events"
              className="inline-flex items-center gap-2 mt-6 bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-semibold transition"
            >
              Jelajahi Event
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((t) => {
              const category = t.ticket_categories;
              const event = category?.events;
              const statusCfg = STATUS_MAP[t.status] || STATUS_MAP.valid;
              const StatusIcon = statusCfg.icon;

              return (
                <div
                  key={t.id}
                  className="bg-[#111a30] border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/30 transition flex flex-col justify-between"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <span className="text-xs text-blue-400 font-mono tracking-wider font-semibold">
                        {t.ticket_code}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${statusCfg.className}`}
                      >
                        <StatusIcon size={13} />
                        {statusCfg.label}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold mb-3 line-clamp-1">
                      {event?.title || "Konser Musik"}
                    </h3>

                    <div className="space-y-2 text-xs text-gray-400 mb-4">
                      <p className="flex items-center gap-2">
                        <CalendarDays size={14} className="text-blue-400" />
                        {formatDate(event?.start_date)}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin size={14} className="text-blue-400" />
                        {event?.venue_name || event?.city || "Lokasi Acara"}
                      </p>
                    </div>

                    <div className="bg-[#080d1c] p-3 rounded-xl flex justify-between items-center text-xs">
                      <span className="text-gray-400">Kategori:</span>
                      <span className="font-semibold text-white">
                        {category?.name || "Reguler"}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <button
                      onClick={() => setSelectedTicket(t)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600 hover:text-white text-blue-400 font-semibold text-sm transition"
                    >
                      <QrCode size={18} />
                      Tampilkan QR Code
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* QR MODAL */}
        {selectedTicket && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedTicket(null)}
          >
            <div
              className="w-full max-w-sm bg-[#111a30] border border-white/20 rounded-3xl p-6 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                  E-TIKET RESMI
                </span>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <XCircle size={22} />
                </button>
              </div>

              <h3 className="font-bold text-lg mb-1">
                {selectedTicket.ticket_categories?.events?.title || "Konser Musik"}
              </h3>
              <p className="text-xs text-gray-400 mb-6">
                Kategori: {selectedTicket.ticket_categories?.name || "Reguler"}
              </p>

              {/* QR Display */}
              <div className="bg-white p-6 rounded-2xl inline-block shadow-inner mb-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    selectedTicket.qr_token || selectedTicket.id
                  )}`}
                  alt="QR Code Tiket"
                  className="w-44 h-44 object-contain mx-auto"
                />
              </div>

              <p className="font-mono text-sm font-bold text-blue-400 tracking-wider mb-2">
                {selectedTicket.ticket_code}
              </p>
              <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto mb-6">
                Tunjukkan QR Code ini kepada petugas gerbang check-in untuk dipindai.
              </p>

              <button
                onClick={() => setSelectedTicket(null)}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-sm transition"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
