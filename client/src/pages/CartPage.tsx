import { Link, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { useCart, useRemoveCartItem, useUpdateCartItem } from "@/hooks/useCart"
import { useCheckout } from "@/hooks/useOrders"
import { useProduct } from "@/hooks/useProducts"
import { CART, ROUTES, checkoutUrl, productUrl } from "@/lib/constants"
import { formatPrice } from "@/lib/format"
import { useAuthStore } from "@/stores/useAuthStore"
import { useGuestCartStore } from "@/stores/useGuestCartStore"
import type { CartItem } from "@/types/api"

function GuestCartPage() {
  const guestCart = useGuestCartStore()

  if (guestCart.items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex size-24 items-center justify-center rounded-full bg-muted text-5xl">🛒</div>
        <div>
          <h1 className="text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-1 text-muted-foreground">Looks like you haven't added anything yet.</p>
        </div>
        <Link to={ROUTES.home}><Button size="lg">Start shopping</Button></Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">
        Your cart <span className="text-base font-normal text-muted-foreground">({guestCart.items.length} {guestCart.items.length === 1 ? "item" : "items"})</span>
      </h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ul className="divide-y rounded-xl border bg-card shadow-sm">
            {guestCart.items.map((item) => (
              <GuestCartRow
                key={item.product_id}
                productId={item.product_id}
                quantity={item.quantity}
                onQuantityChange={(q) => guestCart.updateItem(item.product_id, q)}
                onRemove={() => guestCart.removeItem(item.product_id)}
              />
            ))}
          </ul>
        </div>

        <div className="h-fit rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Ready to checkout?</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Sign in to place your order. Your cart items will be saved.
          </p>
          <Link to={ROUTES.login}>
            <Button size="lg" className="w-full">Sign in to checkout</Button>
          </Link>
          <Link to={ROUTES.register} className="mt-2 block text-center text-sm text-primary hover:underline">
            New here? Create an account
          </Link>
        </div>
      </div>
    </div>
  )
}

function GuestCartRow({ productId, quantity, onQuantityChange, onRemove }: {
  productId: string
  quantity: number
  onQuantityChange: (q: number) => void
  onRemove: () => void
}) {
  const { data: product } = useProduct(productId)

  return (
    <li className="flex gap-4 p-4">
      <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {product?.images?.[0]?.url && (
          <img src={product.images[0].url} alt={product.title} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link to={productUrl(productId)} className="font-medium leading-snug hover:underline line-clamp-2">
          {product?.title ?? "Loading…"}
        </Link>
        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg border px-1">
            <Button variant="ghost" size="icon-sm" disabled={quantity <= CART.minQuantity}
              onClick={() => onQuantityChange(quantity - 1)}>−</Button>
            <span className="w-7 text-center text-sm tabular-nums">{quantity}</span>
            <Button variant="ghost" size="icon-sm" onClick={() => onQuantityChange(quantity + 1)}>+</Button>
          </div>
          <button onClick={onRemove} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
            Remove
          </button>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold">{product ? formatPrice(product.final_price) : "—"}</p>
      </div>
    </li>
  )
}

function LoggedInCartPage() {
  const { data: cart, isPending, isError } = useCart()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const checkout = useCheckout()
  const navigate = useNavigate()

  if (isPending) return <p className="p-6">Loading cart…</p>
  if (isError) return <p className="p-6 text-destructive">Failed to load cart.</p>

  if (cart.items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        {/* Cart illustration */}
        <div className="flex size-24 items-center justify-center rounded-full bg-muted text-5xl">
          🛒
        </div>
        <div>
          <h1 className="text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-1 text-muted-foreground">Looks like you haven't added anything yet.</p>
        </div>
        <Link to={ROUTES.home}>
          <Button size="lg">Start shopping</Button>
        </Link>
      </div>
    )
  }

  const mutationError = updateItem.error ?? removeItem.error ?? checkout.error
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0)

  function handleCheckout() {
    checkout.mutate(undefined, {
      onSuccess: ({ orderId }) => navigate(checkoutUrl(orderId)),
    })
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">
        Your cart <span className="text-base font-normal text-muted-foreground">({itemCount} {itemCount === 1 ? "item" : "items"})</span>
      </h1>

      {mutationError && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {mutationError.message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items list */}
        <div className="lg:col-span-2">
          <ul className="divide-y rounded-xl border bg-card shadow-sm">
            {cart.items.map((item) => (
              <CartRow
                key={item.id}
                item={item}
                busy={
                  (updateItem.isPending && updateItem.variables?.id === item.id) ||
                  (removeItem.isPending && removeItem.variables === item.id)
                }
                onQuantityChange={(quantity) => updateItem.mutate({ id: item.id, quantity })}
                onRemove={() => removeItem.mutate(item.id)}
              />
            ))}
          </ul>
        </div>

        {/* Order summary */}
        <div className="h-fit rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Order summary</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal ({itemCount} items)</span>
              <span>{formatPrice(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping</span>
              <span className="text-green-600 font-medium">Free</span>
            </div>
          </div>

          <div className="my-4 border-t" />

          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatPrice(cart.subtotal)}</span>
          </div>

          <Button
            size="lg"
            className="mt-5 w-full"
            onClick={handleCheckout}
            disabled={checkout.isPending}
          >
            {checkout.isPending ? "Creating order…" : "Proceed to checkout"}
          </Button>

          <Link to={ROUTES.home} className="mt-3 block text-center text-sm text-primary hover:underline">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  )
}

export function CartPage() {
  const isLoggedIn = useAuthStore((s) => !!s.token)
  return isLoggedIn ? <LoggedInCartPage /> : <GuestCartPage />
}

type CartRowProps = {
  item: CartItem
  busy: boolean
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
}

function CartRow({ item, busy, onQuantityChange, onRemove }: CartRowProps) {
  const stock = item.stock ?? 0
  const overStock = item.quantity > stock

  return (
    <li className={`flex gap-4 p-4 transition-opacity ${busy ? "opacity-50" : ""}`}>
      {/* Thumbnail */}
      <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {item.primary_image && (
          <img src={item.primary_image} alt={item.title} className="h-full w-full object-cover" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link to={productUrl(item.product_id)} className="font-medium leading-snug hover:underline line-clamp-2">
          {item.title}
        </Link>
        {item.variant_type && (
          <p className="text-xs text-muted-foreground">
            {item.variant_type}: {item.variant_value}
          </p>
        )}
        {overStock && (
          <p className="text-xs text-destructive font-medium">Only {stock} left in stock</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3">
          {/* Quantity stepper */}
          <div className="flex items-center gap-1 rounded-lg border px-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Decrease"
              disabled={busy || item.quantity <= CART.minQuantity}
              onClick={() => onQuantityChange(item.quantity - 1)}
            >
              −
            </Button>
            <span className="w-7 text-center text-sm tabular-nums">{item.quantity}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Increase"
              disabled={busy || item.quantity >= stock}
              onClick={() => onQuantityChange(item.quantity + 1)}
            >
              +
            </Button>
          </div>

          <button
            onClick={onRemove}
            disabled={busy}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Price */}
      <div className="text-right">
        <p className="font-semibold">{formatPrice(item.unit_price)}</p>
        {item.quantity > 1 && (
          <p className="text-xs text-muted-foreground">{formatPrice(item.unit_price)} each</p>
        )}
      </div>
    </li>
  )
}
