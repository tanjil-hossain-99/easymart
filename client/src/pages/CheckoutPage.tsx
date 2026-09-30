import { useState, type FormEvent } from "react"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { Navigate, useParams } from "react-router"
import { Button } from "@/components/ui/button"
import { useOrder } from "@/hooks/useOrders"
import { orderUrl } from "@/lib/constants"
import { formatPrice } from "@/lib/format"
import { stripePromise } from "@/lib/stripe"

export function CheckoutPage() {
  const { orderId } = useParams()
  const { data: order, isPending, isError, error } = useOrder(orderId!)

  if (isPending) return <p className="p-6">Loading…</p>
  if (isError) return <p className="p-6 text-destructive">{error.message}</p>

  // No client secret = nothing left to pay (already paid or cancelled) → show the order
  if (!order.clientSecret) return <Navigate to={orderUrl(order.id)} replace />

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-1 text-2xl font-semibold">Payment</h1>
      <p className="mb-6 text-muted-foreground">
        Order total: <strong>{formatPrice(order.total_amount)}</strong>
      </p>

      {/* <Elements> connects Stripe.js to this PaymentIntent via its client secret.
          Card details go straight from the browser to Stripe — they never touch our server. */}
      <Elements stripe={stripePromise} options={{ clientSecret: order.clientSecret }}>
        <PaymentForm orderId={order.id} />
      </Elements>
    </div>
  )
}

function PaymentForm({ orderId }: { orderId: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // Stripe.js loads asynchronously — can't submit until it's ready
    if (!stripe || !elements) return

    setSubmitting(true)
    setErrorMessage(null)

    const { error } = await stripe.confirmPayment({
      elements,
      // After payment (incl. 3D Secure), Stripe sends the browser here
      confirmParams: { return_url: `${window.location.origin}${orderUrl(orderId)}` },
    })

    // We only get here if confirmation failed immediately (declined card, invalid input).
    // On success the browser is already navigating to return_url.
    if (error) setErrorMessage(error.message ?? "Payment failed")
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Stripe's hosted card form (renders in an iframe, so our JS can't read card numbers) */}
      <PaymentElement />

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <Button type="submit" size="lg" disabled={!stripe || submitting}>
        {submitting ? "Processing…" : "Pay now"}
      </Button>
    </form>
  )
}
