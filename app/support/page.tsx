import { ChevronDownIcon } from "lucide-react"
import { redirect } from "next/navigation"

import {
  AddSectionActionsMenu,
  ContactActionsMenu,
  EntryActionsMenu,
  SectionActionsMenu,
} from "@/app/support/action-menus"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  fetchSupportDirectoryData,
  type SupportDirectoryContact,
  type SupportDirectoryItem,
  type SupportDirectorySection,
} from "@/lib/support-directory-data"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const SUPPORT_PAGE_TITLE = "Support Directory"
const SUPPORT_PAGE_SUBTITLE =
  "Find the right inbox quickly, use rush channels for urgent items, and route escalations to the right manager."
const SUPPORT_POLICY_TITLE = "Inbox Routing Policy"
const SUPPORT_POLICY_BODY =
  "Please refrain from cc'ing an individual on a group email if they are listed as someone who manages the inbox. This is especially important for all rush request inboxes."

function toTelHref(phone: string) {
  const normalized = phone.replace(/[^0-9+]/g, "")
  return `tel:${normalized}`
}

function firstSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function matchesText(value: string | null | undefined, query: string) {
  if (!value) {
    return false
  }

  return value.toLowerCase().includes(query)
}

function itemMatchesQuery(item: SupportDirectoryItem, query: string) {
  if (matchesText(item.title, query) || matchesText(item.description, query)) {
    return true
  }

  if (
    item.emails.some((email) => matchesText(email, query)) ||
    matchesText(item.monitoredBy, query) ||
    item.notes.some((note) => matchesText(note, query))
  ) {
    return true
  }

  return item.contacts.some((contact) => {
    return (
      matchesText(contact.name, query) ||
      matchesText(contact.role, query) ||
      matchesText(contact.phone, query) ||
      matchesText(contact.email, query)
    )
  })
}

function filterSectionByQuery(
  section: SupportDirectorySection,
  query: string
): SupportDirectorySection | null {
  if (!query) {
    return section
  }

  const sectionMatches =
    matchesText(section.title, query) ||
    matchesText(section.description, query) ||
    matchesText(section.managerName, query) ||
    matchesText(section.managerPhone, query) ||
    section.notes.some((note) => matchesText(note, query))

  const matchingItems = section.items.filter((item) => itemMatchesQuery(item, query))

  if (!sectionMatches && matchingItems.length === 0) {
    return null
  }

  return {
    ...section,
    items: sectionMatches ? section.items : matchingItems,
  }
}

function isNotNull<T>(value: T | null): value is T {
  return value !== null
}

function buildSupportHref({
  query,
  editMode,
}: {
  query: string
  editMode: boolean
}) {
  const params = new URLSearchParams()
  if (query) {
    params.set("q", query)
  }
  if (editMode) {
    params.set("edit", "1")
  }

  const suffix = params.toString()
  return suffix ? `/support?${suffix}` : "/support"
}

function EmailLink({ email }: { email: string }) {
  return (
    <a
      href={`mailto:${email}`}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      {email}
    </a>
  )
}

function ContactDetails({
  contact,
  editable = false,
}: {
  contact: SupportDirectoryContact
  editable?: boolean
}) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{contact.name}</p>
          {contact.role ? (
            <p className="text-xs text-muted-foreground">{contact.role}</p>
          ) : null}
        </div>
        {editable ? <ContactActionsMenu contact={contact} /> : null}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {contact.phone ? (
          <a href={toTelHref(contact.phone)} className="text-primary hover:underline">
            {contact.phone}
          </a>
        ) : null}
        {contact.email ? <EmailLink email={contact.email} /> : null}
      </div>
    </div>
  )
}

