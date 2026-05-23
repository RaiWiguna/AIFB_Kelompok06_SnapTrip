import { apiAssetUrl, apiFetch } from "@/lib/api/client"
import { adaptTripCard } from "@/lib/api/adapters/trips"
import type { CategoryId } from "@/lib/categories"
import type { CollectionCardDisplay, CollectionDetailDisplay, BackendTripCard } from "@/lib/api/types"

type BackendCollectionCard = {
  id: string
  slug: string
  name: string
  description: string
  count: number
  cover_url: string
  cover_grid_urls: string[]
  visibility: "private" | "shared"
  updated_label: string
}

type BackendCollectionDetail = BackendCollectionCard & {
  title: string
  region: string
  category_ids: CategoryId[]
  saves_label: string
  trip_ids: string[]
  trips: BackendTripCard[]
}

function adaptCollectionCard(item: BackendCollectionCard): CollectionCardDisplay {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    count: item.count,
    cover: apiAssetUrl(item.cover_url),
    covers: item.cover_grid_urls.map(apiAssetUrl),
    visibility: item.visibility,
    updated: item.updated_label,
  }
}

export async function getCollections(cookieHeader?: string): Promise<CollectionCardDisplay[]> {
  const body = await apiFetch<{ collections: BackendCollectionCard[] }>("/api/collections", { cookieHeader })
  return body.collections.map(adaptCollectionCard)
}

export async function getCollectionDetail(
  slugOrId: string,
  cookieHeader?: string,
): Promise<CollectionDetailDisplay> {
  const body = await apiFetch<{ collection: BackendCollectionDetail }>(
    `/api/collections/${encodeURIComponent(slugOrId)}`,
    { cookieHeader },
  )
  const item = body.collection
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    description: item.description,
    cover: apiAssetUrl(item.cover_url),
    region: item.region,
    categoryIds: item.category_ids,
    savesLabel: item.saves_label,
    tripIds: item.trip_ids,
    trips: item.trips.map(adaptTripCard),
  }
}
