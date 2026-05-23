"use client"

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion"

type SectionProps = HTMLMotionProps<"section"> & {
  children: React.ReactNode
}

const sectionTransition = {
  duration: 0.9,
  ease: [0.16, 1, 0.3, 1],
} as const

export function LandingSection({ children, className, ...props }: SectionProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.section
      className={className}
      initial={reduceMotion ? false : { opacity: 0.92, y: 28 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.26 }}
      transition={sectionTransition}
      {...props}
    >
      {children}
    </motion.section>
  )
}

type RevealProps = HTMLMotionProps<"div"> & {
  children: React.ReactNode
  delay?: number
  direction?: "up" | "down" | "left" | "right"
}

const offsets = {
  up: { y: 36, x: 0 },
  down: { y: -24, x: 0 },
  left: { x: 34, y: 0 },
  right: { x: -34, y: 0 },
}

export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
  ...props
}: RevealProps) {
  const reduceMotion = useReducedMotion()
  const offset = offsets[direction]

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, ...offset, filter: "blur(10px)" }}
      whileInView={reduceMotion ? undefined : { opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.34 }}
      transition={{
        duration: 0.86,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

type StaggerProps = HTMLMotionProps<"div"> & {
  children: React.ReactNode
}

export function Stagger({ children, className, ...props }: StaggerProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "show"}
      viewport={{ once: true, amount: 0.22 }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.08,
            delayChildren: 0.08,
          },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

type StaggerItemProps = HTMLMotionProps<"div"> & {
  children: React.ReactNode
}

export function StaggerItem({ children, className, ...props }: StaggerItemProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 22, scale: 0.98 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.72, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

type FloatProps = HTMLMotionProps<"div"> & {
  children: React.ReactNode
  amplitude?: number
  duration?: number
}

export function Float({
  children,
  className,
  amplitude = 10,
  duration = 7,
  ...props
}: FloatProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      animate={
        reduceMotion
          ? undefined
          : {
              y: [0, -amplitude, 0],
              rotate: [0, 0.35, 0],
            }
      }
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function Sheen({ className = "" }: { className?: string }) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.span
      aria-hidden
      className={`pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-18deg] bg-white/25 blur-xl ${className}`}
      animate={reduceMotion ? undefined : { x: ["0%", "520%"] }}
      transition={{
        duration: 4.8,
        repeat: Infinity,
        repeatDelay: 2.4,
        ease: [0.16, 1, 0.3, 1],
      }}
    />
  )
}
