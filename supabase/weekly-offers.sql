-- Baytna weekly offers: every Wednesday morning the database's own scheduler asks the
-- weekly-offers function to look up what each household still has to buy, on the
-- chains' own Saudi websites. Run after offers.sql. Applied on 16 Nov 2026.
--
-- The call is trusted by a shared secret. It is made up here, kept only in the vault, and
-- never shown: the cron job reads it from the vault to send it, and the function asks
-- weekly_offers_authorized() whether the one it received is the same.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- What was looked up for a household in a given week, so a week never costs more than its cap.
create table if not exists public.weekly_offer_runs (
  household_id uuid not null references public.households (id) on delete cascade,
  -- The Monday (UTC) of the week.
  run_week date not null,
  looked_up text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (household_id, run_week)
);

-- No policies: only the function, with the service role, reads or writes it.
alter table public.weekly_offer_runs enable row level security;

select vault.create_secret(
  replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  'weekly_offers_secret',
  'Shared secret between the weekly offers cron job and the weekly-offers function'
)
where not exists (select 1 from vault.secrets where name = 'weekly_offers_secret');

create or replace function public.weekly_offers_authorized(candidate text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from vault.decrypted_secrets s
    where s.name = 'weekly_offers_secret' and s.decrypted_secret = candidate
  );
$$;

revoke execute on function public.weekly_offers_authorized(text) from public, anon, authenticated;
grant execute on function public.weekly_offers_authorized(text) to service_role;

-- Wednesday, 07:00 to 07:55 Riyadh time (04:00 UTC), every five minutes: each call carries on
-- where the last stopped, and once a household's lookups for the week are done it does nothing.
select cron.schedule(
  'weekly-offers',
  '*/5 4 * * 3',
  $job$
    select net.http_post(
      url := 'https://paaogyxbubuyffaajwmk.supabase.co/functions/v1/weekly-offers',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'weekly_offers_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 5000
    );
  $job$
);
