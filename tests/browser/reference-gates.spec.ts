import { test, expect } from "@playwright/test";

test("reference visual upgrade: textured flexible SL poles and decorated GS gates", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/?quality=low&renderer=webgl2");
  await expect(page.locator("#loading")).toHaveCount(0, { timeout: 45000 });
  const sl = await page.evaluate(() => (window as any).__ski.getState());
  expect(sl.course).toBe("SL");
  expect(sl.texturedGatePoles).toBe(44);
  expect(sl.gateFlagCount).toBe(0);
  await page.locator('header [data-nav="courses"]').click();
  await page.locator('[data-course="GS"]').click();
  await page.locator("#play").click();
  await page.waitForFunction(() => {
    const s = (window as any).__ski.getState();
    return s.course === "GS" && s.gateFlagCount === 36 && s.texturedGatePoles === 36;
  }, {}, {timeout: 45000});
  await page.screenshot({ path: "test-results/reference-gs-flags.png" });
  await page.keyboard.press("Escape");
  await page.locator("#home").click();
  expect(errors).toEqual([]);
});
