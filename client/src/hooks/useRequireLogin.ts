import { useLocation, useNavigate } from "react-router"
import { ROUTES } from "@/lib/constants"
import { useAuthStore } from "@/stores/useAuthStore"

// For actions that need an account (add to cart, buy now).
// Returns a function: true if logged in; otherwise sends the user to /login and
// remembers this page (search + filters included) so they come straight back.
export function useRequireLogin() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const location = useLocation()

  return function requireLogin(): boolean {
    if (user) return true
    navigate(ROUTES.login, { state: { from: location.pathname + location.search } })
    return false
  }
}
