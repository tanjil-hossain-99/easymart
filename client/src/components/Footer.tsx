import { Link } from "react-router"
import { ROUTES } from "@/lib/constants"

export function Footer() {
  return (
    <footer className="border-t bg-muted mt-12">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <p className="text-xl font-extrabold tracking-tight">
              Tc<span className="text-brand">Mart</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Your one-stop shop for everything you need, delivered fast.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Shop</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to={ROUTES.home} className="hover:text-foreground transition-colors">Home</Link></li>
              <li><Link to={ROUTES.search} className="hover:text-foreground transition-colors">All Products</Link></li>
              <li><Link to={ROUTES.cart} className="hover:text-foreground transition-colors">Cart</Link></li>
              <li><Link to={ROUTES.orders} className="hover:text-foreground transition-colors">My Orders</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Account</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to={ROUTES.profile} className="hover:text-foreground transition-colors">Profile</Link></li>
              <li><Link to={ROUTES.login} className="hover:text-foreground transition-colors">Sign in</Link></li>
              <li><Link to={ROUTES.register} className="hover:text-foreground transition-colors">Register</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Support</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><span>Cash on Delivery available</span></li>
              <li><span>Secure payments</span></li>
              <li><span>Fast shipping</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 flex flex-col items-center gap-1 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} TcMart. All rights reserved.</p>
          <p>Powered by <span className="font-semibold text-foreground">TechCare</span></p>
        </div>
      </div>
    </footer>
  )
}
