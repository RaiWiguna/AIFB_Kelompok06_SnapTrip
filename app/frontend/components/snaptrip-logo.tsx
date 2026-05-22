import { cn } from "@/lib/utils"

type Tone = "dark" | "light"

export function SnapTripMark({
  className,
  tone = "dark",
}: {
  className?: string
  tone?: Tone
}) {
  const stroke = tone === "dark" ? "#123c35" : "#f5f0e7"
  return (
    <svg
      viewBox="0 0 36 36"
      width="32"
      height="32"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <circle
        cx="18"
        cy="18"
        r="16.5"
        fill="none"
        stroke={stroke}
        strokeWidth="1.25"
      />
      {/* Palm tree */}
      <path
        d="M14 22 C14 18 13 14 11 12"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M11 12 C9 11 7 11 5.5 12.5 M11 12 C10 10 9 8.5 7 8 M11 12 C12 10 13.5 9 16 9 M11 12 C12.5 11 14.5 11 16.5 12.5"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Mountain */}
      <path
        d="M14 22 L19 16 L24 22 Z"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Sea waves */}
      <path
        d="M6 26 Q9 24.5 12 26 T18 26 T24 26 T30 26"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export function SnapTripLogo({
  className,
  tone = "dark",
}: {
  className?: string
  tone?: Tone
}) {
  const text = tone === "dark" ? "text-primary" : "text-mist"
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <SnapTripMark tone={tone} />
      <span className={cn("font-display text-2xl tracking-tight", text)}>
        SnapTrip
      </span>
    </div>
  )
}
