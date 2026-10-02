import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { API_ENDPOINTS, HttpMethod, ORDER_POLL_INTERVAL, OrderStatus, QUERY_KEYS } from "@/lib/constants"
import { queryClient } from "@/lib/queryClient"
import type { CheckoutResponse, Order, OrdersPage } from "@/types/api"

// Cart → pending order + Stripe PaymentIntent
export function useCheckout() {
  return useMutation({
    mutationFn: () => apiFetch<CheckoutResponse>(API_ENDPOINTS.checkout, { method: HttpMethod.Post }),
    // A new (pending) order now exists — make the order list show it
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.orders] }),
  })
}

// Confirm a COD order — skips Stripe, clears cart, sets status to "confirmed"
export function usePlaceCodOrder(orderId: string) {
  return useMutation({
    mutationFn: () => apiFetch(API_ENDPOINTS.orderCod(orderId), { method: HttpMethod.Post }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.orders] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.order, orderId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] })
    },
  })
}

export function useOrders() {
  return useInfiniteQuery<OrdersPage>({
    queryKey: [QUERY_KEYS.orders],
    queryFn: ({ pageParam = 1 }) =>
      apiFetch(`${API_ENDPOINTS.orders}?page=${pageParam}&limit=10`),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  })
}

type UseOrderOptions = {
  // Keep re-fetching while the order is pending (waiting for the webhook)
  pollWhilePending?: boolean
}

export function useOrder(orderId: string, { pollWhilePending = false }: UseOrderOptions = {}) {
  return useQuery<Order>({
    queryKey: [QUERY_KEYS.order, orderId],
    queryFn: () => apiFetch(API_ENDPOINTS.order(orderId)),
    // refetchInterval as a function: poll every 2s while pending, stop once it's paid
    refetchInterval: (query) =>
      pollWhilePending && query.state.data?.status === OrderStatus.Pending
        ? ORDER_POLL_INTERVAL
        : false,
  })
}
