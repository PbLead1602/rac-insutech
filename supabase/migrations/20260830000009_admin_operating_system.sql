-- RAC Admin operating-system foundation.
-- This migration extends the existing public catalogue and quotation tables;
-- it deliberately does not reset or duplicate historical commercial records.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  company text,
  phone text,
  email text,
  gstin text,
  billing_address text,
  shipping_address text,
  city text,
  state text,
  pin_code text,
  customer_type text not null default 'other' check (customer_type in ('hvac_contractor', 'consultant', 'peb_contractor', 'architect', 'dealer', 'end_user', 'industrial_customer', 'other')),
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_email_lookup_idx on public.customers (lower(email));
create index if not exists customers_phone_lookup_idx on public.customers (phone);
create index if not exists customers_company_lookup_idx on public.customers (lower(company));
create index if not exists customers_gstin_lookup_idx on public.customers (gstin);

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  note text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists application_id uuid references public.applications(id) on delete set null,
  add column if not exists requirement text,
  add column if not exists internal_notes text,
  add column if not exists project_status text not null default 'active' check (project_status in ('active', 'on_hold', 'completed', 'archived')),
  add column if not exists start_date date,
  add column if not exists expected_delivery_date date,
  add column if not exists public_case_study boolean not null default false;
create index if not exists projects_customer_idx on public.projects(customer_id, created_at desc);

alter table public.enquiries
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists follow_up_at timestamptz,
  add column if not exists follow_up_note text,
  add column if not exists last_activity_at timestamptz not null default now(),
  add column if not exists lost_reason text;
create index if not exists enquiries_follow_up_idx on public.enquiries(follow_up_at) where follow_up_at is not null;
create index if not exists enquiries_customer_idx on public.enquiries(customer_id, created_at desc);

