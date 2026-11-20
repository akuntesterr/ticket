// ============================================================
// ZTICK Mobile: API Client
// Semua komunikasi ke backend FastAPI melalui file ini
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

// ─── Token helpers ──────────────────────────────────────────
export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('access_token');
}

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem('access_token', token);
}

export async function removeToken(): Promise<void> {
  await AsyncStorage.removeItem('access_token');
}

// ─── Generic fetch wrapper ───────────────────────────────────
interface ApiOptions extends RequestInit {
  auth?: boolean;
}

async function request<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { auth = true, headers = {}, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = await getToken();
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
  });

  const json = await res.json();

  if (!res.ok) {
    const message =
      json?.detail ?? json?.message ?? `HTTP ${res.status}`;
    throw new Error(message);
  }

  return json as T;
}

// ─── Auth ────────────────────────────────────────────────────
export interface LoginResult {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await request<{ success: boolean; data: LoginResult }>('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password }),
  });
  await saveToken(res.data.access_token);
  return res.data;
}

export async function register(
  full_name: string,
  email: string,
  password: string
): Promise<LoginResult> {
  const res = await request<{ success: boolean; data: LoginResult }>('/api/auth/register', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ full_name, email, password }),
  });
  if (res.data?.access_token) {
    await saveToken(res.data.access_token);
  }
  return res.data;
}

export async function getMyProfile() {
  const res = await request<{ success: boolean; data: { user: LoginResult['user'] } }>('/api/auth/me');
  return res.data.user;
}

// ─── Events ──────────────────────────────────────────────────
export interface Event {
  id: string;
  title: string;
  poster_url: string | null;
  start_date: string;
  venue_name: string;
  venue_address?: string | null;
  city: string;
  ticket_categories: TicketCategory[];
}

export interface TicketCategory {
  id: string;
  name: string;
  price: number;
  quota: number;
  sold: number;
  event_id: string;
}

export async function getEvents(): Promise<Event[]> {
  const res = await request<{ success: boolean; data: Event[] }>('/api/events', { auth: false });
  return res.data;
}

export async function getEventDetail(id: string): Promise<Event> {
  const res = await request<{ success: boolean; data: Event }>(`/api/events/${id}`, { auth: false });
  return res.data;
}

// ─── Orders ──────────────────────────────────────────────────
export interface Order {
  id: string;
  order_code: string;
  total_amount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export async function createOrder(
  ticket_category_id: string,
  quantity: number
): Promise<{ order_id: string }> {
  const res = await request<{ success: boolean; data: { order_id: string } }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify({ ticket_category_id, quantity }),
  });
  return res.data;
}

export async function getMyOrders(): Promise<Order[]> {
  const res = await request<{ success: boolean; data: Order[] }>('/api/orders/my-orders');
  return res.data;
}

export async function getOrderDetail(order_id: string): Promise<Order> {
  const res = await request<{ success: boolean; data: Order }>(`/api/orders/${order_id}`);
  return res.data;
}

export async function cancelOrder(order_id: string): Promise<void> {
  await request(`/api/orders/${order_id}/cancel`, { method: 'PATCH' });
}

// ─── Payments ────────────────────────────────────────────────
export interface PaymentResult {
  payment_id: string;
  order_id: string;
  snap_token: string;
  redirect_url: string;
}

export async function createPayment(order_id: string): Promise<PaymentResult> {
  const res = await request<{ success: boolean; data: PaymentResult }>('/api/payments/create', {
    method: 'POST',
    body: JSON.stringify({ order_id }),
  });
  return res.data;
}

export async function retryPayment(order_id: string): Promise<PaymentResult> {
  const res = await request<{ success: boolean; data: PaymentResult }>('/api/payments/retry', {
    method: 'POST',
    body: JSON.stringify({ order_id }),
  });
  return res.data;
}

export async function getPaymentStatus(order_id: string): Promise<{
  payment_id: string;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
}> {
  const res = await request<{ success: boolean; data: unknown }>(`/api/payments/status/${order_id}`);
  return res.data as {
    payment_id: string;
    status: string;
    payment_method: string | null;
    paid_at: string | null;
  };
}

export async function getMidtransClientKey(): Promise<string> {
  const res = await request<{ client_key: string }>('/api/payments/client-key', { auth: false });
  return res.client_key;
}

// ─── Tickets ─────────────────────────────────────────────────
export interface Ticket {
  id: string;
  ticket_code: string;
  qr_token: string;
  status: 'valid' | 'active' | 'used' | 'cancelled';
  created_at: string;
  ticket_categories: {
    id: string;
    name: string;
    events: Event;
  };
}

export async function getMyTickets(): Promise<Ticket[]> {
  const res = await request<{ success: boolean; data: Ticket[] }>('/api/tickets/my-tickets');
  return res.data;
}

export async function getTicketDetail(ticket_id: string): Promise<Ticket> {
  const res = await request<{ success: boolean; data: Ticket }>(`/api/tickets/${ticket_id}`);
  return res.data;
}
