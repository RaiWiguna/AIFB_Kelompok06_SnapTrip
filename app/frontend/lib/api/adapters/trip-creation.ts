import { apiAssetUrl } from "@/lib/api/client"
import type {
  BackendClassification,
  BackendRecommendationItem,
  BackendTripCreationSession,
  BackendUploadedImage,
  ClassificationDisplay,
  RecommendationCardDisplay,
  TripCreationSessionDisplay,
  UploadedImageDisplay,
} from "@/lib/api/types"
import { CATEGORY_LABEL, type CategoryId } from "@/lib/categories"

const SOURCE_LABEL: Record<string, string> = {
  upload: "Upload",
  saved_or_liked_trip_plan: "Saved trip",
}

function formatBytes(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} MB`
  if (value >= 1000) return `${Math.round(value / 1000)} KB`
  return `${value} B`
}

function percent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100)))
}

export function adaptUploadedImage(image: BackendUploadedImage): UploadedImageDisplay {
  return {
    id: image.id,
    filename: image.filename,
    contentType: image.content_type,
    sizeBytes: image.size_bytes,
    sizeLabel: formatBytes(image.size_bytes),
    url: apiAssetUrl(image.url),
    source: image.source,
    sourceLabel: SOURCE_LABEL[image.source] || "Saved trip",
  }
}

export function adaptClassification(
  classification: BackendClassification | null | undefined,
  images: UploadedImageDisplay[],
): ClassificationDisplay | null {
  if (!classification) return null
  const imageById = new Map(images.map((image) => [image.id, image]))
  return {
    id: classification.id,
    mode: classification.mode,
    modelVersion: classification.model_version,
    perImage: classification.per_image.map((item) => {
      const topPrediction =
        item.predictions.find((prediction) => prediction.category === item.top_category) || item.predictions[0]
      const confidence = percent(topPrediction?.confidence || 0)
      return {
        imageId: item.image_id,
        image: imageById.get(item.image_id),
        topCategory: item.top_category,
        topLabel: CATEGORY_LABEL[item.top_category],
        confidence,
        confidenceLabel: `${confidence}%`,
        scores: item.predictions.map((prediction) => ({
          id: prediction.category,
          label: CATEGORY_LABEL[prediction.category],
          value: percent(prediction.confidence),
        })),
      }
    }),
    scores: classification.aggregated.map((item) => ({
      id: item.category,
      label: CATEGORY_LABEL[item.category],
      value: percent(item.confidence),
    })),
  }
}

function matchPercent(item: BackendRecommendationItem) {
  const confidenceBase = item.confidence === "high" ? 96 : item.confidence === "medium" ? 88 : 78
  return Math.max(65, confidenceBase - Math.max(item.rank - 1, 0) * 3)
}

function subCategory(categories: CategoryId[]) {
  return categories.map((category) => CATEGORY_LABEL[category]).join(", ")
}

function warningText(item: BackendRecommendationItem) {
  const warning = item.warnings.find((entry) => entry.code === "provider_fallback") || item.warnings[0]
  if (warning) return warning.message
  if (item.estimated_cost.is_estimate) return "Costs are estimates and may change before travel."
  return undefined
}

export function adaptRecommendationItem(
  item: BackendRecommendationItem,
  selectedIds: string[] = [],
): RecommendationCardDisplay {
  return {
    id: item.id,
    name: item.name,
    match: matchPercent(item),
    category: item.categories.length > 1 ? "Mixed" : CATEGORY_LABEL[item.categories[0]],
    subCategory: subCategory(item.categories),
    cover: apiAssetUrl(item.image_snaps[0]?.url || "/placeholder.jpg"),
    estTime: item.short_summary,
    estBudget: item.estimated_cost.label,
    region: item.region,
    reason: item.match_reason,
    hours: item.opening_hours_summary.summary,
    estimateNote: warningText(item),
    address: item.location.address,
    lat: item.location.lat,
    lng: item.location.lng,
    googleMapsUri: item.location.google_maps_uri,
    placeEnrichmentId: item.place_enrichment_id,
    selected: selectedIds.includes(item.id),
  }
}

export function adaptTripCreationSession(session: BackendTripCreationSession): TripCreationSessionDisplay {
  const images = session.images.map(adaptUploadedImage)
  const selectedIds = session.selected_recommendation_ids || []
  return {
    id: session.id,
    source: session.source,
    status: session.status,
    confirmedCategories: session.confirmed_categories || [],
    selectedRecommendationIds: selectedIds,
    latestRecommendationRunId: session.latest_recommendation_run_id,
    images,
    classification: adaptClassification(session.classification, images),
    recommendations: session.latest_recommendations
      ? {
          run: session.latest_recommendations.run,
          items: session.latest_recommendations.items.map((item) => adaptRecommendationItem(item, selectedIds)),
        }
      : null,
  }
}

export function defaultConfirmedCategories(
  confirmedCategories: CategoryId[],
  classification: ClassificationDisplay | null | undefined,
): CategoryId[] {
  if (confirmedCategories.length) return confirmedCategories
  return classification?.scores.slice(0, 1).map((score) => score.id) || []
}
