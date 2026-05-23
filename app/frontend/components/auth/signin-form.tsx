"use client"

import { useState } from "react"
import { ArrowRight, Lock, Mail } from "lucide-react"
import { ApiError } from "@/lib/api/client"
import { login } from "@/lib/api/auth"

export function SignInForm({
  successHref,
  buttonLabel,
}: {
  successHref: string
  buttonLabel: string
}) {
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setPending(true)
    const form = new FormData(event.currentTarget)
    try {
      await login({
        email: String(form.get("email") || ""),
        password: String(form.get("password") || ""),
      })
      window.location.href = successHref
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="text-[12.5px] font-medium text-foreground/75">Email</span>
        <div className="mt-2 flex items-center gap-3 rounded-[18px] bg-card px-4 py-3.5 ring-1 ring-border transition focus-within:ring-primary">
          <Mail className="size-4 text-muted-foreground" aria-hidden />
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
          />
        </div>
      </label>

      <label className="block">
        <span className="text-[12.5px] font-medium text-foreground/75">Password</span>
        <div className="mt-2 flex items-center gap-3 rounded-[18px] bg-card px-4 py-3.5 ring-1 ring-border transition focus-within:ring-primary">
          <Lock className="size-4 text-muted-foreground" aria-hidden />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
          />
        </div>
      </label>

      {error ? <p className="text-[12.5px] text-[color:var(--color-error)]">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-primary px-5 py-4 text-[14px] font-medium text-primary-foreground shadow-[0_18px_42px_rgba(18,60,53,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0b2a25] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Signing in..." : buttonLabel}
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </form>
  )
}

