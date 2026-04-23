-- Domain restriction is now enforced by Google Workspace auth; remove legacy DB guard.
do $$
declare
  trigger_name text;
begin
  for trigger_name in
    select t.tgname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid
    where not t.tgisinternal
      and n.nspname = 'auth'
      and c.relname = 'users'
      and p.proname = 'enforce_allowed_email_domain'
  loop
    execute format('drop trigger if exists %I on auth.users', trigger_name);
  end loop;
end $$;

drop function if exists public.enforce_allowed_email_domain();
drop function if exists auth.enforce_allowed_email_domain();
