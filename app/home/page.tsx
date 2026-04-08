import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { AprilBranchSummaryTable } from "@/components/home/april-branch-summary-table"
import { AprilDivisionSummaryTable } from "@/components/home/april-division-summary-table"
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
import {
  fetchAprilBranchSummaryFromRpc,
  fetchAprilDivisionSummaryFromRpc,
  fetchCanopyProductionSeriesFromRpc,
} from "@/lib/hub-data"
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
  const aprilYear = new Date().getFullYear()

  let productionChartError: string | null = null
  let productionSeries: Awaited<
    ReturnType<typeof fetchCanopyProductionSeriesFromRpc>
  > | null = null
  let aprilBranchError: string | null = null
  let aprilBranchSummary: Awaited<
    ReturnType<typeof fetchAprilBranchSummaryFromRpc>
  > = []
  let aprilDivisionError: string | null = null
  let aprilDivisionSummary: Awaited<
    ReturnType<typeof fetchAprilDivisionSummaryFromRpc>
  > = []

  const [chartResult, aprilDivisionResult, aprilBranchResult] =
    await Promise.allSettled([
    fetchCanopyProductionSeriesFromRpc(),
    fetchAprilDivisionSummaryFromRpc(),
    fetchAprilBranchSummaryFromRpc(),
    ])

  if (chartResult.status === "fulfilled") {
    productionSeries = chartResult.value
  } else {
    productionChartError = "Data load failed."
  }

  if (aprilDivisionResult.status === "fulfilled") {
    aprilDivisionSummary = aprilDivisionResult.value
  } else {
    aprilDivisionError = "Data load failed."
  }

  if (aprilBranchResult.status === "fulfilled") {
    aprilBranchSummary = aprilBranchResult.value
  } else {
    aprilBranchError = "Data load failed."
  }
  const topAprilDivisionSummary = [...aprilDivisionSummary]
    .sort((a, b) => {
      if (b.fileCount !== a.fileCount) {
        return b.fileCount - a.fileCount
      }
      if (b.totalVolume !== a.totalVolume) {
        return b.totalVolume - a.totalVolume
      }
      return a.divisionName.localeCompare(b.divisionName)
    })
    .slice(0, 20)
  const topAprilBranchSummary = [...aprilBranchSummary]
    .sort((a, b) => {
      if (b.fileCount !== a.fileCount) {
        return b.fileCount - a.fileCount
      }
      if (b.totalVolume !== a.totalVolume) {
        return b.totalVolume - a.totalVolume
      }
      return a.branchName.localeCompare(b.branchName)
    })
    .slice(0, 20)

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
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border bg-card p-6 text-card-foreground">
              <h2 className="text-xl font-semibold">
                April {aprilYear} Division Summary
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Funded file count and total funded volume by division.
              </p>
              {aprilDivisionError ? (
                <p className="mt-4 text-sm text-destructive">{aprilDivisionError}</p>
              ) : topAprilDivisionSummary.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No funded files were found for April {aprilYear}.
                </p>
              ) : (
                <AprilDivisionSummaryTable rows={topAprilDivisionSummary} />
              )}
            </div>
            <div className="rounded-xl border bg-card p-6 text-card-foreground">
              <h2 className="text-xl font-semibold">
                April {aprilYear} Branch Summary
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Funded file count and total funded volume by branch.
              </p>
              {aprilBranchError ? (
                <p className="mt-4 text-sm text-destructive">{aprilBranchError}</p>
              ) : topAprilBranchSummary.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No funded files were found for April {aprilYear}.
                </p>
              ) : (
                <AprilBranchSummaryTable rows={topAprilBranchSummary} />
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
