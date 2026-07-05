-- =====================================================================
--  Migration 0007 — map suppliers to the items they supply
--  Run in Supabase SQL Editor.
-- =====================================================================

create table if not exists public.supplier_raw_materials (
  supplier_id     uuid references public.suppliers(id) on delete cascade,
  raw_material_id uuid references public.raw_materials(id) on delete cascade,
  primary key (supplier_id, raw_material_id)
);

create table if not exists public.supplier_drinks (
  supplier_id uuid references public.suppliers(id) on delete cascade,
  drink_id    uuid references public.drinks(id) on delete cascade,
  primary key (supplier_id, drink_id)
);

alter table public.supplier_raw_materials enable row level security;
alter table public.supplier_drinks        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['supplier_raw_materials','supplier_drinks'] loop
    execute format('drop policy if exists "%1$s_select" on public.%1$s;', t);
    execute format('drop policy if exists "%1$s_write"  on public.%1$s;', t);
    execute format('create policy "%1$s_select" on public.%1$s for select to authenticated using (true);', t);
    execute format('create policy "%1$s_write"  on public.%1$s for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);', t);
  end loop;
end $$;
