import { Outlet, Route, Routes, useNavigate, useParams } from "react-router"
import { Header } from "@/components/Header"
import { RequireAuth } from "@/components/RequireAuth"
import { AuthMode, ROUTES, productUrl } from "@/lib/constants"
import { AuthPage } from "@/pages/AuthPage"
import { CartPage } from "@/pages/CartPage"
import { CheckoutPage } from "@/pages/CheckoutPage"
import { OrderPage } from "@/pages/OrderPage"
import { ProductDetailPage } from "@/pages/ProductDetailPage"
import { ProductsPage } from "@/pages/ProductsPage"

// Shared layout: header on every page, the matched route renders in <Outlet />
function Layout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}

// Thin wrappers so the existing pages keep their props (onSelect / onBack)
function ProductsRoute() {
  const navigate = useNavigate()
  return <ProductsPage onSelect={(id) => navigate(productUrl(id))} />
}

function ProductDetailRoute() {
  const { id } = useParams()
  const navigate = useNavigate()
  return <ProductDetailPage id={id!} onBack={() => navigate(-1)} />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path={ROUTES.home} element={<ProductsRoute />} />
        <Route path={ROUTES.productDetail} element={<ProductDetailRoute />} />
        <Route path={ROUTES.login} element={<AuthPage mode={AuthMode.Login} />} />
        <Route path={ROUTES.register} element={<AuthPage mode={AuthMode.Register} />} />

        {/* Logged-in only */}
        <Route element={<RequireAuth />}>
          <Route path={ROUTES.cart} element={<CartPage />} />
          <Route path={ROUTES.checkout} element={<CheckoutPage />} />
          <Route path={ROUTES.orderDetail} element={<OrderPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
