"use client"

import { PlusIcon, XIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  FILE_VIEWER_FILTER_FIELDS,
  getFieldType,
  getFilterFieldLabel,
  getOperatorLabel,
  getOperatorsForField,
  isVisibleFilterField,
  operatorRequiresValue,
  sanitizeFileViewerFilters,
  type FileViewerFilter,
  type FileViewerFilterField,
  type FileViewerFilterOperator,
} from "@/lib/file-viewer-filters"

const DEFAULT_FIELD: FileViewerFilterField = "borrower"
const DEFAULT_OPERATOR: FileViewerFilterOperator = "contains"

function buildDefaultFilter(): FileViewerFilter {
  return {
    field: DEFAULT_FIELD,
    operator: DEFAULT_OPERATOR,
    value: "",
  }
}

export function FileViewerFilters({
  initialFilters,
}: {
  initialFilters: FileViewerFilter[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<FileViewerFilter[]>(
    initialFilters.length > 0 ? initialFilters : [buildDefaultFilter()]
  )

  const activeFilterCount = useMemo(
    () => sanitizeFileViewerFilters(filters).length,
    [filters]
  )

  function updateFilter(
    index: number,
    nextFilter: Partial<FileViewerFilter>
  ) {
    setFilters((currentFilters) =>
      currentFilters.map((filter, filterIndex) => {
        if (filterIndex !== index) {
          return filter
        }

        const mergedFilter = { ...filter, ...nextFilter }
        const validOperators = getOperatorsForField(mergedFilter.field)

        if (!validOperators.includes(mergedFilter.operator)) {
          return {
            ...mergedFilter,
            operator: validOperators[0],
          }
        }

        return mergedFilter
      })
    )
  }

  function applyFilters() {
    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.delete("ff")
    nextSearchParams.delete("fo")
    nextSearchParams.delete("fv")

    const normalizedFilters = sanitizeFileViewerFilters(filters)
    for (const filter of normalizedFilters) {
      nextSearchParams.append("ff", filter.field)
      nextSearchParams.append("fo", filter.operator)
      nextSearchParams.append("fv", filter.value)
    }

    const queryString = nextSearchParams.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname)
  }

  function resetFilters() {
    setFilters([buildDefaultFilter()])
    router.push(pathname)
  }

  return (
    <div className="mb-4 rounded-lg border p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Filters</p>
          <p className="text-xs text-muted-foreground">
            {activeFilterCount} active {activeFilterCount === 1 ? "filter" : "filters"}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setFilters((currentFilters) => [...currentFilters, buildDefaultFilter()])}
        >
          <PlusIcon className="mr-1 h-4 w-4" />
          Add Filter
        </Button>
      </div>

      <div className="space-y-2">
        {filters.map((filter, index) => {
          const operators = getOperatorsForField(filter.field)
          const fieldType = getFieldType(filter.field)
          const needsValue = operatorRequiresValue(filter.operator)
          const fieldOptions = isVisibleFilterField(filter.field)
            ? FILE_VIEWER_FILTER_FIELDS
            : [
                ...FILE_VIEWER_FILTER_FIELDS,
                {
                  value: filter.field,
                  label: `${getFilterFieldLabel(filter.field)} (From Link)`,
                  type: fieldType,
                },
              ]

          return (
            <div key={`${filter.field}-${index}`} className="grid gap-2 md:grid-cols-[1.2fr_1fr_1.5fr_auto]">
              <select
                value={filter.field}
                onChange={(event) =>
                  updateFilter(index, {
                    field: event.target.value as FileViewerFilterField,
                  })
                }
                className="h-8 w-full rounded-lg border border-input bg-background pl-2.5 pr-8 text-sm"
              >
                {fieldOptions.map((fieldDef) => (
                  <option key={fieldDef.value} value={fieldDef.value}>
                    {fieldDef.label}
                  </option>
                ))}
              </select>

              <select
                value={filter.operator}
                onChange={(event) =>
                  updateFilter(index, {
                    operator: event.target.value as FileViewerFilterOperator,
                  })
                }
                className="h-8 w-full rounded-lg border border-input bg-background pl-2.5 pr-8 text-sm"
              >
                {operators.map((operator) => (
                  <option key={operator} value={operator}>
                    {getOperatorLabel(operator)}
                  </option>
                ))}
              </select>

              <Input
                value={filter.value}
                onChange={(event) =>
                  updateFilter(index, {
                    value: event.target.value,
                  })
                }
                placeholder={needsValue ? "Value" : "No value needed"}
                disabled={!needsValue}
                type={fieldType === "number" ? "number" : fieldType === "date" ? "date" : "text"}
              />

              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() =>
                  setFilters((currentFilters) =>
                    currentFilters.length <= 1
                      ? [buildDefaultFilter()]
                      : currentFilters.filter((_, filterIndex) => filterIndex !== index)
                  )
                }
                aria-label="Remove filter"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button type="button" size="sm" onClick={applyFilters}>
          Apply Filters
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={resetFilters}>
          Reset
        </Button>
      </div>
    </div>
  )
}
