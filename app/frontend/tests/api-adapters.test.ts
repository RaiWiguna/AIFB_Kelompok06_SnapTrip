import { describe, expect, it } from "vitest"
import { apiAssetUrl, ApiError } from "../lib/api/client"
import { adaptTripCard, formatIdr } from "../lib/api/adapters/trips"

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
    })
    expect(trip.cover).toContain("/api/images/img_1")
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

