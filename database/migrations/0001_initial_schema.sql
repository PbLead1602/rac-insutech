-- RAC Insutech initial Supabase schema
-- Apply with `supabase db push` or paste into the Supabase SQL editor.
-- This migration is idempotent only at the object level expected by Supabase CLI.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('super_admin', 'content_manager', 'sales', 'technical');
create type public.content_status as enum ('draft', 'published', 'archived');
create type public.enquiry_status as enum ('new', 'contacted', 'qualified', 'quoted', 'won', 'lost', 'spam');
create type public.document_type as enum ('datasheet', 'brochure', 'test_certificate', 'installation_guide', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role public.user_role not null default 'content_manager',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  logo_url text,
  website_url text,
  authorization_note text,
  status public.content_status not null default 'draft',
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  material text,
  form_factor text,
  temperature_min_c numeric,
  temperature_max_c numeric,
  key_benefits jsonb not null default '[]'::jsonb,
  specifications jsonb not null default '{}'::jsonb,
  installation_notes text,
  seo_title text,
  seo_description text,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products(category_id);
create index products_brand_idx on public.products(brand_id);
create index products_status_idx on public.products(status);
create index products_search_idx on public.products using gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(material, '')));

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  sku text,
  thickness text,
  dimensions text,
  density text,
  specifications jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, name)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  kind text not null default 'product' check (kind in ('hero', 'product', 'installed', 'application', 'technical', 'packaging')),
  width integer,
  height integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.product_documents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null,
  document_type public.document_type not null default 'datasheet',
  file_url text not null,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  summary text,
  content text,
  hero_image_url text,
  status public.content_status not null default 'draft',
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_applications (
  product_id uuid not null references public.products(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  primary key (product_id, application_id)
);

create table public.industries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  summary text,
  content text,
  image_url text,
  status public.content_status not null default 'draft',
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_industries (
  product_id uuid not null references public.products(id) on delete cascade,
  industry_id uuid not null references public.industries(id) on delete cascade,
  primary key (product_id, industry_id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  summary text,
  content text,
  icon text,
  hero_image_url text,
  status public.content_status not null default 'draft',
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  client_name text,
  location text,
  industry_id uuid references public.industries(id) on delete set null,
  requirement text,
  solution text,
  scope text,
  featured_image_url text,
  gallery jsonb not null default '[]'::jsonb,
  status public.content_status not null default 'draft',
  completed_at date,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  cover_image_url text,
  author_id uuid references public.profiles(id) on delete set null,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(product_id, application_id, service_id) <= 1)
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  mobile text not null,
  email text,
  city text,
  project_location text,
  product_name text,
  brand_name text,
  quantity text,
  thickness text,
  application_name text,
  message text,
  source text not null default 'website',
  status public.enquiry_status not null default 'new',
  assigned_to uuid references public.profiles(id) on delete set null,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index enquiries_status_idx on public.enquiries(status, created_at desc);

create table public.enquiry_items (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text,
  brand_name text,
  quantity text,
  thickness text,
  application_name text,
  created_at timestamptz not null default now()
);

create table public.enquiry_attachments (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  file_name text not null,
  file_url text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.create_profile_for_new_user();

create or replace function public.is_rac_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('super_admin', 'content_manager', 'sales', 'technical')
  );
$$;

create or replace function public.is_content_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('super_admin', 'content_manager')
  );
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger brands_updated_at before update on public.brands for each row execute procedure public.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute procedure public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute procedure public.set_updated_at();
create trigger product_variants_updated_at before update on public.product_variants for each row execute procedure public.set_updated_at();
create trigger applications_updated_at before update on public.applications for each row execute procedure public.set_updated_at();
create trigger industries_updated_at before update on public.industries for each row execute procedure public.set_updated_at();
create trigger services_updated_at before update on public.services for each row execute procedure public.set_updated_at();
create trigger projects_updated_at before update on public.projects for each row execute procedure public.set_updated_at();
create trigger articles_updated_at before update on public.articles for each row execute procedure public.set_updated_at();
create trigger faqs_updated_at before update on public.faqs for each row execute procedure public.set_updated_at();
create trigger enquiries_updated_at before update on public.enquiries for each row execute procedure public.set_updated_at();
create trigger settings_updated_at before update on public.site_settings for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.product_documents enable row level security;
alter table public.applications enable row level security;
alter table public.product_applications enable row level security;
alter table public.industries enable row level security;
alter table public.product_industries enable row level security;
alter table public.services enable row level security;
alter table public.projects enable row level security;
alter table public.articles enable row level security;
alter table public.faqs enable row level security;
alter table public.enquiries enable row level security;
alter table public.enquiry_items enable row level security;
alter table public.enquiry_attachments enable row level security;
alter table public.site_settings enable row level security;

create policy "profiles read own profile" on public.profiles for select using (id = auth.uid() or public.is_rac_admin());
create policy "profiles admins update" on public.profiles for update using (public.is_content_admin()) with check (public.is_content_admin());

create policy "published brands public read" on public.brands for select using (status = 'published' or public.is_rac_admin());
create policy "content admins manage brands" on public.brands for all using (public.is_content_admin()) with check (public.is_content_admin());
create policy "published categories public read" on public.categories for select using (status = 'published' or public.is_rac_admin());
create policy "content admins manage categories" on public.categories for all using (public.is_content_admin()) with check (public.is_content_admin());
create policy "published products public read" on public.products for select using (status = 'published' or public.is_rac_admin());
create policy "content admins manage products" on public.products for all using (public.is_content_admin()) with check (public.is_content_admin());
create policy "product variants public read" on public.product_variants for select using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or public.is_rac_admin())));
create policy "content admins manage product variants" on public.product_variants for all using (public.is_content_admin()) with check (public.is_content_admin());
create policy "product images public read" on public.product_images for select using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or public.is_rac_admin())));
create policy "content admins manage product images" on public.product_images for all using (public.is_content_admin()) with check (public.is_content_admin());
create policy "product documents public read" on public.product_documents for select using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or public.is_rac_admin())));
create policy "content admins manage product documents" on public.product_documents for all using (public.is_content_admin()) with check (public.is_content_admin());
create policy "published applications public read" on public.applications for select using (status = 'published' or public.is_rac_admin());
create policy "content admins manage applications" on public.applications for all using (public.is_content_admin()) with check (public.is_content_admin());
create policy "product applications public read" on public.product_applications for select using (public.is_rac_admin() or exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy "content admins manage product applications" on public.product_applications for all using (public.is_content_admin()) with check (public.is_content_admin());
create policy "published industries public read" on public.industries for select using (status = 'published' or public.is_rac_admin());
create policy "content admins manage industries" on public.industries for all using (public.is_content_admin()) with check (public.is_content_admin());
create policy "product industries public read" on public.product_industries for select using (public.is_rac_admin() or exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy "content admins manage product industries" on public.product_industries for all using (public.is_content_admin()) with check (public.is_content_admin());
create policy "published services public read" on public.services for select using (status = 'published' or public.is_rac_admin());
create policy "content admins manage services" on public.services for all using (public.is_content_admin()) with check (public.is_content_admin());
create policy "published projects public read" on public.projects for select using (status = 'published' or public.is_rac_admin());
create policy "content admins manage projects" on public.projects for all using (public.is_content_admin()) with check (public.is_content_admin());
create policy "published articles public read" on public.articles for select using (status = 'published' or public.is_rac_admin());
create policy "content admins manage articles" on public.articles for all using (public.is_content_admin()) with check (public.is_content_admin());
create policy "published faqs public read" on public.faqs for select using (status = 'published' or public.is_rac_admin());
create policy "content admins manage faqs" on public.faqs for all using (public.is_content_admin()) with check (public.is_content_admin());
create policy "rac team reads enquiries" on public.enquiries for select using (public.is_rac_admin());
create policy "rac team updates enquiries" on public.enquiries for update using (public.is_rac_admin()) with check (public.is_rac_admin());
create policy "rac team reads enquiry items" on public.enquiry_items for select using (public.is_rac_admin());
create policy "rac team reads enquiry attachments" on public.enquiry_attachments for select using (public.is_rac_admin());
create policy "rac team reads settings" on public.site_settings for select using (public.is_rac_admin());
create policy "content admins manage settings" on public.site_settings for all using (public.is_content_admin()) with check (public.is_content_admin());

-- Bucket is private. Route handlers using the service key perform uploads and should
-- later replace public URLs with signed URLs if attachments must be downloaded by staff.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rfq-attachments', 'rfq-attachments', false, 10485760, array['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/acad', 'image/png', 'image/jpeg'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
