-- =====================================================================
--  Migration 0006 — allow authenticated users to delete their operational
--  records (purchases, expenses, revenues, repairs). Reports stay owner-only.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'raw_material_purchases','drink_purchases','expenses','repairs','revenues'
  ] loop
    execute format('drop policy if exists "%1$s_delete" on public.%1$s;', t);
    execute format('create policy "%1$s_delete" on public.%1$s for delete to authenticated using (auth.uid() is not null);', t);
  end loop;
end $$;
