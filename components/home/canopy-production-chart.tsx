"use client"

import {
  Bar,
  LabelList,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts"

import { formatCompactCurrency } from "@/lib/hub-metrics"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

interface CanopyProductionChartProps {
  labels: string[]
  monthlyFundedCounts: number[]
  monthlyFundedVolumes: number[]
}

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

function toFiniteNumber(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

const chartConfig = {
  fundedCount: {
    label: "Funded Loans",
    color: "var(--chart-1)",
  },
  fundedVolume: {
    label: "Funded Volume",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function CanopyProductionChart({
  labels,
  monthlyFundedCounts,
  monthlyFundedVolumes,
}: CanopyProductionChartProps) {
  const data = labels.map((label, index) => ({
    label,
    fundedCount: monthlyFundedCounts[index] ?? 0,
    fundedVolume: monthlyFundedVolumes[index] ?? 0,
  }))

  return (
    <ChartContainer config={chartConfig} className="h-[360px] w-full">
      <ComposedChart
        data={data}
        margin={{
          top: 12,
          right: 16,
          left: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={14} />
        <YAxis
          yAxisId="left"
          tickLine={false}
          axisLine={false}
          width={44}
          allowDecimals={false}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickLine={false}
          axisLine={false}
          width={66}
          tickFormatter={(value) => formatCompactCurrency(Number(value))}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => {
                if (name === "fundedVolume") {
                  return (
                    <div className="flex w-full items-center justify-between gap-2">
                      <span>Funded Volume</span>
                      <span className="font-mono tabular-nums">
                        {formatCompactCurrency(Number(value))}
                      </span>
                    </div>
                  )
                }

                return (
                  <div className="flex w-full items-center justify-between gap-2">
                    <span>Funded Loans</span>
                    <span className="font-mono tabular-nums">
                      {NUMBER_FORMATTER.format(Number(value))}
                    </span>
                  </div>
                )
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          yAxisId="left"
          dataKey="fundedCount"
          fill="var(--color-fundedCount)"
          radius={[6, 6, 0, 0]}
          barSize={22}
        >
          <LabelList
            dataKey="fundedCount"
            position="top"
            offset={8}
            className="fill-foreground text-[10px]"
            formatter={(value) => NUMBER_FORMATTER.format(toFiniteNumber(value))}
          />
        </Bar>
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="fundedVolume"
          stroke="var(--color-fundedVolume)"
          strokeWidth={2}
          dot={{ r: 0 }}
          activeDot={{ r: 5 }}
        >
          <LabelList
            dataKey="fundedVolume"
            position="top"
            offset={8}
            className="fill-muted-foreground text-[10px]"
            formatter={(value) => formatCompactCurrency(toFiniteNumber(value))}
          />
        </Line>
      </ComposedChart>
    </ChartContainer>
  )
}
