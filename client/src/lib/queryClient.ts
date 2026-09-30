import { QueryClient } from '@tanstack/react-query'
import { STALE_TIME } from '@/lib/constants'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME.default,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
