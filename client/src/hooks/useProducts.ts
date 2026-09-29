import { useQuery } from "@tanstack/react-query"
import {
  apiFetch,
  buildProductsUrl,
  type Category,
  type ProductDetail,
  type ProductFilters,
  type ProductsResponse,
} from "@/lib/api"

export function useProducts(filters: ProductFilters) {
  return useQuery<ProductsResponse>({
    queryKey: ["products", filters],
    queryFn: () => apiFetch(buildProductsUrl(filters)),
  })
}

export function useProduct(id: string) {
  return useQuery<ProductDetail>({
    queryKey: ["product", id],
    queryFn: () => apiFetch(`/products/${id}`),
    enabled: !!id,
  })
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => apiFetch("/categories"),
    staleTime: 5 * 60 * 1000, // categories rarely change — cache for 5 mins
  })
}
