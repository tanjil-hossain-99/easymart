import { Link } from "react-router"
import { useOrders } from "@/hooks/useOrders"
import { ORDER_STATUS_LABELS, OrderStatus, ROUTES, checkoutUrl, orderUrl } from "@/lib/constants"
import { formatPrice } from "@/lib/format"

export function OrdersPage() {
  const { data: orders, isPending, isError, error } = useOrders()

  if (isPending) return <p className="p-6">Loading orders…</p>
  if (isError) return <p className="p-6 text-destructive">{error.message}</p>

  if (orders.length === 0) {
    return (
      <div className="p-6">
        <h1 className="mb-2 text-2xl font-semibold">No orders yet</h1>
        <Link to={ROUTES.home} className="text-primary underline">
          Start shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Your orders</h1>

      <ul className="divide-y rounded-lg border">
        {orders.map((order) => {
          const isPending = order.status === OrderStatus.Pending
          return (
            <li key={order.id}>
              {/* Unpaid orders go back to the payment page; everything else shows details */}
              <Link
                to={isPending ? checkoutUrl(order.id) : orderUrl(order.id)}
                className="flex items-center gap-4 p-4 hover:bg-muted"
              >
                <div className="flex-1">
                  <p className="font-mono text-sm">{order.id.slice(0, 8)}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()} · {order.item_count} item
                    {order.item_count === 1 ? "" : "s"}
                  </p>
                </div>
                <span className={isPending ? "text-sm text-destructive" : "text-sm"}>
                  {isPending ? "Pay now →" : ORDER_STATUS_LABELS[order.status]}
                </span>
                <span className="w-28 text-right font-medium">{formatPrice(order.total_amount)}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
