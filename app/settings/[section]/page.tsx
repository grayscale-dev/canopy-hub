import Link from "next/link"
import { redirect } from "next/navigation"

import { PermissionsTable } from "@/app/settings/[section]/permissions-table"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  fetchPermissionDirectoryUsers,
  fetchPermissionUsers,
  fetchPermissions,
  type PermissionDirectoryUser,
  type Permission,
  type PermissionUser,
} from "@/lib/permissions-data"
import { userHasPermissionCode } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const SETTINGS_PAGES = [
  { key: "general", label: "General" },
  { key: "permissions", label: "Permissions" },
] as const

type SettingsPageKey = (typeof SETTINGS_PAGES)[number]["key"]

function isSettingsPage(value: string): value is SettingsPageKey {
  return SETTINGS_PAGES.some((page) => page.key === value)
}

export default async function SettingsSubPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const resolvedParams = await params
  const section = resolvedParams.section.toLowerCase()

  if (!isSettingsPage(section)) {
    redirect("/settings/general")
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const canViewSettings = await userHasPermissionCode({
    supabase,
    userId: user.id,
    code: "settings.access",
  })

  if (!canViewSettings) {
    redirect("/home")
  }

  const canEditPermissions = await userHasPermissionCode({
    supabase,
    userId: user.id,
    code: "permissions.edit",
  })

  if (section === "permissions" && !canEditPermissions) {
    redirect("/settings/general")
  }

  const visiblePages = SETTINGS_PAGES.filter(
    (page) => page.key !== "permissions" || canEditPermissions
  )
  const activePage = visiblePages.find((page) => page.key === section)
  let permissions: Permission[] = []
  let permissionUsers: PermissionUser[] = []
  let permissionDirectoryUsers: PermissionDirectoryUser[] = []
  let permissionsLoadError: string | null = null

  if (section === "permissions" && canEditPermissions) {
    try {
      ;[permissions, permissionUsers, permissionDirectoryUsers] = await Promise.all([
        fetchPermissions(),
        fetchPermissionUsers(),
        fetchPermissionDirectoryUsers(),
      ])
    } catch {
      permissionsLoadError = "Data load failed."
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar activePath="/settings" />
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
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{activePage?.label}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="px-1 py-2">
            <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage application preferences and access controls.
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-4 md:flex-row">
            <aside className="h-fit w-full rounded-xl border bg-card p-2 text-card-foreground md:max-w-56">
              <nav className="grid gap-1">
                {visiblePages.map((page) => {
                  const isActive = page.key === section

                  return (
                    <Link
                      key={page.key}
                      href={`/settings/${page.key}`}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {page.label}
                    </Link>
                  )
                })}
              </nav>
            </aside>

            <section className="min-h-[420px] flex-1">
              {section === "permissions" ? (
                permissionsLoadError ? (
                  <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
                    {permissionsLoadError}
                  </div>
                ) : (
                  <PermissionsTable
                    permissions={permissions}
                    permissionUsers={permissionUsers}
                    permissionDirectoryUsers={permissionDirectoryUsers}
                  />
                )
              ) : (
                <div className="rounded-xl border bg-card" />
              )}
            </section>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
