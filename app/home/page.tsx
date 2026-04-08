import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { CanopyProductionChart } from "@/components/home/canopy-production-chart"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { fetchCanopyProductionSeriesFromRpc } from "@/lib/hub-data"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const googleIdentity = user.identities?.find(
    (identity) => identity.provider === "google"
  )
  const identityData = (googleIdentity?.identity_data ?? {}) as Record<
    string,
    unknown
  >
  const metadata = user.user_metadata as Record<string, unknown>

  const sidebarUser = {
    name:
      (metadata.full_name as string | undefined) ??
      (metadata.name as string | undefined) ??
      (identityData.full_name as string | undefined) ??
      (identityData.name as string | undefined) ??
      user.email?.split("@")[0] ??
      "User",
    email: user.email ?? "unknown@example.com",
    avatar:
      (metadata.avatar_url as string | undefined) ??
      (metadata.picture as string | undefined) ??
      (identityData.avatar_url as string | undefined) ??
      (identityData.picture as string | undefined) ??
      null,
  }
  const firstName = sidebarUser.name.trim().split(/\s+/)[0] || "there"

  let productionChartError: string | null = null
  let productionSeries: Awaited<
    ReturnType<typeof fetchCanopyProductionSeriesFromRpc>
  > | null = null

  try {
    productionSeries = await fetchCanopyProductionSeriesFromRpc()
  } catch {
    productionChartError = "Data load failed."
  }

  return (
    <SidebarProvider>
      <AppSidebar user={sidebarUser} />
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
                <BreadcrumbPage>Home</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="px-1 py-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor production trends, performance, and key operational metrics.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 text-card-foreground">
            <h2 className="text-xl font-semibold">
              Canopy Production Last 12 Months
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Funded Loans (bar) and Funded Volume (line)
            </p>
            {productionChartError || !productionSeries ? (
              <p className="mt-4 text-sm text-destructive">
                {productionChartError ?? "Data load failed."}
              </p>
            ) : (
              <div className="mt-4">
                <CanopyProductionChart
                  labels={productionSeries.labels}
                  monthlyFundedCounts={productionSeries.monthlyFundedCounts}
                  monthlyFundedVolumes={productionSeries.monthlyFundedVolumes}
                />
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
