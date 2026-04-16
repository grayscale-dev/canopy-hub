"use client"

import { ChevronDown, ChevronUp } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { DataTablePagination } from "@/components/ui/data-table-pagination"
import type { BranchDirectoryRow } from "@/lib/hub-data"

type SortKey = "id" | "accountingCode" | "branch" | "address" | "city" | "state" | "zip"
type SortDirection = "asc" | "desc"

function valueOrDash(value: string | null | undefined) {
  return value?.trim() ? value : "—"
}

function normalize(value: string | null | undefined) {
  return value?.toLowerCase().trim() ?? ""
}

function getNextSort(
  current: { key: SortKey; direction: SortDirection },
  key: SortKey
) {
  if (current.key === key) {
    return {
      key,
      direction: current.direction === "asc" ? "desc" : "asc",
    } as const
  }

  return {
    key,
    direction: "asc",
  } as const
}

export function BranchesTable({ rows }: { rows: BranchDirectoryRow[] }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "branch",
    direction: "asc",
  })
  const pageSize = 50

  const filteredAndSortedRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    const filtered = normalizedQuery
      ? rows.filter((row) =>
          [
            row.id,
            row.accountingCode,
            row.branch,
            row.address,
            row.city,
            row.state,
            row.zip,
          ]
            .map((value) => normalize(value))
            .join(" ")
            .includes(normalizedQuery)
        )
      : rows

    return [...filtered].sort((left, right) => {
      const leftValue = normalize(left[sort.key] as string | null | undefined)
      const rightValue = normalize(right[sort.key] as string | null | undefined)
      const result = leftValue.localeCompare(rightValue)
      return sort.direction === "asc" ? result : -result
    })
  }, [rows, searchQuery, sort])

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRows.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const pagedRows = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize
    return filteredAndSortedRows.slice(startIndex, startIndex + pageSize)
  }, [filteredAndSortedRows, safePage])

  const sortIndicator = (key: SortKey) => {
    if (sort.key !== key) {
      return null
    }

    return sort.direction === "asc" ? (
      <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
    ) : (
      <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
    )
  }

  return (
    <div className="rounded-xl border bg-card p-4 text-card-foreground">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <input
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value)
            setCurrentPage(1)
          }}
          placeholder="Search branches"
          className="h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <p className="text-xs text-muted-foreground">
          {filteredAndSortedRows.length} result
          {filteredAndSortedRows.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="max-w-full overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              {[
                { key: "id", label: "ID" },
                { key: "accountingCode", label: "Accounting Code" },
                { key: "branch", label: "Branch" },
                { key: "address", label: "Address" },
                { key: "city", label: "City" },
                { key: "state", label: "State" },
                { key: "zip", label: "Zip" },
              ].map((column) => (
                <th key={column.key} className="px-3 py-2.5 font-medium whitespace-nowrap">
                  <button
                    type="button"
                    className="flex items-center gap-2 hover:text-foreground"
                    onClick={() =>
                      setSort((current) =>
                        getNextSort(current, column.key as SortKey)
                      )
                    }
                  >
                    <span>{column.label}</span>
                    {sortIndicator(column.key as SortKey)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-sm text-muted-foreground"
                >
                  No branches found.
                </td>
              </tr>
            ) : (
              pagedRows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b last:border-0 ${
                    row.id?.trim()
                      ? "cursor-pointer transition-colors hover:bg-muted/30"
                      : ""
                  }`}
                  onClick={() => {
                    if (!row.id?.trim()) {
                      return
                    }
                    router.push(`/branch/${encodeURIComponent(row.id)}`)
                  }}
                  onKeyDown={(event) => {
                    if (!row.id?.trim()) {
                      return
                    }
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      router.push(`/branch/${encodeURIComponent(row.id)}`)
                    }
                  }}
                  tabIndex={row.id?.trim() ? 0 : -1}
                >
                  <td className="px-3 py-2.5 font-mono whitespace-nowrap">{row.id}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {valueOrDash(row.accountingCode)}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{valueOrDash(row.branch)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{valueOrDash(row.address)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{valueOrDash(row.city)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{valueOrDash(row.state)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{valueOrDash(row.zip)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DataTablePagination
        page={safePage}
        totalItems={filteredAndSortedRows.length}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
      />
    </div>
  )
}
