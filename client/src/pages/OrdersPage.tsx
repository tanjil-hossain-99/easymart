import { Link } from "react-router"
import { useOrders } from "@/hooks/useOrders"
import { ORDER_STATUS_LABELS, OrderStatus, ROUTES, checkoutUrl, orderUrl } from "@/lib/constants"
import { formatPrice } from "@/lib/format"
import type { OrderSummary } from "@/types/api"

const STATUS_STYLES: Record<OrderStatus, string> = {
  [OrderStatus.Pending]:   "bg-yellow-100 text-yellow-800 border-yellow-200",
  [OrderStatus.Confirmed]: "bg-blue-100 text-blue-800 border-blue-200",
  [OrderStatus.Paid]:      "bg-green-100 text-green-800 border-green-200",
  [OrderStatus.Shipped]:   "bg-purple-100 text-purple-800 border-purple-200",
  [OrderStatus.Cancelled]: "bg-red-100 text-red-800 border-red-200",
}

const STATUS_ICONS: Record<OrderStatus, string> = {
  [OrderStatus.Pending]:   "⏳",
  [OrderStatus.Confirmed]: "✅",
  [OrderStatus.Paid]:      "💳",
  [OrderStatus.Shipped]:   "📦",
  [OrderStatus.Cancelled]: "❌",
}

export function OrdersPage() {
  const { data, isPending, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrders()

  if (isPending) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  )
  if (isError) return <p className="p-6 text-destructive">{error.message}</p>

  const allOrders = data.pages.flatMap(p => p.orders)
  const total = data.pages[0]?.total ?? 0

  if (allOrders.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <div className="flex size-20 items-center justify-center rounded-full bg-muted text-4xl">📋</div>
        <div>
          <h1 className="text-2xl font-bold">No orders yet</h1>
          <p className="mt-1 text-muted-foreground">Your order history will appear here once you place an order.</p>
        </div>
        <Link
          to={ROUTES.home}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Start shopping
        </Link>
      </div>
    )
  }

  const pendingOrders = allOrders.filter(o => o.status === OrderStatus.Pending)
  const otherOrders   = allOrders.filter(o => o.status !== OrderStatus.Pending)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your orders</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{total} order{total === 1 ? "" : "s"}</p>
        </div>
        <Link to={ROUTES.home} className="text-sm font-medium text-primary hover:underline">
          Continue shopping →
        </Link>
      </div>

      {/* Pending / awaiting payment — highlighted section */}
      {pendingOrders.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-yellow-700 dark:text-yellow-400">
            Awaiting payment
          </p>
          <ul className="space-y-3">
            {pendingOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </ul>
        </div>
      )}

      {/* All other orders */}
      {otherOrders.length > 0 && (
        <div>
          {pendingOrders.length > 0 && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Order history
            </p>
          )}
          <ul className="space-y-3">
            {otherOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </ul>
        </div>
      )}

      {/* Load more */}
      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage
              ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Loading…</>
              : `Load more (${total - allOrders.length} remaining)`
            }
          </button>
        </div>
      )}

      {!hasNextPage && allOrders.length > 10 && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          You've seen all {total} orders.
        </p>
      )}
    </div>
  )
}

function OrderCard({ order }: { order: OrderSummary }) {
  const isPendingOrder = order.status === OrderStatus.Pending
  const to = isPendingOrder ? checkoutUrl(order.id) : orderUrl(order.id)
  const extraItems = order.item_count - 1
  const statusStyle = STATUS_STYLES[order.status]
  const statusIcon  = STATUS_ICONS[order.status]

  return (
    <li>
      <Link
        to={to}
        className={`group flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${isPendingOrder ? "border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-800" : ""}`}
      >
        {/* Thumbnail */}
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
          {order.preview_image ? (
            <img
              src={order.preview_image}
              alt={order.first_title ?? "Product"}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-2xl text-muted-foreground">📦</div>
          )}
          {order.item_count > 1 && (
            <span className="absolute bottom-0.5 right-0.5 rounded-md bg-black/60 px-1 text-[10px] font-bold text-white leading-4">
              +{extraItems}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-snug group-hover:text-primary transition-colors">
            {order.first_title ?? "Order"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
            {" · "}
            {order.item_count} item{order.item_count === 1 ? "" : "s"}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/70">
            #{order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        {/* Status + price */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyle}`}>
            {statusIcon} {isPendingOrder ? "Pay now" : ORDER_STATUS_LABELS[order.status]}
          </span>
          <span className="text-base font-bold">{formatPrice(order.total_amount)}</span>
          {isPendingOrder && (
            <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Tap to pay →</span>
          )}
        </div>
      </Link>
    </li>
  )
}
