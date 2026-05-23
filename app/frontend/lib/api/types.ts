import type { CategoryId } from "@/lib/categories"

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
  region: string
  categories: CategoryId[]
  days: number
  budget: string
  likes: number
  saves: number
  owner: { name: string; avatar: string; verified?: boolean }
  editorPick?: boolean
  liked?: boolean
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
  categories: CategoryId[]
  cover_url: string
  region: string
  duration_days?: number
  estimated_budget_idr?: number | null
  like_count: number
  save_count: number
  editor_pick?: boolean
  owner_display: { name: string; avatar_url: string; verified?: boolean }
  viewer?: { liked?: boolean }
}

