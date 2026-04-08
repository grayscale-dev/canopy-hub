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
