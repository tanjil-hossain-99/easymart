import { useMutation } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { API_ENDPOINTS, HttpMethod } from "@/lib/constants"
import { queryClient } from "@/lib/queryClient"
import { useAuthStore } from "@/stores/useAuthStore"
import type { AuthResponse, Credentials } from "@/types/api"

type AuthEndpoint = typeof API_ENDPOINTS.auth.login | typeof API_ENDPOINTS.auth.register

// useMutation (not useQuery) because login/register change server state
// and should only run when the user submits — never automatically.
function useAuthMutation(endpoint: AuthEndpoint) {
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: (body: Credentials) =>
      apiFetch<AuthResponse>(endpoint, { method: HttpMethod.Post, body }),
    onSuccess: ({ token, user }) => setAuth(token, user),
  })
}

export const useLogin = () => useAuthMutation(API_ENDPOINTS.auth.login)
export const useRegister = () => useAuthMutation(API_ENDPOINTS.auth.register)

export function useLogout() {
  const logout = useAuthStore((s) => s.logout)
  return () => {
    logout()
    // Forget cached data from the previous user (e.g. their cart)
    queryClient.clear()
  }
}