create table if not exists public.enquiry_notes (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  note text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.products
  add column if not exists short_name text,
  add column if not exists product_type text,
  add column if not exists quotation_enabled boolean not null default false,
  add column if not exists featured boolean not null default false,
  add column if not exists active boolean not null default true,
  add column if not exists archived_at timestamptz;
create index if not exists products_quotation_enabled_idx on public.products(quotation_enabled) where active;

alter table public.product_variants
  add column if not exists material_class text,
  add column if not exists lamination text,
  add column if not exists width_m numeric(12, 3),
  add column if not exists length_m numeric(12, 3),
  add column if not exists roll_area_m2 numeric(12, 3),
  add column if not exists tube_length_mm numeric(12, 2),
  add column if not exists tubes_per_carton integer,
  add column if not exists pack_running_metres numeric(12, 3),
  add column if not exists active boolean not null default true,
  add column if not exists archived_at timestamptz;

create table if not exists public.laminations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quotation_rate_cards
  add column if not exists product_variant_id uuid references public.product_variants(id) on delete set null,
  add column if not exists packing_label text,
  add column if not exists moq numeric(14, 3),
  add column if not exists gst_rate numeric(5, 2) not null default 18 check (gst_rate between 0 and 100),
  add column if not exists reason text,
  add column if not exists published_at timestamptz,
  add column if not exists archived_at timestamptz;
create index if not exists quotation_rate_cards_variant_idx on public.quotation_rate_cards(product_variant_id, active, valid_from desc);

create table if not exists public.quotation_rate_card_history (
  id uuid primary key default gen_random_uuid(),
  rate_card_id uuid not null references public.quotation_rate_cards(id) on delete restrict,
  old_rate numeric(14, 5),
  new_rate numeric(14, 5) not null,
  valid_from date,
  valid_to date,
  reason text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

alter table public.quotations
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists source text not null default 'website_auto_quote' check (source in ('website_auto_quote', 'admin_created', 'enquiry_converted')),
  add column if not exists revision_number integer not null default 0 check (revision_number >= 0),
  add column if not exists parent_quotation_id uuid references public.quotations(id) on delete restrict,
  add column if not exists valid_until date,
  add column if not exists follow_up_at timestamptz,
  add column if not exists follow_up_note text,
  add column if not exists internal_notes text,
  add column if not exists lost_reason text,
  add column if not exists last_sent_at timestamptz,
  add column if not exists last_viewed_at timestamptz;
alter table public.quotations drop constraint if exists quotations_status_check;
alter table public.quotations add constraint quotations_status_check check (status in ('draft', 'generated', 'sent', 'viewed', 'follow_up', 'revision_requested', 'revised', 'accepted', 'po_received', 'won', 'lost', 'expired', 'cancelled'));
create index if not exists quotations_customer_idx on public.quotations(customer_id, created_at desc);
create index if not exists quotations_project_idx on public.quotations(project_id, created_at desc);
create index if not exists quotations_follow_up_idx on public.quotations(follow_up_at) where follow_up_at is not null;
create index if not exists quotations_valid_until_idx on public.quotations(valid_until) where valid_until is not null;

alter table public.quotation_items
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists product_variant_uuid uuid references public.product_variants(id) on delete set null,
  add column if not exists standard_rate numeric(14, 5),
  add column if not exists quoted_rate numeric(14, 5),
  add column if not exists override_reason text,
  add column if not exists tax_rate numeric(5, 2),
  add column if not exists snapshot jsonb not null default '{}'::jsonb;

create table if not exists public.quotation_notes (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  note text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.quotation_events (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  event_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists quotation_events_quote_idx on public.quotation_events(quotation_id, created_at desc);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  document_type public.document_type not null default 'other',
  brand_id uuid references public.brands(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  material_family text,
  version text,
  document_date date,
  file_url text not null,
  visibility text not null default 'internal' check (visibility in ('public', 'internal')),
  status text not null default 'current' check (status in ('current', 'archived')),
  replaced_by_id uuid references public.documents(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists documents_product_idx on public.documents(product_id, status, created_at desc);

alter table public.product_documents
  add column if not exists version text,
  add column if not exists document_date date,
  add column if not exists visibility text not null default 'public' check (visibility in ('public', 'internal')),
  add column if not exists status text not null default 'current' check (status in ('current', 'archived')),
  add column if not exists replaced_by_id uuid references public.product_documents(id) on delete set null;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint,
  width integer,
  height integer,
  alt_text text,
  visibility text not null default 'internal' check (visibility in ('public', 'internal')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  content_key text not null unique,
  title text,
  body jsonb not null default '{}'::jsonb,
  status public.content_status not null default 'draft',
  seo_title text,
  seo_description text,
  published_at timestamptz,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  before_state jsonb,
  after_state jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_created_idx on public.activity_log(created_at desc);
create index if not exists activity_log_entity_idx on public.activity_log(entity_type, entity_id, created_at desc);

create trigger customers_updated_at before update on public.customers for each row execute procedure public.set_updated_at();
create trigger laminations_updated_at before update on public.laminations for each row execute procedure public.set_updated_at();
create trigger documents_updated_at before update on public.documents for each row execute procedure public.set_updated_at();
create trigger site_content_updated_at before update on public.site_content for each row execute procedure public.set_updated_at();

alter table public.customers enable row level security;
alter table public.customer_notes enable row level security;
alter table public.enquiry_notes enable row level security;
alter table public.laminations enable row level security;
alter table public.quotation_rate_card_history enable row level security;
alter table public.quotation_notes enable row level security;
alter table public.quotation_events enable row level security;
alter table public.documents enable row level security;
alter table public.media_assets enable row level security;
alter table public.site_content enable row level security;
alter table public.activity_log enable row level security;

create policy "admin manages customers" on public.customers for all using (public.is_rac_admin()) with check (public.is_rac_admin());
create policy "admin manages customer notes" on public.customer_notes for all using (public.is_rac_admin()) with check (public.is_rac_admin());
create policy "admin manages enquiry notes" on public.enquiry_notes for all using (public.is_rac_admin()) with check (public.is_rac_admin());
create policy "admin manages laminations" on public.laminations for all using (public.is_rac_admin()) with check (public.is_rac_admin());
create policy "admin manages rate history" on public.quotation_rate_card_history for all using (public.is_rac_admin()) with check (public.is_rac_admin());
create policy "admin manages quotation notes" on public.quotation_notes for all using (public.is_rac_admin()) with check (public.is_rac_admin());
create policy "admin manages quotation events" on public.quotation_events for all using (public.is_rac_admin()) with check (public.is_rac_admin());
create policy "admin manages documents" on public.documents for all using (public.is_rac_admin()) with check (public.is_rac_admin());
create policy "admin manages media" on public.media_assets for all using (public.is_rac_admin()) with check (public.is_rac_admin());
create policy "public reads published site content" on public.site_content for select using (status = 'published' or public.is_rac_admin());
create policy "admin manages site content" on public.site_content for all using (public.is_rac_admin()) with check (public.is_rac_admin());
create policy "admin reads activity log" on public.activity_log for select using (public.is_rac_admin());
create policy "admin inserts activity log" on public.activity_log for insert with check (public.is_rac_admin());
