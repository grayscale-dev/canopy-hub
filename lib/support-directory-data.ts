import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"

interface SupportDirectorySectionRow {
  id: string
  kind: "general_help" | "rush" | "department"
  title: string
  description: string | null
  manager_name: string | null
  manager_phone: string | null
  notes: string[] | null
  sort_order: number
}

interface SupportDirectoryEntryRow {
  id: string
  section_id: string
  title: string
  description: string | null
  emails: string[] | null
  monitored_by: string | null
  notes: string[] | null
  sort_order: number
}

interface SupportDirectoryEntryContactRow {
  id: string
  entry_id: string
  name: string
  role: string | null
  phone: string | null
  email: string | null
  sort_order: number
}

export interface SupportDirectoryContact {
  id: string
  name: string
  role: string | null
  phone: string | null
  email: string | null
  sortOrder: number
}

export interface SupportDirectoryItem {
  id: string
  title: string
  description: string | null
  emails: string[]
  monitoredBy: string | null
  notes: string[]
  sortOrder: number
  contacts: SupportDirectoryContact[]
}

export interface SupportDirectorySection {
  id: string
  kind: "general_help" | "rush" | "department"
  title: string
  description: string | null
  managerName: string | null
  managerPhone: string | null
  notes: string[]
  sortOrder: number
  items: SupportDirectoryItem[]
}

export interface SupportDirectoryData {
  generalHelpSection: SupportDirectorySection | null
  rushSections: SupportDirectorySection[]
  departments: SupportDirectorySection[]
}

function toList(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => Boolean(item?.trim()))
}

function compareSortThenTitle(
  a: { sortOrder: number; title: string },
  b: { sortOrder: number; title: string }
) {
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder
  }

  return a.title.localeCompare(b.title)
}

function compareSortThenName(
  a: { sortOrder: number; name: string },
  b: { sortOrder: number; name: string }
) {
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder
  }

  return a.name.localeCompare(b.name)
}

async function fetchSections() {
  const supabase = await createSupabaseServerClient()

  const [sectionsResult, entriesResult, contactsResult] = await Promise.all([
    supabase
      .from("support_directory_sections")
      .select(
        "id,kind,title,description,manager_name,manager_phone,notes,sort_order"
      ),
    supabase
      .from("support_directory_entries")
      .select(
        "id,section_id,title,description,emails,monitored_by,notes,sort_order"
      ),
    supabase
      .from("support_directory_entry_contacts")
      .select("id,entry_id,name,role,phone,email,sort_order"),
  ])

  if (sectionsResult.error) {
    throw new Error(sectionsResult.error.message)
  }

  if (entriesResult.error) {
    throw new Error(entriesResult.error.message)
  }

  if (contactsResult.error) {
    throw new Error(contactsResult.error.message)
  }

  const sectionRows = (sectionsResult.data ?? []) as SupportDirectorySectionRow[]
  const entryRows = (entriesResult.data ?? []) as SupportDirectoryEntryRow[]
  const contactRows =
    (contactsResult.data ?? []) as SupportDirectoryEntryContactRow[]

  const contactsByEntryId = new Map<string, SupportDirectoryContact[]>()
  for (const contact of contactRows) {
    const current = contactsByEntryId.get(contact.entry_id) ?? []
    current.push({
      id: contact.id,
      name: contact.name,
      role: contact.role,
      phone: contact.phone,
      email: contact.email,
      sortOrder: Number(contact.sort_order) || 0,
    })
    contactsByEntryId.set(contact.entry_id, current)
  }

  for (const list of contactsByEntryId.values()) {
    list.sort(compareSortThenName)
  }

  const entriesBySectionId = new Map<string, SupportDirectoryItem[]>()
  for (const entry of entryRows) {
    const current = entriesBySectionId.get(entry.section_id) ?? []
    current.push({
      id: entry.id,
      title: entry.title,
      description: entry.description,
      emails: toList(entry.emails),
      monitoredBy: entry.monitored_by,
      notes: toList(entry.notes),
      sortOrder: Number(entry.sort_order) || 0,
      contacts: contactsByEntryId.get(entry.id) ?? [],
    })
    entriesBySectionId.set(entry.section_id, current)
  }

  for (const list of entriesBySectionId.values()) {
    list.sort(compareSortThenTitle)
  }

  const sections: SupportDirectorySection[] = sectionRows.map((section) => ({
    id: section.id,
    kind: section.kind,
    title: section.title,
    description: section.description,
    managerName: section.manager_name,
    managerPhone: section.manager_phone,
    notes: toList(section.notes),
    sortOrder: Number(section.sort_order) || 0,
    items: entriesBySectionId.get(section.id) ?? [],
  }))

  const generalHelpSection = sections
    .filter((section) => section.kind === "general_help")
    .sort(compareSortThenTitle)[0] ?? null

  const rushSections = sections
    .filter((section) => section.kind === "rush")
    .sort(compareSortThenTitle)

  const departments = sections
    .filter((section) => section.kind === "department")
    .sort(compareSortThenTitle)

  return { generalHelpSection, rushSections, departments }
}

export async function fetchSupportDirectoryData(): Promise<SupportDirectoryData> {
  const sections = await fetchSections()

  return {
    generalHelpSection: sections.generalHelpSection,
    rushSections: sections.rushSections,
    departments: sections.departments,
  }
}
