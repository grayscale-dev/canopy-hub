create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  page text not null,
  code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_permissions_page_name
  on public.permissions(page, name);

drop trigger if exists trg_permissions_updated_at on public.permissions;
create trigger trg_permissions_updated_at
before update on public.permissions
for each row
execute function public.set_updated_at();

create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, permission_id)
);

create index if not exists idx_user_permissions_user_id
  on public.user_permissions(user_id);

create index if not exists idx_user_permissions_permission_id
  on public.user_permissions(permission_id);

alter table public.permissions enable row level security;
alter table public.user_permissions enable row level security;

drop policy if exists permissions_select_authenticated on public.permissions;
create policy permissions_select_authenticated
  on public.permissions
  for select
  to authenticated
  using (true);

drop policy if exists permissions_insert_authenticated on public.permissions;
create policy permissions_insert_authenticated
  on public.permissions
  for insert
  to authenticated
  with check (true);

drop policy if exists permissions_update_authenticated on public.permissions;
create policy permissions_update_authenticated
  on public.permissions
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists permissions_delete_authenticated on public.permissions;
create policy permissions_delete_authenticated
  on public.permissions
  for delete
  to authenticated
  using (true);

drop policy if exists user_permissions_select_authenticated on public.user_permissions;
create policy user_permissions_select_authenticated
  on public.user_permissions
  for select
  to authenticated
  using (true);

drop policy if exists user_permissions_insert_authenticated on public.user_permissions;
create policy user_permissions_insert_authenticated
  on public.user_permissions
  for insert
  to authenticated
  with check (true);

drop policy if exists user_permissions_delete_authenticated on public.user_permissions;
create policy user_permissions_delete_authenticated
  on public.user_permissions
  for delete
  to authenticated
  using (true);

grant select, insert, update, delete on table public.permissions to authenticated;
grant select, insert, delete on table public.user_permissions to authenticated;

insert into public.permissions (name, page, code)
values ('Edit Support Page', 'Support', 'support.edit')
on conflict (code) do update
set
  name = excluded.name,
  page = excluded.page;
