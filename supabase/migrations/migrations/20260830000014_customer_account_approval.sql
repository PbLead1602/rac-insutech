-- Customer registration and approval lifecycle.
-- Public visitors can create enquiries; only an active approved account can
-- create a website quotation. Existing historic Admin quotations are retained.

create sequence if not exists public.enquiry_number_seq start 1000;

alter table public.enquiries
  add column if not exists enquiry_number text;

update public.enquiries
set enquiry_number = 'ENQ-' || to_char(created_at at time zone 'UTC', 'YYYYMMDD') || '-' || lpad(nextval('public.enquiry_number_seq')::text, 4, '0')
where enquiry_number is null;

alter table public.enquiries
  alter column enquiry_number set default ('ENQ-' || to_char(current_date, 'YYYYMMDD') || '-' || lpad(nextval('public.enquiry_number_seq')::text, 4, '0')),
  alter column enquiry_number set not null;

create unique index if not exists enquiries_enquiry_number_idx on public.enquiries(enquiry_number);

create table if not exists public.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  mobile text not null default '',
  full_name text not null default '',
  company_name text,
  gstin text,
  customer_type text not null default 'end_user' check (customer_type in ('end_user', 'contractor', 'consultant', 'dealer', 'other')),
  approval_status text not null default 'pending_email_verification' check (approval_status in ('pending_email_verification', 'pending_admin_approval', 'active', 'rejected', 'suspended', 'archived')),
  email_verified boolean not null default false,
  customer_id uuid unique references public.customers(id) on delete set null,
  pending_enquiry_id uuid references public.enquiries(id) on delete set null,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  rejected_at timestamptz,
  rejected_reason text,
  suspended_at timestamptz,
  suspended_reason text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customer_accounts_email_idx on public.customer_accounts(lower(email));
create index if not exists customer_accounts_mobile_idx on public.customer_accounts(mobile);
create index if not exists customer_accounts_status_idx on public.customer_accounts(approval_status, created_at desc);

alter table public.customers add column if not exists account_id uuid unique references public.customer_accounts(id) on delete set null;
alter table public.enquiries add column if not exists account_id uuid references public.customer_accounts(id) on delete set null;
alter table public.quotations add column if not exists account_id uuid references public.customer_accounts(id) on delete set null;
create index if not exists enquiries_account_idx on public.enquiries(account_id, created_at desc);
create index if not exists quotations_account_idx on public.quotations(account_id, created_at desc);

create table if not exists public.enquiry_continuations (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  token_hash text not null unique,
  account_id uuid references public.customer_accounts(id) on delete set null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists enquiry_continuations_enquiry_idx on public.enquiry_continuations(enquiry_id, expires_at desc);

-- Customer sign-ups create a non-privileged pending account. User metadata is
-- not trusted for authorisation; it can only create a pending record.
create or replace function public.create_customer_account_on_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_user_meta_data->>'account_type', '') = 'customer' then
    insert into public.customer_accounts (
      auth_user_id, email, mobile, full_name, company_name, gstin, customer_type,
      approval_status, email_verified
    ) values (
      new.id,
      coalesce(new.email, ''),
      coalesce(new.raw_user_meta_data->>'mobile', ''),
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'company_name', ''),
      nullif(new.raw_user_meta_data->>'gstin', ''),
      case when coalesce(new.raw_user_meta_data->>'customer_type', '') in ('end_user', 'contractor', 'consultant', 'dealer', 'other') then new.raw_user_meta_data->>'customer_type' else 'end_user' end,
      case when new.email_confirmed_at is null then 'pending_email_verification' else 'pending_admin_approval' end,
      new.email_confirmed_at is not null
    ) on conflict (auth_user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_customer_auth_user_created on auth.users;
create trigger on_customer_auth_user_created
  after insert on auth.users for each row execute procedure public.create_customer_account_on_auth_user();

create or replace function public.set_customer_account_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists customer_accounts_updated_at on public.customer_accounts;
create trigger customer_accounts_updated_at before update on public.customer_accounts for each row execute procedure public.set_customer_account_updated_at();

-- Approval is atomic: either the active Customer exists and all linked
-- enquiries are connected, or no approval is committed.
create or replace function public.approve_customer_account(p_account_id uuid, p_admin_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  account_record public.customer_accounts%rowtype;
  resolved_customer_id uuid;
  resolved_type text;
begin
  select * into account_record from public.customer_accounts where id = p_account_id for update;
  if not found then raise exception 'Customer account was not found'; end if;
  if account_record.approval_status not in ('pending_admin_approval', 'active') then raise exception 'Only verified pending accounts can be approved'; end if;
  if not account_record.email_verified then raise exception 'Email verification is required before approval'; end if;

  select id into resolved_customer_id from public.customers where account_id = account_record.id limit 1;
  if resolved_customer_id is null then
    select id into resolved_customer_id from public.customers
    where (account_record.gstin is not null and lower(coalesce(gstin, '')) = lower(account_record.gstin))
       or (account_record.email <> '' and lower(coalesce(email, '')) = lower(account_record.email))
       or (account_record.mobile <> '' and phone = account_record.mobile)
    order by created_at asc limit 1;
  end if;
  resolved_type := case account_record.customer_type when 'contractor' then 'hvac_contractor' when 'consultant' then 'consultant' when 'dealer' then 'dealer' when 'end_user' then 'end_user' else 'other' end;
  if resolved_customer_id is null then
    insert into public.customers (account_id, full_name, company, phone, email, gstin, customer_type, status)
    values (account_record.id, account_record.full_name, nullif(account_record.company_name, ''), nullif(account_record.mobile, ''), nullif(account_record.email, ''), nullif(account_record.gstin, ''), resolved_type, 'active')
    returning id into resolved_customer_id;
  else
    update public.customers set account_id = account_record.id, status = 'active' where id = resolved_customer_id;
  end if;
  update public.customer_accounts set approval_status = 'active', customer_id = resolved_customer_id, approved_at = now(), approved_by = p_admin_id, rejected_at = null, rejected_reason = null where id = account_record.id;
  update public.enquiries set account_id = account_record.id, customer_id = resolved_customer_id where account_id = account_record.id;
  return resolved_customer_id;
end;
$$;

alter table public.customer_accounts enable row level security;
alter table public.enquiry_continuations enable row level security;
create policy "customer account reads own record" on public.customer_accounts for select using (auth_user_id = auth.uid() or public.is_rac_admin());
create policy "admin manages customer accounts" on public.customer_accounts for all using (public.is_rac_admin()) with check (public.is_rac_admin());
create policy "admin manages enquiry continuations" on public.enquiry_continuations for all using (public.is_rac_admin()) with check (public.is_rac_admin());
