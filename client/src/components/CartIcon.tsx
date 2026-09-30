import { CART } from "@/lib/constants"

// Amazon-style cart: open-top basket with the item count sitting inside it.
// Drawn as SVG (not an icon library) because the count has to fit *in* the basket.
export function CartIcon({ count }: { count: number }) {
  // Amazon caps the badge so big numbers don't overflow the basket
  const label = count > CART.maxBadgeCount ? `${CART.maxBadgeCount}+` : String(count)
  // One digit fits big; "12" or "99+" must shrink to stay inside the basket
  const sizeClass = label.length === 1 ? "top-0 text-lg" : label.length === 2 ? "top-0.5 text-sm" : "top-1 text-[10px]"

  return (
    <span className="relative inline-block h-8 w-10" aria-hidden="true">
      <svg viewBox="0 0 40 32" className="h-full w-full" fill="none" stroke="currentColor">
        {/* handle → left side of the basket → bottom → right side (top left open) */}
        <path
          d="M2 5 H8 L13 21 H32 L36 9"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* wheels */}
        <circle cx={15} cy={27} r={2.5} fill="currentColor" stroke="none" />
        <circle cx={30} cy={27} r={2.5} fill="currentColor" stroke="none" />
      </svg>
      {/* Sits in the basket opening: centered at x ≈ 57%, top aligned with the handle */}
      <span className={`absolute left-[57%] -translate-x-1/2 leading-none font-bold text-brand-strong ${sizeClass}`}>
        {label}
      </span>
    </span>
  )
}
