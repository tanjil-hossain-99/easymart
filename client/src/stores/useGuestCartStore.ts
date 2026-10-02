import { create } from "zustand"
import { persist } from "zustand/middleware"

export type GuestCartItem = {
  product_id: string
  variant_id?: string
  quantity: number
}

// Two items are the "same" if they share product + variant
const sameItem = (a: GuestCartItem, b: GuestCartItem) =>
  a.product_id === b.product_id && (a.variant_id ?? null) === (b.variant_id ?? null)

type GuestCartState = {
  items: GuestCartItem[]
  addItem: (product_id: string, quantity: number, variant_id?: string) => void
  removeItem: (product_id: string, variant_id?: string) => void
  updateItem: (product_id: string, quantity: number, variant_id?: string) => void
  clear: () => void
}

export const useGuestCartStore = create<GuestCartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (product_id, quantity, variant_id) =>
        set((state) => {
          const key: GuestCartItem = { product_id, variant_id, quantity }
          const existing = state.items.find((i) => sameItem(i, key))
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameItem(i, key) ? { ...i, quantity: i.quantity + quantity } : i,
              ),
            }
          }
          return { items: [...state.items, { product_id, variant_id, quantity }] }
        }),
      removeItem: (product_id, variant_id) =>
        set((state) => ({
          items: state.items.filter((i) => !sameItem(i, { product_id, variant_id, quantity: 0 })),
        })),
      updateItem: (product_id, quantity, variant_id) =>
        set((state) => ({
          items: state.items.map((i) =>
            sameItem(i, { product_id, variant_id, quantity }) ? { ...i, quantity } : i,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "tcmart-guest-cart" },
  ),
)
