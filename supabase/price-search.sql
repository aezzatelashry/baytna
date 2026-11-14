-- Price search usage caps. Run after schema.sql, before deploying the price-search function.
-- Every search costs money, so each one is claimed here first: 20 a day per user and
-- 100 a day for the whole project. Raise the numbers below if the family needs more.

create table if not exists public.price_searches (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists price_searches_created_at on public.price_searches (created_at);

-- No policies: the table is reachable only through the function below.
alter table public.price_searches enable row level security;

create or replace function public.claim_price_search()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  per_user_limit constant int := 20;
  project_limit constant int := 100;
  day_start constant timestamptz := date_trunc('day', now());
  mine int;
  everyone int;
begin
  if auth.uid() is null then
    return false;
  end if;

  -- One claim at a time, so two phones cannot both slip under the cap.
  perform pg_advisory_xact_lock(hashtext('price_search_claim'));

  select count(*) filter (where user_id = auth.uid()), count(*)
    into mine, everyone
    from public.price_searches
   where created_at >= day_start;

  if mine >= per_user_limit or everyone >= project_limit then
    return false;
  end if;

  insert into public.price_searches (user_id) values (auth.uid());
  return true;
end $$;

revoke execute on function public.claim_price_search() from public, anon;
grant execute on function public.claim_price_search() to authenticated;
