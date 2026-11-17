import { test, expect } from "@playwright/test";

test("full original Super-G racer renders and classic fallback remains available", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/?quality=low&racer=full&renderer=webgl2");
  await expect(page.locator("#loading")).toHaveCount(0, { timeout: 60000 });
  const detailed = await page.evaluate(() => (window as any).__ski.getState());
  expect(detailed.athleteVariant).toBe("full");
  expect(detailed.athleteSeamless).toBe(true);
  expect(detailed.athleteHasAttachedSkis).toBe(true);
  await page.locator("#play").click();
  await page.evaluate(() => (window as any).__ski.freezeSimulation(true));
  await page.screenshot({ path: "test-results/superg-FULL-25-bones.png" });
  await page.goto("/?quality=low&racer=classic&renderer=webgl2");
  await expect(page.locator("#loading")).toHaveCount(0, { timeout: 45000 });
  const classic = await page.evaluate(() => (window as any).__ski.getState());
  expect(classic.athleteVariant).toBe("classic");
  expect(classic.athleteSeamless).toBe(false);
  expect(classic.athleteBones).toBeGreaterThanOrEqual(17);
  expect(errors).toEqual([]);
});
