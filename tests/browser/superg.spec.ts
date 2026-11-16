import { test, expect } from "@playwright/test";

test("World-Cup-style Super-G start house, four-pole flags and terrain crest", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?quality=low&renderer=webgl2");
  await expect(page.locator("#loading")).toHaveCount(0, { timeout: 45000 });
  await page.locator('header [data-nav="courses"]').click();
  await page.locator('[data-course="SG"]').click();
  const setup = await page.evaluate(() => (window as any).__ski.getState());
  // Menu selections rebuild the render scene; race.course switches at start.
  expect(setup.startHouse).toBe(true);
  expect(setup.timingWands).toBe(2);
  expect(setup.pairedGatePoles).toBe(68);
  expect(setup.gateFlagCount).toBe(68);
  await page.screenshot({ path: "test-results/superg-start-house.png" });

  await page.locator("#play").click();
  const state = await page.evaluate(() => {
    const api = (window as any).__ski;
    const neutral = { steer: 0, tuck: false, brake: false, jump: false };
    api.step(361, neutral);
    api.step(230, neutral);
    return api.getState();
  });
  expect(state.course).toBe("SG");
  expect(state.phase).toBe("racing");
  expect(state.vz).toBeGreaterThan(2);
  await page.waitForTimeout(300);
  expect((await page.evaluate(() => (window as any).__ski.getState())).timingWandAngle)
    .toBeGreaterThan(10);
  await page.screenshot({ path: "test-results/superg-start-push.png" });

  const crest = await page.evaluate(() => {
    const api = (window as any).__ski;
    const neutral = { steer: 0, tuck: false, brake: false, jump: false };
    let maxHeight = 0, takeoffs = 0;
    for (let i = 0; i < 6500; i++) {
      api.step(1, neutral);
      const state = api.getState();
      maxHeight = Math.max(maxHeight, state.height);
      if (state.lastTakeoffZ > 100) takeoffs++;
      if (state.z > 365) break;
    }
    const last = api.getState();
    return { ...last, maxHeight, takeoffs };
  });
  expect(crest.z).toBeGreaterThan(325);
  expect(crest.takeoffs).toBeGreaterThan(0);
  expect(crest.maxHeight).toBeGreaterThan(0.05);
  await page.waitForTimeout(200);
  await page.screenshot({ path: "test-results/superg-first-crest.png" });
  expect(errors).toEqual([]);
});
