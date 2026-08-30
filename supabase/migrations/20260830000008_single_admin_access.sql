-- RAC operates its dashboard with one authorised Admin account only.
-- Existing staff profiles are retained, but only the earliest profile is
-- promoted to the sole dashboard Admin during this migration.

alter table public.profiles
  add column if not exists is_primary_admin boolean not null default false;

alter table public.profiles
  alter column role set default 'admin';

update public.profiles
set role = 'admin',
    is_primary_admin = false;

with initial_admin as (
  select id
  from public.profiles
  order by created_at asc, id asc
  limit 1
)
update public.profiles
set is_primary_admin = true
where id in (select id from initial_admin);

create unique index if not exists profiles_one_primary_admin_idx
  on public.profiles (is_primary_admin)
  where is_primary_admin;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  primary_admin_available boolean;
begin
  select not exists (
    select 1 from public.profiles where is_primary_admin
  ) into primary_admin_available;

  insert into public.profiles (id, email, display_name, role, is_primary_admin)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'admin',
    primary_admin_available
  );
  return new;
end;
$$;

create or replace function public.is_rac_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_primary_admin
  );
$$;

create or replace function public.is_content_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_rac_admin();
$$;
