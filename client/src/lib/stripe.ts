import { loadStripe } from "@stripe/stripe-js"
import { env } from "@/config/env"

// Loads Stripe.js from Stripe's servers once, at module level. Calling loadStripe
// inside a component would re-load it on every render.
// The publishable key (pk_) is safe to ship to the browser — it can only create
// payments, never read or refund them. The secret key (sk_) stays on the server.
export const stripePromise = loadStripe(env.stripePublishableKey)
