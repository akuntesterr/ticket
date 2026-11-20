-- ========================================================
-- ZTICK DATABASE SCHEMA FOR SUPABASE (100% Full Supabase)
-- Jalankan script SQL ini di Supabase SQL Editor:
-- Dashboard Supabase > SQL Editor > New query > Run
-- ========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ========================================================
-- 1. PROFILES TABLE
-- ========================================================
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null,
    email text not null,
    phone text,
    avatar_url text,
    role text not null default 'customer' check (role in ('customer', 'admin', 'event_organizer')),
    verification_status text default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
    verified_at timestamptz,
    verified_by uuid references auth.users(id),
    rejection_reason text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Trigger: Otomatis buat profile saat user register di Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========================================================
-- 2. EVENTS TABLE
-- ========================================================
create table if not exists public.events (
    id uuid primary key default uuid_generate_v4(),
    organizer_id uuid references public.profiles(id) on delete cascade not null,
    title text not null,
    slug text not null unique,
    description text,
    category text,
    start_date timestamptz not null,
    end_date timestamptz,
    venue_name text not null,
    venue_address text,
    city text not null,
    poster_url text,
    terms_conditions text,
    status text not null default 'draft' check (status in ('draft', 'published', 'completed', 'cancelled')),
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- ========================================================
-- 3. TICKET CATEGORIES TABLE
-- ========================================================
create table if not exists public.ticket_categories (
    id uuid primary key default uuid_generate_v4(),
    event_id uuid references public.events(id) on delete cascade not null,
    name text not null,
    price numeric not null check (price >= 0),
    quota integer not null check (quota >= 0),
    sold integer not null default 0 check (sold >= 0),
    description text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- ========================================================
-- 4. ORDERS TABLE
-- ========================================================
create table if not exists public.orders (
    id uuid primary key default uuid_generate_v4(),
    order_code text not null unique,
    customer_id uuid references public.profiles(id) on delete cascade not null,
    total_amount numeric not null check (total_amount >= 0),
    status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'cancelled', 'refunded')),
    expires_at timestamptz not null,
    paid_at timestamptz,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- ========================================================
-- 5. ORDER ITEMS TABLE
-- ========================================================
create table if not exists public.order_items (
    id uuid primary key default uuid_generate_v4(),
    order_id uuid references public.orders(id) on delete cascade not null,
    ticket_category_id uuid references public.ticket_categories(id) on delete cascade not null,
    quantity integer not null check (quantity > 0),
    unit_price numeric not null check (unit_price >= 0),
    subtotal numeric not null check (subtotal >= 0),
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- ========================================================
-- 6. TICKETS TABLE
-- ========================================================
create table if not exists public.tickets (
    id uuid primary key default uuid_generate_v4(),
    order_id uuid references public.orders(id) on delete cascade not null,
    order_item_id uuid references public.order_items(id) on delete cascade not null,
    owner_id uuid references public.profiles(id) on delete cascade not null,
    ticket_category_id uuid references public.ticket_categories(id) on delete cascade not null,
    ticket_code text not null unique,
    qr_token uuid not null default uuid_generate_v4() unique,
    status text not null default 'valid' check (status in ('valid', 'used', 'cancelled')),
    checked_in_at timestamptz,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- ========================================================
-- 7. PAYMENTS TABLE
-- ========================================================
create table if not exists public.payments (
    id uuid primary key default uuid_generate_v4(),
    order_id uuid references public.orders(id) on delete cascade not null,
    provider text not null default 'midtrans',
    provider_reference text not null,
    payment_method text not null default 'snap',
    amount numeric not null,
    status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'expired')),
    paid_at timestamptz,
    raw_response jsonb,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- ========================================================
-- 8. RPC FUNCTIONS (Stored Procedures)
-- ========================================================

-- A. Create Ticket Order (Atomic Quota Reservation)
create or replace function public.create_ticket_order(
    p_customer_id uuid,
    p_ticket_category_id uuid,
    p_quantity int
)
returns uuid
language plpgsql
security definer
as $$
declare
    v_category record;
    v_order_id uuid;
    v_order_code text;
    v_total_amount numeric;
    v_order_item_id uuid;
begin
    -- 1. Check ticket category and lock row
    select * into v_category
    from public.ticket_categories
    where id = p_ticket_category_id
    for update;

    if not found then
        raise exception 'Kategori tiket tidak ditemukan.';
    end if;

    if (v_category.quota - v_category.sold) < p_quantity then
        raise exception 'Kuota tiket tidak mencukupi.';
    end if;

    -- 2. Calculate amount
    v_total_amount := v_category.price * p_quantity;
    v_order_code := 'ZTICK-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

    -- 3. Create Order
    insert into public.orders (
        order_code,
        customer_id,
        total_amount,
        status,
        expires_at
    )
    values (
        v_order_code,
        p_customer_id,
        v_total_amount,
        'pending',
        now() + interval '15 minutes'
    )
    returning id into v_order_id;

    -- 4. Create Order Item
    insert into public.order_items (
        order_id,
        ticket_category_id,
        quantity,
        unit_price,
        subtotal
    )
    values (
        v_order_id,
        p_ticket_category_id,
        p_quantity,
        v_category.price,
        v_total_amount
    )
    returning id into v_order_item_id;

    -- 5. Reserve quota
    update public.ticket_categories
    set sold = sold + p_quantity
    where id = p_ticket_category_id;

    return v_order_id;
end;
$$;

-- B. Generate Order Tickets (Saat Pembayaran Berhasil)
create or replace function public.generate_order_tickets(
    p_order_id uuid
)
returns int
language plpgsql
security definer
as $$
declare
    v_order record;
    v_item record;
    v_i int;
    v_tickets_count int := 0;
    v_ticket_code text;
begin
    select * into v_order
    from public.orders
    where id = p_order_id;

    if not found then
        raise exception 'Order tidak ditemukan.';
    end if;

    -- Cegah duplikasi generate jika tiket sudah pernah dibuat
    select count(*) into v_tickets_count
    from public.tickets
    where order_id = p_order_id;

    if v_tickets_count > 0 then
        return v_tickets_count;
    end if;

    -- Generate setiap tiket untuk tiap order item
    for v_item in (
        select * from public.order_items
        where order_id = p_order_id
    ) loop
        for v_i in 1..v_item.quantity loop
            v_ticket_code := 'TIX-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

            insert into public.tickets (
                order_id,
                order_item_id,
                owner_id,
                ticket_category_id,
                ticket_code,
                qr_token,
                status
            )
            values (
                p_order_id,
                v_item.id,
                v_order.customer_id,
                v_item.ticket_category_id,
                v_ticket_code,
                uuid_generate_v4(),
                'valid'
            );

            v_tickets_count := v_tickets_count + 1;
        end loop;
    end loop;

    return v_tickets_count;
end;
$$;

-- C. Check-in Ticket (Scan QR Code di Lokasi Acara)
create or replace function public.checkin_ticket(
    p_qr_token text,
    p_admin_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_ticket record;
begin
    select * into v_ticket
    from public.tickets
    where qr_token = p_qr_token::uuid
    for update;

    if not found then
        return jsonb_build_object('success', false, 'message', 'Tiket tidak ditemukan.');
    end if;

    if v_ticket.status = 'used' then
        return jsonb_build_object('success', false, 'message', 'Tiket sudah pernah digunakan.');
    end if;

    if v_ticket.status != 'valid' then
        return jsonb_build_object('success', false, 'message', 'Status tiket tidak valid.');
    end if;

    update public.tickets
    set status = 'used',
        checked_in_at = now()
    where id = v_ticket.id;

    return jsonb_build_object(
        'success', true,
        'ticket_id', v_ticket.id,
        'ticket_code', v_ticket.ticket_code,
        'checked_in_at', now()
    );
end;
$$;

-- D. Admin Dashboard Stats
create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
as $$
declare
    v_total_users int;
    v_total_events int;
    v_total_orders int;
    v_total_revenue numeric;
begin
    select count(*) into v_total_users from public.profiles;
    select count(*) into v_total_events from public.events;
    select count(*) into v_total_orders from public.orders where status = 'paid';
    select coalesce(sum(total_amount), 0) into v_total_revenue from public.orders where status = 'paid';

    return jsonb_build_object(
        'total_users', v_total_users,
        'total_events', v_total_events,
        'total_orders', v_total_orders,
        'total_revenue', v_total_revenue
    );
end;
$$;

-- E. Organizer Dashboard Stats
create or replace function public.get_organizer_dashboard_stats(
    p_organizer_id uuid,
    p_event_id uuid default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_total_tickets_sold int;
    v_total_revenue numeric;
    v_total_events int;
begin
    select count(*) into v_total_events
    from public.events
    where organizer_id = p_organizer_id;

    select
        coalesce(sum(tc.sold), 0),
        coalesce(sum(tc.sold * tc.price), 0)
    into
        v_total_tickets_sold,
        v_total_revenue
    from public.ticket_categories tc
    join public.events e on tc.event_id = e.id
    where e.organizer_id = p_organizer_id
      and (p_event_id is null or e.id = p_event_id);

    return jsonb_build_object(
        'total_events', v_total_events,
        'total_tickets_sold', v_total_tickets_sold,
        'total_revenue', v_total_revenue
    );
end;
$$;

-- ========================================================
-- 9. SUPABASE STORAGE BUCKETS (Event Posters & User Avatars)
-- ========================================================
insert into storage.buckets (id, name, public)
values 
  ('event-posters', 'event-posters', true),
  ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Policy agar siapapun bisa melihat poster dan avatar secara publik
create policy "Public Access Event Posters" on storage.objects for select
using (bucket_id = 'event-posters');

create policy "Public Access Avatars" on storage.objects for select
using (bucket_id = 'avatars');

-- Policy upload storage untuk user yang login
create policy "Authenticated Users Upload Posters" on storage.objects for insert
with check (bucket_id = 'event-posters' and auth.role() = 'authenticated');

create policy "Authenticated Users Upload Avatars" on storage.objects for insert
with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- ========================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.ticket_categories enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.tickets enable row level security;
alter table public.payments enable row level security;

-- PROFILES: Semua orang bisa baca profil publik, user bisa edit profil sendiri
create policy "Public profiles are viewable by everyone" on public.profiles
for select using (true);

create policy "Users can update own profile" on public.profiles
for update using (auth.uid() = id);

-- EVENTS: Siapapun bisa lihat event published, organizer bisa kelola eventnya
create policy "Published events are viewable by everyone" on public.events
for select using (status = 'published' or auth.uid() = organizer_id);

create policy "Organizers can insert events" on public.events
for insert with check (auth.uid() = organizer_id);

create policy "Organizers can update own events" on public.events
for update using (auth.uid() = organizer_id);

-- TICKET CATEGORIES: Siapapun bisa lihat tiket
create policy "Ticket categories viewable by everyone" on public.ticket_categories
for select using (true);

-- ORDERS & ORDER ITEMS: Customer bisa lihat pesanan miliknya sendiri
create policy "Customers view own orders" on public.orders
for select using (auth.uid() = customer_id);

create policy "Customers view own order items" on public.order_items
for select using (
    exists (
        select 1 from public.orders
        where orders.id = order_items.order_id
        and orders.customer_id = auth.uid()
    )
);

-- TICKETS: Owner bisa lihat tiket miliknya sendiri
create policy "Owners view own tickets" on public.tickets
for select using (auth.uid() = owner_id);

-- PAYMENTS: Hanya bisa dilihat customer pemilik order
create policy "Customers view own payments" on public.payments
for select using (
    exists (
        select 1 from public.orders
        where orders.id = payments.order_id
        and orders.customer_id = auth.uid()
    )
);
