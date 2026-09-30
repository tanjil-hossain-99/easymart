import { Link, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { useCart, useRemoveCartItem, useUpdateCartItem } from "@/hooks/useCart"
import { useCheckout } from "@/hooks/useOrders"
import { CART, ROUTES, checkoutUrl, productUrl } from "@/lib/constants"
import { formatPrice } from "@/lib/format"
import type { CartItem } from "@/types/api"

export function CartPage() {
  const { data: cart, isPending, isError } = useCart()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const checkout = useCheckout()
  const navigate = useNavigate()

  if (isPending) return <p className="p-6">Loading cart…</p>
  if (isError) return <p className="p-6 text-destructive">Failed to load cart.</p>

  if (cart.items.length === 0) {
    return (
      <div className="p-6">
        <h1 className="mb-2 text-2xl font-semibold">Your cart is empty</h1>
        <Link to={ROUTES.home} className="text-primary underline">
          Browse products
        </Link>
      </div>
    )
  }

  // Any mutation's error (e.g. server rejected the change, out of stock) is shown once at the top
  const mutationError = updateItem.error ?? removeItem.error ?? checkout.error

  function handleCheckout() {
    checkout.mutate(undefined, {
      onSuccess: ({ orderId }) => navigate(checkoutUrl(orderId)),
    })
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Your cart</h1>

      {mutationError && <p className="mb-4 text-sm text-destructive">{mutationError.message}</p>}

      <ul className="divide-y rounded-lg border">
        {cart.items.map((item) => (
          <CartRow
            key={item.id}
            item={item}
            // Only disable the row being changed, not the whole cart
            busy={
              (updateItem.isPending && updateItem.variables?.id === item.id) ||
              (removeItem.isPending && removeItem.variables === item.id)
            }
            onQuantityChange={(quantity) => updateItem.mutate({ id: item.id, quantity })}
            onRemove={() => removeItem.mutate(item.id)}
          />
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-lg">
          Subtotal: <strong>{formatPrice(cart.subtotal)}</strong>
        </span>
        <Button size="lg" onClick={handleCheckout} disabled={checkout.isPending}>
          {checkout.isPending ? "Creating order…" : "Checkout"}
        </Button>
      </div>
    </div>
  )
}

type CartRowProps = {
  item: CartItem
  busy: boolean
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
}

function CartRow({ item, busy, onQuantityChange, onRemove }: CartRowProps) {
  // stock is null if the product has no inventory row — treat as 0 available
  const stock = item.stock ?? 0
  const overStock = item.quantity > stock

  return (
    <li className="flex items-center gap-4 p-4">
      {item.primary_image && (
        <img src={item.primary_image} alt={item.title} className="size-16 rounded object-cover" />
      )}

      <div className="min-w-0 flex-1">
        <Link to={productUrl(item.product_id)} className="font-medium hover:underline">
          {item.title}
        </Link>
        {item.variant_type && (
          <p className="text-sm text-muted-foreground">
            {item.variant_type}: {item.variant_value}
          </p>
        )}
        <p className="text-sm text-muted-foreground">{formatPrice(item.unit_price)} each</p>
        {/* Stock can drop after the item was added; checkout will reject it, so warn early */}
        {overStock && <p className="text-sm text-destructive">Only {stock} left in stock</p>}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Decrease quantity"
          disabled={busy || item.quantity <= CART.minQuantity}
          onClick={() => onQuantityChange(item.quantity - 1)}
        >
          −
        </Button>
        <span className="w-8 text-center tabular-nums">{item.quantity}</span>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Increase quantity"
          disabled={busy || item.quantity >= stock}
          onClick={() => onQuantityChange(item.quantity + 1)}
        >
          +
        </Button>
      </div>

      <Button variant="ghost" size="sm" disabled={busy} onClick={onRemove}>
        Remove
      </Button>
    </li>
  )
}
