import { Link } from "react-router"
import { AddToCartButton } from "@/components/AddToCartButton"
import { productUrl } from "@/lib/constants"
import { formatPercent, formatPrice } from "@/lib/format"
import type { Product } from "@/types/api"

// One row in the results list: image on the left, details on the right (Amazon list layout)
export function ProductResultCard({ product }: { product: Product }) {
  const url = productUrl(product.id)
  const onSale = Number(product.discount) > 0

  return (
    <article className="flex gap-4 rounded-md border bg-card p-3">
      <Link to={url} className="flex size-48 shrink-0 items-center justify-center rounded bg-muted">
        {product.primary_image && (
          <img
            src={product.primary_image}
            alt={product.title}
            loading="lazy" // off-screen results don't download until scrolled to
            className="max-h-full max-w-full object-contain"
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link to={url} className="text-lg leading-snug font-medium hover:text-brand-text">
          {product.title}
        </Link>
        <p className="text-sm text-muted-foreground">by {product.merchant_name}</p>

        <div className="mt-2 flex items-baseline gap-2">
          {onSale && (
            <span className="rounded-sm bg-destructive px-1.5 py-0.5 text-xs font-bold text-white">
              -{formatPercent(product.discount)}%
            </span>
          )}
          <span className="text-2xl font-medium">{formatPrice(product.final_price)}</span>
        </div>
        {onSale && (
          <p className="text-sm text-muted-foreground">
            List: <s>{formatPrice(product.price)}</s>
          </p>
        )}

        <div className="mt-auto">
          <AddToCartButton productId={product.id} compact />
        </div>
      </div>
    </article>
  )
}
