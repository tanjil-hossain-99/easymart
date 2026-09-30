// Fail loudly at startup if client/.env is missing, instead of every request going to "undefined/products"
function required(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  if (!value) throw new Error(`Missing ${name} — copy client/.env.example to client/.env`)
  return value
}

export const env = {
  apiUrl: required("VITE_API_URL"),
  stripePublishableKey: required("VITE_STRIPE_PUBLISHABLE_KEY"),
} as const
