create table if not exists public.support_directory_sections (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('general_help', 'rush', 'department')),
  title text not null,
  description text,
  manager_name text,
  manager_phone text,
  notes text[] not null default '{}'::text[],
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_directory_sections_kind_sort
  on public.support_directory_sections(kind, sort_order, title);

drop trigger if exists trg_support_directory_sections_updated_at on public.support_directory_sections;
create trigger trg_support_directory_sections_updated_at
before update on public.support_directory_sections
for each row
execute function public.set_updated_at();

create table if not exists public.support_directory_entries (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.support_directory_sections(id) on delete cascade,
  title text not null,
  description text,
  emails text[] not null default '{}'::text[],
  monitored_by text,
  notes text[] not null default '{}'::text[],
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_directory_entries_section_sort
  on public.support_directory_entries(section_id, sort_order, title);

drop trigger if exists trg_support_directory_entries_updated_at on public.support_directory_entries;
create trigger trg_support_directory_entries_updated_at
before update on public.support_directory_entries
for each row
execute function public.set_updated_at();

create table if not exists public.support_directory_entry_contacts (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.support_directory_entries(id) on delete cascade,
  name text not null,
  role text,
  phone text,
  email text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_directory_entry_contacts_entry_sort
  on public.support_directory_entry_contacts(entry_id, sort_order, name);

drop trigger if exists trg_support_directory_entry_contacts_updated_at on public.support_directory_entry_contacts;
create trigger trg_support_directory_entry_contacts_updated_at
before update on public.support_directory_entry_contacts
for each row
execute function public.set_updated_at();

alter table public.support_directory_sections enable row level security;
alter table public.support_directory_entries enable row level security;
alter table public.support_directory_entry_contacts enable row level security;

drop policy if exists support_directory_sections_select_authenticated on public.support_directory_sections;
create policy support_directory_sections_select_authenticated
  on public.support_directory_sections
  for select
  to authenticated
  using (true);

drop policy if exists support_directory_sections_insert_authenticated on public.support_directory_sections;
create policy support_directory_sections_insert_authenticated
  on public.support_directory_sections
  for insert
  to authenticated
  with check (true);

drop policy if exists support_directory_sections_update_authenticated on public.support_directory_sections;
create policy support_directory_sections_update_authenticated
  on public.support_directory_sections
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists support_directory_sections_delete_authenticated on public.support_directory_sections;
create policy support_directory_sections_delete_authenticated
  on public.support_directory_sections
  for delete
  to authenticated
  using (true);

drop policy if exists support_directory_entries_select_authenticated on public.support_directory_entries;
create policy support_directory_entries_select_authenticated
  on public.support_directory_entries
  for select
  to authenticated
  using (true);

drop policy if exists support_directory_entries_insert_authenticated on public.support_directory_entries;
create policy support_directory_entries_insert_authenticated
  on public.support_directory_entries
  for insert
  to authenticated
  with check (true);

drop policy if exists support_directory_entries_update_authenticated on public.support_directory_entries;
create policy support_directory_entries_update_authenticated
  on public.support_directory_entries
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists support_directory_entries_delete_authenticated on public.support_directory_entries;
create policy support_directory_entries_delete_authenticated
  on public.support_directory_entries
  for delete
  to authenticated
  using (true);

drop policy if exists support_directory_entry_contacts_select_authenticated on public.support_directory_entry_contacts;
create policy support_directory_entry_contacts_select_authenticated
  on public.support_directory_entry_contacts
  for select
  to authenticated
  using (true);

drop policy if exists support_directory_entry_contacts_insert_authenticated on public.support_directory_entry_contacts;
create policy support_directory_entry_contacts_insert_authenticated
  on public.support_directory_entry_contacts
  for insert
  to authenticated
  with check (true);

drop policy if exists support_directory_entry_contacts_update_authenticated on public.support_directory_entry_contacts;
create policy support_directory_entry_contacts_update_authenticated
  on public.support_directory_entry_contacts
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists support_directory_entry_contacts_delete_authenticated on public.support_directory_entry_contacts;
create policy support_directory_entry_contacts_delete_authenticated
  on public.support_directory_entry_contacts
  for delete
  to authenticated
  using (true);

grant select, insert, update, delete on table public.support_directory_sections to authenticated;
grant select, insert, update, delete on table public.support_directory_entries to authenticated;
grant select, insert, update, delete on table public.support_directory_entry_contacts to authenticated;
