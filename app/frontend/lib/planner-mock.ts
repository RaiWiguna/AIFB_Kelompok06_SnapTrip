import type { LucideIcon } from "lucide-react"
import { Brain, Bookmark, Calendar, Search, Sparkles, Wallet } from "lucide-react"

export type AgentTurnKind =
  | "reasoned"
  | "searched-memo"
  | "searched-destinations"
  | "drafted-itinerary"
  | "updated-budget"
  | "edited-memo"

export type AgentTurnSpec = {
  kind: AgentTurnKind
  /** Short row label, like "Reasoned" or "Searched codebase" */
  label: string
  /** Optional longer paragraph rendered as prose under the row */
  paragraph?: string
  /** Time the spinner should run (ms) before the row settles */
  durationMs: number
  /** Optional patch applied at the end of this turn */
  patch?: AgentPatch
}

export type AgentPatch =
  | { target: "memo"; tiles?: { src: string; alt: string }[]; caption?: string; itemCount?: number }
  | {
      target: "itinerary"
      day: number
      name: string
      note: string
    }
  | {
      target: "budget"
      total: string
      perPerson: string
      accommodation: string
      activities: string
      meals: string
    }

export type ChatTurn =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string }
  | {
      id: string
      role: "agent-run"
      /** While true, the active step shows a spinner */
      activeIndex: number
      done: boolean
      steps: AgentTurnSpec[]
      /** Final assistant summary shown after the run is done */
      summary?: string
    }

export const TURN_ICONS: Record<AgentTurnKind, LucideIcon> = {
  reasoned: Brain,
  "searched-memo": Search,
  "searched-destinations": Search,
  "drafted-itinerary": Calendar,
  "updated-budget": Wallet,
  "edited-memo": Bookmark,
}

export const ACTIVE_PILL_ICON: Record<AgentTurnKind, LucideIcon> = {
  reasoned: Sparkles,
  "searched-memo": Search,
  "searched-destinations": Search,
  "drafted-itinerary": Calendar,
  "updated-budget": Wallet,
  "edited-memo": Bookmark,
}

const MEMO_TILES = [
  {
    src: "https://images.unsplash.com/photo-1518544801976-3e159e50e5bb?auto=format&fit=crop&w=200&q=70",
    alt: "Coastal cliffs at sunset",
  },
  {
    src: "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=200&q=70",
    alt: "Tropical waterfall",
  },
  {
    src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=200&q=70",
    alt: "Rice terraces",
  },
  {
    src: "https://images.unsplash.com/photo-1573790387438-4da905039392?auto=format&fit=crop&w=200&q=70",
    alt: "Balinese temple ceremony",
  },
]

/**
 * Scripted flows. The orchestrator picks one at random, or by index, and plays
 * each step with a spinner for `durationMs` then "settles" the row.
 *
 * Each flow corresponds to a user prompt category (broad / day-edit / budget /
 * memo / destinations). The first prompt in each list is the suggestion shown
 * in the empty state.
 */
export type PlannerFlow = {
  prompts: string[]
  steps: AgentTurnSpec[]
  summary: string
}

