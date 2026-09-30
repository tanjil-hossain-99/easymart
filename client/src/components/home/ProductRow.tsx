import { Link } from "react-router"
import { useProducts } from "@/hooks/useProducts"
import { productUrl } from "@/lib/constants"
import { formatPercent, formatPrice } from "@/lib/format"
import type { ProductFilters } from "@/types/api"

type Props = {
  title: string
  filters: ProductFilters // which products this row shows (e.g. biggest discounts)
  seeAllUrl: string
}

// Amazon-style horizontal row: title + "See all", then a scrollable strip of small cards
export function ProductRow({ title, filters, seeAllUrl }: Props) {
  const { data, isPending } = useProducts(filters)

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
        // snap-x: scrolling with a trackpad stops neatly on a card edge
        <ul className="flex snap-x gap-4 overflow-x-auto pb-2">
          {data?.data.map((product) => {
            const onSale = Number(product.discount) > 0
            return (
              <li key={product.id} className="w-44 shrink-0 snap-start">
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
