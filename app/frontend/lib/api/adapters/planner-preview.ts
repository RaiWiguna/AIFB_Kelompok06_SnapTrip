import { apiAssetUrl } from "@/lib/api/client"
import type {
  BackendPlannerPreview,
  BackendPlannerSessionResponse,
  PlannerPreviewDisplay,
  PlannerSessionDisplay,
} from "@/lib/api/types"
import type {
  BudgetCategory,
  BudgetCategoryId,
  DailyBudgetRow,
  DayPlan,
  DestinationStop,
  TransportMode,
} from "@/lib/trip-detail"

const BUDGET_IDS: BudgetCategoryId[] = ["accommodation", "transport", "meals", "activities", "other"]
const TRANSPORT_MODES: TransportMode[] = ["Drive", "Ferry", "Walk", "Scooter", "Speedboat", "Flight"]

export function adaptPlannerPreview(body: BackendPlannerPreview): PlannerPreviewDisplay {
  const detail = {
    id: body.session_id,
    itinerary: body.itinerary.map(adaptDayPlan),
    destinations: body.destinations.map(adaptDestinationStop),
    budgetCategories: body.budget.categories.map(adaptBudgetCategory),
    budgetDaily: body.budget.daily.map(adaptDailyBudgetRow),
    memoMarkdown: body.memo.markdown,
    memoCaption: body.memo.caption,
    memoSource: body.memo.source,
    memoItems: body.memo.items,
    memoTiles: body.memo.tiles.map((tile) => ({ src: apiAssetUrl(tile.src), alt: tile.alt })),
    galleryThumbs: body.gallery.thumbs.map((thumb) => ({ src: apiAssetUrl(thumb.src), alt: thumb.alt })),
    galleryMore: body.gallery.more,
    participants: [],
  }
  const budgetById = new Map(detail.budgetCategories.map((category) => [category.id, category.amount]))

  return {
    sessionId: body.session_id,
    title: body.title,
    status: body.status,
    categories: body.categories,
    documentsPersisted: body.documents.persisted,
    documentNote: body.documents.note,
    acceptance: body.acceptance,
    detail,
    budgetTotalAmount: body.budget.total_amount,
    budgetTotalLabel: body.budget.total_label,
    workspace: {
      memoCaption: body.memo.caption,
      memoItemCount: body.memo.items,
      memoTiles: detail.memoTiles.slice(0, 4),
      itineraryDays: detail.itinerary.map((day) => ({
        day: day.day,
        name: day.title,
        note: day.summary,
      })),
      budget: {
        total: body.budget.total_amount,
        perPerson: body.budget.total_amount,
        accommodation: budgetById.get("accommodation") || "Budget TBD",
        activities: budgetById.get("activities") || "Budget TBD",
        meals: budgetById.get("meals") || "Budget TBD",
      },
    },
  }
}

export function adaptPlannerSession(body: BackendPlannerSessionResponse): PlannerSessionDisplay {
  const session = body.session
  const display = session.display
  const preview = adaptPlannerPreview({
    session_id: session.id,
    title: display.title,
    status: "planner_preview",
    categories: display.categories,
    source: "planner_session",
    documents: {
      persisted: true,
      schema_versions: Object.values(session.documents)
        .filter(Boolean)
        .map((doc) => doc?.schema_version || ""),
      note: display.acceptance.reason,
    },
    destinations: display.destinations,
    memo: display.memo,
    itinerary: display.itinerary,
    budget: display.budget,
    gallery: display.gallery,
    acceptance: display.acceptance,
  })
  const hasMemo = Boolean(session.documents.trip_memo)
  const hasItinerary = Boolean(session.documents.full_itinerary)
  const hasBudget = Boolean(session.documents.budget_plan)
  return {
    ...preview,
    status: session.status,
    messages: session.messages,
    events: session.events,
    ready: session.ready,
    acceptedTripPlanId: session.accepted_trip_plan_id,
    travelStartDate: session.travel_start_date,
    travelEndDate: session.travel_end_date,
    travelerCount: session.traveler_count,
    workspace: {
      ...preview.workspace,
      memoCaption: hasMemo ? preview.workspace.memoCaption : null,
      memoItemCount: hasMemo ? preview.workspace.memoItemCount : 0,
      memoTiles: hasMemo ? preview.workspace.memoTiles : [],
      itineraryDays: hasItinerary ? preview.workspace.itineraryDays : [],
      budget: hasBudget ? preview.workspace.budget : null,
    },
  }
}

function adaptDestinationStop(item: BackendPlannerPreview["destinations"][number]): DestinationStop {
  return {
    order: item.order,
    name: item.name,
    region: item.region,
    cover: apiAssetUrl(item.cover),
    blurb: item.blurb,
    highlights: item.highlights,
    pin: item.pin,
    days: item.days,
    address: item.address,
    lat: item.lat,
    lng: item.lng,
    googleMapsUri: item.google_maps_uri,
    placeEnrichmentId: item.place_enrichment_id,
  }
}

function adaptDayPlan(day: BackendPlannerPreview["itinerary"][number]): DayPlan {
  return {
    day: day.day,
    title: day.title,
    summary: day.summary,
    description: day.description,
    cover: apiAssetUrl(day.cover),
    dateLabel: day.dateLabel,
    highlights: day.highlights,
    activities: day.activities,
    transport: {
      mode: TRANSPORT_MODES.includes(day.transport.mode as TransportMode)
        ? (day.transport.mode as TransportMode)
        : "Drive",
      from: day.transport.from,
      to: day.transport.to,
      durationLabel: day.transport.durationLabel,
    },
    accommodation: day.accommodation,
    meals: day.meals,
    estCost: day.estCost,
  }
}

function adaptBudgetCategory(category: BackendPlannerPreview["budget"]["categories"][number]): BudgetCategory {
  const id = BUDGET_IDS.includes(category.id as BudgetCategoryId) ? (category.id as BudgetCategoryId) : "other"
  return {
    id,
    label: category.label,
    amount: category.amount,
    note: category.note,
    items: category.items,
  }
}

function adaptDailyBudgetRow(row: BackendPlannerPreview["budget"]["daily"][number]): DailyBudgetRow {
  return {
    day: row.day,
    title: row.title,
    route: row.route,
    amounts: {
      accommodation: Number(row.amounts.accommodation || 0),
      transport: Number(row.amounts.transport || 0),
      meals: Number(row.amounts.meals || 0),
      activities: Number(row.amounts.activities || 0),
      other: Number(row.amounts.other || 0),
    },
  }
}
