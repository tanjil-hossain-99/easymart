import { FilterSidebar } from "@/components/catalog/FilterSidebar"
import { Pagination } from "@/components/catalog/Pagination"
import { ProductResultCard } from "@/components/catalog/ProductResultCard"
import { ResultsBar } from "@/components/catalog/ResultsBar"
import { useCatalogParams } from "@/hooks/useCatalogParams"
import { useProducts, useSearchProducts } from "@/hooks/useProducts"
import { PAGINATION } from "@/lib/constants"

// Amazon-style results page:
//   [ results count ........................ sort ]
//   [ filters ] [ result rows ...                  ]
//               [ ‹ Previous 1 2 3 … Next ›        ]
export function ProductsPage() {
  // Filters live in the URL (set by the header search, category links and the sidebar)
  const { filters, update } = useCatalogParams()
  const { q, sort, ...rest } = filters
  const isSearching = !!q

  // Two data sources, same response shape: a query → Algolia search, no query → Postgres list.
  // `enabled` makes sure only the active one actually sends requests.
  const productList = useProducts({ ...rest, sort }, { enabled: !isSearching })
  const searchResults = useSearchProducts({ ...rest, q: q ?? "" }, { enabled: isSearching })
  const { data, isPending, isError } = isSearching ? searchResults : productList

  function goToPage(page: number) {
    update({ page })
    window.scrollTo({ top: 0 }) // new page → start reading from the top, like Amazon
  }

  return (
    <div>
      <ResultsBar
        query={q}
        pagination={data?.pagination}
        sort={sort}
        onSortChange={(sort) => update({ sort })}
      />

      <div className="flex gap-6 p-4">
        <FilterSidebar filters={filters} onChange={update} />

        <main className="flex min-w-0 flex-1 flex-col gap-3">
          <h2 className="text-xl font-bold">Results</h2>

          {isPending && <p className="text-muted-foreground">Loading…</p>}
          {isError && <p className="text-destructive">Failed to load products.</p>}
          {data?.data.length === 0 && (
            <p className="text-muted-foreground">
              No products match. Try different keywords or clear some filters.
            </p>
          )}

          {data?.data.map((product) => (
            <ProductResultCard key={product.id} product={product} />
          ))}

          {data && (
            <div className="mt-4">
              <Pagination
                page={filters.page ?? PAGINATION.defaultPage}
                totalPages={data.pagination.totalPages}
                onPageChange={goToPage}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
