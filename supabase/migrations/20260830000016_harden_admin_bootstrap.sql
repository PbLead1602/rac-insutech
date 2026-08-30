-- Production hardening: no Auth registration can ever self-promote to RAC Admin.
-- Create the sole Admin deliberately in Supabase Auth, then promote that exact
-- profile through the documented one-time bootstrap step before public signup
-- is enabled. Customer profiles remain non-privileged.

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, role, is_primary_admin)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'content_manager',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Existing profiles are intentionally untouched. On a new V2 project there
-- are none yet; the one authorised Admin is promoted after being created.
