import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  BarChart3Icon,
  CircleDollarSignIcon,
  Building2Icon,
  CableIcon,
  HomeIcon,
  LifeBuoyIcon,
  ListTreeIcon,
  Settings2Icon,
  UsersRoundIcon,
} from "lucide-react"
import { redirect } from "next/navigation"

import { NewslettersSidebarLauncher } from "@/components/newsletters/newsletters-sidebar-launcher"
import { OfficeFloorPlanSidebarLauncher } from "@/components/office-floor-plan/office-floor-plan-sidebar-launcher"
import { PoliciesSidebarLauncher } from "@/components/policies/policies-sidebar-launcher"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  compareNewsletterFilesDescending,
  NEWSLETTER_BUCKET,
  parseNewsletterFileName,
  type NewsletterFileSummary,
} from "@/lib/newsletters"
import { OFFICE_FLOOR_PLAN_UPLOAD_PERMISSION } from "@/lib/office-floor-plan"
import { userHasPermissionCode } from "@/lib/permissions"
import {
  POLICIES_BUCKET,
  POLICIES_MANAGE_PERMISSION,
  stripPolicyFileExtension,
  type PolicyFileSummary,
} from "@/lib/policies"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { FeaturebaseMessenger } from "@/components/featurebase-messenger"

const dashboardNav = [
  {
    title: "Home",
    url: "/home",
    icon: HomeIcon,
  },
  {
    title: "Pipeline",
    url: "/pipeline",
    icon: ListTreeIcon,
  },
  {
    title: "Points Specialists",
    url: "/points-specialists",
    icon: CircleDollarSignIcon,
  },
]

const operationsNav = [
  {
    title: "Bridge",
    url: "/bridge",
    icon: CableIcon,
  },
  {
    title: "File Quality",
    url: "/file-quality",
    icon: BarChart3Icon,
  },
]

const directoryNav = [
  {
    title: "Employee Directory",
    url: "/employee-directory",
    icon: UsersRoundIcon,
  },
  {
    title: "Branches",
    url: "/branches",
    icon: Building2Icon,
  },
]

const adminNav = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings2Icon,
  },
  {
    title: "Support",
    url: "/support",
    icon: LifeBuoyIcon,
  },
]

export async function AppSidebar({
  activePath,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  activePath?: string
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/login")
  }

  const googleIdentity = authUser.identities?.find(
    (identity) => identity.provider === "google"
  )
  const identityData = (googleIdentity?.identity_data ?? {}) as Record<
    string,
    unknown
  >
  const metadata = authUser.user_metadata as Record<string, unknown>

  const user = {
    name:
      (metadata.full_name as string | undefined) ??
      (metadata.name as string | undefined) ??
      (identityData.full_name as string | undefined) ??
      (identityData.name as string | undefined) ??
      authUser.email?.split("@")[0] ??
      "User",
    email: authUser.email ?? "unknown@example.com",
    avatar:
      (metadata.avatar_url as string | undefined) ??
      (metadata.picture as string | undefined) ??
      (identityData.avatar_url as string | undefined) ??
      (identityData.picture as string | undefined) ??
      null,
  }

  const canViewSettings = await userHasPermissionCode({
    supabase,
    userId: authUser.id,
    code: "settings.access",
  })
  const canUploadNewsletters = await userHasPermissionCode({
    supabase,
    userId: authUser.id,
    code: "newsletters.upload",
  })
  const canUploadOfficeFloorPlan = await userHasPermissionCode({
    supabase,
    userId: authUser.id,
    code: OFFICE_FLOOR_PLAN_UPLOAD_PERMISSION,
  })
  const canManagePolicies = await userHasPermissionCode({
    supabase,
    userId: authUser.id,
    code: POLICIES_MANAGE_PERMISSION,
  })

  let newsletters: NewsletterFileSummary[] = []
  let policies: PolicyFileSummary[] = []
  try {
    const { data: files, error: filesError } = await supabase.storage
      .from(NEWSLETTER_BUCKET)
      .list("", { limit: 1000 })
    if (filesError) {
      throw new Error(filesError.message)
    }

    newsletters = (files ?? [])
      .map((file) => parseNewsletterFileName(file.name))
      .filter((file): file is NewsletterFileSummary => file !== null)
      .sort(compareNewsletterFilesDescending)
  } catch {
    newsletters = []
  }

  try {
    const { data: files, error: filesError } = await supabase.storage
      .from(POLICIES_BUCKET)
      .list("", { limit: 1000 })
    if (filesError) {
      throw new Error(filesError.message)
    }

    policies = (files ?? [])
      .filter((file) => Boolean(file.name?.trim()))
      .map((file) => ({
        fileName: file.name,
        displayName: stripPolicyFileExtension(file.name),
      }))
      .sort((left, right) => {
        const labelCompare = left.displayName.localeCompare(right.displayName, undefined, {
          sensitivity: "base",
        })
        if (labelCompare !== 0) {
          return labelCompare
        }
        return left.fileName.localeCompare(right.fileName, undefined, {
          sensitivity: "base",
        })
      })
  } catch {
    policies = []
  }

  const navSecondary = adminNav.filter(
    (item) => item.url !== "/settings" || canViewSettings
  )

  return (
    <Sidebar collapsible="icon" {...props}>
      <FeaturebaseMessenger
        email={authUser.email ?? null}
        userId={authUser.id}
        name={user.name}
      />
      <SidebarHeader className="h-16 justify-center border-b px-4 py-0">
        <div className="flex h-full items-center group-data-[collapsible=icon]:hidden">
          <Image
            src="/logo.png"
            alt="Canopy Hub"
            width={140}
            height={40}
            className="h-9 w-auto dark:hidden"
            priority
          />
          <Image
            src="/logo-light.png"
            alt="Canopy Hub"
            width={140}
            height={40}
            className="hidden h-9 w-auto dark:block"
            priority
          />
        </div>
        <div className="hidden h-full items-center justify-center group-data-[collapsible=icon]:flex">
          <Image
            src="/canopy-logo-cube-100.png"
            alt="Canopy Hub"
            width={28}
            height={28}
            className="h-7 w-auto object-contain"
            priority
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboardNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={activePath === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span className="group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={activePath === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span className="group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Directory</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {directoryNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={activePath === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span className="group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NewslettersSidebarLauncher
                newsletters={newsletters}
                canUpload={canUploadNewsletters}
              />
              <OfficeFloorPlanSidebarLauncher
                canUpload={canUploadOfficeFloorPlan}
              />
              <PoliciesSidebarLauncher
                policies={policies}
                canManage={canManagePolicies}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {navSecondary.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={activePath === item.url}
                tooltip={item.title}
              >
                <Link href={item.url}>
                  <item.icon />
                  <span className="group-data-[collapsible=icon]:hidden">
                    {item.title}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
