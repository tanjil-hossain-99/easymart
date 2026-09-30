import { env } from "@/config/env"
import { HttpMethod, HttpStatus } from "@/lib/constants"
import { useAuthStore } from "@/stores/useAuthStore"
import type { ApiErrorBody } from "@/types/api"

// Carries the HTTP status so callers can tell "wrong password" (401) from "server down" (500)
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// "That thing doesn't exist": 404, or 400 for a malformed id in the URL (e.g. /products/abc).
// Pages show the not-found screen for these instead of a raw error message.
export function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === HttpStatus.NotFound || error.status === HttpStatus.BadRequest)
  )
}

// 4xx = the request itself is wrong (not found, not allowed) — retrying can't fix it.
// Only network errors and 5xx (server hiccups) are worth another try.
export function isRetryableError(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status >= HttpStatus.InternalServerError
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

type QueryValue = string | number | boolean | undefined
type QueryParams = Record<string, QueryValue | string[]>

// Turns (path, filters) into "/products?category_id=…&sort=…", skipping empty values.
// Arrays become repeated params (?brand=LG&brand=Sony) — how multi-select filters are sent.
export function buildUrl(path: string, params: QueryParams): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((v) => search.append(key, v))
    else if (value !== undefined && value !== "" && value !== false) search.set(key, String(value))
  }
  const query = search.toString()
  // No params → "/s", not "/s?"
  return query ? `${path}?${query}` : path
}
