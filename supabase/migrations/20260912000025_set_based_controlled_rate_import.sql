-- Replace the row-by-row import loop with set-based updates and audit writes.
-- This keeps the optimistic rate check and history records while allowing a
-- large, approved supplier-rate import to complete in one database operation.

create or replace function public.apply_rate_import_updates_v2(p_changes jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_changes integer;
  matching_cards integer;
  applied_changes integer;
begin
  if pg_catalog.jsonb_typeof(p_changes) <> 'array' then
    raise exception 'Rate import changes must be an array.' using errcode = '22023';
  end if;

  select pg_catalog.jsonb_array_length(p_changes) into expected_changes;
  if expected_changes = 0 then
    return;
  end if;

  if exists (
    select changes.rate_card_id
    from pg_catalog.jsonb_to_recordset(p_changes) as changes(
      rate_card_id uuid,
      expected_previous_rate numeric,
      new_rate numeric,
      reactivate boolean,
      reason text,
      changed_by uuid
    )
    group by changes.rate_card_id
    having pg_catalog.count(*) > 1
  ) then
    raise exception 'A Rate Card may be changed only once in a controlled import.' using errcode = '22023';
  end if;

  with changes as (
    select *
    from pg_catalog.jsonb_to_recordset(p_changes) as change_values(
      rate_card_id uuid,
      expected_previous_rate numeric,
      new_rate numeric,
      reactivate boolean,
      reason text,
      changed_by uuid
    )
  ), matching as (
    select cards.id
    from changes
    join public.quotation_rate_cards as cards
      on cards.id = changes.rate_card_id
     and cards.rate = changes.expected_previous_rate
    for update of cards
  )
  select pg_catalog.count(*) into matching_cards
  from matching;

  if matching_cards <> expected_changes then
    raise exception 'A selected Rate Card changed after analysis. Re-analyse the workbook before confirming.' using errcode = 'P0001';
  end if;

  with changes as (
    select *
    from pg_catalog.jsonb_to_recordset(p_changes) as change_values(
      rate_card_id uuid,
      expected_previous_rate numeric,
      new_rate numeric,
      reactivate boolean,
      reason text,
      changed_by uuid
    )
  ),
  updated as (
    update public.quotation_rate_cards as cards
    set
      rate = changes.new_rate,
      active = case when coalesce(changes.reactivate, false) then true else cards.active end,
      reason = changes.reason,
      published_at = case when coalesce(changes.reactivate, false) then pg_catalog.now() else cards.published_at end
    from changes
    where cards.id = changes.rate_card_id
      and cards.rate = changes.expected_previous_rate
    returning
      cards.id,
      changes.expected_previous_rate as old_rate,
      cards.rate as new_rate,
      cards.valid_from,
      cards.valid_to,
      changes.reason,
      changes.changed_by
  ), history as (
    insert into public.quotation_rate_card_history (
      rate_card_id, old_rate, new_rate, valid_from, valid_to, reason, changed_by
    )
    select id, old_rate, new_rate, valid_from, valid_to, reason, changed_by
    from updated
    returning rate_card_id
  )
  select pg_catalog.count(*) into applied_changes
  from history;

  if applied_changes <> expected_changes then
    raise exception 'A selected Rate Card changed after analysis. Re-analyse the workbook before confirming.' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.apply_rate_import_updates_v2(jsonb) from public, anon, authenticated;
grant execute on function public.apply_rate_import_updates_v2(jsonb) to service_role;
