import { lazy, Suspense } from "react"
import { Footer } from "@/components/Footer"
import { Header } from "@/components/Header"
import { RequireAuth } from "@/components/RequireAuth"
import { AuthMode, ROUTES } from "@/lib/constants"
import { Outlet, Route, Routes } from "react-router"

const AuthPage          = lazy(() => import("@/pages/AuthPage").then(m => ({ default: m.AuthPage })))
const CartPage          = lazy(() => import("@/pages/CartPage").then(m => ({ default: m.CartPage })))
const CheckoutPage      = lazy(() => import("@/pages/CheckoutPage").then(m => ({ default: m.CheckoutPage })))
const HomePage          = lazy(() => import("@/pages/HomePage").then(m => ({ default: m.HomePage })))
const NotFoundPage      = lazy(() => import("@/pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })))
const OrderPage         = lazy(() => import("@/pages/OrderPage").then(m => ({ default: m.OrderPage })))
const OrdersPage        = lazy(() => import("@/pages/OrdersPage").then(m => ({ default: m.OrdersPage })))
const ProductDetailPage = lazy(() => import("@/pages/ProductDetailPage").then(m => ({ default: m.ProductDetailPage })))
const ProductsPage      = lazy(() => import("@/pages/ProductsPage").then(m => ({ default: m.ProductsPage })))
const ProfilePage       = lazy(() => import("@/pages/ProfilePage").then(m => ({ default: m.ProfilePage })))
const SavedPage         = lazy(() => import("@/pages/SavedPage").then(m => ({ default: m.SavedPage })))

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  )
}

// Shared layout: header on every page, the matched route renders in <Outlet />
function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.search} element={<ProductsPage />} />
        <Route path={ROUTES.productDetail} element={<ProductDetailPage />} />
        <Route path={ROUTES.login} element={<AuthPage mode={AuthMode.Login} />} />
        <Route path={ROUTES.register} element={<AuthPage mode={AuthMode.Register} />} />

        {/* Cart is accessible to guests — GuestCartPage handles the unauthed state */}
        <Route path={ROUTES.cart} element={<CartPage />} />

        {/* Logged-in only */}
        <Route element={<RequireAuth />}>
          <Route path={ROUTES.checkout} element={<CheckoutPage />} />
          <Route path={ROUTES.orders} element={<OrdersPage />} />
          <Route path={ROUTES.orderDetail} element={<OrderPage />} />
          <Route path={ROUTES.profile} element={<ProfilePage />} />
          <Route path={ROUTES.saved} element={<SavedPage />} />
        </Route>

        {/* Catch-all. React Router ranks routes by specificity, so "*" only
            matches when no other route does */}
        <Route path={ROUTES.notFound} element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
