import type { CategoryId } from "@/lib/categories"
import type { TripDetailFull } from "@/lib/trip-detail"

export type CurrentUserDisplay = {
  id: string
  displayName: string
  email: string
  avatar: string
  joinedAt: string
  bio: string
  initials: string
}

export type TripCardDisplay = {
  id: string
  title: string
  cover: string
  sourceImageId?: string | null
  region: string
  categories: CategoryId[]
  days: number
  budget: string
  likes: number
  saves: number
  owner: { name: string; avatar: string; verified?: boolean }
  editorPick?: boolean
  liked?: boolean
  saved?: boolean
}

export type ExploreTripDisplay = TripCardDisplay

export type MyTripDisplay = {
  id: string
  title: string
  cover: string
  categories: CategoryId[]
  days: number
  estBudget: string
  visibility: "private" | "invite_only" | "public"
  status: "draft" | "accepted"
  updated: string
  participants: number
  ownerName: string
  joinedAs?: "owner" | "viewer"
}

export type AccountSummaryDisplay = {
  user: CurrentUserDisplay
  stats: { trips: number; joined: number; collections: number; likes: number }
  recentOwnedTrips: MyTripDisplay[]
  joinedTrips: MyTripDisplay[]
}

export type CollectionCardDisplay = {
  id: string
  slug: string
  name: string
  description: string
  count: number
  cover: string
  covers: string[]
  visibility: "private" | "shared"
  updated: string
}

export type CollectionDetailDisplay = {
  id: string
  slug: string
  title: string
  description: string
  cover: string
  region: string
  categoryIds: CategoryId[]
  savesLabel: string
  tripIds: string[]
  trips: TripCardDisplay[]
}

export type BackendUser = {
  id: string
  email: string
  display_name: string
  avatar_url?: string
  joined_label?: string
  bio?: string
}

export type BackendTripCard = {
  id: string
  title: string
  owner_id: string
  categories: CategoryId[]
  cover_url: string
  source_image_id?: string | null
  region: string
  duration_days?: number
  estimated_budget_idr?: number | null
  like_count: number
  save_count: number
  editor_pick?: boolean
  owner_display: { name: string; avatar_url: string; verified?: boolean }
  viewer?: { liked?: boolean; saved?: boolean }
}

export type UploadedImageDisplay = {
  id: string
  filename: string
  contentType?: string | null
  sizeBytes: number
  sizeLabel: string
  url: string
  source: string
  sourceLabel: string
}

export type CategoryScoreDisplay = {
  id: CategoryId
  label: string
  value: number
}

export type PerImagePredictionDisplay = {
  imageId: string
  image?: UploadedImageDisplay
  topCategory: CategoryId
  topLabel: string
  confidence: number
  confidenceLabel: string
  scores: CategoryScoreDisplay[]
}

export type ClassificationDisplay = {
  id: string
  mode: string
  modelVersion: string
  perImage: PerImagePredictionDisplay[]
  scores: CategoryScoreDisplay[]
}

export type BackendUploadedImage = {
  id: string
  filename: string
  content_type?: string | null
  size_bytes: number
  url: string
  source: string
}

export type BackendClassification = {
  id: string
  model_version: string
  mode: string
  per_image: {
    image_id: string
    top_category: CategoryId
    predictions: { category: CategoryId; confidence: number }[]
  }[]
  aggregated: { category: CategoryId; confidence: number }[]
}

export type BackendRecommendationRun = {
  id: string
  summary: string
  confirmed_categories: CategoryId[]
  fallback_used: boolean
  provider_modes?: Record<string, string>
}

export type BackendRecommendationItem = {
  id: string
  place_enrichment_id?: string
  rank: number
  name: string
  categories: CategoryId[]
  region: string
  short_summary: string
  description: string
  match_reason: string
  opening_hours_summary: { status: string; summary: string }
  estimated_cost: { amount_idr?: number | null; label: string; is_estimate: boolean }
  location: { address?: string | null; lat?: number | null; lng?: number | null; google_maps_uri?: string | null }
  image_snaps: { photo_id: string; url?: string | null; attribution?: string | null }[]
  warnings: { code: string; message: string }[]
  source_notes: { source: string; note: string }[]
  confidence: "high" | "medium" | "low"
}

