-- Apply approved controlled-import updates in one database transaction. This
-- replaces one REST update plus one REST audit insert for every selected row.

create or replace function public.apply_rate_import_updates(p_changes jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  change_row record;
  updated_card public.quotation_rate_cards%rowtype;
begin
  if pg_catalog.jsonb_typeof(p_changes) <> 'array' then
    raise exception 'Rate import changes must be an array.' using errcode = '22023';
  end if;

  for change_row in
    select *
    from pg_catalog.jsonb_to_recordset(p_changes) as changes(
      rate_card_id uuid,
      expected_previous_rate numeric,
      new_rate numeric,
      reactivate boolean,
      reason text,
      changed_by uuid
    )
  loop
    update public.quotation_rate_cards
    set
      rate = change_row.new_rate,
      active = case when change_row.reactivate then true else active end,
      reason = change_row.reason,
      published_at = case when change_row.reactivate then pg_catalog.now() else published_at end
    where id = change_row.rate_card_id
      and rate = change_row.expected_previous_rate
    returning * into updated_card;

    if not found then
      raise exception 'A selected Rate Card changed after analysis. Re-analyse the workbook before confirming.' using errcode = 'P0001';
    end if;

    insert into public.quotation_rate_card_history (
      rate_card_id, old_rate, new_rate, valid_from, valid_to, reason, changed_by
    ) values (
      updated_card.id, change_row.expected_previous_rate, change_row.new_rate,
      updated_card.valid_from, updated_card.valid_to, change_row.reason, change_row.changed_by
    );
  end loop;
end;
$$;

create or replace function public.finalise_rate_import(
  p_import_id uuid,
  p_confirmed_at timestamptz,
  p_rows jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_rows integer;
  updated_rows integer;
begin
  if pg_catalog.jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Rate import audit rows must be an array.' using errcode = '22023';
  end if;

  select pg_catalog.jsonb_array_length(p_rows) into expected_rows;

  with audit_updates as (
    select *
    from pg_catalog.jsonb_to_recordset(p_rows) as rows(
      id uuid,
      action text,
      applied_rate_card_id uuid
    )
  )
  update public.rate_import_rows as import_rows
  set action = audit_updates.action,
      applied_rate_card_id = audit_updates.applied_rate_card_id
  from audit_updates
  where import_rows.id = audit_updates.id
    and import_rows.import_id = p_import_id;

  get diagnostics updated_rows = row_count;
  if updated_rows <> expected_rows then
    raise exception 'The controlled-import review changed before it could be finalised.' using errcode = 'P0001';
  end if;

  update public.rate_imports
  set confirmed_at = p_confirmed_at,
      status = 'confirmed'
  where id = p_import_id
    and status = 'reviewed';

  if not found then
    raise exception 'The controlled-import review is no longer available.' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.apply_rate_import_updates(jsonb) from public, anon, authenticated;
grant execute on function public.apply_rate_import_updates(jsonb) to service_role;

revoke execute on function public.finalise_rate_import(uuid, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.finalise_rate_import(uuid, timestamptz, jsonb) to service_role;