function DirectoryItemCard({
  item,
  editable = false,
}: {
  item: SupportDirectoryItem
  editable?: boolean
}) {
  const previewEmail = item.emails[0] ?? null

  return (
    <details className="group rounded-lg border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{item.title}</p>
          {previewEmail ? (
            <p className="truncate text-xs text-muted-foreground">{previewEmail}</p>
          ) : null}
        </div>
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t px-3 pb-3 pt-2">
        {editable ? (
          <div className="mb-2 flex items-center justify-end">
            <EntryActionsMenu item={item} />
          </div>
        ) : null}
        {item.description ? (
          <p className="text-xs text-muted-foreground">{item.description}</p>
        ) : null}
        {item.emails.length ? (
          <div className="mt-2 flex flex-col gap-1 text-sm">
            {item.emails.map((email) => (
              <EmailLink key={email} email={email} />
            ))}
          </div>
        ) : null}
        {item.monitoredBy ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Monitored by: <span className="font-medium">{item.monitoredBy}</span>
          </p>
        ) : null}
        {item.notes.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            {item.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
        {item.contacts.length ? (
          <div className="mt-2 grid gap-2">
            {item.contacts.map((contact) => (
              <ContactDetails key={contact.id} contact={contact} editable={editable} />
            ))}
          </div>
        ) : null}
      </div>
    </details>
  )
}

function SectionControlRow({
  section,
  editable = false,
}: {
  section: SupportDirectorySection
  editable?: boolean
}) {
  if (!editable) {
    return null
  }

  return <SectionActionsMenu section={section} />
}

function DepartmentAccordion({
  department,
  editable = false,
}: {
  department: SupportDirectorySection
  editable?: boolean
}) {
  return (
    <details className="group rounded-xl border bg-card text-card-foreground">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">{department.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {department.managerName
              ? `Manager: ${department.managerName}`
              : "Department contacts"}
            {department.managerPhone ? (
              <>
                {" "}
                <a
                  href={toTelHref(department.managerPhone)}
                  className="text-primary hover:underline"
                >
                  {department.managerPhone}
                </a>
              </>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {department.items.length} contact channel
            {department.items.length === 1 ? "" : "s"}
          </p>
        </div>
        <ChevronDownIcon className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t px-5 pb-5 pt-4">
        <div className="mb-2 flex items-center justify-end">
          <SectionControlRow section={department} editable={editable} />
        </div>
        {department.notes.length ? (
          <ul className="mb-3 mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            {department.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}

        <div className="grid gap-3">
          {department.items.map((item) => (
            <DirectoryItemCard key={item.id} item={item} editable={editable} />
          ))}
        </div>
      </div>
    </details>
  )
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const queryText = (firstSearchParam(resolvedSearchParams.q) ?? "").trim()
  const query = queryText.toLowerCase()
  const isEditMode = (firstSearchParam(resolvedSearchParams.edit) ?? "") === "1"

  let loadError: string | null = null
  let directoryData: Awaited<ReturnType<typeof fetchSupportDirectoryData>> | null = null

  try {
    directoryData = await fetchSupportDirectoryData()
  } catch {
    loadError = "Data load failed."
  }

  const filteredGeneralHelpSection = directoryData?.generalHelpSection
    ? filterSectionByQuery(directoryData.generalHelpSection, query)
    : null
  const filteredRushSections = (directoryData?.rushSections ?? [])
    .map((section) => filterSectionByQuery(section, query))
    .filter(isNotNull)
  const filteredDepartments = (directoryData?.departments ?? [])
    .map((section) => filterSectionByQuery(section, query))
    .filter(isNotNull)
  const hasSearchResults =
    !query ||
    Boolean(filteredGeneralHelpSection) ||
    filteredRushSections.length > 0 ||
    filteredDepartments.length > 0

  return (
    <SidebarProvider>
      <AppSidebar activePath="/support" />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Support</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 px-1 py-2">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{SUPPORT_PAGE_TITLE}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{SUPPORT_PAGE_SUBTITLE}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant={isEditMode ? "default" : "outline"} size="sm">
                <a href={buildSupportHref({ query: queryText, editMode: !isEditMode })}>
                  {isEditMode ? "Done Editing" : "Edit Content"}
                </a>
              </Button>
              {isEditMode ? <AddSectionActionsMenu /> : null}
            </div>
          </div>
          <form method="get" className="flex flex-wrap items-center gap-2 px-1">
            <Input
              name="q"
              defaultValue={queryText}
              placeholder="Search support by department, email, name, or phone"
              className="w-full max-w-xl"
            />
            {isEditMode ? <input type="hidden" name="edit" value="1" /> : null}
            <Button type="submit" variant="outline" size="sm">
              Search
            </Button>
            {queryText ? (
              <Button asChild variant="ghost" size="sm">
                <a href={buildSupportHref({ query: "", editMode: isEditMode })}>Clear</a>
              </Button>
            ) : null}
          </form>
          {isEditMode ? (
            <p className="px-1 text-xs text-muted-foreground">
              Edit mode is on. Use three-dot menus to select an action, then complete
              the modal.
            </p>
          ) : null}

          {loadError || !directoryData ? (
            <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
              {loadError}
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="text-sm font-medium">{SUPPORT_POLICY_TITLE}</p>
                <p className="mt-1 text-sm">{SUPPORT_POLICY_BODY}</p>
              </div>

              {filteredGeneralHelpSection ? (
                <div className="rounded-xl border bg-card p-6 text-card-foreground">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-xl font-semibold">{filteredGeneralHelpSection.title}</h2>
                      {filteredGeneralHelpSection.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {filteredGeneralHelpSection.description}
                        </p>
                      ) : null}
                    </div>
                    <SectionControlRow
                      section={filteredGeneralHelpSection}
                      editable={isEditMode}
                    />
                  </div>
                  {isEditMode && filteredGeneralHelpSection.items.length ? (
                    <div className="mt-4 grid gap-2">
                      {filteredGeneralHelpSection.items.map((item) => (
                        <DirectoryItemCard key={item.id} item={item} editable />
                      ))}
                    </div>
                  ) : null}
                  {!isEditMode ? (
                    filteredGeneralHelpSection.items[0] ? (
                      <div className="mt-4 rounded-lg border p-3">
                        <p className="text-sm font-medium">
                          {filteredGeneralHelpSection.items[0].title}
                        </p>
                        {filteredGeneralHelpSection.items[0].emails[0] ? (
                          <p className="mt-1 text-sm">
                            <EmailLink
                              email={filteredGeneralHelpSection.items[0].emails[0]}
                            />
                          </p>
                        ) : null}
                        {filteredGeneralHelpSection.items[0].monitoredBy ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Monitored by:{" "}
                            <span className="font-medium">
                              {filteredGeneralHelpSection.items[0].monitoredBy}
                            </span>
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-lg border p-3 text-sm text-muted-foreground">
                        No general help entry configured.
                      </div>
                    )
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-xl border bg-card p-6 text-card-foreground">
                <h2 className="text-xl font-semibold">Rush Request Inboxes</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use these for urgent requests and get a response in under an hour.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredRushSections.map((section) => {
                    const firstItem = section.items[0] ?? null
                    const managedBy = section.managerName ?? firstItem?.monitoredBy ?? null
                    const description = section.description ?? firstItem?.description ?? null
                    const emails = [...new Set(section.items.flatMap((item) => item.emails))]

                    return (
                      <div key={section.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold">{section.title}</p>
                          <SectionControlRow section={section} editable={isEditMode} />
                        </div>
                        {description ? (
                          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                        ) : null}
                        <div className="mt-2 flex flex-col gap-1 text-sm">
                          {emails.map((email) => (
                            <EmailLink key={`${section.id}-${email}`} email={email} />
                          ))}
                        </div>
                        {managedBy ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Managed by: <span className="font-medium">{managedBy}</span>
                          </p>
                        ) : null}
                        {isEditMode && section.items.length ? (
                          <div className="mt-3 grid gap-2">
                            {section.items.map((item) => (
                              <DirectoryItemCard key={item.id} item={item} editable />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>

              {!hasSearchResults ? (
                <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
                  No support matches found for “{queryText}”.
                </div>
              ) : null}

              <div className="space-y-3">
                {filteredDepartments.map((department) => (
                  <DepartmentAccordion
                    key={department.id}
                    department={department}
                    editable={isEditMode}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
