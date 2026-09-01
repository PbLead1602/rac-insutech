-- A transient browser request may be retried after a network interruption.
-- Keep one business enquiry for that intent, even if the browser submits again.
alter table public.enquiries
  add column if not exists public_submission_id uuid;

create unique index if not exists enquiries_public_submission_id_idx
  on public.enquiries(public_submission_id)
  where public_submission_id is not null;
