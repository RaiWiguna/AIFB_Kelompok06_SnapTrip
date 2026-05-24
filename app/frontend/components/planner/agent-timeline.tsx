"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Check } from "lucide-react"
import type { ChatTurn } from "@/lib/planner-events"
import { ACTIVE_PILL_ICON, TURN_ICONS } from "@/lib/planner-events"

export function AgentTimeline({ runs }: { runs: ChatTurn[] }) {
  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence initial={false}>
        {runs.map((turn) => {
          if (turn.role === "user") {
            return (
              <motion.div
                key={turn.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="ml-auto max-w-[88%] rounded-2xl rounded-br-sm bg-card px-3.5 py-2.5 text-[13px] text-foreground ring-1 ring-border/70"
              >
                {turn.text}
              </motion.div>
            )
          }
          if (turn.role === "assistant") {
            return (
              <motion.div
                key={turn.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[13.5px] leading-relaxed text-foreground/85"
              >
                {turn.text}
              </motion.div>
            )
          }

          // agent-run
          const active = !turn.done ? turn.steps[turn.activeIndex] : undefined
          const visibleCount = turn.activeIndex + 1
          // Connector progress: how much of the rail is "filled" (settled rows)
          const railFilled = turn.done ? 1 : Math.max(0, turn.activeIndex) / Math.max(1, turn.steps.length - 1)

          return (
            <motion.div
              key={turn.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              {/* Soft frame so the run reads as a single unit */}
              <div className="relative rounded-2xl bg-card/60 p-3.5 ring-1 ring-border/60 backdrop-blur-sm">
                {/* Vertical rail */}
                {turn.steps.length > 1 ? (
                  <>
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-[26px] top-[26px] bottom-[26px] w-px bg-border/60"
                    />
                    <motion.span
                      aria-hidden
                      initial={false}
                      animate={{ scaleY: railFilled }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      style={{ transformOrigin: "top" }}
                      className="pointer-events-none absolute left-[26px] top-[26px] bottom-[26px] w-px bg-primary/60"
                    />
                  </>
                ) : null}

                <div className="flex flex-col gap-3">
                  {turn.steps.map((step, i) => {
                    if (i >= visibleCount) return null
                    const isActiveRow = !turn.done && i === turn.activeIndex
                    const isSettled = i < turn.activeIndex || turn.done
                    const Icon = TURN_ICONS[step.kind]

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="flex flex-col gap-1.5"
                      >
                        <div className="flex items-center gap-3 text-[14px]">
                          <StepIndicator active={isActiveRow} settled={isSettled} icon={<Icon className="size-3.5" aria-hidden />} />
                          <StepLabel active={isActiveRow} settled={isSettled}>
                            {step.label}
                          </StepLabel>
                        </div>
                        {step.paragraph ? (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.08 }}
                            className="pl-[40px] text-[13.5px] leading-relaxed text-foreground/85"
                          >
                            {step.paragraph}
                          </motion.p>
                        ) : null}
                      </motion.div>
                    )
                  })}

                  {/* Active "Creating prototype"-style pill */}
                  <AnimatePresence>
                    {active ? (
                      <motion.div
                        key="pill"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="ml-[40px] inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[12.5px] font-medium text-primary ring-1 ring-primary/20"
                      >
                        <PillIcon kind={active.kind} />
                        <span>{pillLabel(active.label)}</span>
                        <BouncingDots />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>

              {/* Final assistant summary */}
              {turn.done && turn.summary ? (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="mt-3 text-[13.5px] leading-relaxed text-foreground/85"
                >
                  {turn.summary}
                </motion.div>
              ) : null}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

/* ----------------- step indicator: rotating dashed ring + icon morph ----------------- */

function StepIndicator({
  active,
  settled,
  icon,
}: {
  active: boolean
  settled: boolean
  icon: React.ReactNode
}) {
  return (
    <span className="relative grid size-[26px] shrink-0 place-items-center rounded-full bg-card ring-1 ring-border/70">
      {/* rotating dashed ring while active */}
      <AnimatePresence>
        {active ? (
          <motion.svg
            key="ring"
            aria-hidden
            viewBox="0 0 32 32"
            className="absolute inset-[-4px] size-[34px]"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1, rotate: 360 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
              rotate: { repeat: Number.POSITIVE_INFINITY, duration: 1.6, ease: "linear" },
            }}
          >
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="currentColor"
              className="text-primary/70"
              strokeWidth="1.5"
              strokeDasharray="3 4"
              strokeLinecap="round"
            />
          </motion.svg>
        ) : null}
      </AnimatePresence>

      {/* icon swap: active -> step icon, settled -> check */}
      <AnimatePresence mode="wait" initial={false}>
        {settled ? (
          <motion.span
            key="check"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 24 }}
            className="grid size-full place-items-center rounded-full bg-primary text-primary-foreground"
          >
            <Check className="size-3.5" aria-hidden />
          </motion.span>
        ) : (
          <motion.span
            key="icon"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={
              active
                ? "grid size-full place-items-center text-primary"
                : "grid size-full place-items-center text-muted-foreground/80"
            }
          >
            {icon}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

/* ----------------- shimmer label while active ----------------- */

function StepLabel({
  active,
  settled,
  children,
}: {
  active: boolean
  settled: boolean
  children: React.ReactNode
}) {
  if (active) {
    return (
      <span
        className="bg-clip-text text-transparent"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(31,39,35,0.45) 0%, rgba(31,39,35,0.95) 50%, rgba(31,39,35,0.45) 100%)",
          backgroundSize: "220% 100%",
          animation: "v0-shimmer 1.6s linear infinite",
        }}
      >
        {children}
      </span>
    )
  }
  return (
    <span className={settled ? "text-foreground/85" : "text-muted-foreground"}>{children}</span>
  )
}

/* ----------------- pill icon + bouncing dots ----------------- */

function PillIcon({ kind }: { kind: keyof typeof ACTIVE_PILL_ICON }) {
  const Icon = ACTIVE_PILL_ICON[kind]
  return (
    <span className="grid size-5 place-items-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/25">
      <Icon className="size-3" aria-hidden />
    </span>
  )
}

function BouncingDots() {
  return (
    <span className="ml-0.5 inline-flex items-end gap-[3px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block size-[3px] rounded-full bg-primary"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 0.9,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
    </span>
  )
}

function pillLabel(rowLabel: string) {
  if (rowLabel.startsWith("Reasoned")) return "Reasoning"
  if (rowLabel.startsWith("Searched")) return rowLabel.replace("Searched", "Searching")
  if (rowLabel.startsWith("Drafted")) return rowLabel.replace("Drafted", "Drafting")
  if (rowLabel.startsWith("Rewrote")) return rowLabel.replace("Rewrote", "Rewriting")
  if (rowLabel.startsWith("Wrote")) return rowLabel.replace("Wrote", "Writing")
  if (rowLabel.startsWith("Edited")) return rowLabel.replace("Edited", "Editing")
  if (rowLabel.startsWith("Updated")) return rowLabel.replace("Updated", "Updating")
  if (rowLabel.startsWith("Recalculating")) return rowLabel
  if (rowLabel.startsWith("Estimated")) return "Estimating budget"
  return rowLabel
}
