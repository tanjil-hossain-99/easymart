import { useState } from "react"
import { useNavigate } from "react-router"
import { SaveButton } from "@/components/SaveButton"
import { Button } from "@/components/ui/button"
import { useAddToCart, useCart } from "@/hooks/useCart"
import { BUY_BOX, CART, ROUTES, STORE_NAME } from "@/lib/constants"
import { formatPrice } from "@/lib/format"
import { useAuthStore } from "@/stores/useAuthStore"
import { useGuestCartStore } from "@/stores/useGuestCartStore"

type Props = {
  productId: string
  finalPrice: string
  stock: number
  merchantName: string
}

// The right-hand purchase card on the product page
export function BuyBox({ productId, finalPrice, stock, merchantName }: Props) {
  const [quantity, setQuantity] = useState<number>(CART.defaultAddQuantity)
  const isLoggedIn = useAuthStore((s) => !!s.token)
  const addToCart = useAddToCart()
  const navigate = useNavigate()
  const { data: cart } = useCart()
  const guestCart = useGuestCartStore()

  const inStock = stock > 0
  const maxQuantity = Math.min(stock, BUY_BOX.maxQuantity)
  const quantityOptions = Array.from({ length: maxQuantity }, (_, i) => i + CART.minQuantity)

  const inServerCart = cart?.items.some((i) => i.product_id === productId) ?? false
  const inGuestCart = guestCart.items.some((i) => i.product_id === productId)
  const alreadyInCart = isLoggedIn ? inServerCart : inGuestCart

  function add(onDone?: () => void) {
    if (isLoggedIn) {
      addToCart.mutate({ product_id: productId, quantity }, { onSuccess: onDone })
    } else {
      guestCart.addItem(productId, quantity)
      onDone?.()
    }
  }

  return (
    <aside className="flex flex-col gap-3 rounded-lg border p-4" aria-label="Buy">
      <p className="text-2xl font-medium">{formatPrice(finalPrice)}</p>

      <StockMessage stock={stock} />

      {inStock && (
        <>
          {!alreadyInCart && (
            <label className="flex items-center gap-2 text-sm">
              Quantity:
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="rounded-md border bg-muted px-2 py-1"
              >
                {quantityOptions.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          )}

          {alreadyInCart ? (
            <Button
              onClick={() => navigate(ROUTES.cart)}
              className="h-9 rounded-full bg-green-600 text-white hover:bg-green-700"
            >
              Go to Cart
            </Button>
          ) : (
            <Button
              onClick={() => add()}
              disabled={addToCart.isPending}
              className="h-9 rounded-full bg-brand text-brand-foreground hover:bg-brand-hover"
            >
              {addToCart.isPending ? "Adding…" : "Add to Cart"}
            </Button>
          )}

          {/* Buy Now: add then navigate to cart */}
          <Button
            onClick={() => alreadyInCart ? navigate(ROUTES.cart) : add(() => navigate(ROUTES.cart))}
            disabled={addToCart.isPending}
            className="h-9 rounded-full bg-brand-hover text-brand-foreground hover:bg-brand"
          >
            Buy Now
          </Button>

          {addToCart.isError && <p className="text-sm text-destructive">{addToCart.error.message}</p>}
        </>
      )}

      <SaveButton productId={productId} />

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <dt>Ships from</dt>
        <dd className="text-foreground">{STORE_NAME}</dd>
        <dt>Sold by</dt>
        <dd className="text-foreground">{merchantName}</dd>
      </dl>
    </aside>
  )
}

function StockMessage({ stock }: { stock: number }) {
  if (stock <= 0) return <p className="text-lg font-medium text-destructive">Currently unavailable.</p>
  if (stock <= BUY_BOX.lowStockThreshold) {
    return <p className="font-medium text-destructive">Only {stock} left in stock - order soon.</p>
  }
  return <p className="text-lg font-medium text-green-700 dark:text-green-500">In Stock</p>
}
