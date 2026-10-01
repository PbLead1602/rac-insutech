-- Repair and lock down commercial/customer tables that must never be readable
-- through the anonymous PostgREST endpoint. Application routes use the
-- service-role client, so this changes no quotation, import, or customer flow.

do $$
declare
  protected_tables constant text[] := array[
    'customer_accounts',
    'customers',
    'customer_notes',
    'enquiry_continuations',
    'quotation_rate_cards',
    'quotation_rate_card_history',
    'rate_imports',
    'rate_import_rows',
    'quotations',
    'quotation_items',
    'quotation_item_layers',
    'quotation_notes',
    'quotation_events',
    'customer_revision_requests'
  ];
  table_name text;
  policy_record record;
begin
  foreach table_name in array protected_tables loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', table_name);

    for policy_record in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = table_name
    loop
      execute format('drop policy if exists %I on public.%I', policy_record.policyname, table_name);
    end loop;

    execute format('revoke all on table public.%I from public', table_name);
    execute format('revoke all on table public.%I from anon', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
  end loop;
end;
$$;

-- Browser sessions may only read the account and quotation records belonging
-- to their authenticated customer. Administrative writes remain behind the
-- existing Admin routes and service-role repositories.
create policy "customer reads own account" on public.customer_accounts
  for select to authenticated
  using (auth_user_id = auth.uid());

create policy "customer reads own customer profile" on public.customers
  for select to authenticated
  using (id in (
    select customer_id from public.customer_accounts
    where auth_user_id = auth.uid() and customer_id is not null
  ));

create policy "customer reads own quotations" on public.quotations
  for select to authenticated
  using (account_id in (
    select id from public.customer_accounts where auth_user_id = auth.uid()
  ));

create policy "customer reads own quotation items" on public.quotation_items
  for select to authenticated
  using (quotation_id in (
    select id from public.quotations
    where account_id in (
      select id from public.customer_accounts where auth_user_id = auth.uid()
    )
  ));

create policy "customer reads own revision requests" on public.customer_revision_requests
  for select to authenticated
  using (account_id in (
    select id from public.customer_accounts where auth_user_id = auth.uid()
  ));

create policy "customer creates own revision requests" on public.customer_revision_requests
  for insert to authenticated
  with check (
    account_id in (
      select id from public.customer_accounts
      where auth_user_id = auth.uid() and approval_status = 'active'
    )
    and customer_id in (
      select customer_id from public.customer_accounts
      where auth_user_id = auth.uid()
        and approval_status = 'active'
        and customer_id is not null
    )
  );

-- Admin access is evaluated by the trusted helper in the private schema.
create policy "admin manages customer accounts" on public.customer_accounts
  for all to authenticated using ((select private.is_rac_admin())) with check ((select private.is_rac_admin()));
create policy "admin manages customers" on public.customers
  for all to authenticated using ((select private.is_rac_admin())) with check ((select private.is_rac_admin()));
create policy "admin manages customer notes" on public.customer_notes
  for all to authenticated using ((select private.is_rac_admin())) with check ((select private.is_rac_admin()));
create policy "admin manages enquiry continuations" on public.enquiry_continuations
  for all to authenticated using ((select private.is_rac_admin())) with check ((select private.is_rac_admin()));
create policy "admin manages quotation rate cards" on public.quotation_rate_cards
  for all to authenticated using ((select private.is_rac_admin())) with check ((select private.is_rac_admin()));
create policy "admin manages quotation rate-card history" on public.quotation_rate_card_history
  for all to authenticated using ((select private.is_rac_admin())) with check ((select private.is_rac_admin()));
create policy "admin manages rate imports" on public.rate_imports
  for all to authenticated using ((select private.is_rac_admin())) with check ((select private.is_rac_admin()));
create policy "admin manages rate import rows" on public.rate_import_rows
  for all to authenticated using ((select private.is_rac_admin())) with check ((select private.is_rac_admin()));
create policy "admin manages quotations" on public.quotations
  for all to authenticated using ((select private.is_rac_admin())) with check ((select private.is_rac_admin()));
create policy "admin manages quotation items" on public.quotation_items
  for all to authenticated using ((select private.is_rac_admin())) with check ((select private.is_rac_admin()));
create policy "admin manages quotation item layers" on public.quotation_item_layers
  for all to authenticated using ((select private.is_rac_admin())) with check ((select private.is_rac_admin()));
create policy "admin manages quotation notes" on public.quotation_notes
  for all to authenticated using ((select private.is_rac_admin())) with check ((select private.is_rac_admin()));
create policy "admin manages quotation events" on public.quotation_events
  for all to authenticated using ((select private.is_rac_admin())) with check ((select private.is_rac_admin()));
create policy "admin manages customer revision requests" on public.customer_revision_requests
  for all to authenticated using ((select private.is_rac_admin())) with check ((select private.is_rac_admin()));

grant select on public.customer_accounts, public.customers, public.quotations, public.quotation_items, public.customer_revision_requests to authenticated;
grant insert on public.customer_revision_requests to authenticated;
