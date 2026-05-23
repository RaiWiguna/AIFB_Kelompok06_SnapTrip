import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export type Step = {
  label: string
  href?: string
}

export function StepIndicator({
  current,
  steps,
  className,
}: {
  current: number // 1-based
  steps: Step[]
  className?: string
}) {
  return (
    <nav aria-label="Progress" className={cn("flex flex-wrap items-center gap-2", className)}>
      {steps.map((step, i) => {
        const idx = i + 1
        const isDone = idx < current
        const isCurrent = idx === current
        return (
          <div key={step.label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium",
                isDone && "border-primary bg-primary text-primary-foreground",
                isCurrent && "border-primary bg-background text-primary",
                !isDone && !isCurrent && "border-border bg-background text-muted-foreground",
              )}
              aria-current={isCurrent ? "step" : undefined}
            >
              {isDone ? <Check className="h-3.5 w-3.5" aria-hidden /> : idx}
            </div>
            <span
              className={cn(
                "text-sm",
                isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
                isDone && "text-foreground",
              )}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <span aria-hidden className="mx-1 hidden h-px w-8 bg-border md:inline-block" />
            )}
          </div>
        )
      })}
    </nav>
  )
}

export const NEW_TRIP_STEPS: Step[] = [
  { label: "Images" },
  { label: "Categories" },
  { label: "Recommendations" },
  { label: "Plan" },
  { label: "Review" },
]
