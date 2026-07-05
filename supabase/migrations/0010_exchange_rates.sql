-- =====================================================================
--  Migration 0010 — central exchange-rate table (set once, used everywhere)
--  Rates are LAK per 1 unit of the currency. LAK is the base (rate 1).
--  Run in Supabase SQL Editor. Adjust the seed values to today's rates.
-- =====================================================================

create table if not exists public.exchange_rates (
  currency   text primary key,
  rate       numeric(16,4) not null default 1,
  updated_at timestamptz not null default now()
);

insert into public.exchange_rates (currency, rate) values
  ('THB', 600), ('USD', 21500), ('CNY', 3000)
on conflict (currency) do nothing;

alter table public.exchange_rates enable row level security;

drop policy if exists exchange_rates_select on public.exchange_rates;
drop policy if exists exchange_rates_write  on public.exchange_rates;
create policy exchange_rates_select on public.exchange_rates for select to authenticated using (true);
create policy exchange_rates_write  on public.exchange_rates for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
