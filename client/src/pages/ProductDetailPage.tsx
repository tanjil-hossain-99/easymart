import { useState } from "react"
import { useParams } from "react-router"
import { BuyBox } from "@/components/product/BuyBox"
import { CategoryBreadcrumb } from "@/components/product/CategoryBreadcrumb"
import { ImageGallery } from "@/components/product/ImageGallery"
import { useProduct } from "@/hooks/useProducts"
import { isNotFoundError } from "@/lib/api"
import { formatPercent, formatPrice } from "@/lib/format"
import { NotFoundPage } from "@/pages/NotFoundPage"
import type { ProductDetail, ProductVariant } from "@/types/api"

// Amazon-style product page:
//   breadcrumb
//   [ gallery ] [ title, price, about this item ] [ buy box ]
export function ProductDetailPage() {
  const { id } = useParams()
  const { data: product, isPending, isError, error } = useProduct(id!)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)

  if (isPending) return <p className="p-6 text-muted-foreground">Loading…</p>
  if (isError) {
    if (isNotFoundError(error)) return <NotFoundPage thing="product" />
    return <p className="p-6 text-destructive">Couldn't load this product. Please try again.</p>
  }

  const hasVariants = product.variants.length > 0

  // Stock: for variant products, use the selected variant's stock; fall back to base row
  const stock = hasVariants
    ? (product.inventory.find((i) => i.variant_id === selectedVariantId)?.quantity ?? 0)
    : (product.inventory.find((i) => i.variant_id === null)?.quantity ?? 0)

  // Price: add the selected variant's price modifier on top of the product's final_price
  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) ?? null
  const variantModifier = selectedVariant ? Number(selectedVariant.price_modifier) : 0
  const displayPrice = (Number(product.final_price) + variantModifier).toFixed(2)

  return (
    <div className="mx-auto max-w-7xl p-4">
      <CategoryBreadcrumb categoryId={product.category_id} />

      <div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:grid-cols-[minmax(0,5fr)_minmax(0,5fr)_16rem]">
        <ImageGallery images={product.images} alt={product.title} />

        <ProductInfo
          product={product}
          selectedVariantId={selectedVariantId}
          onVariantSelect={setSelectedVariantId}
        />

        <div className="md:col-span-2 lg:col-span-1">
          <BuyBox
            productId={product.id}
            variantId={selectedVariantId}
            finalPrice={displayPrice}
            stock={hasVariants && !selectedVariantId ? 0 : stock}
            stockMessage={hasVariants && !selectedVariantId ? "select-size" : undefined}
            merchantName={product.merchant_name}
          />
        </div>
      </div>
    </div>
  )
}

type ProductInfoProps = {
  product: ProductDetail
  selectedVariantId: string | null
  onVariantSelect: (id: string) => void
}

function ProductInfo({ product, selectedVariantId, onVariantSelect }: ProductInfoProps) {
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

      {product.variants.length > 0 && (
        <VariantSelector
          variants={product.variants}
          inventory={product.inventory}
          selectedId={selectedVariantId}
          onSelect={onVariantSelect}
        />
      )}

      <hr />

      <section>
        <h2 className="mb-1 font-bold">About this item</h2>
        <p className="leading-relaxed whitespace-pre-line">{product.description}</p>
      </section>
    </div>
  )
}

type VariantSelectorProps = {
  variants: ProductVariant[]
  inventory: { variant_id: string | null; quantity: number }[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function VariantSelector({ variants, inventory, selectedId, onSelect }: VariantSelectorProps) {
  // Group by type so we can show "Size: S M L XL" as one row
  const groups = variants.reduce<Record<string, ProductVariant[]>>((acc, v) => {
    acc[v.type] = acc[v.type] ?? []
    acc[v.type].push(v)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-3">
      {Object.entries(groups).map(([type, options]) => (
        <div key={type}>
          <p className="mb-1.5 text-sm font-medium">
            {type}
            {selectedId && options.find((v) => v.id === selectedId) && (
              <span className="ml-1.5 font-normal text-muted-foreground">
                : {options.find((v) => v.id === selectedId)!.value}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {options.map((v) => {
              const stock = inventory.find((i) => i.variant_id === v.id)?.quantity ?? 0
              const outOfStock = stock === 0
              const isSelected = v.id === selectedId
              const modifier = Number(v.price_modifier)

              return (
                <button
                  key={v.id}
                  onClick={() => !outOfStock && onSelect(v.id)}
                  disabled={outOfStock}
                  title={outOfStock ? "Out of stock" : undefined}
                  className={[
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    isSelected
                      ? "border-brand bg-brand/10 font-medium text-brand-text ring-1 ring-brand"
                      : "hover:border-brand hover:text-brand-text",
                    outOfStock ? "cursor-not-allowed opacity-40 line-through" : "cursor-pointer",
                  ].join(" ")}
                >
                  {v.value}
                  {modifier !== 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({modifier > 0 ? "+" : ""}{formatPrice(v.price_modifier)})
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
