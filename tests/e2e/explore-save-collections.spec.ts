import { expect, test } from "@playwright/test";
import { seedProductJourneys, signupViaApi } from "./helpers";

test("filters Explore, likes a trip, saves it to a new collection, and shows persisted boards", async ({ page }) => {
  await seedProductJourneys(page);
  await signupViaApi(page, "explore");

  for (const category of ["pantai", "gunung", "air_terjun", "wisata_tradisional"]) {
    await page.goto(`/explore?as=user&category=${category}`);
    await expect(page.getByText(/1 trips found/i)).toBeVisible();
  }

  await page.goto("/explore?as=user&category=pantai");
  await page.getByRole("button", { name: "Like trip" }).first().click();
  await expect(page.getByRole("button", { name: "Unlike trip" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Save to collection" }).first().click();
  await page.getByLabel("New collection name").fill("Journey Board");
  await page.getByRole("button", { name: "Create collection and save" }).click();
  await expect(page.getByRole("button", { name: "Saved to collection" }).first()).toBeVisible();

  await page.goto("/likes");
  await expect(page.getByRole("heading", { name: /trips you've liked/i })).toBeVisible();
  await expect(page.getByText("Pantai Kuta Journey")).toBeVisible();

  await page.goto("/collections");
  await expect(page.getByText("Journey Board")).toBeVisible();
  await page.getByText("Journey Board").click();
  await expect(page.getByRole("heading", { name: "Journey Board" })).toBeVisible();
  await expect(page.getByText("Pantai Kuta Journey")).toBeVisible();
});

