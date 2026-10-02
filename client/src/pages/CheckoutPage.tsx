import { useState, type FormEvent } from "react"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { Navigate, useNavigate, useParams } from "react-router"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { useAddresses, useSaveOrderAddress } from "@/hooks/useAddresses"
import { useOrder, usePlaceCodOrder } from "@/hooks/useOrders"
import { isNotFoundError } from "@/lib/api"
import { orderUrl } from "@/lib/constants"
import { formatPrice } from "@/lib/format"
import { stripePromise } from "@/lib/stripe"
import { NotFoundPage } from "@/pages/NotFoundPage"
import type { Address, AddressInput } from "@/types/api"

const EMPTY_ADDRESS: AddressInput = {
  full_name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "Bangladesh",
  is_default: false,
}

// ── Address step ───────────────────────────────────────────────────────────────

function AddressStep({
  orderId,
  onDone,
}: {
  orderId: string
  onDone: () => void
}) {
  const { data: addresses, isPending: loadingAddresses } = useAddresses()
  const saveAddress = useSaveOrderAddress()

  const defaultAddress = addresses?.find((a) => a.is_default) ?? addresses?.[0]
  const [selected, setSelected] = useState<Address | "new" | null>(null)
  const [form, setForm] = useState<AddressInput>(EMPTY_ADDRESS)

  const activeAddress = selected ?? (defaultAddress ? defaultAddress : "new")

  function setField(field: keyof AddressInput, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleContinue(e: FormEvent) {
    e.preventDefault()
    const payload =
      activeAddress === "new"
        ? form
        : { ...activeAddress, is_default: activeAddress.is_default }

    await saveAddress.mutateAsync(
      { orderId, ...payload },
      { onSuccess: () => onDone() },
    )
  }

  if (loadingAddresses) return <p className="text-muted-foreground">Loading…</p>

  return (
    <form onSubmit={handleContinue} className="space-y-4">
      <h2 className="text-lg font-semibold">Shipping address</h2>

      {/* Saved addresses */}
      {addresses && addresses.length > 0 && (
        <div className="space-y-2">
          {addresses.map((addr) => (
            <label
              key={addr.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                activeAddress !== "new" && (activeAddress as Address).id === addr.id
                  ? "border-primary bg-primary/5"
                  : "hover:border-muted-foreground"
              }`}
            >
              <input
                type="radio"
                name="address"
                checked={activeAddress !== "new" && (activeAddress as Address).id === addr.id}
                onChange={() => setSelected(addr)}
                className="mt-0.5 shrink-0"
              />
              <div className="text-sm">
                <p className="font-medium">{addr.full_name}</p>
                <p className="text-muted-foreground">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                <p className="text-muted-foreground">{addr.city}, {addr.state} {addr.postal_code}</p>
                <p className="text-muted-foreground">{addr.country}</p>
              </div>
            </label>
          ))}

          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
              activeAddress === "new" ? "border-primary bg-primary/5" : "hover:border-muted-foreground"
            }`}
          >
            <input
              type="radio"
              name="address"
              checked={activeAddress === "new"}
              onChange={() => setSelected("new")}
              className="shrink-0"
            />
            <span className="text-sm font-medium">Use a different address</span>
          </label>
        </div>
      )}

      {/* New address form */}
      {activeAddress === "new" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Full name</label>
            <input
              required
              value={form.full_name}
              onChange={(e) => setField("full_name", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Address line 1</label>
            <input
              required
              value={form.line1}
              onChange={(e) => setField("line1", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Address line 2 (optional)</label>
            <input
              value={form.line2 ?? ""}
              onChange={(e) => setField("line2", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">City</label>
            <input
              required
              value={form.city}
              onChange={(e) => setField("city", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">State / District</label>
            <input
              required
              value={form.state}
              onChange={(e) => setField("state", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Postal code</label>
            <input
              required
              value={form.postal_code}
              onChange={(e) => setField("postal_code", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Country</label>
            <input
              required
              value={form.country}
              onChange={(e) => setField("country", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      )}

      {saveAddress.isError && (
        <p className="text-sm text-destructive">Failed to save address. Please try again.</p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={saveAddress.isPending}>
        {saveAddress.isPending ? "Saving…" : "Continue to payment"}
      </Button>
    </form>
  )
}

// ── Payment method step ────────────────────────────────────────────────────────

function PaymentMethodStep({
  orderId,
  clientSecret,
  totalAmount,
  onChangeAddress,
}: {
  orderId: string
  clientSecret: string
  totalAmount: string
  onChangeAddress: () => void
}) {
  const navigate = useNavigate()
  const placeCod = usePlaceCodOrder(orderId)
  const [method, setMethod] = useState<"cod" | "stripe">("cod")
  const [stripeOpen, setStripeOpen] = useState(false)

  async function handlePlaceCod() {
    await placeCod.mutateAsync(undefined, {
      onSuccess: () => navigate(orderUrl(orderId), { replace: true }),
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Payment method</h2>

      <div className="space-y-2">
        {/* COD option */}
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
            method === "cod" ? "border-primary bg-primary/5" : "hover:border-muted-foreground"
          }`}
        >
          <input
            type="radio"
            name="payment"
            checked={method === "cod"}
            onChange={() => setMethod("cod")}
            className="mt-0.5 shrink-0"
          />
          <div className="text-sm">
            <p className="font-medium">Cash on Delivery</p>
            <p className="text-muted-foreground">Pay when your order arrives at your door.</p>
          </div>
        </label>

        {/* Online payment option */}
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
            method === "stripe" ? "border-primary bg-primary/5" : "hover:border-muted-foreground"
          }`}
        >
          <input
            type="radio"
            name="payment"
            checked={method === "stripe"}
            onChange={() => setMethod("stripe")}
            className="mt-0.5 shrink-0"
          />
          <div className="text-sm">
            <p className="font-medium">Pay online</p>
            <p className="text-muted-foreground">Credit / debit card, and more.</p>
          </div>
        </label>
      </div>

      {/* COD confirm button */}
      {method === "cod" && (
        <>
          {placeCod.isError && (
            <p className="text-sm text-destructive">
              {(placeCod.error as Error)?.message ?? "Failed to place order. Please try again."}
            </p>
          )}
          <Button size="lg" className="w-full" onClick={handlePlaceCod} disabled={placeCod.isPending}>
            {placeCod.isPending ? "Placing order…" : "Place order (pay on delivery)"}
          </Button>
        </>
      )}

      {/* Open Stripe modal */}
      {method === "stripe" && (
        <Button size="lg" className="w-full" onClick={() => setStripeOpen(true)}>
          Continue to payment
        </Button>
      )}

      <button onClick={onChangeAddress} className="text-sm text-primary hover:underline">
        ← Change address
      </button>

      {/* Stripe payment modal */}
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <StripeModal
          open={stripeOpen}
          onClose={() => setStripeOpen(false)}
          orderId={orderId}
          totalAmount={totalAmount}
        />
      </Elements>
    </div>
  )
}

function StripeModal({
  open,
  onClose,
  orderId,
  totalAmount,
}: {
  open: boolean
  onClose: () => void
  orderId: string
  totalAmount: string
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setSubmitting(true)
    setErrorMessage(null)

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}${orderUrl(orderId)}` },
    })

    if (error) setErrorMessage(error.message ?? "Payment failed")
    setSubmitting(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Complete payment">
      <p className="mb-4 text-sm text-muted-foreground">
        Amount due: <strong className="text-foreground">{formatPrice(totalAmount)}</strong>
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <PaymentElement />
        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
        <Button type="submit" size="lg" disabled={!stripe || submitting}>
          {submitting ? "Processing…" : "Pay now"}
        </Button>
      </form>
    </Modal>
  )
}

// ── Checkout page ─────────────────────────────────────────────────────────────

export function CheckoutPage() {
  const { orderId } = useParams()
  const { data: order, isPending, isError, error } = useOrder(orderId!)
  const [step, setStep] = useState<"address" | "payment">("address")

  if (isPending) return <p className="p-6">Loading…</p>
  if (isError && isNotFoundError(error)) return <NotFoundPage thing="order" />
  if (isError) return <p className="p-6 text-destructive">{error.message}</p>
  // Already paid (Stripe webhook) or COD-confirmed — redirect to order detail
  if (!order.clientSecret || order.status === "confirmed") return <Navigate to={orderUrl(order.id)} replace />

  return (
    <div className="mx-auto max-w-lg p-6">
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <span className={step === "address" ? "font-semibold text-foreground" : "text-muted-foreground"}>
          1. Address
        </span>
        <span className="text-muted-foreground">›</span>
        <span className={step === "payment" ? "font-semibold text-foreground" : "text-muted-foreground"}>
          2. Payment
        </span>
      </div>

      <p className="mb-6 text-muted-foreground">
        Order total: <strong className="text-foreground">{formatPrice(order.total_amount)}</strong>
      </p>

      {step === "address" && (
        <AddressStep
          orderId={order.id}
          onDone={() => setStep("payment")}
        />
      )}

      {step === "payment" && (
        <PaymentMethodStep
          orderId={order.id}
          clientSecret={order.clientSecret}
          totalAmount={order.total_amount}
          onChangeAddress={() => setStep("address")}
        />
      )}
    </div>
  )
}
