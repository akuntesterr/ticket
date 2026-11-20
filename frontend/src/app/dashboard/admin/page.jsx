"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  CalendarDays,
  Receipt,
  DollarSign,
  LoaderCircle,
  ScanQrCode,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Search,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    total_users: 0,
    total_events: 0,
    total_orders: 0,
    total_revenue: 0,
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("ztick_token");
    const savedUser = localStorage.getItem("ztick_user");

    if (!token || !savedUser) {
      router.replace("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.role !== "admin") {
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

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [overviewRes, usersRes] = await Promise.allSettled([
        apiRequest("/api/dashboard/admin/overview"),
        apiRequest("/api/admin/users"),
      ]);

      if (overviewRes.status === "fulfilled" && overviewRes.value?.data) {
        setStats(overviewRes.value.data);
      }

      if (usersRes.status === "fulfilled" && usersRes.value?.data) {
        setUsers(usersRes.value.data);
      }

      if (overviewRes.status === "rejected" && usersRes.status === "rejected") {
        throw new Error("Gagal mengambil data dashboard admin.");
      }
    } catch (err) {
      console.error("ADMIN DASHBOARD ERROR:", err);
      setError(err.message || "Gagal memuat data admin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchAdminData();
  }, [user, fetchAdminData]);

  async function handleVerifyOrganizer(organizerId, verificationStatus) {
    let rejectionReason = null;
    if (verificationStatus === "rejected") {
      rejectionReason = window.prompt("Masukkan alasan penolakan:");
      if (!rejectionReason) return;
    }

    setActionLoading(organizerId);
    try {
      await apiRequest(`/api/admin/organizers/${organizerId}/verification`, {
        method: "PATCH",
        body: JSON.stringify({
          verification_status: verificationStatus,
          rejection_reason: rejectionReason,
        }),
      });
      alert(`Organizer berhasil ${verificationStatus === "verified" ? "diverifikasi" : "ditolak"}.`);
      fetchAdminData();
    } catch (err) {
      alert(err.message || "Gagal memproses verifikasi.");
    } finally {
      setActionLoading(null);
    }
  }

  function handleLogout() {
    localStorage.removeItem("ztick_token");
    localStorage.removeItem("ztick_user");
    router.replace("/login");
  }

  const filteredUsers = users.filter((u) => {
    const matchRole = filterRole === "all" || u.role === filterRole;
    const matchSearch =
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[#080d1c] flex items-center justify-center text-blue-400">
        <LoaderCircle size={36} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold tracking-widest uppercase mb-1">
            <ShieldCheck size={16} />
            PANEL ADMINISTRATOR
          </div>
          <h1 className="text-3xl font-extrabold text-white">Dashboard Admin</h1>
          <p className="text-sm text-gray-400 mt-1">
            Selamat datang, <span className="text-white font-semibold">{user.full_name}</span>. Pantau metrik dan kelola pengguna.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-[#111a30] hover:border-blue-500/50 text-sm transition"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-sm transition"
          >
            <LogOut size={15} />
            Keluar
          </button>
        </div>
      </div>

      {/* ERROR NOTIFICATION */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
          <button onClick={fetchAdminData} className="underline text-xs font-bold">
            Coba lagi
          </button>
        </div>
      )}

      {/* OVERVIEW STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-[#111a30] border border-white/10 rounded-2xl p-6">
          <div className="flex justify-between items-center text-gray-400 mb-3">
            <span className="text-sm">Total Pendapatan</span>
            <DollarSign size={20} className="text-emerald-400" />
          </div>
          <h3 className="text-2xl font-black text-emerald-400">
            {loading ? "..." : formatPrice(stats.total_revenue)}
          </h3>
          <p className="text-xs text-gray-500 mt-2">Dari transaksi tiket lunas</p>
        </div>

        <div className="bg-[#111a30] border border-white/10 rounded-2xl p-6">
          <div className="flex justify-between items-center text-gray-400 mb-3">
            <span className="text-sm">Pesanan Sukses</span>
            <Receipt size={20} className="text-blue-400" />
          </div>
          <h3 className="text-3xl font-black text-white">
            {loading ? "..." : stats.total_orders}
          </h3>
          <p className="text-xs text-gray-500 mt-2">Order terkonfirmasi dibayar</p>
        </div>

        <div className="bg-[#111a30] border border-white/10 rounded-2xl p-6">
          <div className="flex justify-between items-center text-gray-400 mb-3">
            <span className="text-sm">Total Event</span>
            <CalendarDays size={20} className="text-purple-400" />
          </div>
          <h3 className="text-3xl font-black text-white">
            {loading ? "..." : stats.total_events}
          </h3>
          <p className="text-xs text-gray-500 mt-2">Seluruh konser di platform</p>
        </div>

        <div className="bg-[#111a30] border border-white/10 rounded-2xl p-6">
          <div className="flex justify-between items-center text-gray-400 mb-3">
            <span className="text-sm">Total Pengguna</span>
            <Users size={20} className="text-cyan-400" />
          </div>
          <h3 className="text-3xl font-black text-white">
            {loading ? "..." : stats.total_users}
          </h3>
          <p className="text-xs text-gray-500 mt-2">Customer & Organizer terdaftar</p>
        </div>
      </div>

      {/* QUICK SCANNER BANNER */}
      <div className="bg-gradient-to-r from-blue-900/50 via-indigo-900/40 to-[#111a30] border border-blue-500/30 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ScanQrCode size={22} className="text-blue-400" />
            Pemindai Tiket Acara (Check-In)
          </h3>
          <p className="text-sm text-gray-300 mt-1">
            Gunakan kamera untuk memindai QR Code pengunjung di pintu masuk acara secara langsung.
          </p>
        </div>
        <Link
          href="/dashboard/admin/checkin"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-lg shadow-blue-600/30 shrink-0"
        >
          Buka QR Scanner
        </Link>
      </div>

      {/* USERS MANAGEMENT TABLE */}
      <div className="bg-[#111a30] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Manajemen Pengguna</h2>
            <p className="text-xs text-gray-400 mt-1">Daftar akun terdaftar dan verifikasi status organizer.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* SEARCH */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau email..."
                className="pl-9 pr-4 py-2 rounded-xl bg-[#080d1c] border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* ROLE FILTER */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#080d1c] border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">Semua Role</option>
              <option value="customer">Customer</option>
              <option value="event_organizer">Organizer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-blue-400">
            <LoaderCircle size={32} className="animate-spin mb-3" />
            <p className="text-xs text-gray-400">Memuat data pengguna...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            Tidak ada pengguna ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-[#0c1428] text-xs text-gray-400 uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Pengguna</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status Verifikasi</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u) => {
                  const isOrganizer = u.role === "event_organizer";
                  const isVerified = u.verification_status === "verified";
                  const isPending = u.verification_status === "pending";

                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-white">{u.full_name || "Tanpa Nama"}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${
                          u.role === "admin"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : u.role === "event_organizer"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isOrganizer ? (
                          <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${
                            isVerified
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : isPending
                              ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                              : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                          }`}>
                            {u.verification_status || "pending"}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isOrganizer && isPending && (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleVerifyOrganizer(u.id, "verified")}
                              disabled={actionLoading === u.id}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition inline-flex items-center gap-1"
                            >
                              <CheckCircle size={13} />
                              Verifikasi
                            </button>
                            <button
                              onClick={() => handleVerifyOrganizer(u.id, "rejected")}
                              disabled={actionLoading === u.id}
                              className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-semibold transition inline-flex items-center gap-1"
                            >
                              <XCircle size={13} />
                              Tolak
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
