create or replace function public.list_permission_users()
returns table (
  permission_id uuid,
  user_id uuid,
  email text,
  full_name text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    up.permission_id,
    up.user_id,
    u.email,
    coalesce(
      u.raw_user_meta_data ->> 'full_name',
      u.raw_user_meta_data ->> 'name',
      split_part(coalesce(u.email, ''), '@', 1)
    ) as full_name
  from public.user_permissions up
  join auth.users u
    on u.id = up.user_id;
$$;

revoke all on function public.list_permission_users() from public;
grant execute on function public.list_permission_users() to authenticated;
