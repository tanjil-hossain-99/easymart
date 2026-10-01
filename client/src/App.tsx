import { Header } from "@/components/Header"
import { RequireAuth } from "@/components/RequireAuth"
import { AuthMode, ROUTES } from "@/lib/constants"
import { AuthPage } from "@/pages/AuthPage"
import { CartPage } from "@/pages/CartPage"
import { CheckoutPage } from "@/pages/CheckoutPage"
import { HomePage } from "@/pages/HomePage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { OrderPage } from "@/pages/OrderPage"
import { OrdersPage } from "@/pages/OrdersPage"
import { ProductDetailPage } from "@/pages/ProductDetailPage"
import { ProductsPage } from "@/pages/ProductsPage"
import { ProfilePage } from "@/pages/ProfilePage"
import { Outlet, Route, Routes } from "react-router"

// Shared layout: header on every page, the matched route renders in <Outlet />
function Layout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
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

        {/* Logged-in only */}
        <Route element={<RequireAuth />}>
          <Route path={ROUTES.cart} element={<CartPage />} />
          <Route path={ROUTES.checkout} element={<CheckoutPage />} />
          <Route path={ROUTES.orders} element={<OrdersPage />} />
          <Route path={ROUTES.orderDetail} element={<OrderPage />} />
          <Route path={ROUTES.profile} element={<ProfilePage />} />
        </Route>

        {/* Catch-all. React Router ranks routes by specificity, so "*" only
            matches when no other route does */}
        <Route path={ROUTES.notFound} element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
