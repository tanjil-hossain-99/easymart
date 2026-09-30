import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { useLogout } from "@/hooks/useAuth"
import { useCart } from "@/hooks/useCart"
import { ROUTES } from "@/lib/constants"
import { useAuthStore } from "@/stores/useAuthStore"

export function Header() {
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()
  const { data: cart } = useCart()

  // Total units, not distinct products: 3 of one item shows "3"
  const cartCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <Link to={ROUTES.home} className="text-lg font-semibold">
        EasyMart
      </Link>

      <nav className="flex items-center gap-3 text-sm">
        {user ? (
          <>
            <Link to={ROUTES.cart}>Cart ({cartCount})</Link>
            <span className="text-muted-foreground">{user.email}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              Log out
            </Button>
          </>
        ) : (
          <>
            <Link to={ROUTES.login}>Log in</Link>
            {/* asChild: render the <Link> with Button styles, instead of a <button> inside a link */}
            <Button size="sm" asChild>
              <Link to={ROUTES.register}>Sign up</Link>
            </Button>
          </>
        )}
      </nav>
    </header>
  )
}
