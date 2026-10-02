import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { useAddToCart, useCart } from "@/hooks/useCart"
import { CART, ROUTES } from "@/lib/constants"
import { useGuestCartStore } from "@/stores/useGuestCartStore"
import { useAuthStore } from "@/stores/useAuthStore"

type Props = {
  productId: string
  stock?: number
  compact?: boolean
}

export function AddToCartButton({ productId, stock, compact = false }: Props) {
  const isLoggedIn = useAuthStore((s) => !!s.token)
  const addToCart = useAddToCart()
  const { data: cart } = useCart()
  const guestCart = useGuestCartStore()

  const inServerCart = cart?.items.some((item) => item.product_id === productId) ?? false
  const inGuestCart = guestCart.items.some((item) => item.product_id === productId)
  const inCart = isLoggedIn ? inServerCart : inGuestCart

  function handleClick() {
    if (isLoggedIn) {
      addToCart.mutate({ product_id: productId, quantity: CART.defaultAddQuantity })
    } else {
      guestCart.addItem(productId, CART.defaultAddQuantity)
    }
  }

  const outOfStock = stock !== undefined && stock <= 0

  return (
    <div className={`flex items-center gap-3 ${compact ? "" : "my-4"}`}>
      <Button
        size={compact ? "sm" : "lg"}
        onClick={handleClick}
        disabled={outOfStock || addToCart.isPending || inCart}
        className="rounded-full bg-brand px-4 text-brand-foreground hover:bg-brand-hover"
      >
        {outOfStock ? "Out of stock" : addToCart.isPending ? "Adding…" : "Add to cart"}
      </Button>

      {(inCart || addToCart.isSuccess) && (
        <span className="text-sm">
          Added ✓{" "}
          <Link to={ROUTES.cart} className="text-brand-text underline">
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
