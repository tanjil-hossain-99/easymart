import { Navigate, Outlet, useLocation } from "react-router"
import { ROUTES } from "@/lib/constants"
import { useAuthStore } from "@/stores/useAuthStore"

// Wrap protected routes with this. Logged out → go to /login, remembering where
// the user wanted to go (AuthPage reads `from` and sends them back after login).
export function RequireAuth() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
