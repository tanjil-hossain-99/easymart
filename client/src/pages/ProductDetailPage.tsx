import { useProduct } from "@/hooks/useProducts"

type Props = { id: string; onBack: () => void }

export function ProductDetailPage({ id, onBack }: Props) {
  const { data, isPending, isError } = useProduct(id)

  if (isPending) return <p style={{ padding: 24 }}>Loading…</p>
  if (isError || !data) return <p style={{ padding: 24, color: "red" }}>Product not found.</p>

  // Find stock for the base product (no variant)
  const baseStock = data.inventory.find((i) => i.variant_id === null)?.quantity ?? 0

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <button onClick={onBack} style={{ marginBottom: 16 }}>← Back</button>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Images */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.images.map((img) => (
            <img
              key={img.id}
              src={img.url}
              alt={data.title}
              style={{ width: 200, height: 150, objectFit: "cover", borderRadius: 6,
                border: img.is_primary ? "2px solid #333" : "1px solid #ddd" }}
            />
          ))}
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <h1 style={{ marginTop: 0 }}>{data.title}</h1>
          <p style={{ color: "#555" }}>{data.description}</p>

          <p>
            <strong>Price:</strong> ${data.price}
            {Number(data.discount) > 0 && (
              <span style={{ color: "green", marginLeft: 8 }}>
                {data.discount}% off →  $
                {(Number(data.price) * (1 - Number(data.discount) / 100)).toFixed(2)}
              </span>
            )}
          </p>

          <p><strong>Category:</strong> {data.category_name}</p>
          <p>
            <strong>Merchant:</strong>{" "}
            <a href={data.merchant_url} target="_blank" rel="noreferrer">{data.merchant_name}</a>
          </p>

          {/* Variants */}
          {data.variants.length > 0 && (
            <div>
              <strong>Variants:</strong>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {data.variants.map((v) => {
                  const stock = data.inventory.find((i) => i.variant_id === v.id)?.quantity ?? 0
                  return (
                    <span
                      key={v.id}
                      style={{
                        padding: "4px 10px",
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        fontSize: 13,
                        opacity: stock === 0 ? 0.4 : 1,
                      }}
                    >
                      {v.type}: {v.value}
                      {Number(v.price_modifier) !== 0 && (
                        <span style={{ color: "#888", marginLeft: 4 }}>
                          ({Number(v.price_modifier) > 0 ? "+" : ""}{v.price_modifier})
                        </span>
                      )}
                      {stock === 0 && <span style={{ color: "red", marginLeft: 4 }}>(out)</span>}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Stock */}
          {data.variants.length === 0 && (
            <p>
              <strong>Stock:</strong>{" "}
              <span style={{ color: baseStock === 0 ? "red" : "green" }}>
                {baseStock === 0 ? "Out of stock" : `${baseStock} available`}
              </span>
            </p>
          )}

          {/* Debug: raw IDs — useful during development */}
          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: "pointer", color: "#888", fontSize: 12 }}>Debug info</summary>
            <pre style={{ fontSize: 11, background: "#f5f5f5", padding: 8, borderRadius: 4 }}>
              {JSON.stringify({ id: data.id, merchant_id: data.merchant_id, stripe_product_id: data.stripe_product_id }, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  )
}
