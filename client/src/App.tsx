import { useState } from "react"
import { ProductsPage } from "@/pages/ProductsPage"
import { ProductDetailPage } from "@/pages/ProductDetailPage"

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return selectedId
    ? <ProductDetailPage id={selectedId} onBack={() => setSelectedId(null)} />
    : <ProductsPage onSelect={setSelectedId} />
}
