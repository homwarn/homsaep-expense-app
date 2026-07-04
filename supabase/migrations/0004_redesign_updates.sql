-- =====================================================================
--  Migration 0004 — Redesign updates
--   • shipping cost on purchases (total_price now includes shipping)
--   • revenue types changed to material / drink / other
--  Run this in the Supabase SQL Editor AFTER 0001–0003.
-- =====================================================================

-- ---------- Raw material purchases: shipping cost ----------
alter table public.raw_material_purchases
  add column if not exists shipping_cost numeric(16,2) not null default 0 check (shipping_cost >= 0);

alter table public.raw_material_purchases drop column if exists total_price;
alter table public.raw_material_purchases
  add column total_price numeric(16,2)
  generated always as (quantity * unit_price + coalesce(shipping_cost, 0)) stored;

-- ---------- Drink purchases: shipping cost ----------
alter table public.drink_purchases
  add column if not exists shipping_cost numeric(16,2) not null default 0 check (shipping_cost >= 0);

alter table public.drink_purchases drop column if exists total_price;
alter table public.drink_purchases
  add column total_price numeric(16,2)
  generated always as (quantity * unit_price + coalesce(shipping_cost, 0)) stored;

-- ---------- Revenue types: food/drink → material/drink/other ----------
alter table public.revenues drop constraint if exists revenues_type_check;

update public.revenues set type = 'material' where type = 'food';

alter table public.revenues
  add constraint revenues_type_check check (type in ('material', 'drink', 'other'));
