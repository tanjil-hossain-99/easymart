import { CURRENCY } from "@/lib/constants"

// Created once and reused — building an Intl formatter is relatively expensive
const priceFormatter = new Intl.NumberFormat(CURRENCY.locale, {
  style: "currency",
  currency: CURRENCY.code,
})

// The server sends money as strings ("1746.36"). Number() is fine here because
// we're only *displaying* it — all money math happens on the server in NUMERIC.
export function formatPrice(amount: string | number): string {
  return priceFormatter.format(Number(amount))
}
