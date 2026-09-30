import { useEffect } from "react"
import { Link, useParams, useSearchParams } from "react-router"
import { useOrder } from "@/hooks/useOrders"
import {
  ORDER_STATUS_LABELS,
  OrderStatus,
  QUERY_KEYS,
  ROUTES,
  STRIPE_REDIRECT,
  checkoutUrl,
} from "@/lib/constants"
import { formatPrice } from "@/lib/format"
import { queryClient } from "@/lib/queryClient"

export function OrderPage() {
  const { orderId } = useParams()
  const [searchParams] = useSearchParams()
  const { data: order, isPending, isError, error } = useOrder(orderId!, { pollWhilePending: true })

  // Stripe adds ?redirect_status=failed to return_url when e.g. 3D Secure was rejected
  const paymentFailed = searchParams.get(STRIPE_REDIRECT.statusParam) === STRIPE_REDIRECT.failed
  const isPaid = order?.status === OrderStatus.Paid

  // The webhook removed the bought items from the cart on the server —
  // refetch so the header's cart count updates
  // Same for the order list, so it shows this order as paid
  useEffect(() => {
    if (!isPaid) return
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] })
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.orders] })
  }, [isPaid])

  if (isPending) return <p className="p-6">Loading…</p>
  if (isError) return <p className="p-6 text-destructive">{error.message}</p>

  const isAwaitingPayment = order.status === OrderStatus.Pending

  return (
    <div className="mx-auto max-w-2xl p-6">
      {isPaid && <h1 className="mb-2 text-2xl font-semibold">Thank you! Your order is confirmed 🎉</h1>}

      {isAwaitingPayment && paymentFailed && (
        <p className="mb-4 text-destructive">
          Payment didn't go through.{" "}
          <Link to={checkoutUrl(order.id)} className="underline">
            Try again
          </Link>
        </p>
      )}

      {/* Stripe redirects here the moment payment succeeds, but our server only learns
          about it from the webhook a moment later — so "pending" briefly shows here. */}
      {isAwaitingPayment && !paymentFailed && (
        <p className="mb-4 text-muted-foreground">Confirming your payment…</p>
      )}

      <div className="mb-4 text-sm text-muted-foreground">
        Order <span className="font-mono">{order.id.slice(0, 8)}</span> ·{" "}
        {new Date(order.created_at).toLocaleString()} ·{" "}
        <strong className="text-foreground">{ORDER_STATUS_LABELS[order.status]}</strong>
      </div>

      <ul className="divide-y rounded-lg border">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 p-4">
            {item.primary_image && (
              <img src={item.primary_image} alt={item.title} className="size-12 rounded object-cover" />
            )}
            <span className="flex-1">
              {item.title} <span className="text-muted-foreground">× {item.quantity}</span>
            </span>
            {/* price_at_purchase: what they actually paid, even if the price changes later */}
            <span>{formatPrice(item.line_total)}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-right text-lg">
        Total: <strong>{formatPrice(order.total_amount)}</strong>
      </p>

      <div className="mt-6 flex gap-4">
        <Link to={ROUTES.orders} className="text-primary underline">
          All orders
        </Link>
        <Link to={ROUTES.home} className="text-primary underline">
          Continue shopping
        </Link>
      </div>
    </div>
  )
}
