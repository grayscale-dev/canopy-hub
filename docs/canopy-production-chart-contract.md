# Canopy Production Chart Data Contract

## Input row shape

Each row must match:

```ts
type FundedProductionRow = {
  funded_date: string | null // ISO date, e.g. "2026-03-20"
  loan_amount: number | null
}
```

Rows are fetched from `production_data` with:
- `funded_date IS NOT NULL`
- `funded_date >= fundedWindowStartIso`

Where `fundedWindowStartIso` is first day of current month minus 11 months (YYYY-MM-DD).

## Output series shape

```ts
type CanopyProductionSeries = {
  labels: string[] // "MMM YYYY", oldest -> newest
  monthlyFundedCounts: number[] // bar series: Funded Loans
  monthlyFundedVolumes: number[] // line series: Funded Volume
}
```

The series always includes all 12 months in order and zero-fills missing months.

## Example payload (ordering + zero fill)

```json
{
  "labels": ["Jan 2026", "Feb 2026", "Mar 2026"],
  "monthlyFundedCounts": [4, 0, 3],
  "monthlyFundedVolumes": [1200000, 0, 875000]
}
```
