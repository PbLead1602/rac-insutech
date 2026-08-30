-- Align existing quotation-rate-card installations with roll ordering and
-- square-metre sheet pricing.
-- Safe to run after 0002 in environments created before this rate-card revision.

update public.quotation_rate_cards
set order_unit = 'roll'
where order_unit = 'square_metre'
  and product_slug in ('xlpe-sheet', 'nitrile-rubber-sheet');

alter table public.quotation_rate_cards
  drop constraint if exists quotation_rate_cards_order_unit_check;

alter table public.quotation_rate_cards
  add constraint quotation_rate_cards_order_unit_check
  check (order_unit in ('roll', 'square_metre', 'box', 'running_metre', 'carton'));

alter table public.quotation_rate_cards
  alter column rate type numeric(14, 5);
