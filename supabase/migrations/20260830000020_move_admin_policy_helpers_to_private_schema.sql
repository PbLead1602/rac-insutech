-- Keep RLS helper functions out of the public PostgREST schema. Policies can
-- execute these trusted helpers, but browser clients cannot invoke them as RPC.

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.is_rac_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_primary_admin
  );
$$;

create or replace function private.is_content_admin()
returns boolean language sql stable security definer set search_path = private, public as $$
  select private.is_rac_admin();
$$;

revoke all on function private.is_rac_admin() from public;
revoke all on function private.is_content_admin() from public;
grant usage on schema private to anon, authenticated, service_role;
grant execute on function private.is_rac_admin() to anon, authenticated, service_role;
grant execute on function private.is_content_admin() to anon, authenticated, service_role;

-- Update every existing RLS policy in one controlled operation. Expressions
-- are read from PostgreSQL's policy catalogue, not from user input.
do $$
declare
  policy_record record;
  updated_qual text;
  updated_check text;
begin
  for policy_record in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') like '%public.is_rac_admin()%'
        or coalesce(qual, '') like '%public.is_content_admin()%'
        or coalesce(with_check, '') like '%public.is_rac_admin()%'
        or coalesce(with_check, '') like '%public.is_content_admin()%'
      )
  loop
    -- PostgreSQL deparses the legacy policy expressions without the public
    -- schema prefix, hence these exact unqualified replacements.
    updated_qual := replace(replace(policy_record.qual, 'is_content_admin()', 'private.is_content_admin()'), 'is_rac_admin()', 'private.is_rac_admin()');
    updated_check := replace(replace(policy_record.with_check, 'is_content_admin()', 'private.is_content_admin()'), 'is_rac_admin()', 'private.is_rac_admin()');

    if updated_qual is not null then
      execute format('alter policy %I on %I.%I using (%s)', policy_record.policyname, policy_record.schemaname, policy_record.tablename, updated_qual);
    end if;
    if updated_check is not null then
      execute format('alter policy %I on %I.%I with check (%s)', policy_record.policyname, policy_record.schemaname, policy_record.tablename, updated_check);
    end if;
  end loop;
end;
$$;

drop function public.is_content_admin();
drop function public.is_rac_admin();
