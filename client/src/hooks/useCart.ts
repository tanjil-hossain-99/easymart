import { useMutation, useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { API_ENDPOINTS, HttpMethod, QUERY_KEYS } from "@/lib/constants"
import { queryClient } from "@/lib/queryClient"
import { useAuthStore } from "@/stores/useAuthStore"
import type { AddCartItemInput, Cart, UpdateCartItemInput } from "@/types/api"

export function useCart() {
  const isLoggedIn = useAuthStore((s) => !!s.token)

  return useQuery<Cart>({
    queryKey: [QUERY_KEYS.cart],
    queryFn: () => apiFetch(API_ENDPOINTS.cart),
    // The cart needs a token — don't fire a request that is guaranteed to 401
    enabled: isLoggedIn,
  })
}

// After any change, refetch the cart from the server instead of editing the cache by hand.
// One extra request, but the server stays the single source of truth for prices and subtotal.
const refetchCart = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] })

export function useAddToCart() {
  return useMutation({
    mutationFn: (input: AddCartItemInput) =>
      apiFetch(API_ENDPOINTS.cartItems, { method: HttpMethod.Post, body: input }),
    onSuccess: refetchCart,
  })
}

export function useUpdateCartItem() {
  return useMutation({
    mutationFn: ({ id, quantity }: UpdateCartItemInput) =>
      apiFetch(API_ENDPOINTS.cartItem(id), { method: HttpMethod.Patch, body: { quantity } }),
    onSuccess: refetchCart,
  })
}

export function useRemoveCartItem() {
  return useMutation({
    mutationFn: (id: string) => apiFetch(API_ENDPOINTS.cartItem(id), { method: HttpMethod.Delete }),
    onSuccess: refetchCart,
  })
}
