-- Baytna: shared shopping list and meal plan for one household.
-- Run once in the Supabase SQL editor. Requires "Anonymous sign-ins" enabled
-- (Authentication > Sign In / Providers).

create extension if not exists pgcrypto;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.list_items (
  id uuid primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  week_start date not null,
  name text not null check (char_length(name) between 1 and 120),
  qty numeric not null check (qty >= 0),
  unit text not null default '',
  category text not null,
  est_price numeric check (est_price >= 0),
  paid_price numeric check (paid_price >= 0),
  bought boolean not null default false,
  meal_id text,
  added_by text not null default '',
  deleted boolean not null default false,
  updated_at timestamptz not null,
  server_updated_at timestamptz not null default now()
);

create table public.plan_entries (
  id uuid primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  date date not null,
  slot text not null check (slot in ('breakfast', 'lunch', 'dinner')),
  meal_id text not null,
  deleted boolean not null default false,
  updated_at timestamptz not null,
  server_updated_at timestamptz not null default now()
);

create index list_items_pull on public.list_items (household_id, server_updated_at);
create index plan_entries_pull on public.plan_entries (household_id, server_updated_at);

-- The pull cursor uses the server clock, so phone clock drift cannot hide rows.
create function public.touch_server_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.server_updated_at := now();
  return new;
end $$;

create trigger list_items_touch before insert or update on public.list_items
  for each row execute function public.touch_server_updated_at();
create trigger plan_entries_touch before insert or update on public.plan_entries
  for each row execute function public.touch_server_updated_at();

create function public.is_member(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members
    where household_id = target and user_id = auth.uid()
  );
$$;

-- Creates a household with a random 8-character code and joins the caller.
create function public.create_household() returns table (id uuid, code text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  new_id uuid;
  new_code text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  new_code := upper(encode(gen_random_bytes(5), 'hex'));
  new_code := substr(new_code, 1, 8);
  insert into public.households (code) values (new_code) returning households.id into new_id;
  insert into public.household_members (household_id, user_id) values (new_id, auth.uid());
  return query select new_id, new_code;
end $$;

-- Joins the caller to the household that owns the code.
create function public.join_household(join_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  target uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select h.id into target from public.households h where h.code = upper(trim(join_code));
  if target is null then raise exception 'unknown code'; end if;
  insert into public.household_members (household_id, user_id)
    values (target, auth.uid()) on conflict do nothing;
  return target;
end $$;

revoke execute on function public.is_member(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;
revoke execute on function public.create_household() from public, anon;
revoke execute on function public.join_household(text) from public, anon;
grant execute on function public.create_household() to authenticated;
grant execute on function public.join_household(text) to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.list_items enable row level security;
alter table public.plan_entries enable row level security;

create policy households_read on public.households
  for select to authenticated using (public.is_member(id));
create policy members_read on public.household_members
  for select to authenticated using (user_id = auth.uid());

create policy list_items_all on public.list_items
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy plan_entries_all on public.plan_entries
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

alter publication supabase_realtime add table public.list_items, public.plan_entries;
