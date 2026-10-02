import { useMutation } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { API_ENDPOINTS, HttpMethod } from "@/lib/constants"
import { queryClient } from "@/lib/queryClient"
import { useAuthStore } from "@/stores/useAuthStore"
import { useGuestCartStore } from "@/stores/useGuestCartStore"
import type { AuthResponse, Credentials } from "@/types/api"

type AuthEndpoint = typeof API_ENDPOINTS.auth.login | typeof API_ENDPOINTS.auth.register

// useMutation (not useQuery) because login/register change server state
// and should only run when the user submits — never automatically.
function useAuthMutation(endpoint: AuthEndpoint) {
  const setAuth = useAuthStore((s) => s.setAuth)
  const guestCart = useGuestCartStore()

  return useMutation({
    mutationFn: (body: Credentials) =>
      apiFetch<AuthResponse>(endpoint, { method: HttpMethod.Post, body }),
    onSuccess: async ({ token, user }) => {
      setAuth(token, user)

      // Merge guest cart into the server cart — fire all requests in parallel
      if (guestCart.items.length > 0) {
        await Promise.allSettled(
          guestCart.items.map((item) =>
            apiFetch(API_ENDPOINTS.cartItems, {
              method: HttpMethod.Post,
              body: { product_id: item.product_id, variant_id: item.variant_id ?? null, quantity: item.quantity },
            }),
          ),
        )
        guestCart.clear()
        queryClient.invalidateQueries({ queryKey: ["cart"] })
      }
    },
  })
}

export const useLogin = () => useAuthMutation(API_ENDPOINTS.auth.login)
export const useRegister = () => useAuthMutation(API_ENDPOINTS.auth.register)

export function useLogout() {
  const logout = useAuthStore((s) => s.logout)
  return async () => {
    // Tell the server to stamp last_logout_at — invalidates the token server-side.
    // Fire-and-forget: even if it fails we still clear the client session.
    try {
      await apiFetch("/auth/logout", { method: HttpMethod.Post })
    } catch {
      // ignore — network error or already expired token
    }
    logout()
    queryClient.clear()
  }
}
