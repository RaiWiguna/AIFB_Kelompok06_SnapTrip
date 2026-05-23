import { env } from "@/lib/env"

export type ApiFetchOptions = RequestInit & {
  cookieHeader?: string
}

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

function apiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  return `${env.NEXT_PUBLIC_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

export function apiAssetUrl(value: string) {
  if (!value) return "/placeholder.jpg"
  if (value.startsWith("/api/")) return `${env.NEXT_PUBLIC_API_BASE_URL}${value}`
  return value
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has("content-type") && !(options.body instanceof FormData)) {
    headers.set("content-type", "application/json")
  }
  if (options.cookieHeader) {
    headers.set("cookie", options.cookieHeader)
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
    credentials: "include",
    cache: options.cache ?? "no-store",
  })
  const contentType = response.headers.get("content-type") || ""
  const body = contentType.includes("application/json") ? await response.json() : null
  if (!response.ok) {
    const error = body?.error
    throw new ApiError(response.status, error?.code || "http_error", error?.message || response.statusText)
  }
  return body as T
}

