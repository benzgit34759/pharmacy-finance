-- =============================================================
-- Pharmacy Finance — Supabase Schema
-- Run this in your Supabase project's SQL Editor
-- =============================================================

-- ── Profiles (extends auth.users) ──────────────────────────
create table public.profiles (
  id       uuid references auth.users(id) on delete cascade primary key,
  role     text not null check (role in ('staff', 'owner')) default 'staff',
  name     text,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- ── Daily financial entries ─────────────────────────────────
create table public.daily_entries (
  id            uuid default gen_random_uuid() primary key,
  date          date not null unique,                        -- one entry per day enforced by UNIQUE
  sales         numeric(12, 2) not null default 0 check (sales >= 0),
  cost          numeric(12, 2) not null default 0 check (cost >= 0),
  cash_on_hand  numeric(12, 2) not null default 0 check (cash_on_hand >= 0),
  bank_balance  numeric(12, 2) not null default 0 check (bank_balance >= 0),
  submitted_by  uuid references public.profiles(id),
  submitted_at  timestamptz default now() not null,
  is_locked     boolean not null default true,
  created_at    timestamptz default now() not null
);

alter table public.daily_entries enable row level security;

-- Any authenticated user can insert (staff submits, date UNIQUE prevents duplicates)
create policy "Authenticated users can insert entries"
  on public.daily_entries for insert
  with check (auth.uid() is not null);

-- Any authenticated user can read all entries
create policy "Authenticated users can view entries"
  on public.daily_entries for select
  using (auth.uid() is not null);

-- Nobody can update or delete once submitted (is_locked enforced at app level too)

-- ── Auto-create profile on signup ──────────────────────────
-- Pass role via raw_user_meta_data when creating users in Supabase Auth dashboard:
--   { "role": "owner", "name": "เจ้าของร้าน" }
--   { "role": "staff", "name": "พนักงาน" }

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'staff'),
    coalesce(new.raw_user_meta_data ->> 'name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================
-- HOW TO CREATE USERS
-- In Supabase Dashboard → Authentication → Users → Add user
-- Set email + password, then in "User metadata" add:
--   { "role": "owner", "name": "ชื่อเจ้าของ" }
--   { "role": "staff", "name": "ชื่อพนักงาน" }
-- =============================================================
