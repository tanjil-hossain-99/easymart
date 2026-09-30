import { env } from "@/config/env"
import { API_ENDPOINTS, HttpMethod, HttpStatus } from "@/lib/constants"
import { useAuthStore } from "@/stores/useAuthStore"
import type { ApiErrorBody, ProductFilters } from "@/types/api"

// Carries the HTTP status so callers can tell "wrong password" (401) from "server down" (500)
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type FetchOptions = {
  method?: HttpMethod
  body?: unknown
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  // getState() reads the store outside React — this function isn't a component
  const token = useAuthStore.getState().token
  const hasBody = options.body !== undefined

  const res = await fetch(`${env.apiUrl}${path}`, {
    method: options.method ?? HttpMethod.Get,
    headers: {
      ...(hasBody && { "Content-Type": "application/json" }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: hasBody ? JSON.stringify(options.body) : undefined,
  })

  // Token expired or invalid → drop it so the UI shows "logged out"
  if (res.status === HttpStatus.Unauthorized && token) useAuthStore.getState().logout()

  if (!res.ok) {
    // Use the server's { error: "..." } message when there is one
    const data: ApiErrorBody | null = await res.json().catch(() => null)
    throw new ApiError(res.status, data?.error ?? `API error: ${res.status}`)
  }

  // 204 No Content (e.g. DELETE) has no body to parse
  if (res.status === HttpStatus.NoContent) return undefined as T
  return res.json() as Promise<T>
}

// Turns a filters object into "/products?category_id=…&sort=…", skipping empty values
export function buildProductsUrl(filters: ProductFilters): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "" && value !== false) params.set(key, String(value))
  }
  return `${API_ENDPOINTS.products}?${params.toString()}`
}
