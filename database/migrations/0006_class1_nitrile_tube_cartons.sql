-- Permit carton-priced Class 1 Nitrile Rubber Tube configurations.

alter table public.quotation_rate_cards
  drop constraint if exists quotation_rate_cards_order_unit_check;

alter table public.quotation_rate_cards
  add constraint quotation_rate_cards_order_unit_check
  check (order_unit in ('roll', 'square_metre', 'box', 'running_metre', 'carton'));
