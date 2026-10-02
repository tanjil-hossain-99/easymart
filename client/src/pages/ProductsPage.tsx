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
  const { q, sort, facets, ...rest } = filters
  const hasFacetSelections = Object.keys(facets ?? {}).length > 0

  // Two data sources, same response shape:
  //   Algolia (/search)  — a query, a category, or a dynamic filter is set. Only the search
  //                        engine returns filter counts, so this is where dynamic filters live.
  //   Postgres (/products) — plain browsing ("All", "Today's Deals"), which supports price/date sorts.
  // `enabled` makes sure only the active one actually sends requests.
  const viaSearchEngine = !!q || !!rest.category_id || hasFacetSelections
  const productList = useProducts({ ...rest, sort }, { enabled: !viaSearchEngine })
  // Pass sort to Algolia too — it picks the right replica index server-side
  const searchResults = useSearchProducts({ ...rest, q: q ?? "", sort, facets }, { enabled: viaSearchEngine })
  const { data, isPending, isError } = viaSearchEngine ? searchResults : productList

  function goToPage(page: number) {
    update({ page })
    window.scrollTo({ top: 0 }) // new page → start reading from the top, like Amazon
  }

  return (
    <div>
      <ResultsBar
        query={q}
        relevanceOrder={!!q}
        pagination={data?.pagination}
        sort={sort}
        onSortChange={(sort) => update({ sort })}
      />

      <div className="flex gap-6 p-4">
        <FilterSidebar filters={filters} facetGroups={data?.facets?.groups} onChange={update} />

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
