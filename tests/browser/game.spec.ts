import { test, expect } from "@playwright/test";
test("renders the Super-G, responds to keys, pauses, restarts and changes suit", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?quality=low");
  await expect(page.locator("#loading")).toHaveCount(0, { timeout: 45000 });
  const athlete = await page.evaluate(() => (window as any).__ski.getState());
  expect(athlete.athleteBones).toBeGreaterThanOrEqual(17);
  expect(athlete.athleteSurfaces).toBeGreaterThanOrEqual(40);
  expect(athlete.flexiblePoleTips).toBe(68);
  expect(athlete.course).toBe("SG");
  await expect(page.locator('[data-nav="courses"]')).toHaveCount(0);
  expect(athlete.pressure).toBe(1);
  expect(athlete.skid).toBe(0);
  await expect(page.locator("h1")).toContainText("VOTRE");
  await page.screenshot({ path: "test-results/menu.png" });
  await page.locator("#play").click();
  await expect(page.locator("#hud")).toBeVisible();
  await page.waitForFunction(
    () => (window as any).__ski.getState().z > 4,
    {},
    { timeout: 45000 },
  );
  const before = await page.evaluate(() => (window as any).__ski.getState());
  expect(before.z).toBeGreaterThan(3);
  await page.keyboard.down("KeyD");
  await page.waitForFunction(
    () => (window as any).__ski.getState().edge < -0.5,
    {},
    { timeout: 15000 },
  );
  await page.keyboard.up("KeyD");
  const after = await page.evaluate(() => (window as any).__ski.getState());
  expect(after.heading).toBeLessThan(before.heading);
  expect(after.edge).toBeLessThan(0);
  await page.waitForFunction(
    () => (window as any).__ski.getState().z > 8,
    {}, { timeout: 45000 },
  );
  expect((await page.evaluate(() => (window as any).__ski.getState())).startArchVisible)
    .toBe(false);
  await page.screenshot({ path: "test-results/racing.png" });
  await page.keyboard.press("Escape");
  await expect(page.locator("#modal")).toBeVisible();
  const t = await page.evaluate(() => (window as any).__ski.getState().time);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => (window as any).__ski.getState().time)).toBe(
    t,
  );
  await page.locator("#continue").click();
  await page.keyboard.press("KeyR");
  expect(
    (await page.evaluate(() => (window as any).__ski.getState())).phase,
  ).toBe("countdown");
  await page.keyboard.press("Escape");
  await page.locator("#home").click();
  await page.locator('[data-nav="gear"]').click();
  await page.locator('[data-color="#eb552d"]').click();
  await page.locator("#play").click();
  await page.waitForTimeout(600);
  expect(errors).toEqual([]);
});
test("training mode reveals advisory guide but regular racing does not", async ({ page }) => {
  await page.goto("/?quality=low");
  await expect(page.locator("#loading")).toHaveCount(0, { timeout: 45000 });
  expect(await page.evaluate(() => (window as any).__ski.getState().guideActive)).toBe(false);
  await page.locator("#train").click();
  expect(await page.evaluate(() => (window as any).__ski.getState().guideActive)).toBe(true);
  await page.keyboard.press("Escape");
  await page.locator("#home").click();
  expect(await page.evaluate(() => (window as any).__ski.getState().guideActive)).toBe(false);
  await page.locator("#play").click();
  expect(await page.evaluate(() => (window as any).__ski.getState().guideActive)).toBe(false);
});
