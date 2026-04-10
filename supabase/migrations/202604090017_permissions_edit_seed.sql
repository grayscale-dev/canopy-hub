insert into public.permissions (name, page, code)
values ('Edit Permissions', 'Settings', 'permissions.edit')
on conflict (code) do update
set
  name = excluded.name,
  page = excluded.page;
