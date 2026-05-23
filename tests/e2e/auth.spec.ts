import { expect, test } from "@playwright/test";
import { loginViaUi, signupViaApi, signupViaUi } from "./helpers";

test("signs up, opens account, logs out, and logs back in", async ({ page }) => {
  const user = await signupViaUi(page, "auth");

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: user.displayName })).toBeVisible();
  await expect(page.getByText(user.email)).toBeVisible();

  await page.getByRole("button", { name: /log out/i }).click();
  await expect(page).toHaveURL(/\/signin/);

  await loginViaUi(page, user.email, user.password);
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: user.displayName })).toBeVisible();
});

test("signup session opens protected navbar destinations", async ({ page }) => {
  const user = await signupViaUi(page, "navbar");
  const firstName = user.displayName.split(" ")[0];

  for (const path of ["/explore?as=user", "/new", "/collections", "/trips", "/likes"]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: "Account" })).toContainText(firstName);
  }

  await page.goto("/explore");
  await expect(page).toHaveURL(/\/explore\?as=user$/);

  await page.goto("/explore?category=gunung");
  await expect(page).toHaveURL(/\/explore\?category=gunung&as=user$/);

  await page.goto("/new");
  await expect(page).toHaveURL(/\/new$/);
  await expect(page.getByRole("heading", { name: /choose images/i })).toBeVisible();

  await page.goto("/collections");
  await expect(page).toHaveURL(/\/collections(?:\?as=user)?$/);
  await expect(page.getByRole("heading", { name: /travel collections/i })).toBeVisible();

  await page.goto("/trips");
  await expect(page).toHaveURL(/\/trips$/);
  await expect(page.getByRole("heading", { name: "My trips" })).toBeVisible();

  await page.goto("/likes");
  await page.getByRole("link", { name: "Open Explore" }).click();
  await expect(page).toHaveURL(/\/explore\?as=user$/);
});

test("public explore remains available when logged out", async ({ page }) => {
  await page.goto("/explore");
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("contextual sign in returns to collections", async ({ page }) => {
  const user = await signupViaApi(page, "contextual");
  await page.context().clearCookies();

  await page.goto("/signin?next=%2Fcollections&action=collections");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /sign in and continue/i }).click();

  await expect(page).toHaveURL(/\/collections(?:\?as=user)?$/);
  await expect(page.getByRole("heading", { name: /travel collections/i })).toBeVisible();
});
