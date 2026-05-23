"use client"

import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Lightbulb, PiggyBank } from "lucide-react"
import { useMemo, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { BudgetCategory, BudgetCategoryId, DailyBudgetRow } from "@/lib/trip-detail"

type Mode = "day" | "category"

const SLICE_VARS: Record<BudgetCategoryId, string> = {
  accommodation: "var(--chart-1)",
  transport: "var(--chart-2)",
  meals: "var(--chart-3)",
  activities: "var(--chart-4)",
  other: "var(--chart-5)",
}

const DAY_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
]

function formatIDR(n: number) {
  return "IDR " + n.toLocaleString("en-US")
}

type Slice = { id: string; label: string; value: number; color: string; pct: number }

function Donut({ slices, totalLabel, total }: { slices: Slice[]; totalLabel: string; total: number }) {
  const r = 70
  const circumference = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="relative grid size-[200px] place-items-center">
      <svg viewBox="0 0 180 180" className="size-full -rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--secondary)" strokeWidth="22" />
        {slices.map((s) => {
          const dash = (s.pct / 100) * circumference
          const dashArray = `${dash} ${circumference - dash}`
          const dashOffset = -offset
          offset += dash
          return (
            <motion.circle
              key={s.id}
              cx="90"
              cy="90"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="22"
              strokeLinecap="butt"
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: dashArray, strokeDashoffset: dashOffset }}
              transition={{ type: "spring", stiffness: 90, damping: 18 }}
            />
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-[20px] leading-none tracking-[-0.01em] text-foreground">
            {formatIDR(total).replace("IDR ", "IDR ")}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{totalLabel}</p>
        </div>
      </div>
    </div>
  )
}

export function TripBudgetExplorer({
  tripId,
  categories,
  daily,
  totalLabel,
  totalAmount,
  backHref,
  backLabel = "Back to Trip Overview",
}: {
  tripId: string
  categories: BudgetCategory[]
  daily: DailyBudgetRow[]
  totalLabel: string
  totalAmount: string
  backHref?: string
  backLabel?: string
}) {
  const resolvedBackHref = backHref ?? `/trips/${tripId}`
  const [mode, setMode] = useState<Mode>("day")

  const totals = useMemo(() => {
    const byCat: Record<BudgetCategoryId, number> = {
      accommodation: 0, transport: 0, meals: 0, activities: 0, other: 0,
    }
    let grand = 0
    daily.forEach((d) => {
      ;(Object.keys(d.amounts) as BudgetCategoryId[]).forEach((k) => {
        byCat[k] += d.amounts[k]
        grand += d.amounts[k]
      })
    })
    const byDay = daily.map((d) => ({
      day: d.day,
      total: (Object.values(d.amounts) as number[]).reduce((a, b) => a + b, 0),
    }))
    return { byCat, byDay, grand }
  }, [daily])

  const slices: Slice[] = useMemo(() => {
    if (mode === "category") {
      return categories.map((c) => {
        const value = totals.byCat[c.id]
        return {
          id: c.id,
          label: c.label,
          value,
          color: SLICE_VARS[c.id],
          pct: Math.round((value / totals.grand) * 100),
        }
      })
    }
    return totals.byDay.map((d, i) => ({
      id: `day-${d.day}`,
      label: `Day ${d.day}`,
      value: d.total,
      color: DAY_VARS[i % DAY_VARS.length],
      pct: Math.round((d.total / totals.grand) * 100),
    }))
  }, [mode, categories, totals])

  return (
    <LayoutGroup>
      {/* Top: Estimated total + currency note */}
      <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-6">
        <div className="md:col-span-1 rounded-2xl bg-card p-4 ring-1 ring-border/70">
          <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Estimated total</p>
          <p className="mt-1.5 font-display text-[18px] leading-tight text-foreground">{totalAmount}</p>
          <p className="mt-1 text-[11.5px] text-muted-foreground">{totalLabel}</p>
        </div>
        {categories.map((c) => (
          <div key={c.id} className="md:col-span-1 rounded-2xl bg-card p-4 ring-1 ring-border/70">
            <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{c.label}</p>
            <p className="mt-1.5 font-display text-[16px] leading-tight text-foreground">{c.amount}</p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">{c.note}</p>
          </div>
        ))}
      </section>

      {/* Main grid: breakdown table (left) + summary (right) */}
      <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* Breakdown card */}
        <div className="rounded-2xl bg-card p-5 ring-1 ring-border/70">
          <header className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-foreground">
              {mode === "day" ? "Daily Breakdown" : "Category Breakdown"}
            </h2>
            <div
              role="tablist"
              aria-label="Breakdown mode"
              className="relative inline-flex rounded-full bg-secondary p-1 ring-1 ring-border/60"
            >
              {(["day", "category"] as Mode[]).map((m) => {
                const active = mode === m
                return (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setMode(m)}
                    className={cn(
                      "relative z-10 px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
                      active ? "text-primary-foreground" : "text-foreground/70 hover:text-foreground",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="budget-tab-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    {m === "day" ? "By Day" : "By Category"}
                  </button>
                )
              })}
            </div>
          </header>

          <div className="mt-4 overflow-x-auto">
            <AnimatePresence mode="wait" initial={false}>
              {mode === "day" ? (
                <motion.table
                  key="by-day"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  className="w-full text-left text-[12.5px]"
                >
                  <thead className="text-muted-foreground">
                    <tr className="border-b border-border/60">
                      <th className="py-2.5 pr-4 font-medium">Day</th>
                      <th className="py-2.5 pr-4 font-medium">Route / Activities</th>
                      {categories.map((c) => (
                        <th key={c.id} className="py-2.5 pr-4 font-medium">
                          <span className="block">{c.label}</span>
                          <span className="block text-[10.5px] font-normal">(per day)</span>
                        </th>
                      ))}
                      <th className="py-2.5 pr-2 font-medium">
                        <span className="block">Total</span>
                        <span className="block text-[10.5px] font-normal">(per day)</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.map((d, i) => {
                      const dayTotal = (Object.values(d.amounts) as number[]).reduce((a, b) => a + b, 0)
                      return (
                        <motion.tr
                          key={d.day}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-border/40 last:border-b-0"
                        >
                          <td className="py-3 pr-4 align-top">
                            <span className="font-medium text-foreground">Day {d.day}</span>
                          </td>
                          <td className="py-3 pr-4 align-top">
                            <span className="block font-medium text-foreground">{d.title}</span>
                            <span className="block text-[11.5px] text-muted-foreground">{d.route}</span>
                          </td>
                          {categories.map((c) => (
                            <td key={c.id} className="py-3 pr-4 align-top text-foreground">
                              {formatIDR(d.amounts[c.id])}
                            </td>
                          ))}
                          <td className="py-3 pr-2 align-top font-semibold text-foreground">
                            {formatIDR(dayTotal)}
                          </td>
                        </motion.tr>
                      )
                    })}
                    <tr className="border-t border-border/60 bg-secondary/40">
                      <td className="py-3 pr-4 font-semibold text-foreground" colSpan={2}>
                        Total ({daily.length} Days)
                      </td>
                      {categories.map((c) => (
                        <td key={c.id} className="py-3 pr-4 font-semibold text-foreground">
                          {formatIDR(totals.byCat[c.id])}
                        </td>
                      ))}
                      <td className="py-3 pr-2 font-semibold text-foreground">{formatIDR(totals.grand)}</td>
                    </tr>
                  </tbody>
                </motion.table>
              ) : (
                <motion.div
                  key="by-category"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  className="flex flex-col"
                >
                  {categories.map((c, i) => {
                    const value = totals.byCat[c.id]
                    const pct = Math.round((value / totals.grand) * 100)
                    return (
                      <div key={c.id} className={cn("py-3", i === 0 ? "" : "border-t border-border/60")}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span
                              aria-hidden
                              className="size-2.5 rounded-full"
                              style={{ background: SLICE_VARS[c.id] }}
                            />
                            <div>
                              <p className="text-[13.5px] font-medium text-foreground">
                                {c.label} <span className="text-muted-foreground">({pct}%)</span>
                              </p>
                              <p className="text-[11.5px] text-muted-foreground">{c.note}</p>
                            </div>
                          </div>
                          <span className="text-[14px] font-semibold text-foreground">{formatIDR(value)}</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.05 + i * 0.04, type: "spring", stiffness: 100, damping: 18 }}
                            className="h-full rounded-full"
                            style={{ background: SLICE_VARS[c.id] }}
                          />
                        </div>
                        <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                          {c.items.map((it, idx) => (
                            <li key={idx} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                              <span className="truncate text-foreground">{it.label}</span>
                              <span className="text-muted-foreground">{it.amount}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                  <div className="border-t border-border/60 bg-secondary/40 mt-2 -mx-5 -mb-5 px-5 py-3 rounded-b-2xl flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-foreground">Total ({daily.length} Days)</span>
                    <span className="text-[14px] font-semibold text-foreground">{formatIDR(totals.grand)}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p className="mt-3 text-[11.5px] text-muted-foreground">
            * Costs are estimates based on average prices and can change.
          </p>
        </div>

        {/* Summary + tips */}
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl bg-card p-5 ring-1 ring-border/70">
            <h2 className="text-[15px] font-semibold text-foreground">Budget Summary</h2>
            <div className="mt-3 grid grid-cols-1 items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
              <Donut slices={slices} totalLabel={mode === "day" ? "By day total" : "Total"} total={totals.grand} />
              <ul className="flex flex-col gap-2">
                <AnimatePresence mode="popLayout" initial={false}>
                  {slices.map((s) => (
                    <motion.li
                      key={s.id}
                      layout
                      initial={{ opacity: 0, x: 4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center justify-between gap-3 text-[12.5px]"
                    >
                      <span className="flex items-center gap-2">
                        <span aria-hidden className="size-2 rounded-full" style={{ background: s.color }} />
                        <span className="text-foreground">
                          {s.label} <span className="text-muted-foreground">({s.pct}%)</span>
                        </span>
                      </span>
                      <span className="text-foreground">{formatIDR(s.value)}</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl bg-card p-5 ring-1 ring-border/70">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <PiggyBank className="size-4 text-foreground/70" aria-hidden />
              Budget Tips
            </h2>
            <ul className="mt-3 flex flex-col gap-3">
              {[
                ["Travel in shoulder season", "Prices are lower and places are less crowded."],
                ["Book early", "Save on stays and popular tours."],
                ["Mix experiences", "Combine free viewpoints with paid attractions."],
                ["Use local transport", "Save more on shorter distances."],
              ].map(([h, p]) => (
                <li key={h} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid size-7 place-items-center rounded-lg bg-secondary text-foreground/70">
                    <Lightbulb className="size-3.5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{h}</p>
                    <p className="text-[11.5px] leading-relaxed text-muted-foreground">{p}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end">
            <Link
          href={resolvedBackHref}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground ring-1 ring-primary transition hover:bg-primary/90"
        >
          <span aria-hidden>←</span>
          {backLabel}
            </Link>
          </div>
        </div>
      </section>
    </LayoutGroup>
  )
}
