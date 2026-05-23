"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { logout } from "@/lib/api/auth"

export function LogoutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function onClick() {
    setPending(true)
    await logout()
    router.push("/signin")
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-[13px] font-medium text-foreground ring-1 ring-border hover:ring-[color:var(--color-error)]/40 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <LogOut className="size-4" aria-hidden />
      {pending ? "Logging out..." : "Log out"}
    </button>
  )
}

