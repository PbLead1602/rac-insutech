-- Add the sole application role in a separate migration so PostgreSQL can
-- commit the enum value before it is used by the access-control migration.
alter type public.user_role add value if not exists 'admin';
