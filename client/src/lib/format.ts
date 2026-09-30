import { CURRENCY } from "@/lib/constants"

// Created once and reused — building an Intl formatter is relatively expensive
const priceFormatter = new Intl.NumberFormat(CURRENCY.locale, {
  style: "currency",
  currency: CURRENCY.code,
})

// Whole-dollar variant for labels like "Under $100"
const wholePriceFormatter = new Intl.NumberFormat(CURRENCY.locale, {
  style: "currency",
  currency: CURRENCY.code,
  maximumFractionDigits: 0,
})

export function formatWholePrice(amount: number): string {
  return wholePriceFormatter.format(amount)
}

// "42.99" → "43" for discount badges
export function formatPercent(value: string | number): string {
  return String(Math.round(Number(value)))
}

// The server sends money as strings ("1746.36"). Number() is fine here because
// we're only *displaying* it — all money math happens on the server in NUMERIC.
export function formatPrice(amount: string | number): string {
  return priceFormatter.format(Number(amount))
}
