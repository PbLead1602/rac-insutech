-- A contact login can be removed without erasing the company's commercial
-- history. Keep the request record but clear the now-deleted contact link.
alter table public.customer_revision_requests
  alter column account_id drop not null;

alter table public.customer_revision_requests
  drop constraint if exists customer_revision_requests_account_id_fkey;

alter table public.customer_revision_requests
  add constraint customer_revision_requests_account_id_fkey
  foreign key (account_id) references public.customer_accounts(id) on delete set null;
