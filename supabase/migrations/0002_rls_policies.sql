-- =====================================================================
--  Migration 0002 — Row Level Security & Policies
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid recursive RLS on profiles)
-- ---------------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_owner()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner' and is_active
  );
$$;

create or replace function public.can_view_finance()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active
      and (role = 'owner' or can_view_finance)
  );
$$;

-- ---------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------
alter table public.roles                    enable row level security;
alter table public.profiles                 enable row level security;
alter table public.suppliers                enable row level security;
alter table public.raw_material_categories  enable row level security;
alter table public.raw_materials            enable row level security;
alter table public.raw_material_purchases   enable row level security;
alter table public.drink_categories         enable row level security;
alter table public.drinks                   enable row level security;
alter table public.drink_purchases          enable row level security;
alter table public.expense_categories       enable row level security;
alter table public.expenses                 enable row level security;
alter table public.repairs                  enable row level security;
alter table public.revenues                 enable row level security;
alter table public.reports                  enable row level security;
alter table public.settings                 enable row level security;
alter table public.activity_logs            enable row level security;

-- ---------------------------------------------------------------------
-- ROLES — read for all authenticated, write owner only
-- ---------------------------------------------------------------------
create policy "roles_read"  on public.roles for select to authenticated using (true);
create policy "roles_write" on public.roles for all    to authenticated using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------
-- PROFILES
--   read: self OR owner
--   update self (but not role/permission escalation is enforced in app + owner-only trigger below)
--   owner manages everyone
-- ---------------------------------------------------------------------
create policy "profiles_read_self_or_owner" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_owner());

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_owner_all" on public.profiles
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- Prevent employees from escalating their own role / finance flag
create or replace function public.guard_profile_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then
    if new.role is distinct from old.role
       or new.can_view_finance is distinct from old.can_view_finance
       or new.is_active is distinct from old.is_active then
      raise exception 'Only owner can change role, finance access or active status';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_profile on public.profiles;
create trigger trg_guard_profile before update on public.profiles
  for each row execute function public.guard_profile_escalation();

-- ---------------------------------------------------------------------
-- Generic operational tables:
--   SELECT: any active authenticated user
--   INSERT: any active authenticated user (records own created_by)
--   UPDATE: owner OR the creator (employee edits own record)
--   DELETE: owner only
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'suppliers','raw_material_purchases','drink_purchases',
    'expenses','repairs','revenues'
  ] loop
    execute format('create policy "%1$s_select" on public.%1$s for select to authenticated using (true);', t);
    execute format('create policy "%1$s_insert" on public.%1$s for insert to authenticated with check (auth.uid() is not null);', t);
    execute format('create policy "%1$s_update" on public.%1$s for update to authenticated using (public.is_owner() or created_by = auth.uid()) with check (public.is_owner() or created_by = auth.uid());', t);
    execute format('create policy "%1$s_delete" on public.%1$s for delete to authenticated using (public.is_owner());', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Lookup tables (categories, materials, drinks):
--   read all; write owner OR any authenticated (allow creating categories on the fly),
--   delete owner only
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'raw_material_categories','raw_materials',
    'drink_categories','drinks','expense_categories'
  ] loop
    execute format('create policy "%1$s_select" on public.%1$s for select to authenticated using (true);', t);
    execute format('create policy "%1$s_insert" on public.%1$s for insert to authenticated with check (auth.uid() is not null);', t);
    execute format('create policy "%1$s_update" on public.%1$s for update to authenticated using (public.is_owner()) with check (public.is_owner());', t);
    execute format('create policy "%1$s_delete" on public.%1$s for delete to authenticated using (public.is_owner());', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- REPORTS — read all, create all, delete owner only (spec: employee cannot delete reports)
-- ---------------------------------------------------------------------
create policy "reports_select" on public.reports for select to authenticated using (true);
create policy "reports_insert" on public.reports for insert to authenticated with check (auth.uid() is not null);
create policy "reports_delete" on public.reports for delete to authenticated using (public.is_owner());

-- ---------------------------------------------------------------------
-- SETTINGS — read all, write owner only
-- ---------------------------------------------------------------------
create policy "settings_read"  on public.settings for select to authenticated using (true);
create policy "settings_write" on public.settings for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------
-- ACTIVITY LOGS — owner reads all, user reads own; insert by anyone
-- ---------------------------------------------------------------------
create policy "logs_read"  on public.activity_logs for select to authenticated using (public.is_owner() or user_id = auth.uid());
create policy "logs_insert" on public.activity_logs for insert to authenticated with check (auth.uid() is not null);
