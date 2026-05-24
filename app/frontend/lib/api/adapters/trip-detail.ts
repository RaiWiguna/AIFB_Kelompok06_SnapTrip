import { apiAssetUrl } from "@/lib/api/client"
import { adaptTripCard, formatIdrLong } from "@/lib/api/adapters/trips"
import type { BackendTripDetail } from "@/lib/api/types"
import { CATEGORY_LABEL } from "@/lib/categories"
import type {
  BudgetCategory,
  BudgetCategoryId,
  DailyBudgetRow,
  DayPlan,
  DestinationStop,
  TransportMode,
  TripDetailFull,
  TripParticipant,
  TripParticipantRole,
  TripParticipantStatus,
} from "@/lib/trip-detail"

type TripDetailSummary = ReturnType<typeof adaptTripSummary>

export type TripDetailPageDisplay = {
  summary: TripDetailSummary
  detail: TripDetailFull
}

const BUDGET_IDS: BudgetCategoryId[] = ["accommodation", "transport", "meals", "activities", "other"]
const TRANSPORT_MODES: TransportMode[] = ["Drive", "Ferry", "Walk", "Scooter", "Speedboat", "Flight"]
const PARTICIPANT_ROLES: TripParticipantRole[] = ["Owner", "Editor", "Viewer"]
const PARTICIPANT_STATUSES: TripParticipantStatus[] = ["active", "pending"]

export function adaptTripDetail(body: BackendTripDetail): TripDetailPageDisplay {
  return {
    summary: adaptTripSummary(body),
    detail: {
      id: body.trip_plan.id,
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
      participants: body.participants.map(adaptParticipant),
    },
  }
}

function adaptTripSummary(body: BackendTripDetail) {
  const plan = body.trip_plan
  const card = adaptTripCard(plan)
  const budgetById = new Map(body.budget.categories.map((category) => [category.id, category]))
  return {
    ...card,
    ownerId: plan.owner_id,
    description: plan.description,
    tags: card.categories.map((category) => CATEGORY_LABEL[category] || category),
    durationDays: plan.duration_days || 1,
    durationNights: plan.duration_nights,
    estBudget: plan.budget_total || formatIdrLong(plan.estimated_budget_idr),
    travelers: plan.travelers,
    views: plan.views || 0,
    comments: plan.comments || 0,
    likesK: compactCount(plan.like_count),
    saves: plan.save_count,
    lastUpdated: plan.last_updated,
    owner: {
      name: plan.owner_display.name,
      avatar: plan.owner_display.avatar_url,
      verified: plan.owner_display.verified,
    },
    ownerBio: plan.owner_bio,
    ownerStats: {
      trips: plan.owner_stats.trips,
      followers: plan.owner_stats.followers,
      responseRate: plan.owner_stats.response_rate,
    },
    visibility: plan.visibility,
    status: plan.status,
    plannerSessionId: plan.planner_session_id,
    budget: {
      total: plan.budget_total || formatIdrLong(plan.estimated_budget_idr),
      accommodation: budgetSummary(budgetById.get("accommodation")),
      transport: budgetSummary(budgetById.get("transport")),
      meals: budgetSummary(budgetById.get("meals")),
      activities: budgetSummary(budgetById.get("activities")),
      other: budgetSummary(budgetById.get("other")),
    },
  }
}

function adaptDestinationStop(item: BackendTripDetail["destinations"][number]): DestinationStop {
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

function adaptDayPlan(day: BackendTripDetail["itinerary"][number]): DayPlan {
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

function adaptBudgetCategory(category: BackendTripDetail["budget"]["categories"][number]): BudgetCategory {
  const id = BUDGET_IDS.includes(category.id as BudgetCategoryId) ? (category.id as BudgetCategoryId) : "other"
  return {
    id,
    label: category.label,
    amount: category.amount,
    note: category.note,
    items: category.items,
  }
}

function adaptDailyBudgetRow(row: BackendTripDetail["budget"]["daily"][number]): DailyBudgetRow {
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

function adaptParticipant(participant: BackendTripDetail["participants"][number]): TripParticipant {
  return {
    id: participant.id,
    name: participant.name,
    handle: participant.handle,
    avatar: participant.avatar,
    role: PARTICIPANT_ROLES.includes(participant.role as TripParticipantRole)
      ? (participant.role as TripParticipantRole)
      : "Viewer",
    status: PARTICIPANT_STATUSES.includes(participant.status as TripParticipantStatus)
      ? (participant.status as TripParticipantStatus)
      : "active",
    joinedLabel: participant.joinedLabel,
  }
}

function compactCount(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return String(value)
}

function budgetSummary(category?: BackendTripDetail["budget"]["categories"][number]) {
  return {
    value: category?.amount || "Budget TBD",
    note: category?.note || "(Estimated)",
  }
}
