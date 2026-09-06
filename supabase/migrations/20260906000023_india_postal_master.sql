-- Official India Post master data is imported by scripts/import-india-post-locations.mjs.
-- The application reads it only through a trusted server-side location endpoint.

create extension if not exists pg_trgm;

create table if not exists public.india_postal_locations (
  id bigint generated always as identity primary key,
  city text not null check (city = btrim(city) and city <> ''),
  district text not null check (district = btrim(district) and district <> ''),
  state text not null check (state = btrim(state) and state <> ''),
  pin_code text not null check (pin_code ~ '^[0-9]{6}$'),
  city_search text not null check (city_search = lower(btrim(city_search)) and city_search <> ''),
  source_name text not null default 'Department of Posts, Government of India',
  source_url text not null,
  source_version text not null,
  imported_at timestamptz not null default now(),
  unique (city, district, state, pin_code)
);

create index if not exists india_postal_locations_city_search_idx
  on public.india_postal_locations using gin (city_search gin_trgm_ops);
create index if not exists india_postal_locations_state_city_idx
  on public.india_postal_locations (state, city_search, district);
create index if not exists india_postal_locations_pin_code_idx
  on public.india_postal_locations (pin_code, state, district, city);

alter table public.india_postal_locations enable row level security;

alter table public.customers add column if not exists district text;
alter table public.enquiries add column if not exists district text;

-- Existing records remain untouched. New standardised values (those carrying a
-- district) must match one official master row exactly, so the UI cannot save
-- an arbitrary City/PIN pairing.
create or replace function private.validate_standardised_india_postal_address()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_city text := nullif(btrim(new.city), '');
  v_district text := nullif(btrim(new.district), '');
  v_state text := nullif(btrim(new.state), '');
  v_pin_code text := nullif(btrim(new.pin_code), '');
begin
  if v_city is null and v_district is null and v_state is null and v_pin_code is null then
    return new;
  end if;

  -- A row saved before the postal-master rollout has no district. It is kept
  -- intact until a user edits its address through the new selector.
  if v_district is null then
    return new;
  end if;

  if v_city is null or v_state is null or v_pin_code is null then
    raise exception 'Select a complete City, District, State and PIN Code combination.';
  end if;

  if not exists (
    select 1
    from public.india_postal_locations location
    where lower(location.city) = lower(v_city)
      and lower(location.district) = lower(v_district)
      and lower(location.state) = lower(v_state)
      and location.pin_code = v_pin_code
  ) then
    raise exception 'The selected City, District, State and PIN Code combination is not valid.';
  end if;

  return new;
end;
$$;

drop trigger if exists customers_validate_standardised_india_postal_address on public.customers;
create trigger customers_validate_standardised_india_postal_address
before insert or update of city, district, state, pin_code on public.customers
for each row execute function private.validate_standardised_india_postal_address();

drop trigger if exists enquiries_validate_standardised_india_postal_address on public.enquiries;
create trigger enquiries_validate_standardised_india_postal_address
before insert or update of city, district, state, pin_code on public.enquiries
for each row execute function private.validate_standardised_india_postal_address();

comment on table public.india_postal_locations is
  'Official Department of Posts All India Pincode Directory; load with scripts/import-india-post-locations.mjs.';
