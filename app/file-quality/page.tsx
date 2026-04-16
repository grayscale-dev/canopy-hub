import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { FileQualityMonthPicker } from "@/components/file-quality/file-quality-month-picker"
import { FileQualityRollupTable } from "@/components/file-quality/file-quality-rollup-table"
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
  fetchFileQualityRollupsForMonth,
  getFileQualityMonthOptions,
} from "@/lib/hub-data"
import { createSupabaseServerClient } from "@/lib/supabase/server"

function getMonthParam(searchParams?: Record<string, string | string[] | undefined>) {
  const raw = searchParams?.month
  if (Array.isArray(raw)) {
    return raw[0] ?? null
  }

  return raw ?? null
}

export default async function FileQualityPage({
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
  const monthOptions = getFileQualityMonthOptions()
  const fallbackMonth = monthOptions[monthOptions.length - 1] ?? null
  if (!fallbackMonth) {
    throw new Error("Month options are unavailable.")
  }

  const requestedMonthKey = getMonthParam(resolvedSearchParams)
  const selectedMonth =
    monthOptions.find((month) => month.monthKey === requestedMonthKey) ?? fallbackMonth

  let loadError: string | null = null
  let divisionRows: Awaited<
    ReturnType<typeof fetchFileQualityRollupsForMonth>
  >["divisionRows"] = []
  let branchRows: Awaited<
    ReturnType<typeof fetchFileQualityRollupsForMonth>
  >["branchRows"] = []
  let hasExpectedTouches = true
  let hasNetTouches = true
  let hasExpectedAndNetMetrics = true

  try {
    const data = await fetchFileQualityRollupsForMonth({
      monthKey: selectedMonth.monthKey,
    })
    divisionRows = data.divisionRows
    branchRows = data.branchRows
    hasExpectedTouches = data.hasExpectedTouches
    hasNetTouches = data.hasNetTouches
    hasExpectedAndNetMetrics = data.hasExpectedAndNetMetrics
  } catch {
    loadError = "Data load failed."
  }

  return (
    <SidebarProvider>
      <AppSidebar activePath="/file-quality" />
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
                <BreadcrumbPage>File Quality</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
          <div className="px-1 py-2">
            <h1 className="text-3xl font-semibold tracking-tight">File Quality</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Compare touch efficiency by division and branch.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 text-card-foreground">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FileQualityMonthPicker
                options={monthOptions}
                selectedMonthKey={selectedMonth.monthKey}
              />
              <p className="text-xs text-muted-foreground">
                Showing funded files for {selectedMonth.label}
              </p>
            </div>
          </div>

          {loadError ? (
            <div className="rounded-xl border bg-card p-6 text-sm text-destructive">
              {loadError}
            </div>
          ) : (
            <>
              {!hasExpectedAndNetMetrics ? (
                <div className="rounded-xl border border-amber-300/60 bg-amber-50/70 p-4 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
                  {!hasExpectedTouches && !hasNetTouches ? (
                    <>
                      The current file quality source is missing valid values for
                      <span className="font-medium"> AVG Expected Touches </span>
                      and
                      <span className="font-medium"> Net Touches</span>. Those columns
                      are temporarily unavailable.
                    </>
                  ) : null}
                  {hasExpectedTouches && !hasNetTouches ? (
                    <>
                      The current file quality source is missing valid values for
                      <span className="font-medium"> Net Touches</span>. That column is
                      temporarily unavailable.
                    </>
                  ) : null}
                  {!hasExpectedTouches && hasNetTouches ? (
                    <>
                      The current file quality source is missing valid values for
                      <span className="font-medium"> AVG Expected Touches</span>. That
                      column is temporarily unavailable.
                    </>
                  ) : null}
                </div>
              ) : null}
              <div className="grid gap-4 xl:grid-cols-2">
                <FileQualityRollupTable
                  title="By Division"
                  entityLabel="Division"
                  rows={divisionRows}
                />
                <FileQualityRollupTable
                  title="By Branch"
                  entityLabel="Branch"
                  rows={branchRows}
                />
              </div>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
