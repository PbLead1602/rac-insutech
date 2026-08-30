-- Phase 1 quotation generator. Product/rate data is intentionally separate
-- from the public catalogue so approved commercial data can be governed.

create table public.quotation_rate_cards (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  material_class text not null,
  thickness text not null,
  size_label text not null,
  lamination text not null,
  order_unit text not null check (order_unit in ('roll', 'square_metre', 'box', 'running_metre', 'carton')),
  rate numeric(14, 5) not null check (rate >= 0),
  rate_unit text not null,
  roll_area_m2 numeric(12, 3),
  pack_running_metres numeric(12, 3),
  active boolean not null default true,
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_slug, material_class, thickness, size_label, lamination)
);

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,
  access_token text not null unique,
  customer jsonb not null,
  subtotal numeric(14, 2) not null,
  gst_rate numeric(5, 2) not null,
  gst_amount numeric(14, 2) not null,
  total numeric(14, 2) not null,
  transport text not null default 'At Actual',
  payment_terms text not null,
  validity_days integer not null default 7,
  status text not null default 'generated' check (status in ('generated', 'sent', 'viewed', 'accepted', 'expired')),
  is_provisional boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  variant_id text not null,
  product_name text not null,
  configuration text not null,
  requested_quantity numeric(14, 3) not null,
  requested_unit text not null,
  supplied_quantity numeric(14, 3) not null,
  supplied_unit text not null,
  cartons integer,
  technical_quantity text not null,
  rate numeric(14, 2) not null,
  rate_unit text not null,
  amount numeric(14, 2) not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index quotations_created_at_idx on public.quotations(created_at desc);
create index quotation_items_quotation_id_idx on public.quotation_items(quotation_id, sort_order);
create index quotation_rate_cards_lookup_idx on public.quotation_rate_cards(product_slug, active, valid_from, valid_to);

create or replace function public.next_rac_quote_number()
returns text language plpgsql security definer set search_path = public as $$
declare
  quote_prefix text := 'RAC-Q-' || to_char(current_date, 'YYYYMMDD');
  next_number integer;
begin
  perform pg_advisory_xact_lock(hashtext(quote_prefix));
  select coalesce(max(nullif(regexp_replace(quote_number, '^.*-', ''), '')::integer), 0) + 1
    into next_number
    from public.quotations
    where quote_number like quote_prefix || '-%';
  return quote_prefix || '-' || lpad(next_number::text, 4, '0');
end;
$$;

create trigger quotation_rate_cards_updated_at before update on public.quotation_rate_cards for each row execute procedure public.set_updated_at();
create trigger quotations_updated_at before update on public.quotations for each row execute procedure public.set_updated_at();

alter table public.quotation_rate_cards enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;

create policy "rac team manages quotation rate cards" on public.quotation_rate_cards for all using (public.is_content_admin()) with check (public.is_content_admin());
create policy "rac team reads quotations" on public.quotations for select using (public.is_rac_admin());
create policy "rac team updates quotations" on public.quotations for update using (public.is_rac_admin()) with check (public.is_rac_admin());
create policy "rac team reads quotation items" on public.quotation_items for select using (public.is_rac_admin());

comment on table public.quotation_rate_cards is 'Import current RAC-approved commercial rate cards before production.';
