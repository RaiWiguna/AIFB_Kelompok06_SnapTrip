"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, AtSign, Lock, User } from "lucide-react"
import { ApiError } from "@/lib/api/client"
import { signup } from "@/lib/api/auth"

export function SignUpForm({
  successHref,
  buttonLabel,
}: {
  successHref: string
  buttonLabel: string
}) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setPending(true)
    const form = new FormData(event.currentTarget)
    try {
      await signup({
        display_name: String(form.get("display_name") || ""),
        email: String(form.get("email") || ""),
        password: String(form.get("password") || ""),
      })
      router.push(successHref)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create account.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="mt-7 space-y-3.5" onSubmit={onSubmit}>
      <label className="block">
        <span className="text-[12.5px] font-medium text-foreground/75">Display name</span>
        <div className="mt-2 flex items-center gap-3 rounded-[18px] bg-card px-4 py-3 ring-1 ring-border transition focus-within:ring-primary">
          <User className="size-4 text-muted-foreground" aria-hidden />
          <input
            name="display_name"
            type="text"
            placeholder="Your full name"
            required
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
          />
        </div>
      </label>

      <label className="block">
        <span className="text-[12.5px] font-medium text-foreground/75">Email</span>
        <div className="mt-2 flex items-center gap-3 rounded-[18px] bg-card px-4 py-3 ring-1 ring-border transition focus-within:ring-primary">
          <AtSign className="size-4 text-muted-foreground" aria-hidden />
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
        <div className="mt-2 flex items-center gap-3 rounded-[18px] bg-card px-4 py-3 ring-1 ring-border transition focus-within:ring-primary">
          <Lock className="size-4 text-muted-foreground" aria-hidden />
          <input
            name="password"
            type="password"
            placeholder="At least 8 characters"
            minLength={8}
            required
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
          />
        </div>
      </label>

      <p className="pt-1 text-[12px] leading-relaxed text-muted-foreground">
        By creating an account you agree to keep planning honest. SnapTrip never sells your trip data.
      </p>
      {error ? <p className="text-[12.5px] text-[color:var(--color-error)]">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-primary px-5 py-3.5 text-[14px] font-medium text-primary-foreground shadow-[0_18px_42px_rgba(18,60,53,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0b2a25] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Creating account..." : buttonLabel}
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </form>
  )
}

