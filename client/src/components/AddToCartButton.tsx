import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { useAddToCart } from "@/hooks/useCart"
import { useRequireLogin } from "@/hooks/useRequireLogin"
import { CART, ROUTES } from "@/lib/constants"

type Props = {
  productId: string
  // Unknown on search results (Algolia records don't carry live stock) — the server
  // re-checks stock at checkout anyway, so the button stays enabled
  stock?: number
  compact?: boolean // smaller variant for result cards
}

export function AddToCartButton({ productId, stock, compact = false }: Props) {
  const addToCart = useAddToCart()
  const requireLogin = useRequireLogin()

  function handleClick() {
    // Guests can browse, but the cart lives on the server under a user
    if (!requireLogin()) return
    addToCart.mutate({ product_id: productId, quantity: CART.defaultAddQuantity })
  }

  const outOfStock = stock !== undefined && stock <= 0

  return (
    <div className={`flex items-center gap-3 ${compact ? "" : "my-4"}`}>
      <Button
        size={compact ? "sm" : "lg"}
        onClick={handleClick}
        disabled={outOfStock || addToCart.isPending}
        // Amazon-style yellow pill button
        className="rounded-full bg-brand px-4 text-brand-foreground hover:bg-brand-hover"
      >
        {outOfStock ? "Out of stock" : addToCart.isPending ? "Adding…" : "Add to cart"}
      </Button>

      {addToCart.isSuccess && (
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
