"use client"

import { ArrowUp } from "lucide-react"
import { type FormEvent, useState } from "react"

export function ChatComposer({
  onSubmit,
  disabled,
  placeholder = "Ask anything about your trip…",
}: {
  onSubmit: (text: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [value, setValue] = useState("")

  function handle(e: FormEvent) {
    e.preventDefault()
    const v = value.trim()
    if (!v || disabled) return
    onSubmit(v)
    setValue("")
  }

  return (
    <form
      onSubmit={handle}
      className="flex items-center gap-2 rounded-2xl bg-card p-2 ring-1 ring-border/70 focus-within:ring-primary/40"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="min-w-0 flex-1 bg-transparent px-2 text-[13.5px] outline-none placeholder:text-muted-foreground disabled:opacity-60"
      />
      <button
        type="submit"
        aria-label="Send"
        disabled={disabled || !value.trim()}
        className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground transition hover:bg-[#0b2a25] disabled:opacity-40"
      >
        <ArrowUp className="size-4" aria-hidden />
      </button>
    </form>
  )
}
