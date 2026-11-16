-- Baytna offers: the prices the household saved (typed, found by search, or read off a
-- flyer), shared between its phones. Run after family.sql. Applied on 16 Nov 2026.

create table if not exists public.offers (
  id uuid primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  store text not null check (char_length(store) between 1 and 80),
  name text not null check (char_length(name) between 1 and 160),
  price numeric not null check (price > 0),
  pack_qty integer not null default 1 check (pack_qty >= 1),
  kind text not null check (kind in ('daily', 'weekly', 'bulk')),
  valid_until date,
  source_url text check (source_url is null or char_length(source_url) <= 600),
  added_at date not null,
  -- True when someone took the offer away; the row stays so the other phone hears about it.
  deleted boolean not null default false,
  updated_at timestamptz not null,
  server_updated_at timestamptz not null default now()
);

create index if not exists offers_pull on public.offers (household_id, server_updated_at);

create trigger offers_touch before insert or update on public.offers
  for each row execute function public.touch_server_updated_at();

alter table public.offers enable row level security;

create policy offers_all on public.offers
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

alter publication supabase_realtime add table public.offers;
