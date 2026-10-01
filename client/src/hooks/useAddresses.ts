import { useMutation, useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { API_ENDPOINTS, HttpMethod, QUERY_KEYS } from "@/lib/constants"
import { queryClient } from "@/lib/queryClient"
import type { Address, AddressInput } from "@/types/api"

export function useAddresses() {
  return useQuery<Address[]>({
    queryKey: [QUERY_KEYS.addresses],
    queryFn: () => apiFetch(API_ENDPOINTS.addresses),
  })
}

export function useCreateAddress() {
  return useMutation({
    mutationFn: (data: AddressInput) =>
      apiFetch<Address>(API_ENDPOINTS.addresses, { method: HttpMethod.Post, body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.addresses] }),
  })
}

export function useUpdateAddress() {
  return useMutation({
    mutationFn: ({ id, ...data }: AddressInput & { id: string }) =>
      apiFetch<Address>(`${API_ENDPOINTS.addresses}/${id}`, { method: HttpMethod.Patch, body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.addresses] }),
  })
}

export function useDeleteAddress() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`${API_ENDPOINTS.addresses}/${id}`, { method: HttpMethod.Delete }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.addresses] }),
  })
}

export function useSaveOrderAddress() {
  return useMutation({
    mutationFn: ({ orderId, ...address }: Omit<AddressInput, "is_default"> & { orderId: string }) =>
      apiFetch(`${API_ENDPOINTS.orders}/${orderId}/address`, {
        method: HttpMethod.Patch,
        body: address,
      }),
  })
}
