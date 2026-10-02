import { useState } from "react"
import { Link } from "react-router"
import { CartIcon } from "@/components/CartIcon"
import { SearchBar } from "@/components/SearchBar"
import { useLogout } from "@/hooks/useAuth"
import { useCart } from "@/hooks/useCart"
import { ROUTES } from "@/lib/constants"
import { useAuthStore } from "@/stores/useAuthStore"
import { useGuestCartStore } from "@/stores/useGuestCartStore"

// Amazon-style hover: a thin outline appears around each header block
const NAV_BLOCK = "rounded-sm border border-transparent px-2 py-1 hover:border-nav-foreground"

function AccountDropdown() {
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()
  const firstName = user?.email.split("@")[0]

  return (
    // group: hovering anywhere in this container (trigger OR panel) keeps the panel open
    <div className="group relative">
      {/* Trigger */}
      <div className={`${NAV_BLOCK} cursor-default text-xs leading-tight`}>
        <p>{user ? `Hello, ${firstName}` : "Hello, sign in"}</p>
        <p className="text-sm font-bold">Account ▾</p>
      </div>

      {/* Dropdown panel — hidden until the group is hovered */}
      {/* pointer-events-none on the gap between trigger and panel would break hover;
          a negative top margin bridges it so the mouse never leaves the group */}
      <div className="invisible absolute right-0 top-full z-50 min-w-48 opacity-0 transition-all duration-100 group-hover:visible group-hover:opacity-100">
        {/* invisible bridge fills the gap between trigger and panel so hover doesn't break */}
        <div className="h-2 w-full" />
        {/* small arrow pointer */}
        <div className="ml-auto mr-4 h-0 w-0 border-x-8 border-b-8 border-x-transparent border-b-white dark:border-b-zinc-800" />

        <div className="rounded-md border bg-white py-2 pb-3 shadow-lg dark:bg-zinc-800 dark:border-zinc-700">
          {user ? (
            <>
              <DropdownSection>
                <DropdownLink to={ROUTES.profile}>Your account</DropdownLink>
                <DropdownLink to={ROUTES.orders}>Your orders</DropdownLink>
                <DropdownLink to={ROUTES.saved}>Saved items</DropdownLink>
              </DropdownSection>
              <div className="my-1 border-t dark:border-zinc-700" />
              <DropdownSection>
                <button
                  onClick={logout}
                  className="w-full px-4 py-1.5 text-left text-sm text-foreground hover:bg-muted dark:hover:bg-zinc-700"
                >
                  Sign out
                </button>
              </DropdownSection>
            </>
          ) : (
            <>
              <div className="px-4 py-2">
                <Link
                  to={ROUTES.login}
                  className="block w-full rounded-full bg-brand px-3 py-1.5 text-center text-sm font-semibold text-brand-foreground hover:bg-brand-hover"
                >
                  Sign in
                </Link>
              </div>
              <div className="my-1 border-t dark:border-zinc-700" />
              <DropdownSection>
                <p className="px-4 py-1 text-xs text-muted-foreground">New customer?</p>
                <DropdownLink to={ROUTES.register}>Create account</DropdownLink>
              </DropdownSection>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function DropdownSection({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

function DropdownLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="block px-4 py-1.5 text-sm text-foreground hover:bg-muted dark:hover:bg-zinc-700"
    >
      {children}
    </Link>
  )
}

export function Header() {
  const [searchActive, setSearchActive] = useState(false)
  const isLoggedIn = useAuthStore((s) => !!s.token)
  const { data: cart } = useCart()
  const guestItems = useGuestCartStore((s) => s.items)

  const cartCount = isLoggedIn
    ? (cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0)
    : guestItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <header>
      {/* relative z-50: the top bar (search box + dropdown) stays above the overlay */}
      <div className="relative z-50 flex items-center gap-3 bg-nav px-4 py-2 text-nav-foreground">
        <Link to={ROUTES.home} className={`${NAV_BLOCK} text-xl font-bold tracking-tight`}>
          Tc<span className="text-brand">Mart</span>
        </Link>

        <SearchBar onActiveChange={setSearchActive} />

        <AccountDropdown />

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
