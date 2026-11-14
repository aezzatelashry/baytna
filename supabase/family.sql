-- Baytna family layer: Google-only households, an owner who approves members,
-- the two roles, the weekly order ("الطلب والمشوار") and push tokens.
--
-- NOT APPLIED YET, and not tested against a real project. Run after schema.sql, and only
-- together with the G1 app changes in docs/BOARD_ORDERS_FAMILY_GOOGLE.md: after this file
-- joining a household waits for the owner's approval and anonymous users can no longer
-- create or join one.

-- 1. Owner, roles and approval ------------------------------------------------

alter table public.households
  add column if not exists owner_id uuid references auth.users (id);

alter table public.household_members
  add column if not exists role text not null default 'requester' check (role in ('requester', 'shopper')),
  add column if not exists display_name text not null default '' check (char_length(display_name) <= 60),
  add column if not exists status text not null default 'member' check (status in ('pending', 'member'));

-- True for a signed-in user who is not an anonymous session.
create or replace function public.is_permanent_user() returns boolean
language sql stable as $$
  select auth.uid() is not null and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

-- Only approved members see or change household rows.
create or replace function public.is_member(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members
    where household_id = target and user_id = auth.uid() and status = 'member'
  );
$$;

create or replace function public.create_household() returns table (id uuid, code text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  new_id uuid;
  new_code text;
begin
  if not public.is_permanent_user() then raise exception 'google sign-in required'; end if;
  new_code := substr(upper(encode(gen_random_bytes(5), 'hex')), 1, 8);
  insert into public.households (code, owner_id) values (new_code, auth.uid())
    returning households.id into new_id;
  insert into public.household_members (household_id, user_id, status)
    values (new_id, auth.uid(), 'member');
  return query select new_id, new_code;
end $$;

-- Asks to join. The row stays 'pending' until the owner approves it.
create or replace function public.join_household(join_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  target uuid;
begin
  if not public.is_permanent_user() then raise exception 'google sign-in required'; end if;
  select h.id into target from public.households h where h.code = upper(trim(join_code));
  if target is null then raise exception 'unknown code'; end if;
  insert into public.household_members (household_id, user_id, status)
    values (target, auth.uid(), 'pending') on conflict do nothing;
  return target;
end $$;

create or replace function public.approve_member(target_household uuid, target_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.households where id = target_household and owner_id = auth.uid()) then
    raise exception 'owner only';
  end if;
  update public.household_members set status = 'member'
   where household_id = target_household and user_id = target_user;
end $$;

-- A member sets their own role and the name the other phone shows.
create or replace function public.set_my_profile(target_household uuid, new_role text, new_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member(target_household) then raise exception 'not a member'; end if;
  update public.household_members set role = new_role, display_name = left(trim(new_name), 60)
   where household_id = target_household and user_id = auth.uid();
end $$;

-- The owner sees pending requests; everyone sees their own row (existing policy) and fellow members.
drop policy if exists members_read on public.household_members;
create policy members_read on public.household_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_member(household_id)
    or exists (select 1 from public.households h where h.id = household_id and h.owner_id = auth.uid())
  );

-- 2. The weekly order -----------------------------------------------------------

create table if not exists public.orders (
  household_id uuid not null references public.households (id) on delete cascade,
  week_start date not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'shopping', 'done')),
  sent_by uuid references auth.users (id),
  shopper_id uuid references auth.users (id),
  sent_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (household_id, week_start)
);

alter table public.orders enable row level security;

-- Members read the order. Nobody writes it directly: status only moves through order_event().
drop policy if exists orders_read on public.orders;
create policy orders_read on public.orders
  for select to authenticated using (public.is_member(household_id));

-- Mirrors src/domain/orders.ts. Locks the row so two phones cannot move it at once.
create or replace function public.order_event(target_household uuid, target_week date, event text) returns text
language plpgsql security definer set search_path = public as $$
declare
  my_role text;
  current_status text;
  next_status text;
begin
  select role into my_role from public.household_members
   where household_id = target_household and user_id = auth.uid() and status = 'member';
  if my_role is null then raise exception 'not a member'; end if;

  insert into public.orders (household_id, week_start) values (target_household, target_week)
    on conflict do nothing;
  select status into current_status from public.orders
   where household_id = target_household and week_start = target_week for update;

  next_status := case
    when event = 'send' and current_status = 'draft' and my_role = 'requester' then 'sent'
    when event = 'recall' and current_status = 'sent' and my_role = 'requester' then 'draft'
    when event = 'start' and current_status = 'sent' and my_role = 'shopper' then 'shopping'
    when event = 'finish' and current_status = 'shopping' and my_role = 'shopper' then 'done'
    when event = 'reopen' and current_status = 'done' then 'draft'
    else null
  end;
  if next_status is null then raise exception 'not allowed'; end if;

  update public.orders set
    status = next_status,
    sent_by = case when event = 'send' then auth.uid() else sent_by end,
    sent_at = case when event = 'send' then now() else sent_at end,
    shopper_id = case when event = 'start' then auth.uid() else shopper_id end,
    started_at = case when event = 'start' then now() else started_at end,
    finished_at = case when event = 'finish' then now() else finished_at end,
    updated_at = now()
  where household_id = target_household and week_start = target_week;
  return next_status;
end $$;

alter table public.list_items
  add column if not exists urgent boolean not null default false,
  add column if not exists not_found boolean not null default false,
  add column if not exists substitute text check (substitute is null or char_length(substitute) <= 120);

-- 3. Push tokens ------------------------------------------------------------------

create table if not exists public.push_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null check (char_length(token) <= 200),
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

alter table public.push_tokens enable row level security;

-- A phone manages only its own tokens. Sending reads them with the service role, on the server.
drop policy if exists push_tokens_own on public.push_tokens;
create policy push_tokens_own on public.push_tokens
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4. Grants and realtime ------------------------------------------------------------

revoke execute on function public.approve_member(uuid, uuid) from public, anon;
revoke execute on function public.set_my_profile(uuid, text, text) from public, anon;
revoke execute on function public.order_event(uuid, date, text) from public, anon;
grant execute on function public.approve_member(uuid, uuid) to authenticated;
grant execute on function public.set_my_profile(uuid, text, text) to authenticated;
grant execute on function public.order_event(uuid, date, text) to authenticated;

alter publication supabase_realtime add table public.orders;
