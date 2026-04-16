import { redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
} from "react-icons/fa"

import { AppSidebar } from "@/components/app-sidebar"
import { AprilSummaryTable } from "@/components/home/april-summary-table"
import { CanopyProductionChart } from "@/components/home/canopy-production-chart"
import { FundedLoansByProgramPieChart } from "@/components/home/funded-loans-by-program-pie-chart"
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
import { Button } from "@/components/ui/button"
import {
  fetchAprilBranchSummaryFromRpc,
  fetchAprilDivisionSummaryFromRpc,
  type LeaderboardEntityKey,
  fetchAprilLoanOfficerSummaryFromRpc,
  fetchAprilProcessorSummaryFromRpc,
  fetchAprilUnderwriterSummaryFromRpc,
  fetchAprilUnderwritingOrgSummaryFromRpc,
  fetchCanopyProductionSeriesFromRpc,
  fetchCorporateTurnSummaryFromRpc,
  fetchPreviousMonthLoanProgramSummaryFromRpc,
} from "@/lib/hub-data"
import type { FileViewerFilterField } from "@/lib/file-viewer-filters"
import type { FileViewerFilterOperator } from "@/lib/file-viewer-filters"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const SOCIAL_MEDIA_LINKS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/canopy.mortgage",
    icon: FaInstagram,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/canopy-mortgage",
    icon: FaLinkedinIn,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@canopymortgage",
    icon: FaYoutube,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/people/CanopyMortgage/61555767074405",
    icon: FaFacebookF,
  },
] as const

const CORPORATE_TURN_SECTION_LABELS: Record<string, string> = {
  Processing: "Corporate Processing Metrics",
  Underwriting: "Corporate Underwriting Metrics",
  Closing: "Corporate Closing Metrics",
}

const CORPORATE_TURN_SECTION_ORDER = ["Processing", "Underwriting", "Closing"]

const WHOLE_NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

const ONE_DECIMAL_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const ENTITY_FILTER_FIELD: Record<LeaderboardEntityKey, FileViewerFilterField> = {
  division: "division",
  branch: "branch",
  loanOfficer: "loanOfficer",
  processor: "processor",
  underwriter: "underwriter",
  underwritingOrg: "underwritingOrg",
}
const ENTITY_ID_FILTER_FIELD: Record<LeaderboardEntityKey, FileViewerFilterField> = {
  division: "divisionId",
  branch: "branchId",
  loanOfficer: "loanOfficerId",
  processor: "processorId",
  underwriter: "underwriterId",
  underwritingOrg: "underwritingOrgId",
}

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

type FileViewerUrlFilter = {
  field: FileViewerFilterField
  operator: FileViewerFilterOperator
  value: string
}

function toFileViewerHrefFromFilters(filters: FileViewerUrlFilter[]) {
  if (filters.length === 0) {
    return "/file-viewer"
  }

  const params = new URLSearchParams()
  for (const filter of filters) {
    params.append("ff", filter.field)
    params.append("fo", filter.operator)
    params.append("fv", filter.value)
  }

  return `/file-viewer?${params.toString()}`
}

