import { useState } from "react"
import { Link } from "react-router"
import { CartIcon } from "@/components/CartIcon"
import { SearchBar } from "@/components/SearchBar"
import { useLogout } from "@/hooks/useAuth"
import { useCart } from "@/hooks/useCart"
import { ROUTES } from "@/lib/constants"
import { useAuthStore } from "@/stores/useAuthStore"

// Amazon-style hover: a thin outline appears around each header block
const NAV_BLOCK = "rounded-sm border border-transparent px-2 py-1 hover:border-nav-foreground"

export function Header() {
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()
  const [searchActive, setSearchActive] = useState(false)
  const { data: cart } = useCart()

  // Total units, not distinct products: 3 of one item shows "3"
  const cartCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
  // "Hello, jane" from jane@example.com
  const firstName = user?.email.split("@")[0]

  return (
    <header>
      {/* relative z-50: the top bar (search box + dropdown) stays above the overlay */}
      <div className="relative z-50 flex items-center gap-3 bg-nav px-4 py-2 text-nav-foreground">
        <Link to={ROUTES.home} className={`${NAV_BLOCK} text-xl font-bold tracking-tight`}>
          easy<span className="text-brand">mart</span>
        </Link>

        <SearchBar onActiveChange={setSearchActive} />

        {user ? (
          <div className={`${NAV_BLOCK} text-xs leading-tight`}>
            <Link to={ROUTES.profile} className="block hover:underline">
              Hello, {firstName}
            </Link>
            <button onClick={logout} className="text-sm font-bold hover:underline">
              Sign out
            </button>
          </div>
        ) : (
          <Link to={ROUTES.login} className={`${NAV_BLOCK} text-xs leading-tight`}>
            <p>Hello, sign in</p>
            <p className="text-sm font-bold">Account</p>
          </Link>
        )}

        <Link to={ROUTES.orders} className={`${NAV_BLOCK} hidden text-xs leading-tight sm:block`}>
          <p>Returns</p>
          <p className="text-sm font-bold">& Orders</p>
        </Link>

        <Link
          to={ROUTES.cart}
          className={`${NAV_BLOCK} flex items-end gap-1`}
          aria-label={`Cart, ${cartCount} items`}
        >
          <CartIcon count={cartCount} />
          <span className="hidden text-sm font-bold sm:inline">Cart</span>
        </Link>
      </div>

      {/* Amazon-style focus overlay: dims everything below the top bar.
          Clicking it moves focus off the input, which closes the search (via onBlur). */}
      {searchActive && (
        <div aria-hidden="true" className="fixed inset-0 z-40 bg-overlay" />
      )}
    </header>
  )
}
