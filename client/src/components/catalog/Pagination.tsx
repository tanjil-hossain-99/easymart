import { ChevronLeft, ChevronRight } from "lucide-react"
import { PAGINATION_SIBLINGS } from "@/lib/constants"

type Props = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

const ELLIPSIS = "…"

// Which page numbers to show: always first + last, plus a window around the current page.
//   page 6 of 40 → [1, "…", 4, 5, 6, 7, 8, "…", 40]
function pageItems(page: number, totalPages: number): (number | typeof ELLIPSIS)[] {
  const start = Math.max(2, page - PAGINATION_SIBLINGS)
  const end = Math.min(totalPages - 1, page + PAGINATION_SIBLINGS)

  const items: (number | typeof ELLIPSIS)[] = [1]
  if (start > 2) items.push(ELLIPSIS)
  for (let p = start; p <= end; p++) items.push(p)
  if (end < totalPages - 1) items.push(ELLIPSIS)
  if (totalPages > 1) items.push(totalPages)
  return items
}

export function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null

  const itemClass = "flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-sm"

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={`${itemClass} gap-1 disabled:opacity-40`}
      >
        <ChevronLeft className="size-4" /> Previous
      </button>

      {pageItems(page, totalPages).map((item, index) =>
        item === ELLIPSIS ? (
          <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
            {ELLIPSIS}
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={`${itemClass} ${item === page ? "border-foreground font-bold" : "border-transparent hover:border-border"}`}
          >
            {item}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={`${itemClass} gap-1 disabled:opacity-40`}
      >
        Next <ChevronRight className="size-4" />
      </button>
    </nav>
  )
}
