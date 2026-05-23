import { expect, test } from "@playwright/test";
import { loginViaUi, signupViaUi } from "./helpers";

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

