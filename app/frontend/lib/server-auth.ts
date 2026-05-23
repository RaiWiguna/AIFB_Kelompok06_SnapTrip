import "server-only"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { AppHeaderUser } from "@/components/app-header"
import type { AuthAction } from "@/lib/auth-context"
import { ApiError } from "@/lib/api/client"
import { getCurrentUser } from "@/lib/api/auth"

export async function getCookieHeader() {
  return (await cookies()).toString()
}

export async function getAppHeaderUser(cookieHeader?: string): Promise<AppHeaderUser> {
  const user = await getCurrentUser(cookieHeader ?? await getCookieHeader())
  return {
    name: user.displayName,
    email: user.email,
    initials: user.initials,
  }
}

export async function getOptionalAppHeaderUser(cookieHeader?: string): Promise<AppHeaderUser | undefined> {
  try {
    return await getAppHeaderUser(cookieHeader)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return undefined
    throw error
  }
}

export async function requireAppHeaderUser(
  next: string,
  action: AuthAction = "trips",
  cookieHeader?: string,
): Promise<AppHeaderUser> {
  try {
    return await getAppHeaderUser(cookieHeader)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/signin?next=${encodeURIComponent(next)}&action=${action}`)
    }
    throw error
  }
}
