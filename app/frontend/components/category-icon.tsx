import type { CategoryId } from "@/lib/categories"
import { cn } from "@/lib/utils"

/**
 * Hand-styled icons per canonical SnapTrip category.
 * Stroke-based, calm, editorial.
 */
export function CategoryIcon({
  id,
  className,
  size = 18,
  strokeWidth = 1.6,
}: {
  id: CategoryId
  className?: string
  size?: number
  strokeWidth?: number
}) {
  const sw = strokeWidth
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: cn("shrink-0", className),
    "aria-hidden": true,
  }

  switch (id) {
    case "pantai":
      return (
        <svg {...props}>
          <path d="M3 11c2-1.4 4-1.4 6 0s4 1.4 6 0 4-1.4 6 0" />
          <path d="M3 16c2-1.4 4-1.4 6 0s4 1.4 6 0 4-1.4 6 0" />
          <path d="M3 21c2-1.4 4-1.4 6 0s4 1.4 6 0 4-1.4 6 0" />
        </svg>
      )
    case "gunung":
      return (
        <svg {...props}>
          <path d="M3 20l6-10 4 6 3-4 5 8z" />
        </svg>
      )
    case "air_terjun":
      return (
        <svg {...props}>
          <path d="M5 4v9" />
          <path d="M9 4v11" />
          <path d="M13 4v9" />
          <path d="M17 4v11" />
          <path d="M21 4v9" />
          <path d="M3 18c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2" />
        </svg>
      )
    case "wisata_tradisional":
      return (
        <svg {...props}>
          <path d="M12 3l2 2-2 2-2-2z" />
          <path d="M7 10l5-3 5 3-1 2H8z" />
          <path d="M8 14l4-2 4 2-1 2H9z" />
          <path d="M9 18h6l-1 3H10z" />
        </svg>
      )
  }
}
