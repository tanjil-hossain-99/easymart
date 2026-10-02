import { useMutation, useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { API_ENDPOINTS, HttpMethod, QUERY_KEYS } from "@/lib/constants"
import { queryClient } from "@/lib/queryClient"
import { useAuthStore } from "@/stores/useAuthStore"
import type { SavedProductsResponse } from "@/types/api"

export function useSavedProducts() {
  const isLoggedIn = useAuthStore((s) => !!s.token)
  return useQuery<SavedProductsResponse>({
    queryKey: [QUERY_KEYS.saved],
    queryFn: () => apiFetch(API_ENDPOINTS.saved),
    enabled: isLoggedIn,
  })
}

const refetchSaved = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.saved] })

export function useSaveProduct() {
  return useMutation({
    mutationFn: (productId: string) =>
      apiFetch(API_ENDPOINTS.saved, { method: HttpMethod.Post, body: { product_id: productId } }),
    onSuccess: refetchSaved,
  })
}

export function useUnsaveProduct() {
  return useMutation({
    mutationFn: (productId: string) =>
      apiFetch(API_ENDPOINTS.savedProduct(productId), { method: HttpMethod.Delete }),
    onSuccess: refetchSaved,
  })
}
