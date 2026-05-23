import { apiFetch } from "@/lib/api/client"
import { adaptCurrentUser } from "@/lib/api/adapters/trips"
import type { BackendUser, CurrentUserDisplay } from "@/lib/api/types"

type AuthResponse = { user: BackendUser }

export async function login(payload: { email: string; password: string }) {
  const body = await apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return adaptCurrentUser(body.user)
}

export async function signup(payload: { display_name: string; email: string; password: string }) {
  const body = await apiFetch<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return adaptCurrentUser(body.user)
}

export async function logout() {
  return apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" })
}

export async function getCurrentUser(cookieHeader?: string): Promise<CurrentUserDisplay> {
  const body = await apiFetch<AuthResponse>("/api/auth/me", { cookieHeader })
  return adaptCurrentUser(body.user)
}

