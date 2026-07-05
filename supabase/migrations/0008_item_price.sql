-- =====================================================================
--  Migration 0008 — default price per item (raw materials & drinks)
--  Run in Supabase SQL Editor.
-- =====================================================================

alter table public.raw_materials add column if not exists price numeric(16,2) not null default 0;
alter table public.drinks        add column if not exists price numeric(16,2) not null default 0;
