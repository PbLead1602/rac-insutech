-- Supplier rate-list import audit. Source workbooks are analysed first and
-- never change commercial data until the sole RAC Admin confirms selected rows.
create table if not exists public.rate_imports (
  id uuid primary key default gen_random_uuid(),
  source_file_name text not null,
  source_file_size bigint,
  file_hash text not null,
  profile text not null,
  detected_sheets jsonb not null default '[]'::jsonb,
  analysed_at timestamptz not null,
  confirmed_at timestamptz,
  status text not null check (status in ('reviewed', 'confirmed', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.rate_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.rate_imports(id) on delete restrict,
  source_row integer not null,
  source_data jsonb not null default '{}'::jsonb,
  mapping jsonb not null default '{}'::jsonb,
  action text not null,
  confidence text not null check (confidence in ('high', 'review')),
  validation_issues jsonb not null default '[]'::jsonb,
  previous_rate numeric(14, 5),
  imported_rate numeric(14, 5),
  applied_rate_card_id uuid references public.quotation_rate_cards(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists rate_imports_created_idx on public.rate_imports(created_at desc);
create index if not exists rate_import_rows_import_idx on public.rate_import_rows(import_id, source_row);

alter table public.rate_imports enable row level security;
alter table public.rate_import_rows enable row level security;
create policy "admin manages rate imports" on public.rate_imports for all using (public.is_rac_admin()) with check (public.is_rac_admin());
create policy "admin manages rate import rows" on public.rate_import_rows for all using (public.is_rac_admin()) with check (public.is_rac_admin());
