insert into public.permissions (name, page, code)
values ('Access Settings', 'Settings', 'settings.access')
on conflict (code) do update
set
  name = excluded.name,
  page = excluded.page;
