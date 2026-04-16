insert into public.permissions (name, page, code)
values ('Upload Office Floor Plan', 'Office Floor Plan', 'office-floor-plan.upload')
on conflict (code) do update
set
  name = excluded.name,
  page = excluded.page;
