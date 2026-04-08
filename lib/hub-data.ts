import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { CanopyProductionSeries } from "@/lib/hub-metrics"

interface CanopyProductionMonthlyRow {
  month_key: string
  label: string
  funded_count: number
  funded_volume: number
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
