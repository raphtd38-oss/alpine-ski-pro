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
  await page.screenshot({ path: "test-results/superg-in-start-house.png" });
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
      // Capture the actual airborne pose, not the slope after the landing.
      if (state.z > 285 && state.height > 0.055) break;
    }
    const last = api.getState();
    return { ...last, maxHeight, takeoffs };
  });
  expect(crest.z).toBeGreaterThan(285);
  expect(crest.takeoffs).toBeGreaterThan(0);
  expect(crest.maxHeight).toBeGreaterThan(0.05);
  await page.waitForTimeout(200);
  await page.screenshot({ path: "test-results/superg-airborne.png" });

  // Verify that the complete long Super-G is finishable, then inspect the
  // celebratory arm motion before the results overlay appears.
  const finish = await page.evaluate(() => {
    const api = (window as any).__ski;
    const neutral = { steer: 0, tuck: false, brake: false, jump: false };
    for (let i = 0; i < 28000; i++) {
      if (api.getState().phase === "finished") break;
      api.step(1, neutral);
    }
    return api.getState();
  });
  expect(finish.phase).toBe("finished");
  expect(finish.gate).toBe(34);
  await page.waitForFunction(
    () => (window as any).__ski.getState().celebrationTime > 0.45,
    {}, { timeout: 15000 },
  );
  await page.screenshot({ path: "test-results/superg-finish-gesture.png" });
  await expect(page.locator("#modal")).toBeVisible({ timeout: 15000 });
  expect(errors).toEqual([]);
});
