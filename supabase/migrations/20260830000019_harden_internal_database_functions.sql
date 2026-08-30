-- Internal database functions must never be callable through the public REST
-- RPC surface. The Worker uses the Supabase service-role key for the two
-- server-side workflows that require elevated execution.

alter function public.set_updated_at() set search_path = '';
alter function public.set_customer_account_updated_at() set search_path = '';

revoke execute on function public.approve_customer_account(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_customer_account(uuid, uuid) to service_role;

revoke execute on function public.next_rac_quote_number() from public, anon, authenticated;
grant execute on function public.next_rac_quote_number() to service_role;

-- These are Auth triggers, not RPC endpoints. Trigger execution continues to
-- work, while direct calls from anonymous or signed-in browser sessions stop.
revoke execute on function public.create_profile_for_new_user() from public, anon, authenticated;
revoke execute on function public.create_customer_account_on_auth_user() from public, anon, authenticated;
