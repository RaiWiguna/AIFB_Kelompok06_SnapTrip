import { apiAssetUrl } from "@/lib/api/client"
import type {
  BackendTripCard,
  BackendUser,
  CurrentUserDisplay,
  MyTripDisplay,
  TripCardDisplay,
} from "@/lib/api/types"

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "ST"
}

export function formatIdr(value?: number | null) {
  if (!value) return "Budget TBD"
  if (value >= 1_000_000) {
    const amount = value / 1_000_000
    return `Rp ${amount.toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`
  }
  if (value >= 1000) {
    return `Rp ${(value / 1000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`
  }
  return `Rp ${value.toLocaleString("id-ID")}`
}

export function formatIdrLong(value?: number | null) {
  if (!value) return "Budget TBD"
  return `IDR ${value.toLocaleString("en-US")}`
}

export function adaptCurrentUser(user: BackendUser): CurrentUserDisplay {
  return {
    id: user.id,
    displayName: user.display_name,
    email: user.email,
    avatar: user.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.display_name}`,
    joinedAt: user.joined_label || "Joined recently",
    bio: user.bio || "Planning memorable trips across Indonesia.",
    initials: initials(user.display_name),
  }
}

export function adaptTripCard(item: BackendTripCard): TripCardDisplay {
  return {
    id: item.id,
    title: item.title,
    cover: apiAssetUrl(item.cover_url),
    sourceImageId: item.source_image_id,
    region: item.region,
    categories: item.categories,
    days: item.duration_days || 1,
    budget: formatIdr(item.estimated_budget_idr),
    likes: item.like_count,
    saves: item.save_count,
    owner: {
      name: item.owner_display.name,
      avatar: item.owner_display.avatar_url,
      verified: item.owner_display.verified,
    },
    editorPick: item.editor_pick,
    liked: Boolean(item.viewer?.liked),
  }
}

export function adaptMyTrip(item: {
  id: string
  title: string
  cover_url: string
  categories: MyTripDisplay["categories"]
  days: number
  estimated_budget_idr?: number | null
  visibility: MyTripDisplay["visibility"]
  status: MyTripDisplay["status"]
  updated_label: string
  participants: number
  owner_name: string
  joined_as?: MyTripDisplay["joinedAs"]
}): MyTripDisplay {
  return {
    id: item.id,
    title: item.title,
    cover: apiAssetUrl(item.cover_url),
    categories: item.categories,
    days: item.days,
    estBudget: formatIdrLong(item.estimated_budget_idr),
    visibility: item.visibility,
    status: item.status,
    updated: item.updated_label,
    participants: item.participants,
    ownerName: item.owner_name,
    joinedAs: item.joined_as,
  }
}

