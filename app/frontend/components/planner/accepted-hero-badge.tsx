"use client"

import { motion, useReducedMotion } from "framer-motion"

/**
 * Decorative animated dots scattered across the accepted-hero. Skipped under
 * `prefers-reduced-motion`. Dots are positioned absolutely behind the hero
 * content so they read as ambient confetti rather than an info layer.
 */
export function AcceptedHeroBadge() {
  const reduce = useReducedMotion()

  // Pre-computed positions / colors so the layout is deterministic on SSR.
  const dots = [
    { top: "10%", left: "8%", size: 8, color: "bg-primary/60" },
    { top: "22%", left: "92%", size: 6, color: "bg-accent" },
    { top: "76%", left: "5%", size: 10, color: "bg-primary/30" },
    { top: "40%", left: "78%", size: 5, color: "bg-primary/50" },
    { top: "64%", left: "88%", size: 7, color: "bg-accent/80" },
    { top: "84%", left: "60%", size: 6, color: "bg-primary/40" },
    { top: "16%", left: "44%", size: 4, color: "bg-accent" },
    { top: "92%", left: "30%", size: 5, color: "bg-primary/50" },
  ] as const

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d, i) =>
        reduce ? (
          <span
            key={i}
            className={`absolute rounded-full ${d.color}`}
            style={{ top: d.top, left: d.left, width: d.size, height: d.size }}
          />
        ) : (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.4, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: 0.1 + i * 0.06,
              type: "spring",
              stiffness: 220,
              damping: 16,
            }}
            className={`absolute rounded-full ${d.color}`}
            style={{ top: d.top, left: d.left, width: d.size, height: d.size }}
          />
        ),
      )}
    </div>
  )
}
