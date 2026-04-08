import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { AprilSummaryTable } from "@/components/home/april-summary-table"
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
  fetchAprilLoanOfficerSummaryFromRpc,
  fetchAprilProcessorSummaryFromRpc,
  fetchAprilUnderwriterSummaryFromRpc,
  fetchAprilUnderwritingOrgSummaryFromRpc,
  fetchCanopyProductionSeriesFromRpc,
} from "@/lib/hub-data"
import { createSupabaseServerClient } from "@/lib/supabase/server"

function toTop20ByPerformance<
  T extends { fileCount: number; totalVolume: number; name: string },
>(rows: T[]) {
  return [...rows]
    .sort((a, b) => {
      if (b.fileCount !== a.fileCount) {
        return b.fileCount - a.fileCount
      }
      if (b.totalVolume !== a.totalVolume) {
        return b.totalVolume - a.totalVolume
      }
      return a.name.localeCompare(b.name)
    })
    .slice(0, 20)
}

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
  let aprilLoanOfficerError: string | null = null
  let aprilLoanOfficerSummary: Awaited<
    ReturnType<typeof fetchAprilLoanOfficerSummaryFromRpc>
  > = []
  let aprilProcessorError: string | null = null
  let aprilProcessorSummary: Awaited<
    ReturnType<typeof fetchAprilProcessorSummaryFromRpc>
  > = []
  let aprilUnderwriterError: string | null = null
  let aprilUnderwriterSummary: Awaited<
    ReturnType<typeof fetchAprilUnderwriterSummaryFromRpc>
  > = []
  let aprilUnderwritingOrgError: string | null = null
  let aprilUnderwritingOrgSummary: Awaited<
    ReturnType<typeof fetchAprilUnderwritingOrgSummaryFromRpc>
  > = []

  const [
    chartResult,
    aprilDivisionResult,
    aprilBranchResult,
    aprilLoanOfficerResult,
    aprilProcessorResult,
    aprilUnderwriterResult,
    aprilUnderwritingOrgResult,
  ] =
    await Promise.allSettled([
      fetchCanopyProductionSeriesFromRpc(),
      fetchAprilDivisionSummaryFromRpc(),
      fetchAprilBranchSummaryFromRpc(),
      fetchAprilLoanOfficerSummaryFromRpc(),
      fetchAprilProcessorSummaryFromRpc(),
      fetchAprilUnderwriterSummaryFromRpc(),
      fetchAprilUnderwritingOrgSummaryFromRpc(),
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

  if (aprilLoanOfficerResult.status === "fulfilled") {
    aprilLoanOfficerSummary = aprilLoanOfficerResult.value
  } else {
    aprilLoanOfficerError = "Data load failed."
  }

  if (aprilProcessorResult.status === "fulfilled") {
    aprilProcessorSummary = aprilProcessorResult.value
  } else {
    aprilProcessorError = "Data load failed."
  }

  if (aprilUnderwriterResult.status === "fulfilled") {
    aprilUnderwriterSummary = aprilUnderwriterResult.value
  } else {
    aprilUnderwriterError = "Data load failed."
  }

  if (aprilUnderwritingOrgResult.status === "fulfilled") {
    aprilUnderwritingOrgSummary = aprilUnderwritingOrgResult.value
  } else {
    aprilUnderwritingOrgError = "Data load failed."
  }

  const topAprilDivisionSummary = toTop20ByPerformance(
    aprilDivisionSummary.map((row) => ({
      id: row.divisionId,
      name: row.divisionName,
      fileCount: row.fileCount,
      totalVolume: row.totalVolume,
    }))
  )

  const topAprilBranchSummary = toTop20ByPerformance(
    aprilBranchSummary.map((row) => ({
      id: row.branchId,
      name: row.branchName,
      fileCount: row.fileCount,
      totalVolume: row.totalVolume,
    }))
  )

  const topAprilLoanOfficerSummary = toTop20ByPerformance(
    aprilLoanOfficerSummary.map((row) => ({
      id: row.loanOfficerId,
      name: row.loanOfficerName,
      fileCount: row.fileCount,
      totalVolume: row.totalVolume,
    }))
  )

  const topAprilProcessorSummary = toTop20ByPerformance(
    aprilProcessorSummary.map((row) => ({
      id: row.processorId,
      name: row.processorName,
      fileCount: row.fileCount,
      totalVolume: row.totalVolume,
    }))
  )

  const topAprilUnderwriterSummary = toTop20ByPerformance(
    aprilUnderwriterSummary.map((row) => ({
      id: row.underwriterId,
      name: row.underwriterName,
      fileCount: row.fileCount,
      totalVolume: row.totalVolume,
    }))
  )

  const topAprilUnderwritingOrgSummary = toTop20ByPerformance(
    aprilUnderwritingOrgSummary.map((row) => ({
      id: row.underwritingOrgId,
      name: row.underwritingOrgName,
      fileCount: row.fileCount,
      totalVolume: row.totalVolume,
    }))
  )

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
            <div className="xl:col-span-2 px-1 pt-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                April&apos;s Leaderboard
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ranked funded file count and volume across teams and roles.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 text-card-foreground">
              <h2 className="text-xl font-semibold">Division</h2>
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
                <AprilSummaryTable
                  entityLabel="Division"
                  rows={topAprilDivisionSummary}
                />
              )}
            </div>
            <div className="rounded-xl border bg-card p-6 text-card-foreground">
              <h2 className="text-xl font-semibold">Branch</h2>
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
                <AprilSummaryTable entityLabel="Branch" rows={topAprilBranchSummary} />
              )}
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border bg-card p-6 text-card-foreground">
              <h2 className="text-xl font-semibold">Loan Officer</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Funded file count and total funded volume by loan officer.
              </p>
              {aprilLoanOfficerError ? (
                <p className="mt-4 text-sm text-destructive">
                  {aprilLoanOfficerError}
                </p>
              ) : topAprilLoanOfficerSummary.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No funded files were found for April {aprilYear}.
                </p>
              ) : (
                <AprilSummaryTable
                  entityLabel="Loan Officer"
                  rows={topAprilLoanOfficerSummary}
                />
              )}
            </div>
            <div className="rounded-xl border bg-card p-6 text-card-foreground">
              <h2 className="text-xl font-semibold">Processor</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Funded file count and total funded volume by processor.
              </p>
              {aprilProcessorError ? (
                <p className="mt-4 text-sm text-destructive">{aprilProcessorError}</p>
              ) : topAprilProcessorSummary.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No funded files were found for April {aprilYear}.
                </p>
              ) : (
                <AprilSummaryTable
                  entityLabel="Processor"
                  rows={topAprilProcessorSummary}
                />
              )}
            </div>
            <div className="rounded-xl border bg-card p-6 text-card-foreground">
              <h2 className="text-xl font-semibold">Underwriter</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Funded file count and total funded volume by underwriter.
              </p>
              {aprilUnderwriterError ? (
                <p className="mt-4 text-sm text-destructive">{aprilUnderwriterError}</p>
              ) : topAprilUnderwriterSummary.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No funded files were found for April {aprilYear}.
                </p>
              ) : (
                <AprilSummaryTable
                  entityLabel="Underwriter"
                  rows={topAprilUnderwriterSummary}
                />
              )}
            </div>
            <div className="rounded-xl border bg-card p-6 text-card-foreground">
              <h2 className="text-xl font-semibold">Underwriting Org</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Funded file count and total funded volume by underwriting org.
              </p>
              {aprilUnderwritingOrgError ? (
                <p className="mt-4 text-sm text-destructive">
                  {aprilUnderwritingOrgError}
                </p>
              ) : topAprilUnderwritingOrgSummary.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No funded files were found for April {aprilYear}.
                </p>
              ) : (
                <AprilSummaryTable
                  entityLabel="Underwriting Org"
                  rows={topAprilUnderwritingOrgSummary}
                />
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
