-- Adds commercial order units required by the supplied XLPE tube,
-- insulation tape and insulation adhesive rate lists.

alter table public.quotation_rate_cards
  drop constraint if exists quotation_rate_cards_order_unit_check;

alter table public.quotation_rate_cards
  add constraint quotation_rate_cards_order_unit_check
  check (order_unit in ('roll', 'square_metre', 'box', 'running_metre', 'carton', 'unit', 'drum'));
