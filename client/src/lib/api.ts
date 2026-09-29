const BASE_URL = "http://localhost:3000"

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

// ── Types ──────────────────────────────────────────────────────────────────

export type Product = {
  id: string
  title: string
  price: string
  discount: string
  category_id: string
  merchant_id: string
  created_at: string
  primary_image: string | null
}

export type ProductDetail = Product & {
  description: string
  merchant_name: string
  merchant_url: string
  merchant_logo: string
  category_name: string
  category_slug: string
  stripe_product_id: string | null
  stripe_price_id: string | null
  images: { id: string; url: string; is_primary: boolean }[]
  variants: { id: string; type: string; value: string; price_modifier: string }[]
  inventory: { variant_id: string | null; quantity: number }[]
}

export type Category = {
  id: string
  name: string
  slug: string
  parent_id: string | null
}

export type ProductsResponse = {
  data: Product[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ── Params ─────────────────────────────────────────────────────────────────

export type ProductFilters = {
  category_id?: string
  min_price?: string
  max_price?: string
  has_discount?: boolean
  sort?: "newest" | "price_asc" | "price_desc"
  page?: number
  limit?: number
}

export function buildProductsUrl(filters: ProductFilters): string {
  const params = new URLSearchParams()
  if (filters.category_id) params.set("category_id", filters.category_id)
  if (filters.min_price)   params.set("min_price", filters.min_price)
  if (filters.max_price)   params.set("max_price", filters.max_price)
  if (filters.has_discount) params.set("has_discount", "true")
  if (filters.sort)        params.set("sort", filters.sort)
  if (filters.page)        params.set("page", String(filters.page))
  if (filters.limit)       params.set("limit", String(filters.limit))
  return `/products?${params.toString()}`
}
