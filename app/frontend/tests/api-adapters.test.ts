import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { apiAssetUrl, ApiError } from "../lib/api/client"
import { adaptTripCard, formatIdr } from "../lib/api/adapters/trips"
import { adaptTripDetail } from "../lib/api/adapters/trip-detail"
import { adaptRecommendationItem, adaptTripCreationSession } from "../lib/api/adapters/trip-creation"
import { TripRouteMap } from "../components/trip-route-map"

describe("frontend API adapters", () => {
  it("formats IDR display values for trip cards", () => {
    expect(formatIdr(2_800_000)).toBe("Rp 2,8 jt")
    expect(formatIdr(950_000)).toBe("Rp 950 rb")
  })

  it("adapts backend trip cards to the existing TripCard display shape", () => {
    const trip = adaptTripCard({
      id: "trip_1",
      title: "Bali Coast",
      owner_id: "usr_1",
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
        place_enrichment_id: "plc_1",
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
      placeEnrichmentId: "plc_1",
    })
    expect(rec.cover).toContain("/api/place-photos/pho_1")
  })

  it("adapts trip detail documents and map-safe destination fields", () => {
    const trip = adaptTripDetail({
      trip_plan: {
        id: "trip_1",
        title: "Bali Coast",
        owner_id: "usr_1",
        categories: ["pantai"],
        cover_url: "/landing/diamond-beach.png",
        region: "Bali",
        duration_days: 2,
        estimated_budget_idr: 500_000,
        like_count: 2,
        save_count: 1,
        owner_display: { name: "Snap User", avatar_url: "https://example.test/avatar.svg", verified: true },
        description: "Beach route",
        duration_nights: 1,
        travelers: "2 - 4",
        views: 20,
        comments: 3,
        last_updated: "Updated today",
        owner_bio: "Local traveler",
        owner_stats: { trips: 1, followers: "New", response_rate: "96%" },
        budget_total: "IDR 500,000",
        visibility: "public",
        status: "accepted",
      },
      gallery: { thumbs: [{ src: "/landing/diamond-beach.png", alt: "Beach" }], more: 0 },
      destinations: [
        {
          order: 1,
          name: "Pantai Kuta",
          region: "Kuta, Bali",
          address: "Kuta, Bali",
          cover: "/landing/diamond-beach.png",
          blurb: "Beach stop",
          highlights: ["Pantai"],
          pin: { x: 40, y: 50 },
          days: [1],
          lat: -8.7185,
          lng: 115.1686,
          google_maps_uri: "https://maps.google.com/?cid=1",
          place_enrichment_id: "plc_1",
        },
      ],
      memo: {
        markdown: "## Why this trip",
        caption: "Planning notes",
        source: "SnapTrip",
        items: 1,
        tiles: [{ src: "/landing/diamond-beach.png", alt: "Beach" }],
      },
      itinerary: [
        {
          day: 1,
          title: "Pantai Kuta",
          summary: "Beach stop",
          description: "Beach stop",
          cover: "/landing/diamond-beach.png",
          dateLabel: "Day 1",
          highlights: ["Pantai"],
          activities: [{ time: "09:00", title: "Explore", detail: "Beach stop" }],
          transport: { mode: "Drive", from: "Start", to: "Pantai Kuta", durationLabel: "Flexible" },
          accommodation: { name: "Local stay", area: "Bali", nights: 1 },
          estCost: { value: "IDR 500,000" },
        },
      ],
      budget: {
        categories: [
          { id: "accommodation", label: "Accommodation", amount: "IDR 200,000", note: "(Estimated)", items: [] },
        ],
        daily: [
          {
            day: 1,
            title: "Pantai Kuta",
            route: "Beach stop",
            amounts: { accommodation: 200000, transport: 100000, meals: 80000, activities: 100000, other: 20000 },
          },
        ],
        total_amount: "IDR 500,000",
        total_label: "per person",
      },
      participants: [
        {
          id: "usr_1",
          name: "Snap User",
          avatar: "https://example.test/avatar.svg",
          role: "Owner",
          status: "active",
          joinedLabel: "Owner",
        },
      ],
    })

    expect(trip.summary.title).toBe("Bali Coast")
    expect(trip.detail.destinations[0]).toMatchObject({
      lat: -8.7185,
      lng: 115.1686,
      googleMapsUri: "https://maps.google.com/?cid=1",
      placeEnrichmentId: "plc_1",
    })
    expect(trip.detail.memoMarkdown).toContain("Why this trip")
  })

  it("renders the static route map fallback without a Google Maps key", () => {
    const html = renderToStaticMarkup(
      createElement(TripRouteMap, {
        stops: [
          {
            order: 1,
            name: "Pantai Kuta",
            region: "Bali",
            cover: "/landing/diamond-beach.png",
            blurb: "Beach stop",
            highlights: ["Pantai"],
            pin: { x: 40, y: 50 },
            days: [1],
          },
        ],
      }),
    )

    expect(html).toContain("Trip route: Pantai Kuta")
    expect(html).toContain("Indonesia")
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

