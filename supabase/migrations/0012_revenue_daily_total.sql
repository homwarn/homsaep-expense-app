-- =====================================================================
--  Migration 0012 — Add "daily total" revenue type
--   • allow revenues.type = 'daily_total' (record one lump total per day)
--  Run this in the Supabase SQL Editor AFTER 0001–0011.
-- =====================================================================

-- ---------- Revenue types: add 'daily_total' ----------
alter table public.revenues drop constraint if exists revenues_type_check;

alter table public.revenues
  add constraint revenues_type_check
  check (type in ('material', 'drink', 'other', 'daily_total'));
