import { useEffect, useRef } from "react"
import { Link } from "react-router"
import { useProducts } from "@/hooks/useProducts"
import { productUrl } from "@/lib/constants"
import { formatPercent, formatPrice } from "@/lib/format"
import type { ProductFilters } from "@/types/api"

type Props = {
  title: string
  filters: ProductFilters
  seeAllUrl: string
  autoScroll?: boolean
  scrollDirection?: "left" | "right"
}

const SPEED = 40 // px per second

export function ProductRow({ title, filters, seeAllUrl, autoScroll = false, scrollDirection = "left" }: Props) {
  const { data, isPending } = useProducts(filters)
  const listRef = useRef<HTMLUListElement>(null)
  const pausedRef = useRef(false)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!autoScroll || !data) return
    const el = listRef.current
    if (!el) return

    cancelAnimationFrame(rafRef.current)

    // For right-to-left (scrollDirection="right"), start at the halfway point and count down
    if (scrollDirection === "right") {
      el.scrollLeft = el.scrollWidth / 2
    }

    let lastTime = 0

    function step(time: number) {
      const dt = lastTime ? (time - lastTime) / 1000 : 0
      lastTime = time

      if (!pausedRef.current && el) {
        if (scrollDirection === "right") {
          el.scrollLeft -= SPEED * dt
          // When back at 0, jump to halfway to loop
          if (el.scrollLeft <= 0) {
            el.scrollLeft = el.scrollWidth / 2
          }
        } else {
          el.scrollLeft += SPEED * dt
          if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 10) {
            el.scrollLeft = 0
          }
        }
      }

      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [autoScroll, scrollDirection, data])

  const items = data?.data ?? []
  // Duplicate the list so there's always content to scroll into
  const displayItems = autoScroll ? [...items, ...items] : items

  return (
    <section className="rounded-md bg-card p-4">
      <div className="mb-3 flex items-baseline gap-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <Link to={seeAllUrl} className="text-sm text-brand-text hover:underline">
          See all
        </Link>
      </div>

      {isPending ? (
        <p className="h-56 text-muted-foreground">Loading…</p>
      ) : (
        <ul
          ref={listRef}
          onMouseEnter={() => { pausedRef.current = true }}
          onMouseLeave={() => { pausedRef.current = false }}
          // No snap-x when auto-scrolling — scroll-snap-type fights requestAnimationFrame
          className={`flex gap-4 overflow-x-auto pb-2 scrollbar-none ${autoScroll ? "" : "snap-x"}`}
        >
          {displayItems.map((product, idx) => {
            const onSale = Number(product.discount) > 0
            return (
              <li key={`${product.id}-${idx}`} className={`w-44 shrink-0 ${autoScroll ? "" : "snap-start"}`}>
                <Link to={productUrl(product.id)} className="group flex flex-col gap-1">
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded bg-muted">
                    {product.primary_image && (
                      <img
                        src={product.primary_image}
                        alt={product.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {onSale && (
                      <span className="rounded-sm bg-destructive px-1.5 py-0.5 text-xs font-bold text-white">
                        -{formatPercent(product.discount)}%
                      </span>
                    )}
                    <span className="font-medium">{formatPrice(product.final_price)}</span>
                  </div>
                  <p className="line-clamp-2 text-sm group-hover:text-brand-text">{product.title}</p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
