create unique index if not exists idx_support_directory_single_general_help
  on public.support_directory_sections (kind)
  where kind = 'general_help';

create unique index if not exists idx_support_directory_sections_kind_title_unique
  on public.support_directory_sections (kind, lower(title));

create unique index if not exists idx_support_directory_entries_section_title_unique
  on public.support_directory_entries (section_id, lower(title));

create unique index if not exists idx_support_directory_entry_contacts_unique
  on public.support_directory_entry_contacts (
    entry_id,
    lower(name),
    coalesce(lower(email), '')
  );

alter table public.support_directory_sections
  alter column title set not null;

alter table public.support_directory_entries
  alter column title set not null;

alter table public.support_directory_entry_contacts
  alter column name set not null;
