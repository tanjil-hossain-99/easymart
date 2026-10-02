import { PRODUCT_SORT_LABELS, ProductSort, RELEVANCE_SORT_LABEL } from "@/lib/constants"
import type { Pagination } from "@/types/api"

type Props = {
  query?: string
  // Results come from the search engine, ordered by relevance (no price/date sorting yet)
  relevanceOrder: boolean
  pagination?: Pagination
  sort?: ProductSort
  onSortChange: (sort: ProductSort) => void
}

// "1-20 of 811 results for "chicken""          [Sort by: Featured ▾]
export function ResultsBar({ query, relevanceOrder, pagination, sort, onSortChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 border-b px-4 py-2 shadow-sm">
      <p className="text-sm">{pagination ? <ResultsCount query={query} pagination={pagination} /> : " "}</p>

      <label className="flex items-center gap-2 rounded-md border bg-muted px-2 py-1 text-sm shadow-sm">
        Sort by:
        <select
          value={sort ?? ""}
          onChange={(e) => onSortChange(e.target.value as ProductSort)}
          className="bg-transparent"
        >
          {/* For text searches show a Relevance option (primary Algolia index, no replica) */}
          {relevanceOrder && <option value="">{RELEVANCE_SORT_LABEL}</option>}
          {Object.values(ProductSort).map((option) => (
            <option key={option} value={option}>
              {PRODUCT_SORT_LABELS[option]}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function ResultsCount({ query, pagination }: { query?: string; pagination: Pagination }) {
  const { page, limit, total } = pagination
  if (total === 0) return <>No results{query && <> for <QueryText query={query} /></>}</>

  const first = (page - 1) * limit + 1
  const last = Math.min(page * limit, total)

  return (
    <>
      {first}-{last} of {total.toLocaleString()} results
      {query && (
        <>
          {" "}for <QueryText query={query} />
        </>
      )}
    </>
  )
}

function QueryText({ query }: { query: string }) {
  return <span className="font-bold text-brand-text">"{query}"</span>
}
