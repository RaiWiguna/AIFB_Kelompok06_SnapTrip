import { expect, test } from "@playwright/test";
import { seedProductJourneys } from "./helpers";

test("opens a public trip detail anonymously and uses static map fallback without a Maps key", async ({ page }) => {
  const seed = await seedProductJourneys(page);
  const tripId = seed.trips_by_category.pantai;

  await page.goto(`/trips/${tripId}`);

  await expect(page.getByRole("heading", { name: "Pantai Kuta Journey" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trip Memo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Full Itinerary" })).toBeVisible();
  await expect(page.getByText(/Budget Plan/i)).toBeVisible();
  await expect(page.getByRole("img", { name: /trip route/i })).toBeVisible();
});
