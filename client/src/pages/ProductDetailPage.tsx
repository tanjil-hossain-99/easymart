import { useParams } from "react-router"
import { BuyBox } from "@/components/product/BuyBox"
import { CategoryBreadcrumb } from "@/components/product/CategoryBreadcrumb"
import { ImageGallery } from "@/components/product/ImageGallery"
import { useProduct } from "@/hooks/useProducts"
import { formatPercent, formatPrice } from "@/lib/format"
import type { ProductDetail } from "@/types/api"

// Amazon-style product page:
//   breadcrumb
//   [ gallery ] [ title, price, about this item ] [ buy box ]
export function ProductDetailPage() {
  const { id } = useParams()
  const { data: product, isPending, isError } = useProduct(id!)

  if (isPending) return <p className="p-6 text-muted-foreground">Loading…</p>
  if (isError) return <p className="p-6 text-destructive">Product not found.</p>

  // Products without variants keep their stock on the row with variant_id = null
  const stock = product.inventory.find((i) => i.variant_id === null)?.quantity ?? 0

  return (
    <div className="mx-auto max-w-7xl p-4">
      <CategoryBreadcrumb categoryId={product.category_id} />

      <div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:grid-cols-[minmax(0,5fr)_minmax(0,5fr)_16rem]">
        <ImageGallery images={product.images} alt={product.title} />

        <ProductInfo product={product} />

        <div className="md:col-span-2 lg:col-span-1">
          <BuyBox
            productId={product.id}
            finalPrice={product.final_price}
            stock={stock}
            merchantName={product.merchant_name}
          />
        </div>
      </div>
    </div>
  )
}

function ProductInfo({ product }: { product: ProductDetail }) {
  const onSale = Number(product.discount) > 0

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl leading-tight font-medium">{product.title}</h1>
      {product.merchant_url ? (
        <a href={product.merchant_url} target="_blank" rel="noreferrer" className="text-sm text-brand-text hover:underline">
          Visit the {product.merchant_name} Store
        </a>
      ) : (
        <p className="text-sm text-muted-foreground">by {product.merchant_name}</p>
      )}

      <hr />

      <div>
        <div className="flex items-baseline gap-3">
          {onSale && (
            <span className="text-2xl font-light text-destructive">-{formatPercent(product.discount)}%</span>
          )}
          <span className="text-3xl font-medium">{formatPrice(product.final_price)}</span>
        </div>
        {onSale && (
          <p className="text-sm text-muted-foreground">
            List Price: <s>{formatPrice(product.price)}</s>
          </p>
        )}
      </div>

      {product.variants.length > 0 && <Variants product={product} />}

      <hr />

      <section>
        <h2 className="mb-1 font-bold">About this item</h2>
        <p className="leading-relaxed">{product.description}</p>
      </section>
    </div>
  )
}

// Read-only for now: the seed data has no variants, and choosing one would also
// need variant-aware stock + add-to-cart
function Variants({ product }: { product: ProductDetail }) {
  return (
    <div className="flex flex-wrap gap-2">
      {product.variants.map((v) => {
        const stock = product.inventory.find((i) => i.variant_id === v.id)?.quantity ?? 0
        const modifier = Number(v.price_modifier)
        return (
          <span key={v.id} className={`rounded-md border px-3 py-1 text-sm ${stock === 0 ? "opacity-40" : ""}`}>
            {v.type}: {v.value}
            {modifier !== 0 && (
              <span className="ml-1 text-muted-foreground">
                ({modifier > 0 ? "+" : ""}
                {formatPrice(v.price_modifier)})
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}
