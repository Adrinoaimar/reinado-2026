import { expect, test } from "@playwright/test";

test("public voting experience is accessible and closed by default", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Tu voto/i })).toBeVisible();
  await expect(page.getByText("La votación está cerrada", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Conoce a las candidatas" })).toBeVisible();
});

test("candidate profile opens with keyboard-accessible controls", async ({ page }) => {
  await page.goto("/");
  const opener = page.getByRole("button", { name: /Ver su historia/i }).first();
  await opener.focus();
  await opener.press("Enter");
  await expect(page.getByRole("heading", { name: "Valentina Reyes", level: 2 })).toBeVisible();
  const closeButton = page.getByRole("button", { name: "Cerrar" });
  await expect(closeButton).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Valentina Reyes", level: 2 })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Valentina Reyes", level: 3 })).toBeVisible();
  await expect(opener).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("royal theme renders scroll ornament and brighter candidate hover", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Hover is a desktop interaction.");
  await page.goto("/");
  await expect(page.locator(".royal-scroll-progress")).toBeVisible();
  const card = page.locator(".candidate-card").first();
  const restingShadow = await card.evaluate((element) => getComputedStyle(element).boxShadow);
  await card.hover();
  await expect.poll(() => card.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe(restingShadow);
  await expect.poll(() => card.evaluate((element) => getComputedStyle(element).translate)).not.toBe("none");
});
