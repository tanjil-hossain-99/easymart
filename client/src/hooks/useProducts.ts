import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { apiFetch, buildUrl } from "@/lib/api"
import { API_ENDPOINTS, QUERY_KEYS, SEARCH, STALE_TIME } from "@/lib/constants"
import type {
  Category,
  ProductDetail,
  ProductFilters,
  ProductsResponse,
  SearchFilters,
  SearchSuggestions,
} from "@/types/api"

type QueryToggle = { enabled?: boolean }

export function useProducts(filters: ProductFilters, { enabled = true }: QueryToggle = {}) {
  return useQuery<ProductsResponse>({
    queryKey: [QUERY_KEYS.products, filters],
    queryFn: () => apiFetch(buildUrl(API_ENDPOINTS.products, filters)),
    enabled,
  })
}

// Full-text search via our server → Algolia
export function useSearchProducts(filters: SearchFilters, { enabled = true }: QueryToggle = {}) {
  return useQuery<ProductsResponse>({
    queryKey: [QUERY_KEYS.search, filters],
    // Selections are spread into top-level params: ?brand=LG&a.screen_size=45-56
    queryFn: () => {
      const { facets, ...rest } = filters
      return apiFetch(buildUrl(API_ENDPOINTS.search, { ...rest, ...facets }))
    },
    enabled,
    // While the next query loads, keep showing the previous results
    // instead of flashing "Loading…" on every search
    placeholderData: keepPreviousData,
  })
}

// Autocomplete for the header search box
export function useSearchSuggestions(q: string, categoryId?: string) {
  return useQuery<SearchSuggestions>({
    queryKey: [QUERY_KEYS.suggestions, q, categoryId],
    queryFn: () =>
      apiFetch(buildUrl(API_ENDPOINTS.searchSuggestions, { q, category_id: categoryId })),
    enabled: q.length >= SEARCH.minSuggestionLength,
    staleTime: STALE_TIME.suggestions,
    placeholderData: keepPreviousData, // keep the dropdown steady while the next letter loads
  })
}

export function useProduct(id: string) {
  return useQuery<ProductDetail>({
    queryKey: [QUERY_KEYS.product, id],
    queryFn: () => apiFetch(API_ENDPOINTS.product(id)),
    enabled: !!id,
  })
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: [QUERY_KEYS.categories],
    queryFn: () => apiFetch(API_ENDPOINTS.categories),
    staleTime: STALE_TIME.categories,
  })
}
