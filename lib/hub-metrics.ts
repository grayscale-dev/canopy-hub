export interface CanopyProductionSeries {
  labels: string[]
  monthlyFundedCounts: number[]
  monthlyFundedVolumes: number[]
}

const COMPACT_CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
})

function toNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0
}

export function formatCompactCurrency(value: number | null | undefined) {
  return COMPACT_CURRENCY_FORMATTER.format(toNumber(value))
}
