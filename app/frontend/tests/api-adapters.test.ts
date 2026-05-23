import { describe, expect, it } from "vitest"
import { apiAssetUrl, ApiError } from "../lib/api/client"
import { adaptTripCard, formatIdr } from "../lib/api/adapters/trips"
import { adaptRecommendationItem, adaptTripCreationSession } from "../lib/api/adapters/trip-creation"

describe("frontend API adapters", () => {
  it("formats IDR display values for trip cards", () => {
    expect(formatIdr(2_800_000)).toBe("Rp 2,8 jt")
    expect(formatIdr(950_000)).toBe("Rp 950 rb")
  })

  it("adapts backend trip cards to the existing TripCard display shape", () => {
    const trip = adaptTripCard({
      id: "trip_1",
      title: "Bali Coast",
      categories: ["pantai"],
      cover_url: "/api/images/img_1",
      source_image_id: "img_1",
      region: "Bali",
      duration_days: 3,
      estimated_budget_idr: 1_500_000,
      like_count: 4,
      save_count: 2,
      owner_display: {
        name: "Snap User",
        avatar_url: "https://example.test/avatar.svg",
        verified: true,
      },
      viewer: { liked: true },
    })

    expect(trip).toMatchObject({
      id: "trip_1",
      title: "Bali Coast",
      region: "Bali",
      days: 3,
      budget: "Rp 1,5 jt",
      likes: 4,
      saves: 2,
      liked: true,
      owner: { name: "Snap User", verified: true },
      sourceImageId: "img_1",
    })
    expect(trip.cover).toContain("/api/images/img_1")
  })

  it("adapts uploaded images and classification scores for review screens", () => {
    const session = adaptTripCreationSession({
      id: "tcs_1",
      source: "upload",
      status: "classified",
      image_ids: ["img_1"],
      source_image_refs: [],
      confirmed_categories: [],
      selected_recommendation_ids: [],
      images: [
        {
          id: "img_1",
          filename: "beach.jpg",
          content_type: "image/jpeg",
          size_bytes: 2_400_000,
          url: "/api/images/img_1",
          source: "upload",
        },
      ],
      uploaded_images: [],
      source_images: [],
      classification: {
        id: "cls_1",
        model_version: "2026-05-mvp",
        mode: "mock",
        per_image: [
          {
            image_id: "img_1",
            top_category: "pantai",
            predictions: [{ category: "pantai", confidence: 0.92 }],
          },
        ],
        aggregated: [{ category: "pantai", confidence: 0.92 }],
      },
      latest_recommendations: null,
    })

    expect(session.images[0]).toMatchObject({ filename: "beach.jpg", sourceLabel: "Upload", sizeLabel: "2.4 MB" })
    expect(session.classification?.perImage[0]).toMatchObject({
      topCategory: "pantai",
      topLabel: "Pantai",
      confidenceLabel: "92%",
    })
  })

  it("adapts recommendation cards with warning text and selected state", () => {
    const rec = adaptRecommendationItem(
      {
        id: "reci_1",
        rank: 1,
        name: "Pantai Kuta",
        categories: ["pantai"],
        region: "Bali",
        short_summary: "2 hours near Denpasar",
        description: "Beach destination",
        match_reason: "Matches beach preferences.",
        opening_hours_summary: { status: "available", summary: "Open daily" },
        estimated_cost: { amount_idr: 150_000, label: "Estimasi mulai Rp150.000", is_estimate: true },
        location: {},
        image_snaps: [{ photo_id: "pho_1", url: "/api/place-photos/pho_1" }],
        warnings: [{ code: "provider_fallback", message: "Using curated fallback." }],
        source_notes: [],
        confidence: "high",
      },
      ["reci_1"],
    )

    expect(rec).toMatchObject({
      name: "Pantai Kuta",
      match: 96,
      category: "Pantai",
      selected: true,
      estimateNote: "Using curated fallback.",
    })
    expect(rec.cover).toContain("/api/place-photos/pho_1")
  })

  it("keeps frontend public placeholder assets relative", () => {
    expect(apiAssetUrl("/landing/diamond-beach.png")).toBe("/landing/diamond-beach.png")
  })

  it("normalizes API errors for UI code", () => {
    const error = new ApiError(401, "unauthorized", "Authentication required")
    expect(error.status).toBe(401)
    expect(error.message).toBe("Authentication required")
  })
})

