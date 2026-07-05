-- =====================================================================
--  Migration 0005 — allow authenticated users to edit/delete master data
--  (categories & items). Previously only the owner could update/delete,
--  which made edits silently fail for non-owners.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'raw_material_categories','raw_materials',
    'drink_categories','drinks','expense_categories'
  ] loop
    execute format('drop policy if exists "%1$s_update" on public.%1$s;', t);
    execute format('drop policy if exists "%1$s_delete" on public.%1$s;', t);
    execute format('create policy "%1$s_update" on public.%1$s for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);', t);
    execute format('create policy "%1$s_delete" on public.%1$s for delete to authenticated using (auth.uid() is not null);', t);
  end loop;
end $$;
