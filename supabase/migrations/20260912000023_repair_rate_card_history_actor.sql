-- Legacy production instances can already have quotation_rate_card_history
-- without the actor column. Keep historical rate audits intact and restore
-- the optional Admin attribution used by controlled supplier imports.

alter table public.quotation_rate_card_history
  add column if not exists changed_by uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.quotation_rate_card_history'::regclass
      and contype = 'f'
      and pg_get_constraintdef(oid) like 'FOREIGN KEY (changed_by)%'
  ) then
    alter table public.quotation_rate_card_history
      add constraint quotation_rate_card_history_changed_by_fkey
      foreign key (changed_by) references public.profiles(id) on delete set null;
  end if;
end;
$$;
