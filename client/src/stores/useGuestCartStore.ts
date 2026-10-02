import { create } from "zustand"
import { persist } from "zustand/middleware"

export type GuestCartItem = {
  product_id: string
  quantity: number
}

type GuestCartState = {
  items: GuestCartItem[]
  addItem: (product_id: string, quantity: number) => void
  removeItem: (product_id: string) => void
  updateItem: (product_id: string, quantity: number) => void
  clear: () => void
}

export const useGuestCartStore = create<GuestCartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (product_id, quantity) =>
        set((state) => {
          const existing = state.items.find((i) => i.product_id === product_id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product_id === product_id ? { ...i, quantity: i.quantity + quantity } : i,
              ),
            }
          }
          return { items: [...state.items, { product_id, quantity }] }
        }),
      removeItem: (product_id) =>
        set((state) => ({ items: state.items.filter((i) => i.product_id !== product_id) })),
      updateItem: (product_id, quantity) =>
        set((state) => ({
          items: state.items.map((i) => (i.product_id === product_id ? { ...i, quantity } : i)),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "tcmart-guest-cart" },
  ),
)
