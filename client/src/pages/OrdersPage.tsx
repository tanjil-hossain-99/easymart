import { Link } from "react-router"
import { useOrders } from "@/hooks/useOrders"
import { ORDER_STATUS_LABELS, OrderStatus, ROUTES, checkoutUrl, orderUrl } from "@/lib/constants"
import { formatPrice } from "@/lib/format"

const STATUS_STYLES: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: "bg-yellow-100 text-yellow-800",
  [OrderStatus.Paid]: "bg-green-100 text-green-800",
  [OrderStatus.Shipped]: "bg-blue-100 text-blue-800",
  [OrderStatus.Cancelled]: "bg-red-100 text-red-800",
}

export function OrdersPage() {
  const { data: orders, isPending, isError, error } = useOrders()

  if (isPending) return <p className="p-6">Loading orders…</p>
  if (isError) return <p className="p-6 text-destructive">{error.message}</p>

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="mb-2 text-2xl font-semibold">Your orders</h1>
        <p className="text-muted-foreground">You haven't placed any orders yet.</p>
        <Link to={ROUTES.home} className="mt-4 inline-block text-primary underline">
          Start shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Your orders</h1>

      <ul className="space-y-3">
        {orders.map((order) => {
          const isPendingOrder = order.status === OrderStatus.Pending
          const to = isPendingOrder ? checkoutUrl(order.id) : orderUrl(order.id)
          const extraItems = order.item_count - 1

          return (
            <li key={order.id}>
              <Link
                to={to}
                className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md"
              >
                {/* Thumbnail */}
                <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {order.preview_image ? (
                    <img
                      src={order.preview_image}
                      alt={order.first_title ?? "Product"}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full" />
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium leading-snug">
                    {order.first_title ?? "Order"}
                    {extraItems > 0 && (
                      <span className="ml-1 text-muted-foreground">+{extraItems} more</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {order.item_count} item{order.item_count === 1 ? "" : "s"}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>

                {/* Status + price */}
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status]}`}>
                    {isPendingOrder ? "Pay now →" : ORDER_STATUS_LABELS[order.status]}
                  </span>
                  <span className="font-semibold">{formatPrice(order.total_amount)}</span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
