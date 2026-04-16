insert into public.permissions (name, page, code)
values ('Manage Policies', 'Policies', 'policies.manage')
on conflict (code) do update
set
  name = excluded.name,
  page = excluded.page;
