import { expect, test } from "@playwright/test";
import { API_BASE, signupViaApi } from "./helpers";

test("opens agentic planner from one selected recommendation", async ({ page }) => {
  const email = `planner-${Date.now()}@example.com`;

  const signup = await page.request.post(`${API_BASE}/api/auth/signup`, {
    data: { email, password: "password123", display_name: "Planner User" },
  });
  expect(signup.ok()).toBeTruthy();

  const sessionResponse = await page.request.post(`${API_BASE}/api/trip-creation-sessions`, {
    data: { source: "upload" },
  });
  expect(sessionResponse.ok()).toBeTruthy();
  const { session } = await sessionResponse.json();

  const categories = await page.request.post(
    `${API_BASE}/api/trip-creation-sessions/${session.id}/confirm-categories`,
    { data: { categories: ["pantai"] } },
  );
  expect(categories.ok()).toBeTruthy();

  const recommendations = await page.request.post(
    `${API_BASE}/api/trip-creation-sessions/${session.id}/recommendations`,
  );
  expect(recommendations.ok()).toBeTruthy();
  const recommendationBody = await recommendations.json();
  const selectedId = recommendationBody.items[0].id;

  const selected = await page.request.post(
    `${API_BASE}/api/trip-creation-sessions/${session.id}/selected-recommendations`,
    { data: { recommendation_item_ids: [selectedId] } },
  );
  expect(selected.ok()).toBeTruthy();

  const planner = await page.request.post(`${API_BASE}/api/planner-sessions/from-trip-creation/${session.id}`, {
    data: {
      recommendation_item_id: selectedId,
      travel_start_date: "2026-06-10",
      travel_end_date: "2026-06-12",
      traveler_count: 2,
    },
  });
  expect(planner.ok()).toBeTruthy();
  const plannerBody = await planner.json();
  const plannerId = plannerBody.session.id;

  await page.goto(`/plan/${plannerId}`);

  await expect(page.getByText(/plan assistant/i).first()).toBeVisible();
  await expect(page.getByText(/i drafted the trip memo/i).first()).toBeVisible();
  await expect(page.getByText("Trip Memo", { exact: true })).toBeVisible();
  await expect(page.getByText("Full Itinerary", { exact: true })).toBeVisible();
  await expect(page.getByText("Budget Plan", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /continue to review/i }).click();
  await expect(page).toHaveURL(new RegExp(`/plan/${plannerId}$`));
  await expect(page.getByRole("heading", { name: /review and accept your plan/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /accept plan/i })).toBeEnabled();

  await page.getByRole("button", { name: /accept plan/i }).click();
  await expect(page).toHaveURL(/\/trips\/trip_[^?]+\?as=owner/);
  const tripPlanId = new URL(page.url()).pathname.split("/").pop();
  expect(tripPlanId).toBeTruthy();
  await expect(page.getByRole("heading", { name: "Pantai Kuta trip" })).toBeVisible();

  await page.goto("/trips");
  await page.locator(`a[href="/trips/${tripPlanId}?as=owner"]`).click();
  await expect(page.getByRole("heading", { name: "Pantai Kuta trip" })).toBeVisible();

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Discoverable in Explore.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Unpublish" })).toBeVisible();

  await page.context().clearCookies();
  await signupViaApi(page, "planner-public-viewer");
  await page.goto("/explore?as=user");
  const exploreTrip = page.locator(`a[href="/trips/${tripPlanId}"]`).filter({ hasText: "Pantai Kuta trip" });
  await expect(exploreTrip).toBeVisible();
  await exploreTrip.click();
  await expect(page.getByRole("heading", { name: "Pantai Kuta trip" })).toBeVisible();
});
