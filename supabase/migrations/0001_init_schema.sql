-- =====================================================================
--  ຮ້ານບຸບເຟ້ ຫອມແຊບ · Restaurant Expense Management
--  Migration 0001 — Schema (tables, foreign keys, indexes, triggers)
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Helper: keep updated_at fresh
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- ROLES
-- =====================================================================
create table if not exists public.roles (
  id          smallint generated always as identity primary key,
  name        text not null unique,          -- 'owner' | 'employee'
  description text
);

-- =====================================================================
-- PROFILES  (1:1 with auth.users)
-- =====================================================================
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text not null default '',
  email          text not null,
  phone          text,
  role           text not null default 'employee' check (role in ('owner','employee')),
  can_view_finance boolean not null default false, -- employee finance dashboard permission
  is_active      boolean not null default true,
  avatar_url     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- =====================================================================
-- SUPPLIERS
-- =====================================================================
create table if not exists public.suppliers (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null,
  phone          text,
  address        text,
  contact_person text,
  remark         text,
  is_active      boolean not null default true,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_suppliers_name on public.suppliers using gin (to_tsvector('simple', name));
create trigger trg_suppliers_updated before update on public.suppliers
  for each row execute function public.set_updated_at();

-- =====================================================================
-- RAW MATERIALS
-- =====================================================================
create table if not exists public.raw_material_categories (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.raw_materials (
  id          uuid primary key default uuid_generate_v4(),
  category_id uuid references public.raw_material_categories(id) on delete set null,
  name        text not null,
  unit        text,               -- default unit
  created_at  timestamptz not null default now()
);

create table if not exists public.raw_material_purchases (
  id            uuid primary key default uuid_generate_v4(),
  purchase_date date not null default current_date,
  supplier_id   uuid references public.suppliers(id) on delete set null,
  category_id   uuid references public.raw_material_categories(id) on delete set null,
  material_name text not null,
  quantity      numeric(14,2) not null default 0 check (quantity >= 0),
  unit          text,
  unit_price    numeric(14,2) not null default 0 check (unit_price >= 0),
  total_price   numeric(16,2) generated always as (quantity * unit_price) stored,
  remark        text,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_rmp_date on public.raw_material_purchases(purchase_date);
create index if not exists idx_rmp_supplier on public.raw_material_purchases(supplier_id);
create trigger trg_rmp_updated before update on public.raw_material_purchases
  for each row execute function public.set_updated_at();

-- =====================================================================
-- DRINKS
-- =====================================================================
create table if not exists public.drink_categories (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.drinks (
  id          uuid primary key default uuid_generate_v4(),
  category_id uuid references public.drink_categories(id) on delete set null,
  name        text not null,
  unit        text,
  created_at  timestamptz not null default now()
);

create table if not exists public.drink_purchases (
  id            uuid primary key default uuid_generate_v4(),
  purchase_date date not null default current_date,
  supplier_id   uuid references public.suppliers(id) on delete set null,
  category_id   uuid references public.drink_categories(id) on delete set null,
  drink_name    text not null,
  quantity      numeric(14,2) not null default 0 check (quantity >= 0),
  unit          text,
  unit_price    numeric(14,2) not null default 0 check (unit_price >= 0),
  total_price   numeric(16,2) generated always as (quantity * unit_price) stored,
  remark        text,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_dp_date on public.drink_purchases(purchase_date);
create index if not exists idx_dp_supplier on public.drink_purchases(supplier_id);
create trigger trg_dp_updated before update on public.drink_purchases
  for each row execute function public.set_updated_at();

-- =====================================================================
-- EXPENSE CATEGORIES + EXPENSES
-- =====================================================================
create table if not exists public.expense_categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  icon        text,                -- lucide icon name
  is_system   boolean not null default false,  -- built-in categories cannot be deleted
  created_at  timestamptz not null default now()
);

create table if not exists public.expenses (
  id           uuid primary key default uuid_generate_v4(),
  expense_date date not null default current_date,
  category_id  uuid references public.expense_categories(id) on delete restrict,
  supplier_id  uuid references public.suppliers(id) on delete set null,
  title        text not null,
  amount       numeric(16,2) not null default 0 check (amount >= 0),
  remark       text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_expenses_date on public.expenses(expense_date);
create index if not exists idx_expenses_category on public.expenses(category_id);
create trigger trg_expenses_updated before update on public.expenses
  for each row execute function public.set_updated_at();

-- =====================================================================
-- REPAIRS
-- =====================================================================
create table if not exists public.repairs (
  id            uuid primary key default uuid_generate_v4(),
  repair_date   date not null default current_date,
  repair_name   text not null,
  repair_cost   numeric(16,2) not null default 0 check (repair_cost >= 0),
  material_cost numeric(16,2) not null default 0 check (material_cost >= 0),
  total_cost    numeric(16,2) generated always as (repair_cost + material_cost) stored,
  supplier_id   uuid references public.suppliers(id) on delete set null,
  remark        text,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_repairs_date on public.repairs(repair_date);
create trigger trg_repairs_updated before update on public.repairs
  for each row execute function public.set_updated_at();

-- =====================================================================
-- REVENUES  (food + drink)
-- =====================================================================
create table if not exists public.revenues (
  id           uuid primary key default uuid_generate_v4(),
  revenue_date date not null default current_date,
  type         text not null check (type in ('food','drink')),
  amount       numeric(16,2) not null default 0 check (amount >= 0),
  remark       text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_revenues_date on public.revenues(revenue_date);
create index if not exists idx_revenues_type on public.revenues(type);
create trigger trg_revenues_updated before update on public.revenues
  for each row execute function public.set_updated_at();

-- =====================================================================
-- REPORTS  (saved / generated report metadata)
-- =====================================================================
create table if not exists public.reports (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  report_type  text not null,     -- daily|monthly|yearly|supplier|expense|revenue|profit ...
  period_start date,
  period_end   date,
  file_url     text,              -- optional stored file in Supabase Storage
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- =====================================================================
-- SETTINGS  (single row keyed store)
-- =====================================================================
create table if not exists public.settings (
  id              smallint primary key default 1 check (id = 1),
  restaurant_name text not null default 'ຮ້ານບຸບເຟ້ ຫອມແຊບ',
  logo_url        text,
  currency        text not null default 'LAK',
  language        text not null default 'lo',
  daily_expense_target   numeric(16,2) default 0,
  monthly_expense_budget numeric(16,2) default 0,
  low_profit_threshold   numeric(16,2) default 0,
  updated_at      timestamptz not null default now()
);
create trigger trg_settings_updated before update on public.settings
  for each row execute function public.set_updated_at();

-- =====================================================================
-- ACTIVITY LOGS
-- =====================================================================
create table if not exists public.activity_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.profiles(id) on delete set null,
  action      text not null,       -- insert|update|delete|login
  entity      text not null,       -- table / module name
  entity_id   text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_logs_created on public.activity_logs(created_at desc);

-- =====================================================================
-- NEW USER → PROFILE trigger
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
