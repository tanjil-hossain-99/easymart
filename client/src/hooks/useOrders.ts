import { useMutation, useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { API_ENDPOINTS, HttpMethod, ORDER_POLL_INTERVAL, OrderStatus, QUERY_KEYS } from "@/lib/constants"
import type { CheckoutResponse, Order } from "@/types/api"

// Cart → pending order + Stripe PaymentIntent
export function useCheckout() {
  return useMutation({
    mutationFn: () => apiFetch<CheckoutResponse>(API_ENDPOINTS.checkout, { method: HttpMethod.Post }),
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
