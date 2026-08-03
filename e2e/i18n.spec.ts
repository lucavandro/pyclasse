import { expect, test } from "@playwright/test";

test("autorileva l'inglese del browser e permette il cambio lingua", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await page.getByLabel("Language").selectOption("it");
  await expect(page.getByRole("heading", { name: "Bentornato" })).toBeVisible();
  await context.close();
});
