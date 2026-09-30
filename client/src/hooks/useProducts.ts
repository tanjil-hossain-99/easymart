import { useQuery } from "@tanstack/react-query"
import { apiFetch, buildProductsUrl } from "@/lib/api"
import { API_ENDPOINTS, QUERY_KEYS, STALE_TIME } from "@/lib/constants"
import type { Category, ProductDetail, ProductFilters, ProductsResponse } from "@/types/api"

export function useProducts(filters: ProductFilters) {
  return useQuery<ProductsResponse>({
    queryKey: [QUERY_KEYS.products, filters],
    queryFn: () => apiFetch(buildProductsUrl(filters)),
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
