import { expect, test } from "@playwright/test";
import { pngUpload, signupViaApi } from "./helpers";

test("uploads an image, classifies categories, selects one recommendation, and opens agentic planner", async ({ page }) => {
  await signupViaApi(page, "images");

  await page.goto("/new/upload");
  await page.locator('input[type="file"]').setInputFiles(pngUpload);
  await expect(page).toHaveURL(/\/new\/review-images\?session=/);
  await expect(page.getByText("snaptrip-e2e.png")).toBeVisible();

  await page.getByRole("button", { name: /read images/i }).click();
  await expect(page).toHaveURL(/\/new\/categories\?session=/);
  await expect(page.getByRole("heading", { name: /confirm what your/i })).toBeVisible();

  const gunung = page.getByRole("button", { name: /gunung/i });
  if ((await gunung.getAttribute("aria-pressed")) !== "true") {
    await gunung.click();
  }
  await page.getByRole("button", { name: /build recommendations/i }).click();
  await expect(page).toHaveURL(/\/new\/recommendations\?session=/);

  await expect(page.getByText(/match/i).first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /add to plan/i }).first().click();
  await page.getByLabel(/start date/i).fill("2026-06-10");
  await page.getByLabel(/end date/i).fill("2026-06-12");
  await page.getByLabel(/people/i).fill("2");
  await page.getByRole("button", { name: /open ai trip planner/i }).click();

  await expect(page).toHaveURL(/\/plan\//, { timeout: 15_000 });
  await expect(page.getByText(/plan assistant/i).first()).toBeVisible();
  await expect(page.getByText("Trip Memo", { exact: true })).toBeVisible();
  await expect(page.getByText("Full Itinerary", { exact: true })).toBeVisible();
  await expect(page.getByText("Budget Plan", { exact: true })).toBeVisible();
});
