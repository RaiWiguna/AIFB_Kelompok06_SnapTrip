import { Globe2, Lock, Users } from "lucide-react"
import { cn } from "@/lib/utils"

type Visibility = "private" | "invite_only" | "public"

const META: Record<
  Visibility,
  { label: string; icon: typeof Lock; tone: string }
> = {
  private: { label: "Private", icon: Lock, tone: "bg-muted text-foreground" },
  invite_only: {
    label: "Invite only",
    icon: Users,
    tone: "bg-[color:var(--color-sunset-wash)]/40 text-[color:var(--color-warning)]",
  },
  public: {
    label: "Public",
    icon: Globe2,
    tone: "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]",
  },
}

export function VisibilityBadge({
  visibility,
  className,
}: {
  visibility: Visibility
  className?: string
}) {
  const m = META[visibility]
  const Icon = m.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        m.tone,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {m.label}
    </span>
  )
}
