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

export interface AprilBranchSummary {
  branchId: string | null
  branchName: string
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
