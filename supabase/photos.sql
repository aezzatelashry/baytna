-- Baytna photos: the family's own pictures of products and dishes, shared between the
-- household's phones. Run after family.sql. Applied to the live project on 16 Nov 2026.
--
-- A row in public.photos says which picture belongs to which product or dish; the file
-- itself sits in a private storage bucket under the household's own folder.

create table if not exists public.photos (
  household_id uuid not null references public.households (id) on delete cascade,
  kind text not null check (kind in ('item', 'meal')),
  -- The product's normalized name, or the dish's id.
  key text not null check (char_length(key) between 1 and 200),
  path text not null check (char_length(path) <= 300),
  -- True when the family took the picture away; the row stays so the other phone hears about it.
  deleted boolean not null default false,
  updated_at timestamptz not null,
  server_updated_at timestamptz not null default now(),
  primary key (household_id, kind, key)
);

create index if not exists photos_pull on public.photos (household_id, server_updated_at);

create trigger photos_touch before insert or update on public.photos
  for each row execute function public.touch_server_updated_at();

alter table public.photos enable row level security;

create policy photos_all on public.photos
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

-- The household a stored file belongs to: the first folder of its path, when that is a uuid.
create or replace function public.photo_household(object_name text) returns uuid
language sql immutable set search_path = '' as $$
  select case
    when split_part(object_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(object_name, '/', 1)::uuid
    else null
  end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('household-photos', 'household-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
  on conflict (id) do nothing;

-- Only approved members reach their own household's folder. Nobody else can list, read or write it.
create policy household_photos_read on storage.objects
  for select to authenticated
  using (bucket_id = 'household-photos' and public.is_member(public.photo_household(name)));

create policy household_photos_add on storage.objects
  for insert to authenticated
  with check (bucket_id = 'household-photos' and public.is_member(public.photo_household(name)));

create policy household_photos_replace on storage.objects
  for update to authenticated
  using (bucket_id = 'household-photos' and public.is_member(public.photo_household(name)))
  with check (bucket_id = 'household-photos' and public.is_member(public.photo_household(name)));

alter publication supabase_realtime add table public.photos;