export type RecommendationCardDisplay = {
  id: string
  name: string
  match: number
  category: string
  subCategory: string
  cover: string
  estTime: string
  estBudget: string
  region: string
  reason: string
  hours?: string
  estimateNote?: string
  address?: string | null
  lat?: number | null
  lng?: number | null
  googleMapsUri?: string | null
  placeEnrichmentId?: string | null
  selected: boolean
}

export type BackendTripDetailStop = {
  order: number
  name: string
  region: string
  address?: string | null
  cover: string
  blurb: string
  highlights: string[]
  pin: { x: number; y: number }
  days: number[]
  lat?: number | null
  lng?: number | null
  google_maps_uri?: string | null
  place_enrichment_id?: string | null
}

export type BackendTripDetail = {
  trip_plan: BackendTripCard & {
    description: string
    duration_nights: number
    travelers: string
    views: number
    comments: number
    last_updated: string
    owner_bio: string
    owner_stats: { trips: number; followers: string; response_rate: string }
    budget_total: string
    visibility: "private" | "invite_only" | "public"
    status: "draft" | "accepted"
  }
  gallery: {
    thumbs: { src: string; alt: string }[]
    more: number
  }
  destinations: BackendTripDetailStop[]
  memo: {
    markdown: string
    caption: string
    source: string
    items: number
    tiles: { src: string; alt: string }[]
  }
  itinerary: {
    day: number
    title: string
    summary: string
    description: string
    cover: string
    dateLabel: string
    highlights: string[]
    activities: {
      time: string
      title: string
      detail: string
      location?: string
      duration?: string
    }[]
    transport: { mode: string; from: string; to: string; durationLabel: string }
    accommodation: { name: string; area: string; nights: number }
    meals?: { breakfast?: string; lunch?: string; dinner?: string }
    estCost: { value: string; note?: string }
  }[]
  budget: {
    categories: {
      id: string
      label: string
      amount: string
      note: string
      items: { label: string; amount: string; detail?: string }[]
    }[]
    daily: {
      day: number
      title: string
      route: string
      amounts: Record<string, number>
    }[]
    total_amount: string
    total_label: string
  }
  participants: {
    id: string
    name: string
    handle?: string
    avatar: string
    role: string
    status: string
    joinedLabel: string
  }[]
}

export type BackendTripCreationSession = {
  id: string
  source: string
  status: string
  image_ids: string[]
  source_image_refs: { image_id: string; source: string }[]
  confirmed_categories: CategoryId[]
  selected_recommendation_ids: string[]
  latest_recommendation_run_id?: string | null
  images: BackendUploadedImage[]
  uploaded_images: BackendUploadedImage[]
  source_images: BackendUploadedImage[]
  classification?: BackendClassification | null
  latest_recommendations?: {
    run: BackendRecommendationRun
    items: BackendRecommendationItem[]
  } | null
}

export type TripCreationSessionDisplay = {
  id: string
  source: string
  status: string
  confirmedCategories: CategoryId[]
  selectedRecommendationIds: string[]
  latestRecommendationRunId?: string | null
  images: UploadedImageDisplay[]
  classification?: ClassificationDisplay | null
  recommendations?: {
    run: BackendRecommendationRun
    items: RecommendationCardDisplay[]
  } | null
}

export type BackendPlannerPreview = {
  session_id: string
  title: string
  status: "planner_preview"
  categories: CategoryId[]
  source: string
  documents: {
    persisted: boolean
    schema_versions: string[]
    note: string
  }
  destinations: BackendTripDetailStop[]
  memo: BackendTripDetail["memo"]
  itinerary: BackendTripDetail["itinerary"]
  budget: BackendTripDetail["budget"]
  gallery: BackendTripDetail["gallery"]
  acceptance: {
    enabled: boolean
    reason: string
  }
}

export type PlannerWorkspaceInitialState = {
  memoCaption: string | null
  memoItemCount: number
  memoTiles: { src: string; alt: string }[]
  itineraryDays: { day: number; name: string; note: string }[]
  budget: {
    total: string
    perPerson: string
    accommodation: string
    activities: string
    meals: string
  } | null
}

export type PlannerPreviewDisplay = {
  sessionId: string
  title: string
  status: "planner_preview"
  categories: CategoryId[]
  documentsPersisted: boolean
  documentNote: string
  acceptance: {
    enabled: boolean
    reason: string
  }
  detail: TripDetailFull
  budgetTotalAmount: string
  budgetTotalLabel: string
  workspace: PlannerWorkspaceInitialState
}

