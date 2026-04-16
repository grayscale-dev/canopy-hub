insert into public.permissions (name, page, code)
values ('Upload Newsletters', 'Newsletters', 'newsletters.upload')
on conflict (code) do update
set
  name = excluded.name,
  page = excluded.page;
