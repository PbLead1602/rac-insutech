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
  role_list text;
  using_clause text;
  check_clause text;
begin
  for policy_record in
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
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

    role_list := coalesce(array_to_string(policy_record.roles, ', '), 'public');
    using_clause := case when updated_qual is null then '' else format(' using (%s)', updated_qual) end;
    check_clause := case when updated_check is null then '' else format(' with check (%s)', updated_check) end;

    -- Recreate instead of ALTER: PostgreSQL retains the old function OID as a
    -- dependency when changing an existing policy expression.
    execute format('drop policy %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
    execute format(
      'create policy %I on %I.%I as %s for %s to %s%s%s',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename,
      policy_record.permissive,
      policy_record.cmd,
      role_list,
      using_clause,
      check_clause
    );
  end loop;
end;
$$;

drop function public.is_content_admin();
drop function public.is_rac_admin();
