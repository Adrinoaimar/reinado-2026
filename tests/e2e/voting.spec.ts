import { expect, test } from "@playwright/test";

test("public voting experience is accessible and closed by default", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Tu voto/i })).toBeVisible();
  await expect(page.getByText("La votación está cerrada", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Conoce a las candidatas" })).toBeVisible();
});

test("candidate profile opens with keyboard-accessible controls", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Ver su historia/i }).first().click();
  await expect(page.getByRole("heading", { name: "Valentina Reyes", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar" }).click();
  await expect(page.getByRole("heading", { name: "Valentina Reyes", level: 2 })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Valentina Reyes", level: 3 })).toBeVisible();
});
