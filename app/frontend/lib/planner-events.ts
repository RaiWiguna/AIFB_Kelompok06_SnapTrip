import type { LucideIcon } from "lucide-react"
import { Brain, Bookmark, Calendar, Search, Sparkles, Wallet } from "lucide-react"
import type { BackendPlannerEvent, BackendPlannerMessage } from "@/lib/api/types"

export type AgentTurnKind =
  | "reasoned"
  | "searched-memo"
  | "searched-destinations"
  | "drafted-itinerary"
  | "updated-budget"
  | "edited-memo"

export type AgentTurnSpec = {
  kind: AgentTurnKind
  label: string
  paragraph?: string
  durationMs: number
}

export type ChatTurn =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string }
  | {
      id: string
      role: "agent-run"
      activeIndex: number
      done: boolean
      steps: AgentTurnSpec[]
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

const RUN_TERMINAL_EVENTS = new Set(["run_completed", "run_failed", "run_interrupted"])
const STEP_EVENTS = new Set([
  "turn_started",
  "tool_started",
  "document_validation_started",
  "document_validation_failed",
  "document_committed",
  "context_compaction_started",
])

export function plannerTimeline(messages: BackendPlannerMessage[], events: BackendPlannerEvent[]): ChatTurn[] {
  const runs = buildRuns(events, messages)
  const insertedRuns = new Set<string>()
  const turns: ChatTurn[] = []
  const visible = messages
    .filter((message) => message.visible !== false && ["user", "assistant"].includes(message.role))
    .sort((a, b) => a.sequence - b.sequence)

  for (const message of visible) {
    if (message.role === "user") {
      turns.push({ id: message.id, role: "user", text: message.content })
      continue
    }
    const runId = message.run_id || ""
    const run = runs.find((item) => item.id === runId)
    if (run && !insertedRuns.has(run.id)) {
      turns.push(run)
      insertedRuns.add(run.id)
    } else if (!run) {
      turns.push({ id: message.id, role: "assistant", text: message.content })
    }
  }

  for (const run of runs) {
    if (!insertedRuns.has(run.id)) {
      turns.push(run)
    }
  }
  return turns
}

function buildRuns(events: BackendPlannerEvent[], messages: BackendPlannerMessage[]): ChatTurn[] {
  const byRun = new Map<string, BackendPlannerEvent[]>()
  for (const event of events) {
    if (!event.run_id) continue
    const group = byRun.get(event.run_id) || []
    group.push(event)
    byRun.set(event.run_id, group)
  }

  return Array.from(byRun.entries())
    .map(([runId, runEvents]) => {
      const sortedEvents = runEvents.sort((a, b) => a.sequence - b.sequence)
      const steps = sortedEvents.filter((event) => STEP_EVENTS.has(event.type)).map(eventToStep)
      const done = sortedEvents.some((event) => RUN_TERMINAL_EVENTS.has(event.type))
      const assistant = messages.find((message) => message.run_id === runId && message.role === "assistant")
      return {
        id: runId,
        role: "agent-run" as const,
        activeIndex: done ? Math.max(steps.length - 1, 0) : Math.max(steps.length - 1, 0),
        done,
        steps: steps.length ? steps : [{ kind: "reasoned" as const, label: "Reasoning", durationMs: 600 }],
        summary: assistant?.content,
      }
    })
    .sort((a, b) => firstSequence(a.id, events) - firstSequence(b.id, events))
}

function eventToStep(event: BackendPlannerEvent): AgentTurnSpec {
  return {
    kind: eventKind(event),
    label: event.label,
    paragraph: event.type === "document_committed" ? "The matching planner document was validated and saved." : undefined,
    durationMs: 600,
  }
}

function eventKind(event: BackendPlannerEvent): AgentTurnKind {
  const tool = typeof event.payload?.tool === "string" ? event.payload.tool : ""
  if (tool.includes("places") || tool.includes("research") || event.type.includes("research")) return "searched-destinations"
  if (tool.includes("itinerary") || event.label.includes("Itinerary")) return "drafted-itinerary"
  if (tool.includes("budget") || event.label.includes("Budget")) return "updated-budget"
  if (tool.includes("memo") || event.label.includes("Memo")) return "edited-memo"
  if (event.type.includes("validation") || event.type.includes("compaction")) return "searched-memo"
  return "reasoned"
}

function firstSequence(runId: string, events: BackendPlannerEvent[]) {
  return Math.min(...events.filter((event) => event.run_id === runId).map((event) => event.sequence))
}
