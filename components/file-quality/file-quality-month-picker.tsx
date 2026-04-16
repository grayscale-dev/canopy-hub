"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type { FileQualityMonthOption } from "@/lib/hub-data"

export function FileQualityMonthPicker({
  options,
  selectedMonthKey,
}: {
  options: FileQualityMonthOption[]
  selectedMonthKey: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Month</span>
      <select
        value={selectedMonthKey}
        onChange={(event) => {
          const next = new URLSearchParams(searchParams.toString())
          next.set("month", event.target.value)
          const query = next.toString()
          router.push(query ? `${pathname}?${query}` : pathname)
        }}
        className="h-9 rounded-md border border-input bg-background pl-2.5 pr-8 text-sm"
      >
        {options.map((option) => (
          <option key={option.monthKey} value={option.monthKey}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
