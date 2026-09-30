import { QueryClient } from '@tanstack/react-query'
import { isRetryableError } from '@/lib/api'
import { QUERY_MAX_RETRIES, STALE_TIME } from '@/lib/constants'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME.default,
      // Retry network/server errors once; a 404 won't fix itself, so show it right away
      retry: (failureCount, error) => isRetryableError(error) && failureCount < QUERY_MAX_RETRIES,
      refetchOnWindowFocus: false,
    },
  },
})
