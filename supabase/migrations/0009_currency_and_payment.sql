-- =====================================================================
--  Migration 0009 — item currency + purchase payment fields
--  Run in Supabase SQL Editor.
--  Base currency is LAK; price_lak = price * exchange_rate.
-- =====================================================================

-- item currency & rate
alter table public.raw_materials add column if not exists currency text not null default 'LAK';
alter table public.raw_materials add column if not exists exchange_rate numeric(16,4) not null default 1;
alter table public.drinks        add column if not exists currency text not null default 'LAK';
alter table public.drinks        add column if not exists exchange_rate numeric(16,4) not null default 1;

-- purchase payment method & status
alter table public.raw_material_purchases add column if not exists payment_method text not null default 'cash';
alter table public.raw_material_purchases add column if not exists payment_status text not null default 'paid';
alter table public.drink_purchases        add column if not exists payment_method text not null default 'cash';
alter table public.drink_purchases        add column if not exists payment_status text not null default 'paid';
