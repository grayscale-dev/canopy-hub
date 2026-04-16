"use client"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"

const DEFAULT_PAGE_SIZE = 50

type DataTablePaginationProps = {
  page: number
  totalItems: number
  onPageChange: (page: number) => void
  pageSize?: number
  className?: string
}

type PageItem = number | "ellipsis-left" | "ellipsis-right"

function buildPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const items: PageItem[] = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) {
    items.push("ellipsis-left")
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page)
  }

  if (end < totalPages - 1) {
    items.push("ellipsis-right")
  }

  items.push(totalPages)
  return items
}

export function DataTablePagination({
  page,
  totalItems,
  onPageChange,
  pageSize = DEFAULT_PAGE_SIZE,
  className,
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const startItem = totalItems ? (safePage - 1) * pageSize + 1 : 0
  const endItem = totalItems ? Math.min(safePage * pageSize, totalItems) : 0
  const pageItems = buildPageItems(safePage, totalPages)

  return (
    <div className={cn("mt-3 flex flex-wrap items-center justify-between gap-2", className)}>
      <p className="text-xs text-muted-foreground">
        {startItem}-{endItem} of {totalItems}
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(event) => {
                event.preventDefault()
                if (safePage > 1) {
                  onPageChange(safePage - 1)
                }
              }}
              aria-disabled={safePage <= 1}
              className={safePage <= 1 ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
          {pageItems.map((item) => (
            <PaginationItem key={item}>
              {typeof item === "number" ? (
                <PaginationLink
                  href="#"
                  isActive={item === safePage}
                  onClick={(event) => {
                    event.preventDefault()
                    onPageChange(item)
                  }}
                >
                  {item}
                </PaginationLink>
              ) : (
                <PaginationEllipsis />
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(event) => {
                event.preventDefault()
                if (safePage < totalPages) {
                  onPageChange(safePage + 1)
                }
              }}
              aria-disabled={safePage >= totalPages}
              className={safePage >= totalPages ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
