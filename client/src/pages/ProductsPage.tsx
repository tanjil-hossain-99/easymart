import { useState } from "react"
import { useCategories, useProducts } from "@/hooks/useProducts"
import type { ProductFilters } from "@/lib/api"

type Props = { onSelect: (id: string) => void }

export function ProductsPage({ onSelect }: Props) {
  const [filters, setFilters] = useState<ProductFilters>({ page: 1, limit: 20, sort: "newest" })
  const { data, isPending, isError } = useProducts(filters)
  const { data: categories } = useCategories()

  function set(patch: Partial<ProductFilters>) {
    setFilters((f) => ({ ...f, ...patch, page: 1 }))
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Products ({data?.pagination.total ?? "…"})</h1>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <select onChange={(e) => set({ category_id: e.target.value || undefined })}>
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.parent_id ? "  └ " : ""}{c.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Min price"
          style={{ width: 90 }}
          onBlur={(e) => set({ min_price: e.target.value || undefined })}
        />
        <input
          type="number"
          placeholder="Max price"
          style={{ width: 90 }}
          onBlur={(e) => set({ max_price: e.target.value || undefined })}
        />

        <select onChange={(e) => set({ sort: e.target.value as ProductFilters["sort"] })}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
        </select>

        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="checkbox"
            onChange={(e) => set({ has_discount: e.target.checked || undefined })}
          />
          On sale
        </label>
      </div>

      {/* ── States ── */}
      {isPending && <p>Loading…</p>}
      {isError && <p style={{ color: "red" }}>Failed to load products.</p>}

      {/* ── Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {data?.data.map((p) => (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, cursor: "pointer" }}
          >
            {p.primary_image && (
              <img src={p.primary_image} alt={p.title} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 4 }} />
            )}
            <p style={{ fontWeight: 600, margin: "8px 0 4px", fontSize: 14 }}>{p.title}</p>
            <p style={{ margin: 0 }}>
              ${p.price}
              {Number(p.discount) > 0 && (
                <span style={{ color: "green", marginLeft: 6 }}>-{p.discount}%</span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* ── Pagination ── */}
      {data && (
        <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <button
            disabled={filters.page === 1}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
          >
            ← Prev
          </button>
          <span>Page {data.pagination.page} of {data.pagination.totalPages}</span>
          <button
            disabled={data.pagination.page >= data.pagination.totalPages}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