export const PLANNER_FLOWS: PlannerFlow[] = [
  {
    prompts: [
      "Plan me a 6-day Bali volcanic coast road trip",
      "Draft a full plan for Bali",
      "Build me a Bali itinerary",
    ],
    steps: [
      {
        kind: "reasoned",
        label: "Reasoned",
        paragraph:
          "Let me look at the saved memo and destination signals to anchor the trip on the southern volcanic coast.",
        durationMs: 1100,
      },
      {
        kind: "searched-memo",
        label: "Searched memo",
        durationMs: 850,
      },
      {
        kind: "searched-destinations",
        label: "Searched destinations",
        paragraph:
          "Found strong signals around Ubud, Nusa Penida, and Uluwatu. I'll thread them along a clockwise coastal loop so transfers stay short.",
        durationMs: 950,
      },
      {
        kind: "edited-memo",
        label: "Wrote trip memo",
        durationMs: 800,
        patch: {
          target: "memo",
          tiles: MEMO_TILES,
          caption:
            "A scenic 6-day road trip along Bali's southern shores — cliffside temples, black sand beaches, and sunrise hikes.",
          itemCount: 23,
        },
      },
      {
        kind: "drafted-itinerary",
        label: "Drafted Day 1 — Ubud",
        durationMs: 700,
        patch: { target: "itinerary", day: 1, name: "Ubud", note: "Arrive, rice terraces, local markets" },
      },
      {
        kind: "drafted-itinerary",
        label: "Drafted Day 2 — Waterfalls & Temples",
        durationMs: 650,
        patch: {
          target: "itinerary",
          day: 2,
          name: "Waterfalls & Temples",
          note: "Tegenungan, Tirta Empul, Kintamani",
        },
      },
      {
        kind: "drafted-itinerary",
        label: "Drafted Day 3 — Nusa Penida",
        durationMs: 650,
        patch: {
          target: "itinerary",
          day: 3,
          name: "Nusa Penida",
          note: "Kelingking Beach, Broken Beach",
        },
      },
      {
        kind: "drafted-itinerary",
        label: "Drafted Day 4 — Amed & Sidemen",
        durationMs: 650,
        patch: {
          target: "itinerary",
          day: 4,
          name: "Amed & Sidemen",
          note: "Coastal drive, viewpoints",
        },
      },
      {
        kind: "drafted-itinerary",
        label: "Drafted Day 5 — Uluwatu & South Coast",
        durationMs: 650,
        patch: {
          target: "itinerary",
          day: 5,
          name: "Uluwatu & South Coast",
          note: "Beaches, cliffs, sunset",
        },
      },
      {
        kind: "drafted-itinerary",
        label: "Drafted Day 6 — Sanur",
        durationMs: 650,
        patch: { target: "itinerary", day: 6, name: "Sanur", note: "Relax and departure" },
      },
      {
        kind: "updated-budget",
        label: "Estimated budget",
        durationMs: 800,
        patch: {
          target: "budget",
          total: "IDR 2,800,000",
          perPerson: "IDR 2,800,000",
          accommodation: "IDR 1,050,000",
          activities: "IDR 960,000",
          meals: "IDR 790,000",
        },
      },
    ],
    summary:
      "Drafted a 6-day southern Bali loop and seeded the memo, itinerary, and budget. Tell me what to adjust — a day, a price ceiling, or a vibe.",
  },
  {
    prompts: ["Make day 3 more relaxed", "Slow down day 3", "Day 3 is too packed"],
    steps: [
      { kind: "reasoned", label: "Reasoned", durationMs: 700 },
      { kind: "searched-memo", label: "Searched memo for slow-day notes", durationMs: 700 },
      {
        kind: "drafted-itinerary",
        label: "Rewrote Day 3 — Nusa Penida",
        durationMs: 800,
        patch: {
          target: "itinerary",
          day: 3,
          name: "Nusa Penida (slow day)",
          note: "Kelingking viewpoint, beach, late lunch",
        },
      },
    ],
    summary: "Eased Day 3 to a single-stop loop with a long lunch built in.",
  },
  {
    prompts: ["Cap the budget around 2.5M IDR", "Cut the budget", "Lower spending"],
    steps: [
      { kind: "reasoned", label: "Reasoned", durationMs: 700 },
      { kind: "updated-budget", label: "Recalculating spend", durationMs: 850 },
      {
        kind: "updated-budget",
        label: "Updated budget",
        durationMs: 600,
        patch: {
          target: "budget",
          total: "IDR 2,450,000",
          perPerson: "IDR 2,450,000",
          accommodation: "IDR 900,000",
          activities: "IDR 850,000",
          meals: "IDR 700,000",
        },
      },
    ],
    summary: "Trimmed lodging tier and one paid activity to land near IDR 2.45M per person.",
  },
  {
    prompts: ["Tighten the memo voice", "Rewrite the memo"],
    steps: [
      { kind: "reasoned", label: "Reasoned", durationMs: 600 },
      {
        kind: "edited-memo",
        label: "Edited trip memo",
        durationMs: 900,
        patch: {
          target: "memo",
          caption:
            "Six days. Volcanic coastline. Cliffside temples, hidden waterfalls, rice terraces, and a slow last morning in Sanur.",
        },
      },
    ],
    summary: "Tightened the memo to a single voice — drop me a phrase if you want a different feel.",
  },
]

/**
 * Pick a flow whose prompts loosely match the user message. Falls back to the
 * "broad plan" flow when nothing matches and the workspace is still empty.
 */
export function pickFlow(userMessage: string, isEmpty: boolean): PlannerFlow {
  const m = userMessage.toLowerCase()
  for (let i = 1; i < PLANNER_FLOWS.length; i++) {
    if (PLANNER_FLOWS[i].prompts.some((p) => m.includes(p.toLowerCase().slice(0, 8)))) {
      return PLANNER_FLOWS[i]
    }
  }
  if (m.includes("budget") || m.includes("cheap") || m.includes("idr")) return PLANNER_FLOWS[2]
  if (m.includes("day 3") || m.includes("relax") || m.includes("slow")) return PLANNER_FLOWS[1]
  if (m.includes("memo") || m.includes("voice") || m.includes("tone")) return PLANNER_FLOWS[3]
  return isEmpty ? PLANNER_FLOWS[0] : PLANNER_FLOWS[1]
}

export const SUGGESTED_PROMPTS = [
  "Plan me a 6-day Bali volcanic coast road trip",
  "Make day 3 more relaxed",
  "Cap the budget around 2.5M IDR",
  "Tighten the memo voice",
]
