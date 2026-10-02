import { Link } from "react-router"
import { SaveButton } from "@/components/SaveButton"
import { AddToCartButton } from "@/components/AddToCartButton"
import { useSavedProducts } from "@/hooks/useSavedProducts"
import { productUrl } from "@/lib/constants"
import { formatPercent, formatPrice } from "@/lib/format"

export function SavedPage() {
  const { data, isPending } = useSavedProducts()
  const products = data?.data ?? []

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Saved items</h1>

      {isPending && <p className="text-muted-foreground">Loading…</p>}

      {!isPending && products.length === 0 && (
        <p className="text-muted-foreground">You haven't saved any items yet.</p>
      )}

      <ul className="space-y-3">
        {products.map((product) => {
          const onSale = Number(product.discount) > 0
          const url = productUrl(product.id)
          return (
            <li key={product.id} className="flex gap-4 rounded-md border bg-card p-3">
              <Link
                to={url}
                className="flex size-28 shrink-0 items-center justify-center rounded bg-muted"
              >
                {product.primary_image && (
                  <img
                    src={product.primary_image}
                    alt={product.title}
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link to={url} className="font-medium leading-snug hover:text-brand-text">
                  {product.title}
                </Link>
                <p className="text-sm text-muted-foreground">by {product.merchant_name}</p>

                <div className="flex items-baseline gap-2">
                  {onSale && (
                    <span className="rounded-sm bg-destructive px-1.5 py-0.5 text-xs font-bold text-white">
                      -{formatPercent(product.discount)}%
                    </span>
                  )}
                  <span className="text-lg font-medium">{formatPrice(product.final_price)}</span>
                </div>

                <div className="mt-auto flex items-center gap-4">
                  <AddToCartButton productId={product.id} compact />
                  <SaveButton productId={product.id} compact />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
