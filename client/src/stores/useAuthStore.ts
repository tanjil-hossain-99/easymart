import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/lib/constants'
import type { User } from '@/types/api'

type AuthState = {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  logout: () => void
}

// persist() saves token + user to localStorage so a page refresh doesn't log you out.
// Trade-off: any JS running on the page (e.g. an XSS bug) can read localStorage.
// The safer option is an httpOnly cookie — we'll revisit that in the auth phase.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: STORAGE_KEYS.auth },
  ),
)
