-- Additive storage for sheet-built, custom-diameter Nitrile Rubber insulation.
-- Existing standard Tube and Sheet quotation history remains unchanged.

alter table public.quotation_items
  add column if not exists item_type text not null default 'STANDARD';

alter table public.quotation_items
  drop constraint if exists quotation_items_item_type_check;

alter table public.quotation_items
  add constraint quotation_items_item_type_check
  check (item_type in ('STANDARD', 'CUSTOM_BUILT_UP_NBR'));

create index if not exists quotation_items_item_type_idx
  on public.quotation_items (item_type)
  where item_type = 'CUSTOM_BUILT_UP_NBR';

create table if not exists public.quotation_item_layers (
  id uuid primary key default gen_random_uuid(),
  quotation_item_id uuid not null references public.quotation_items(id) on delete cascade,
  layer_number integer not null check (layer_number between 1 and 5),
  sheet_variant_id text not null,
  sheet_product_name text not null,
  material_class text not null,
  thickness_mm numeric(12, 4) not null check (thickness_mm > 0),
  lamination text not null,
  inner_diameter_mm numeric(14, 6) not null check (inner_diameter_mm > 0),
  mean_diameter_mm numeric(14, 6) not null check (mean_diameter_mm > 0),
  outer_diameter_mm numeric(14, 6) not null check (outer_diameter_mm > 0),
  circumference_m numeric(16, 8) not null check (circumference_m > 0),
  net_area_m2 numeric(16, 8) not null check (net_area_m2 > 0),
  wastage_percent numeric(7, 4) not null check (wastage_percent between 0 and 50),
  quoted_area_m2 numeric(16, 8) not null check (quoted_area_m2 > 0),
  unit_rate_snapshot numeric(16, 5) not null check (unit_rate_snapshot >= 0),
  amount_snapshot numeric(16, 2) not null check (amount_snapshot >= 0),
  created_at timestamptz not null default now(),
  unique (quotation_item_id, layer_number)
);

create index if not exists quotation_item_layers_item_idx
  on public.quotation_item_layers (quotation_item_id, layer_number);

alter table public.quotation_item_layers enable row level security;
drop policy if exists "admin manages quotation item layers" on public.quotation_item_layers;
create policy "admin manages quotation item layers" on public.quotation_item_layers
  for all using (private.is_rac_admin()) with check (private.is_rac_admin());

-- The default is centrally governed through quotation settings. It is seeded
-- only where the setting does not yet exist, and existing Admin values win.
insert into public.site_settings (key, value)
values ('quotation_terms', jsonb_build_object('builtUpNbrWastagePercent', 5))
on conflict (key) do update
set value = public.site_settings.value || jsonb_build_object(
  'builtUpNbrWastagePercent',
  coalesce((public.site_settings.value ->> 'builtUpNbrWastagePercent')::numeric, 5)
);
