-- Baytna family dishes: the meals the household added itself, shared between its
-- phones. Run after family.sql. Applied on 16 Nov 2026.

create table if not exists public.custom_meals (
  household_id uuid not null references public.households (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 80),
  -- The dish as the app holds it. Checked again on every phone that reads it.
  data jsonb not null check (pg_column_size(data) <= 20000),
  deleted boolean not null default false,
  updated_at timestamptz not null,
  server_updated_at timestamptz not null default now(),
  primary key (household_id, id)
);

create index if not exists custom_meals_pull on public.custom_meals (household_id, server_updated_at);

create trigger custom_meals_touch before insert or update on public.custom_meals
  for each row execute function public.touch_server_updated_at();

alter table public.custom_meals enable row level security;

create policy custom_meals_all on public.custom_meals
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

alter publication supabase_realtime add table public.custom_meals;
