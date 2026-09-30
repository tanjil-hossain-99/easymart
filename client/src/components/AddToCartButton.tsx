import { Link, useLocation, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { useAddToCart } from "@/hooks/useCart"
import { CART, ROUTES } from "@/lib/constants"
import { useAuthStore } from "@/stores/useAuthStore"

type Props = {
  productId: string
  stock: number
}

export function AddToCartButton({ productId, stock }: Props) {
  const user = useAuthStore((s) => s.user)
  const addToCart = useAddToCart()
  const navigate = useNavigate()
  const location = useLocation()

  function handleClick() {
    // Guests can browse, but the cart lives on the server under a user — log in first,
    // then come straight back to this product
    if (!user) {
      navigate(ROUTES.login, { state: { from: location.pathname } })
      return
    }
    addToCart.mutate({ product_id: productId, quantity: CART.defaultAddQuantity })
  }

  const outOfStock = stock <= 0

  return (
    <div className="my-4 flex items-center gap-3">
      <Button size="lg" onClick={handleClick} disabled={outOfStock || addToCart.isPending}>
        {outOfStock ? "Out of stock" : addToCart.isPending ? "Adding…" : "Add to cart"}
      </Button>

      {addToCart.isSuccess && (
        <span className="text-sm">
          Added ✓{" "}
          <Link to={ROUTES.cart} className="text-primary underline">
            View cart
          </Link>
        </span>
      )}
      {addToCart.isError && (
        <span className="text-sm text-destructive">{addToCart.error.message}</span>
      )}
    </div>
  )
}
