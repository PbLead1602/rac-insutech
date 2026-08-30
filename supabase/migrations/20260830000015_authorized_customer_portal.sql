-- Authorized Customer Portal: customer-scoped reads and customer revision requests.
-- The portal uses the existing shared sales tables; this adds no duplicate records.

alter table public.documents drop constraint if exists documents_visibility_check;
alter table public.documents add constraint documents_visibility_check check (visibility in ('public', 'customer', 'internal'));

create table if not exists public.customer_revision_requests (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  account_id uuid not null references public.customer_accounts(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  reason text not null,
  required_change text,
  quantity_change text,
  product_change text,
  delivery_change text,
  additional_notes text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'closed')),
  created_at timestamptz not null default now()
);
create index if not exists customer_revision_requests_owner_idx on public.customer_revision_requests(account_id, created_at desc);
create index if not exists customer_revision_requests_quote_idx on public.customer_revision_requests(quotation_id, created_at desc);

alter table public.customer_revision_requests enable row level security;

-- Ownership is always derived through customer_accounts.auth_user_id. Admin policy
-- remains separate so no customer browser ever receives internal rate data or notes.
create policy "customer reads own enquiries" on public.enquiries for select using (
  account_id in (select id from public.customer_accounts where auth_user_id = auth.uid()) or public.is_rac_admin()
);
create policy "customer reads own quotations" on public.quotations for select using (
  account_id in (select id from public.customer_accounts where auth_user_id = auth.uid()) or public.is_rac_admin()
);
create policy "customer reads own projects" on public.projects for select using (
  customer_id in (select customer_id from public.customer_accounts where auth_user_id = auth.uid() and approval_status in ('active', 'suspended')) or public.is_rac_admin()
);
create policy "customer reads permitted documents" on public.documents for select using (
  (visibility in ('public', 'customer') and status = 'current') or public.is_rac_admin()
);
create policy "customer reads own revision requests" on public.customer_revision_requests for select using (
  account_id in (select id from public.customer_accounts where auth_user_id = auth.uid()) or public.is_rac_admin()
);
create policy "customer creates own revision requests" on public.customer_revision_requests for insert with check (
  account_id in (select id from public.customer_accounts where auth_user_id = auth.uid() and approval_status = 'active')
  and customer_id in (select customer_id from public.customer_accounts where auth_user_id = auth.uid() and approval_status = 'active')
);
create policy "admin manages customer revision requests" on public.customer_revision_requests for all using (public.is_rac_admin()) with check (public.is_rac_admin());
