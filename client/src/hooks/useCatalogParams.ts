import { useSearchParams } from "react-router"
import { CatalogParam, FACET_PARAM, PAGINATION, ProductSort, ROUTES } from "@/lib/constants"
import { buildUrl } from "@/lib/api"
import type { CatalogFilters, FacetSelections } from "@/types/api"

const SORT_VALUES = Object.values(ProductSort) as string[]

function isProductSort(value: string | null): value is ProductSort {
  return value !== null && SORT_VALUES.includes(value)
}

const isFacetParam = (key: string) => key === FACET_PARAM.brand || key.startsWith(FACET_PARAM.attributePrefix)

// { facets: { brand: ["LG"] } } → { brand: ["LG"] } — selections are top-level URL params
function toUrlParams({ facets, ...rest }: CatalogFilters) {
  return { ...rest, ...facets }
}

// Build a results-page URL, e.g. catalogUrl({ q: "chair" }) → "/s?q=chair".
// Used by the header search, category links and homepage links.
export function catalogUrl(filters: CatalogFilters = {}): string {
  return buildUrl(ROUTES.search, toUrlParams(filters))
}

// Reads/writes the catalog filters from the URL instead of component state, so:
// - the header search box and the results page share one source of truth
// - results are shareable/bookmarkable and the back button works
export function useCatalogParams() {
  const [params, setParams] = useSearchParams()
  const sortParam = params.get(CatalogParam.Sort)

  // Every brand=… / a.<key>=… param, grouped: { brand: ["LG", "Sony"], "a.screen_size": ["45-56"] }
  const facets: FacetSelections = {}
  for (const key of new Set(params.keys())) {
    if (isFacetParam(key)) facets[key] = params.getAll(key)
  }

  // The URL is user-editable text — parse defensively and fall back to defaults
  const filters: CatalogFilters = {
    q: params.get(CatalogParam.Query)?.trim() || undefined,
    category_id: params.get(CatalogParam.Category) || undefined,
    min_price: params.get(CatalogParam.MinPrice) || undefined,
    max_price: params.get(CatalogParam.MaxPrice) || undefined,
    has_discount: params.get(CatalogParam.HasDiscount) === "true" || undefined,
    sort: isProductSort(sortParam) ? sortParam : ProductSort.Newest,
    page: Number(params.get(CatalogParam.Page)) || PAGINATION.defaultPage,
    limit: PAGINATION.defaultLimit,
    facets,
  }

  // Changing any filter jumps back to page 1 (page 5 of the old results may not exist)
  function update(patch: Partial<CatalogFilters>) {
    const next: CatalogFilters = { ...filters, page: PAGINATION.defaultPage, ...patch }
    // limit and default values stay out of the URL to keep it short
    const { limit: _limit, ...rest } = next
    setParams(
      buildUrl("", {
        ...toUrlParams(rest),
        sort: rest.sort === ProductSort.Newest ? undefined : rest.sort,
        page: rest.page === PAGINATION.defaultPage ? undefined : rest.page,
      }),
    )
  }

  return { filters, update }
}
