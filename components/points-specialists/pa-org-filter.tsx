"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { PointsSpecialistsPaOrgOption } from "@/lib/hub-data"

const ALL_ORGS_VALUE = "__all_orgs__"

export function PointsSpecialistsPaOrgFilter({
  options,
  selectedIds,
}: {
  options: PointsSpecialistsPaOrgOption[]
  selectedIds: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const allIds = options.map((option) => option.id)
  const normalizedSelectedIds = selectedIds.filter((id) => allIds.includes(id))
  const isAllSelected =
    normalizedSelectedIds.length === 0 || normalizedSelectedIds.length === allIds.length
  const selectedValue =
    isAllSelected || normalizedSelectedIds.length !== 1
      ? ALL_ORGS_VALUE
      : normalizedSelectedIds[0]

  function applySelection(nextSelectedId: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("org")
    params.delete("pa_org")

    if (nextSelectedId && nextSelectedId !== ALL_ORGS_VALUE) {
      params.append("pa_org", nextSelectedId)
    }

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <Select value={selectedValue} onValueChange={(value) => applySelection(value)}>
      <SelectTrigger className="w-[320px]">
        <SelectValue placeholder="All PA Orgs" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_ORGS_VALUE}>All PA Orgs</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
