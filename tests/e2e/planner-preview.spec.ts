import { expect, test } from "@playwright/test";

const API_BASE = "http://127.0.0.1:8000";

test("opens planner preview from selected recommendations", async ({ page }) => {
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
  const selectedIds = recommendationBody.items.slice(0, 2).map((item: { id: string }) => item.id);

  const selected = await page.request.post(
    `${API_BASE}/api/trip-creation-sessions/${session.id}/selected-recommendations`,
    { data: { recommendation_item_ids: selectedIds } },
  );
  expect(selected.ok()).toBeTruthy();

  await page.goto(`/plan/${session.id}`);

  await expect(page.getByText(/planner preview/i).first()).toBeVisible();
  await expect(page.getByText("Trip Memo")).toBeVisible();
  await expect(page.getByText("Full Itinerary")).toBeVisible();
  await expect(page.getByText("Budget Plan")).toBeVisible();

  await page.getByRole("button", { name: /continue to review/i }).click();
  await expect(page).toHaveURL(new RegExp(`/plan/${session.id}$`));
  await expect(page.getByRole("heading", { name: /review and accept your plan/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /accept plan/i })).toBeDisabled();
});
