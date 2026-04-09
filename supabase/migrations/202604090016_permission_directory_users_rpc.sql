create or replace function public.list_permission_directory_users()
returns table (
  user_id uuid,
  email text,
  full_name text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    u.id as user_id,
    u.email,
    coalesce(
      u.raw_user_meta_data ->> 'full_name',
      u.raw_user_meta_data ->> 'name',
      split_part(coalesce(u.email, ''), '@', 1)
    ) as full_name
  from auth.users u
  where u.deleted_at is null
  order by coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, ''), '@', 1)
  );
$$;

revoke all on function public.list_permission_directory_users() from public;
grant execute on function public.list_permission_directory_users() to authenticated;
