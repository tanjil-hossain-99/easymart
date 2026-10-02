import { useEffect, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router"
import { useOrder } from "@/hooks/useOrders"
import { isNotFoundError } from "@/lib/api"
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
import { useAuthStore } from "@/stores/useAuthStore"
import { NotFoundPage } from "@/pages/NotFoundPage"

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  paid:      "bg-green-100 text-green-800 border-green-200",
  shipped:   "bg-purple-100 text-purple-800 border-purple-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
}

const STATUS_ICONS: Record<string, string> = {
  pending:   "⏳",
  confirmed: "✅",
  paid:      "💳",
  shipped:   "📦",
  cancelled: "❌",
}

export function OrderPage() {
  const { orderId } = useParams()
  const [searchParams] = useSearchParams()
  const { data: order, isPending, isError, error } = useOrder(orderId!, { pollWhilePending: true })
  const token = useAuthStore((s) => s.token)
  const [downloading, setDownloading] = useState(false)

  async function downloadInvoice() {
    if (!order) return
    setDownloading(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/invoices/${order.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `invoice-${order.id.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  const paymentFailed = searchParams.get(STRIPE_REDIRECT.statusParam) === STRIPE_REDIRECT.failed
  const isPaid = order?.status === OrderStatus.Paid
  const isConfirmed = order?.status === OrderStatus.Confirmed

  useEffect(() => {
    if (!isPaid) return
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] })
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.orders] })
  }, [isPaid])

  if (isPending) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  )
  if (isError && isNotFoundError(error)) return <NotFoundPage thing="order" />
  if (isError) return <p className="p-6 text-destructive">{error.message}</p>

  const isAwaitingPayment = order.status === OrderStatus.Pending
  const canDownloadInvoice = isPaid || isConfirmed || order.status === OrderStatus.Shipped
  const statusStyle = STATUS_STYLES[order.status] ?? "bg-muted text-foreground border-border"
  const statusIcon = STATUS_ICONS[order.status] ?? "📋"

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">

      {/* Hero banner for success states */}
      {(isPaid || isConfirmed) && (
        <div className="mb-6 rounded-2xl bg-linear-to-br from-green-50 to-emerald-50 border border-green-200 p-6 text-center dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-800">
          <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-green-100 text-3xl dark:bg-green-900">
            🎉
          </div>
          <h1 className="text-xl font-bold text-green-800 dark:text-green-300">
            {isConfirmed ? "Order Confirmed!" : "Payment Successful!"}
          </h1>
          <p className="mt-1 text-sm text-green-700 dark:text-green-400">
            {isConfirmed
              ? "Your Cash on Delivery order has been placed. Pay when it arrives."
              : "Your payment was processed successfully."}
          </p>
        </div>
      )}

      {/* Payment failed banner */}
      {isAwaitingPayment && paymentFailed && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950/30">
          <p className="font-medium text-red-800 dark:text-red-300">Payment didn't go through.</p>
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            <Link to={checkoutUrl(order.id)} className="underline font-medium">Try again →</Link>
          </p>
        </div>
      )}

      {/* Confirming spinner */}
      {isAwaitingPayment && !paymentFailed && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border bg-muted/40 p-5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary shrink-0" />
          <p className="text-sm text-muted-foreground">Confirming your payment…</p>
        </div>
      )}

      {/* Order summary card */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Order ID</p>
            <p className="mt-0.5 font-mono text-sm font-semibold">#{order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Placed on</p>
            <p className="mt-0.5 text-sm">{new Date(order.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle}`}>
            {statusIcon} {ORDER_STATUS_LABELS[order.status]}
          </span>
        </div>

        {/* Payment method badge (COD only) */}
        {order.payment_method === "cod" && (
          <div className="flex items-center gap-2 border-b bg-blue-50/60 px-5 py-3 text-sm text-blue-800 dark:bg-blue-950/20 dark:text-blue-300">
            <span className="text-base">💵</span>
            <span>Pay <strong>৳{formatPrice(order.total_amount)}</strong> in cash when your order arrives.</span>
          </div>
        )}

        {/* Items */}
        <ul className="divide-y">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start gap-4 px-5 py-4">
              <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                {item.primary_image
                  ? <img src={item.primary_image} alt={item.title} className="h-full w-full object-cover" />
                  : <div className="flex h-full items-center justify-center text-2xl text-muted-foreground">📦</div>
                }
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <p className="font-medium leading-snug">{item.title}</p>
                <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
              </div>
              <p className="shrink-0 font-semibold">{formatPrice(item.line_total)}</p>
            </li>
          ))}
        </ul>

        {/* Total */}
        <div className="flex items-center justify-between border-t bg-muted/20 px-5 py-4">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Shipping: <span className="font-medium text-green-600">Free</span></p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Order total</p>
            <p className="text-xl font-bold">{formatPrice(order.total_amount)}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link
            to={ROUTES.orders}
            className="text-sm font-medium text-primary hover:underline"
          >
            ← All orders
          </Link>
          <Link
            to={ROUTES.home}
            className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            Continue shopping
          </Link>
        </div>

        {canDownloadInvoice && (
          <button
            onClick={downloadInvoice}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
          >
            {downloading
              ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Generating…</>
              : <>📄 Download Invoice</>
            }
          </button>
        )}
      </div>
    </div>
  )
}
