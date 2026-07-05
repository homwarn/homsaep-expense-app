-- =====================================================================
--  Migration 0011 — per-user menu permissions
--  allowed_menus holds route paths a non-owner user may access
--  (e.g. {'/raw-materials','/drinks'}). Owners always see everything.
-- =====================================================================

alter table public.profiles
  add column if not exists allowed_menus text[] not null default '{}';
