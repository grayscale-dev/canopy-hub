import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { CanopyProductionSeries } from "@/lib/hub-metrics"

interface CanopyProductionMonthlyRow {
  month_key: string
  label: string
  funded_count: number
  funded_volume: number
}

interface AprilBranchSummaryRpcRow {
  branch_id: string | null
  branch_name: string
  file_count: number
  total_volume: number
}

interface AprilDivisionSummaryRpcRow {
  division_id: string | null
  division_name: string
  file_count: number
  total_volume: number
}

interface AprilLoanOfficerSummaryRpcRow {
  loan_officer_id: string | null
  loan_officer_name: string
  file_count: number
  total_volume: number
}

interface AprilProcessorSummaryRpcRow {
  processor_id: string | null
  processor_name: string
  file_count: number
  total_volume: number
}

interface AprilUnderwriterSummaryRpcRow {
  underwriter_id: string | null
  underwriter_name: string
  file_count: number
  total_volume: number
}

interface AprilUnderwritingOrgSummaryRpcRow {
  underwriting_org_id: string | null
  underwriting_org_name: string
  file_count: number
  total_volume: number
}

interface CorporateTurnRowRpcRow {
  section_type: string
  section_label: string
  section_sort_order: number
  status: string
  status_order: number
  files_in_progress: number
  workdays_for_files_in_progress: number
  workdays_to_complete_for_previous_week: number
  workdays_to_complete_for_previous_month: number
}

interface CorporateTurnKpisRpcRow {
  workdays_for_lo_loa_statuses: number
  processing_rushes_last_7_days: number
  underwriting_rushes_last_7_days: number
  closing_funding_rushes_last_7_days: number
}

interface PreviousMonthLoanProgramRpcRow {
  month_start: string
  month_label: string
  loan_program: string
  funded_count: number
  funded_volume: number
}

export interface AprilBranchSummary {
  branchId: string | null
  branchName: string
  fileCount: number
  totalVolume: number
}

export interface AprilDivisionSummary {
  divisionId: string | null
  divisionName: string
  fileCount: number
  totalVolume: number
}

export interface AprilLoanOfficerSummary {
  loanOfficerId: string | null
  loanOfficerName: string
  fileCount: number
  totalVolume: number
}

export interface AprilProcessorSummary {
  processorId: string | null
  processorName: string
  fileCount: number
  totalVolume: number
}

export interface AprilUnderwriterSummary {
  underwriterId: string | null
  underwriterName: string
  fileCount: number
  totalVolume: number
}

export interface AprilUnderwritingOrgSummary {
  underwritingOrgId: string | null
  underwritingOrgName: string
  fileCount: number
  totalVolume: number
}

export interface CorporateTurnTableRow {
  status: string
  statusType: string
  statusOrder: number
  filesInProgress: number
  workdaysForFilesInProgress: number
  workdaysToCompleteForPreviousWeek: number
  workdaysToCompleteForPreviousMonth: number
}

export interface CorporateTurnKpis {
  workdaysForLoLoaStatuses: number
  processingRushesLast7Days: number
  underwritingRushesLast7Days: number
  closingFundingRushesLast7Days: number
}

export interface CorporateTurnSummary {
  tableRows: CorporateTurnTableRow[]
  kpis: CorporateTurnKpis
}

export interface PreviousMonthLoanProgramSummaryRow {
  programName: string
  fundedCount: number
  fundedVolume: number
}

export interface PreviousMonthLoanProgramSummary {
  monthLabel: string
  rows: PreviousMonthLoanProgramSummaryRow[]
}

function toRpcNumber(value: number | string | null | undefined) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return 0
  }

  return Number(numericValue)
}

export async function fetchCanopyProductionSeriesFromRpc(): Promise<CanopyProductionSeries> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc(
    "get_canopy_production_last_12_months"
  )

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as CanopyProductionMonthlyRow[]

  return {
    labels: rows.map((row) => row.label),
    monthlyFundedCounts: rows.map((row) => Number(row.funded_count) || 0),
    monthlyFundedVolumes: rows.map((row) => Number(row.funded_volume) || 0),
  }
}

export async function fetchAprilBranchSummaryFromRpc(): Promise<
  AprilBranchSummary[]
> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("get_branch_april_summary")

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as AprilBranchSummaryRpcRow[]

  return rows.map((row) => ({
    branchId: row.branch_id,
    branchName: row.branch_name || "Unknown Branch",
    fileCount: Number(row.file_count) || 0,
    totalVolume: Number(row.total_volume) || 0,
  }))
}

export async function fetchAprilDivisionSummaryFromRpc(): Promise<
  AprilDivisionSummary[]
> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("get_division_april_summary")

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as AprilDivisionSummaryRpcRow[]

  return rows.map((row) => ({
    divisionId: row.division_id,
    divisionName: row.division_name || "Unknown Division",
    fileCount: Number(row.file_count) || 0,
    totalVolume: Number(row.total_volume) || 0,
  }))
}

export async function fetchAprilLoanOfficerSummaryFromRpc(): Promise<
  AprilLoanOfficerSummary[]
> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("get_loan_officer_april_summary")

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as AprilLoanOfficerSummaryRpcRow[]

  return rows.map((row) => ({
    loanOfficerId: row.loan_officer_id,
    loanOfficerName: row.loan_officer_name || "Unknown Loan Officer",
    fileCount: Number(row.file_count) || 0,
    totalVolume: Number(row.total_volume) || 0,
  }))
}

export async function fetchAprilProcessorSummaryFromRpc(): Promise<
  AprilProcessorSummary[]
> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("get_processor_april_summary")

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as AprilProcessorSummaryRpcRow[]

  return rows.map((row) => ({
    processorId: row.processor_id,
    processorName: row.processor_name || "Unknown Processor",
    fileCount: Number(row.file_count) || 0,
    totalVolume: Number(row.total_volume) || 0,
  }))
}

export async function fetchAprilUnderwriterSummaryFromRpc(): Promise<
  AprilUnderwriterSummary[]
> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("get_underwriter_april_summary")

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as AprilUnderwriterSummaryRpcRow[]

  return rows.map((row) => ({
    underwriterId: row.underwriter_id,
    underwriterName: row.underwriter_name || "Unknown Underwriter",
    fileCount: Number(row.file_count) || 0,
    totalVolume: Number(row.total_volume) || 0,
  }))
}

export async function fetchAprilUnderwritingOrgSummaryFromRpc(): Promise<
  AprilUnderwritingOrgSummary[]
> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc(
    "get_underwriting_org_april_summary"
  )

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as AprilUnderwritingOrgSummaryRpcRow[]

  return rows.map((row) => ({
    underwritingOrgId: row.underwriting_org_id,
    underwritingOrgName: row.underwriting_org_name || "Unknown Underwriting Org",
    fileCount: Number(row.file_count) || 0,
    totalVolume: Number(row.total_volume) || 0,
  }))
}

export async function fetchCorporateTurnSummaryFromRpc(): Promise<CorporateTurnSummary> {
  const supabase = await createSupabaseServerClient()
  const [rowsResult, kpisResult] = await Promise.all([
    supabase.rpc("get_corporate_turn_times_rows"),
    supabase.rpc("get_corporate_turn_times_kpis"),
  ])

  if (rowsResult.error) {
    throw new Error(rowsResult.error.message)
  }
  if (kpisResult.error) {
    throw new Error(kpisResult.error.message)
  }

  const rows = (rowsResult.data ?? []) as CorporateTurnRowRpcRow[]
  const kpiRow = ((kpisResult.data ?? []) as CorporateTurnKpisRpcRow[])[0]

  return {
    tableRows: rows.map((row) => ({
      status: row.status || "Unknown",
      statusType: row.section_type || "Other",
      statusOrder: toRpcNumber(row.status_order) || 999,
      filesInProgress: toRpcNumber(row.files_in_progress),
      workdaysForFilesInProgress: toRpcNumber(row.workdays_for_files_in_progress),
      workdaysToCompleteForPreviousWeek: toRpcNumber(
        row.workdays_to_complete_for_previous_week
      ),
      workdaysToCompleteForPreviousMonth: toRpcNumber(
        row.workdays_to_complete_for_previous_month
      ),
    })),
    kpis: {
      workdaysForLoLoaStatuses: toRpcNumber(kpiRow?.workdays_for_lo_loa_statuses),
      processingRushesLast7Days: toRpcNumber(kpiRow?.processing_rushes_last_7_days),
      underwritingRushesLast7Days: toRpcNumber(
        kpiRow?.underwriting_rushes_last_7_days
      ),
      closingFundingRushesLast7Days: toRpcNumber(
        kpiRow?.closing_funding_rushes_last_7_days
      ),
    },
  }
}

function getPreviousMonthLabel(referenceDate = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1))
}

export async function fetchPreviousMonthLoanProgramSummaryFromRpc(): Promise<PreviousMonthLoanProgramSummary> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc(
    "get_funded_loans_by_program_previous_month"
  )

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as PreviousMonthLoanProgramRpcRow[]
  const monthLabel = rows[0]?.month_label || getPreviousMonthLabel()

  return {
    monthLabel,
    rows: rows.map((row) => ({
      programName: row.loan_program || "Unknown Program",
      fundedCount: toRpcNumber(row.funded_count),
      fundedVolume: toRpcNumber(row.funded_volume),
    })),
  }
}
