import { expect, type Page } from "@playwright/test";

export const API_BASE = "http://127.0.0.1:8000";

export type SeedResponse = {
  seeded: true;
  users: { owner: string };
  trips_by_category: Record<string, string>;
  private_trip_id: string;
};

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

export async function seedProductJourneys(page: Page): Promise<SeedResponse> {
  const response = await page.request.post(`${API_BASE}/api/testing/reset-product-journeys`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as SeedResponse;
}

export async function signupViaApi(page: Page, prefix = "traveler") {
  const email = uniqueEmail(prefix);
  const response = await page.request.post(`${API_BASE}/api/auth/signup`, {
    data: { email, password: "password123", display_name: "Journey User" },
  });
  expect(response.ok()).toBeTruthy();
  return { email, password: "password123", displayName: "Journey User" };
}

export async function signupViaUi(page: Page, prefix = "traveler") {
  const email = uniqueEmail(prefix);
  await page.goto("/signup");
  await page.getByLabel("Display name").fill("Journey User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/explore\?as=user/);
  return { email, password: "password123", displayName: "Journey User" };
}

export async function loginViaUi(page: Page, email: string, password = "password123") {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/explore\?as=user/);
}

export const pngUpload = {
  name: "snaptrip-e2e.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFElEQVR4nGPUqtjCgA0wYRUdtBIADxEBZs4sWUEAAAAASUVORK5CYII=",
    "base64",
  ),
};
