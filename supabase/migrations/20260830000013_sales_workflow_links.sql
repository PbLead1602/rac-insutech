-- Connect public enquiries, customer masters, projects and quotations.
-- Existing sales records remain valid; new columns are nullable for history.

alter table public.enquiries
  add column if not exists state text,
  add column if not exists pin_code text,
  add column if not exists project_name text,
  add column if not exists customer_type text check (customer_type in ('end_user', 'contractor', 'consultant', 'dealer', 'other')),
  add column if not exists delivery_preference text;

alter table public.quotations
  add column if not exists enquiry_id uuid references public.enquiries(id) on delete set null;

create index if not exists enquiries_project_name_idx on public.enquiries(project_name);
create index if not exists quotations_enquiry_idx on public.quotations(enquiry_id, created_at desc);