function toFileViewerHref({
  entity,
  entityId,
  label,
  closedDateStart,
  closedDateEnd,
}: {
  entity: LeaderboardEntityKey
  entityId: string | null
  label: string
  closedDateStart?: string
  closedDateEnd?: string
}) {
  const filters: FileViewerUrlFilter[] = []
  const entityIdField = ENTITY_ID_FILTER_FIELD[entity]
  const entityField = ENTITY_FILTER_FIELD[entity]
  if (entityId?.trim()) {
    filters.push({
      field: entityIdField,
      operator: "equals",
      value: entityId,
    })
  } else if (label.trim()) {
    filters.push({
      field: entityField,
      operator: "equals",
      value: label,
    })
  }
  if (closedDateStart) {
    filters.push({
      field: "closedDate",
      operator: "onOrAfter",
      value: closedDateStart,
    })
  }
  if (closedDateEnd) {
    filters.push({
      field: "closedDate",
      operator: "onOrBefore",
      value: closedDateEnd,
    })
  }

  return toFileViewerHrefFromFilters(filters)
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

  const displayName =
    (metadata.full_name as string | undefined) ??
    (metadata.name as string | undefined) ??
    (identityData.full_name as string | undefined) ??
    (identityData.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "there"
  const firstName = displayName.trim().split(/\s+/)[0] || "there"
  const aprilYear = new Date().getFullYear()
  const aprilClosedStart = `${aprilYear}-04-01`
  const aprilClosedEnd = `${aprilYear}-04-30`

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
  let corporateTurnError: string | null = null
  let corporateTurnSummary: Awaited<
    ReturnType<typeof fetchCorporateTurnSummaryFromRpc>
  > | null = null
  let loanProgramChartError: string | null = null
  let loanProgramChartSummary: Awaited<
    ReturnType<typeof fetchPreviousMonthLoanProgramSummaryFromRpc>
  > | null = null

  const [
    chartResult,
    aprilDivisionResult,
    aprilBranchResult,
    aprilLoanOfficerResult,
    aprilProcessorResult,
    aprilUnderwriterResult,
    aprilUnderwritingOrgResult,
    corporateTurnResult,
    loanProgramChartResult,
  ] =
    await Promise.allSettled([
      fetchCanopyProductionSeriesFromRpc(),
      fetchAprilDivisionSummaryFromRpc(),
      fetchAprilBranchSummaryFromRpc(),
      fetchAprilLoanOfficerSummaryFromRpc(),
      fetchAprilProcessorSummaryFromRpc(),
      fetchAprilUnderwriterSummaryFromRpc(),
      fetchAprilUnderwritingOrgSummaryFromRpc(),
      fetchCorporateTurnSummaryFromRpc(),
      fetchPreviousMonthLoanProgramSummaryFromRpc(),
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

  if (corporateTurnResult.status === "fulfilled") {
    corporateTurnSummary = corporateTurnResult.value
  } else {
    corporateTurnError = "Data load failed."
  }

  if (loanProgramChartResult.status === "fulfilled") {
    loanProgramChartSummary = loanProgramChartResult.value
  } else {
    loanProgramChartError = "Data load failed."
  }

  const topAprilDivisionSummary = toTop20ByPerformance(
    aprilDivisionSummary.map((row) => ({
      id: row.divisionId,
      name: row.divisionName,
      fileCount: row.fileCount,
      totalVolume: row.totalVolume,
      rowHref: row.divisionId ? `/division/${encodeURIComponent(row.divisionId)}` : undefined,
      fileViewerHref: toFileViewerHref({
        entity: "division",
        entityId: row.divisionId,
        label: row.divisionName,
        closedDateStart: aprilClosedStart,
        closedDateEnd: aprilClosedEnd,
      }),
    }))
  )

  const topAprilBranchSummary = toTop20ByPerformance(
    aprilBranchSummary.map((row) => ({
      id: row.branchId,
      name: row.branchName,
      fileCount: row.fileCount,
      totalVolume: row.totalVolume,
      rowHref: row.branchId ? `/branch/${encodeURIComponent(row.branchId)}` : undefined,
      fileViewerHref: toFileViewerHref({
        entity: "branch",
        entityId: row.branchId,
        label: row.branchName,
        closedDateStart: aprilClosedStart,
        closedDateEnd: aprilClosedEnd,
      }),
    }))
  )

  const topAprilLoanOfficerSummary = toTop20ByPerformance(
    aprilLoanOfficerSummary.map((row) => ({
      id: row.loanOfficerId,
      name: row.loanOfficerName,
      fileCount: row.fileCount,
      totalVolume: row.totalVolume,
      rowHref: row.loanOfficerId
        ? `/employee/${encodeURIComponent(row.loanOfficerId)}`
        : undefined,
      fileViewerHref: toFileViewerHref({
        entity: "loanOfficer",
        entityId: row.loanOfficerId,
        label: row.loanOfficerName,
        closedDateStart: aprilClosedStart,
        closedDateEnd: aprilClosedEnd,
      }),
    }))
  )

  const topAprilProcessorSummary = toTop20ByPerformance(
    aprilProcessorSummary.map((row) => ({
      id: row.processorId,
      name: row.processorName,
      fileCount: row.fileCount,
      totalVolume: row.totalVolume,
      rowHref: row.processorId
        ? `/employee/${encodeURIComponent(row.processorId)}`
        : undefined,
      fileViewerHref: toFileViewerHref({
        entity: "processor",
        entityId: row.processorId,
        label: row.processorName,
        closedDateStart: aprilClosedStart,
        closedDateEnd: aprilClosedEnd,
      }),
    }))
  )

  const topAprilUnderwriterSummary = toTop20ByPerformance(
    aprilUnderwriterSummary.map((row) => ({
      id: row.underwriterId,
      name: row.underwriterName,
      fileCount: row.fileCount,
      totalVolume: row.totalVolume,
      rowHref: row.underwriterId
        ? `/employee/${encodeURIComponent(row.underwriterId)}`
        : undefined,
      fileViewerHref: toFileViewerHref({
        entity: "underwriter",
        entityId: row.underwriterId,
        label: row.underwriterName,
        closedDateStart: aprilClosedStart,
        closedDateEnd: aprilClosedEnd,
      }),
    }))
  )

  const topAprilUnderwritingOrgSummary = toTop20ByPerformance(
    aprilUnderwritingOrgSummary.map((row) => ({
      id: row.underwritingOrgId,
      name: row.underwritingOrgName,
      fileCount: row.fileCount,
      totalVolume: row.totalVolume,
      fileViewerHref: toFileViewerHref({
        entity: "underwritingOrg",
        entityId: row.underwritingOrgId,
        label: row.underwritingOrgName,
        closedDateStart: aprilClosedStart,
        closedDateEnd: aprilClosedEnd,
      }),
    }))
  )

  const corporateTurnSections = corporateTurnSummary
    ? [
        ...CORPORATE_TURN_SECTION_ORDER.map((sectionType) => ({
          sectionType,
          label: CORPORATE_TURN_SECTION_LABELS[sectionType] ?? sectionType,
          rows: corporateTurnSummary.tableRows.filter(
            (row) => row.statusType === sectionType
          ),
        })),
        ...[...new Set(corporateTurnSummary.tableRows.map((row) => row.statusType))]
          .filter((sectionType) => !CORPORATE_TURN_SECTION_ORDER.includes(sectionType))
          .map((sectionType) => ({
            sectionType,
            label: CORPORATE_TURN_SECTION_LABELS[sectionType] ?? sectionType,
            rows: corporateTurnSummary.tableRows.filter(
              (row) => row.statusType === sectionType
            ),
          })),
      ].filter((section) => section.rows.length > 0)
    : []

  return (
    <SidebarProvider>
      <AppSidebar activePath="/home" />
      <SidebarInset className="min-w-0 overflow-x-hidden">
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
        <div className="flex flex-1 flex-col gap-4 p-4 xl:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
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
            <div className="rounded-xl border bg-card p-6 text-card-foreground">
              <h2 className="text-xl font-semibold">Corporate Turn Times</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Corporate workflow status metrics and turnaround times.
              </p>
              {corporateTurnError ? (
                <p className="mt-4 text-sm text-destructive">{corporateTurnError}</p>
              ) : !corporateTurnSummary ||
                corporateTurnSummary.tableRows.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No corporate turn time data is available.
                </p>
              ) : (
                <>
                  <div className="mt-4 overflow-hidden rounded-lg border">
                    <div className="grid grid-cols-[2.2fr_repeat(4,minmax(0,1fr))] gap-x-3 border-b bg-muted/10 px-3 py-2 text-xs font-medium text-muted-foreground">
                      <div>Status</div>
                      <div className="text-right">Files In Progress</div>
                      <div className="text-right">Workdays for Files in Progress</div>
                      <div className="text-right">Workdays to Complete for Previous Week</div>
                      <div className="text-right">
                        Workdays to Complete for Previous Month
                      </div>
                    </div>
                    <div className="divide-y">
                      {corporateTurnSections.map((section) => (
                        <div key={section.sectionType}>
                          <div className="bg-muted/20 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            {section.label}
                          </div>
                          <div className="divide-y">
                            {section.rows.map((row) => (
                              <div
                                key={`${section.sectionType}-${row.status}`}
                                className="grid grid-cols-[2.2fr_repeat(4,minmax(0,1fr))] gap-x-3 px-3 py-2 text-sm"
                              >
                                <p className="font-medium">{row.status}</p>
                                <p className="text-right font-mono tabular-nums">
                                  <Link
                                    href={toFileViewerHrefFromFilters([
                                      {
                                        field: "lastStatus",
                                        operator: "equals",
                                        value: row.status,
                                      },
                                      {
                                        field: "closedDate",
                                        operator: "isEmpty",
                                        value: "",
                                      },
                                    ])}
                                    className="font-medium text-primary underline decoration-primary/60 underline-offset-4 transition-colors hover:text-primary/80"
                                  >
                                    {WHOLE_NUMBER_FORMATTER.format(row.filesInProgress)}
                                  </Link>
                                </p>
                                <p className="text-right font-mono tabular-nums">
                                  {ONE_DECIMAL_FORMATTER.format(
                                    row.workdaysForFilesInProgress
                                  )}
                                </p>
                                <p className="text-right font-mono tabular-nums">
                                  {ONE_DECIMAL_FORMATTER.format(
                                    row.workdaysToCompleteForPreviousWeek
                                  )}
                                </p>
                                <p className="text-right font-mono tabular-nums">
                                  {ONE_DECIMAL_FORMATTER.format(
                                    row.workdaysToCompleteForPreviousMonth
                                  )}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-muted-foreground">Workdays for LO/LOA Statuses</p>
                      <p className="mt-1 font-mono tabular-nums">
                        {ONE_DECIMAL_FORMATTER.format(
                          corporateTurnSummary.kpis.workdaysForLoLoaStatuses
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-muted-foreground">
                        Processing Rushes in the Last 7 Days
                      </p>
                      <p className="mt-1 font-mono tabular-nums">
                        <Link
                          href="/file-viewer"
                          className="font-medium text-primary underline decoration-primary/60 underline-offset-4 transition-colors hover:text-primary/80"
                        >
                          {WHOLE_NUMBER_FORMATTER.format(
                            corporateTurnSummary.kpis.processingRushesLast7Days
                          )}
                        </Link>
                      </p>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-muted-foreground">
                        Underwriting Rushes in the Last 7 Days
                      </p>
                      <p className="mt-1 font-mono tabular-nums">
                        <Link
                          href="/file-viewer"
                          className="font-medium text-primary underline decoration-primary/60 underline-offset-4 transition-colors hover:text-primary/80"
                        >
                          {WHOLE_NUMBER_FORMATTER.format(
                            corporateTurnSummary.kpis.underwritingRushesLast7Days
                          )}
                        </Link>
                      </p>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-muted-foreground">
                        Closing/Funding Rushes in the Last 7 Days
                      </p>
                      <p className="mt-1 font-mono tabular-nums">
                        <Link
                          href="/file-viewer"
                          className="font-medium text-primary underline decoration-primary/60 underline-offset-4 transition-colors hover:text-primary/80"
                        >
                          {WHOLE_NUMBER_FORMATTER.format(
                            corporateTurnSummary.kpis.closingFundingRushesLast7Days
                          )}
                        </Link>
                      </p>
                    </div>
                  </div>
                </>
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
                  <AprilSummaryTable
                    entityLabel="Branch"
                    rows={topAprilBranchSummary}
                  />
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
                  <p className="mt-4 text-sm text-destructive">
                    {aprilUnderwriterError}
                  </p>
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
          <aside className="xl:w-80 xl:shrink-0">
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-6 text-card-foreground">
                <h2 className="text-xl font-semibold">Social Media Sites</h2>
                <div className="mt-4 space-y-2">
                  {SOCIAL_MEDIA_LINKS.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                    >
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{item.label}</span>
                    </a>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border bg-card p-6 text-card-foreground">
                <h2 className="text-xl font-semibold">Canopy Wiki</h2>
                <a
                  href="https://sites.google.com/canopymortgage.com/trainingwiki/home?authuser=0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 block overflow-hidden rounded-lg border transition-colors hover:bg-muted/50"
                >
                  <Image
                    src="/training-wiki.jpg"
                    alt="Canopy Wiki"
                    width={640}
                    height={360}
                    className="h-auto w-full"
                  />
                </a>
              </div>
              <div className="rounded-xl border bg-card p-6 text-card-foreground">
                <h2 className="text-xl font-semibold">Need help now?</h2>
                <Link
                  href="/support"
                  className="mt-4 block overflow-hidden rounded-lg border transition-colors hover:bg-muted/50"
                >
                  <Image
                    src="/department-directory.png"
                    alt="Department Directory"
                    width={640}
                    height={360}
                    className="h-auto w-full"
                  />
                </Link>
              </div>
              <div className="rounded-xl border bg-card p-6 text-card-foreground">
                <h2 className="text-xl font-semibold">Funded Loans by Loan Program</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Previous month distribution ({loanProgramChartSummary?.monthLabel ?? "—"}).
                </p>
                {loanProgramChartError ? (
                  <p className="mt-4 text-sm text-destructive">{loanProgramChartError}</p>
                ) : !loanProgramChartSummary ||
                  loanProgramChartSummary.rows.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    No funded loan program data is available for the previous month.
                  </p>
                ) : (
                  <div className="mt-4">
                    <FundedLoansByProgramPieChart rows={loanProgramChartSummary.rows} />
                  </div>
                )}
              </div>
              <div className="rounded-xl border bg-card p-6 text-card-foreground">
                <h2 className="text-xl font-semibold">Compliment Your Team!</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Notice an employee that works hard without recognition? Say
                  something nice!
                </p>
                <div className="mt-4 overflow-hidden rounded-lg border">
                  <Image
                    src="/compliment-employee.jpg"
                    alt="Compliment your team"
                    width={640}
                    height={360}
                    className="h-auto w-full"
                  />
                </div>
                <Button asChild className="mt-4 w-full">
                  <a
                    href="https://docs.google.com/forms/d/e/1FAIpQLSd8FR2h37lG3e64t9_qNIoAn6qkUQaiycSyTzrGQO4unHaceA/viewform"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Compliment Your Team!
                  </a>
                </Button>
              </div>
              <div className="rounded-xl border bg-card p-6 text-card-foreground">
                <h2 className="text-xl font-semibold">Newsletters</h2>
              </div>
            </div>
          </aside>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
