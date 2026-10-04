-- Allow several independently approved contacts to share one company Customer
-- master. The email/auth identity remains unique per person; quotation,
-- enquiry and rate data is unchanged.

-- customer_accounts.customer_id was originally unique, which made the second
-- approved contact replace the first contact's company link. Keep a normal
-- lookup index instead so every contact can retain its own membership.
alter table public.customer_accounts
  drop constraint if exists customer_accounts_customer_id_key;

create index if not exists customer_accounts_customer_id_idx
  on public.customer_accounts(customer_id)
  where customer_id is not null;

-- Keep customers.account_id as the optional legacy primary-contact reference.
-- The active account-to-company relationship is customer_accounts.customer_id.
create or replace function public.approve_customer_account(p_account_id uuid, p_admin_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  account_record public.customer_accounts%rowtype;
  resolved_customer_id uuid;
  resolved_type text;
  company_lock_key text;
begin
  select * into account_record
  from public.customer_accounts
  where id = p_account_id
  for update;

  if not found then raise exception 'Customer account was not found'; end if;
  if account_record.approval_status not in ('pending_admin_approval', 'active') then
    raise exception 'Only verified pending accounts can be approved';
  end if;
  if not account_record.email_verified then
    raise exception 'Email verification is required before approval';
  end if;

  -- Serialize approvals that carry the same durable company identity. This
  -- prevents two contacts with the same GSTIN/mobile from creating duplicate
  -- company masters when approved concurrently.
  company_lock_key := lower(coalesce(nullif(account_record.gstin, ''), nullif(account_record.mobile, ''), account_record.email));
  perform pg_advisory_xact_lock(hashtext(company_lock_key));

  -- Retain the membership already resolved for an active contact.
  select customer_id into resolved_customer_id
  from public.customer_accounts
  where id = account_record.id;

  if resolved_customer_id is null then
    select id into resolved_customer_id
    from public.customers
    where (account_record.gstin is not null and lower(coalesce(gstin, '')) = lower(account_record.gstin))
       or (account_record.email <> '' and lower(coalesce(email, '')) = lower(account_record.email))
       or (account_record.mobile <> '' and phone = account_record.mobile)
    order by created_at asc
    limit 1
    for update;
  end if;

  resolved_type := case account_record.customer_type
    when 'contractor' then 'hvac_contractor'
    when 'consultant' then 'consultant'
    when 'dealer' then 'dealer'
    when 'end_user' then 'end_user'
    else 'other'
  end;

  if resolved_customer_id is null then
    insert into public.customers (
      account_id, full_name, company, phone, email, gstin, customer_type, status
    ) values (
      account_record.id, account_record.full_name, nullif(account_record.company_name, ''),
      nullif(account_record.mobile, ''), nullif(account_record.email, ''),
      nullif(account_record.gstin, ''), resolved_type, 'active'
    ) returning id into resolved_customer_id;
  else
    -- Do not overwrite customers.account_id: it is the historical primary
    -- contact and may already belong to another approved company user.
    update public.customers
    set account_id = coalesce(account_id, account_record.id), status = 'active'
    where id = resolved_customer_id;
  end if;

  update public.customer_accounts
  set approval_status = 'active', customer_id = resolved_customer_id,
      approved_at = now(), approved_by = p_admin_id,
      rejected_at = null, rejected_reason = null
  where id = account_record.id;

  update public.enquiries
  set account_id = account_record.id, customer_id = resolved_customer_id
  where account_id = account_record.id;

  return resolved_customer_id;
end;
$$;

revoke execute on function public.approve_customer_account(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_customer_account(uuid, uuid) to service_role;
