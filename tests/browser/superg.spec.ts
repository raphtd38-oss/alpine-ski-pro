import { test, expect } from "@playwright/test";

test("World-Cup-style Super-G start house, four-pole flags and terrain crest", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?quality=low&renderer=webgl2");
  await expect(page.locator("#loading")).toHaveCount(0, { timeout: 45000 });
  // Super-G is the sole selectable discipline and opens by default.
  const setup = await page.evaluate(() => (window as any).__ski.getState());
  expect(setup.course).toBe("SG");
  const cortina = await page.evaluate(() => (window as any).__ski.getCourse());
  expect(cortina.name).toContain("Cortina");
  expect(cortina.length).toBe(2105);
  expect(cortina.gates).toHaveLength(42);
  expect(setup.startHouse).toBe(true);
  expect(setup.blueBorderDye).toBe(true);
  expect(setup.sprayedBlueDye).toBe(true);
  expect(setup.athleteSeamless).toBe(true);
  expect(setup.athleteVariant).toBe("mobile");
  expect(setup.athleteHasAttachedSkis).toBe(true);
  expect(setup.athleteTexturedSurfaces).toBeGreaterThan(10);
  expect(setup.raceSkiTextureCount).toBe(1);
  expect(setup.raceBibTextureCount).toBe(1);
  expect(setup.timingWands).toBe(1);
  expect(setup.pairedGatePoles).toBe(84);
  expect(setup.gateFlagCount).toBe(84);
  expect(setup.visibleGateCount).toBeGreaterThanOrEqual(4);
  expect(setup.visibleGateCount).toBeLessThan(12);
  await page.screenshot({ path: "test-results/superg-start-house.png" });

  await page.locator("#play").click();
  // Reset and freeze in one page task: rendering delays cannot advance GO
  // before the first pole plant screenshot on slow SwiftShader machines.
  await page.evaluate(() => {
    const api = (window as any).__ski;
    api.start();
    api.freezeSimulation(true);
  });
  await page.screenshot({ path: "test-results/superg-in-start-house.png" });
  const firstPush = await page.evaluate(() => {
    const api = (window as any).__ski;
    const neutral = { steer: 0, tuck: false, brake: false, jump: false };
    // First actual pole stroke occurs just AFTER the 1200-tick, 10s TV prestart.
    api.step(1201, neutral);
    api.step(15, neutral);
    return api.getState();
  });
  expect(firstPush.startLaunchTime).toBeGreaterThan(0);
  expect(firstPush.startLaunchTime).toBeLessThan(0.40);
  await page.waitForTimeout(180);
  await page.screenshot({ path: "test-results/superg-FIRST-pole-push.png" });
  const state = await page.evaluate(() => {
    const api = (window as any).__ski;
    const neutral = { steer: 0, tuck: false, brake: false, jump: false };
    api.step(215, neutral);
    return api.getState();
  });
  expect(state.course).toBe("SG");
  expect(state.phase).toBe("racing");
  expect(state.vz).toBeGreaterThan(2);
  expect(state.startGateOpened).toBe(true);
  expect(state.startGateImpulseTime).not.toBeNull();
  expect(state.startGateDegrees).toBeGreaterThanOrEqual(20);
  await page.waitForTimeout(300);
  expect((await page.evaluate(() => (window as any).__ski.getState())).timingWandAngle)
    .toBeGreaterThan(10);
  await page.screenshot({ path: "test-results/superg-start-push.png" });
  await page.evaluate(() => (window as any).__ski.freezeSimulation(false));

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
  const clearance = await page.evaluate(
    () => (window as any).__ski.getState().cameraTerrainClearance,
  );
  expect(clearance).toBeGreaterThan(1.65);

  // Check the last turn and show the blue-dyed sides before the photo-finish.
  const finalApproach = await page.evaluate(() => {
    const api = (window as any).__ski;
    const neutral = { steer: 0, tuck: false, brake: false, jump: false };
    for (let i = 0; i < 28000; i++) {
      const st = api.getState(), c = api.getCourse();
      if (st.z > c.length - 14) break;
      const next = c.gates[st.gate] || { x: 0, z: c.length };
      const heading = Math.atan2(next.x - st.x, Math.max(24, next.z - st.z));
      const steer = Math.max(-0.95, Math.min(0.95, (heading - st.heading) * 2.5));
      api.step(1, { ...neutral, steer, brake: st.vz > 30 });
    }
    return api.getState();
  });
  expect(finalApproach.z, JSON.stringify(finalApproach)).toBeGreaterThan(2000);
  await page.waitForTimeout(60);
  await page.screenshot({ path: "test-results/superg-last-turn.png" });

  // Verify that the entire Super-G reaches the finish photoelectric beam.
  const finish = await page.evaluate(() => {
    const api = (window as any).__ski;
    const neutral = { steer: 0, tuck: false, brake: false, jump: false };
    for (let i = 0; i < 28000; i++) {
      const st = api.getState(), c = api.getCourse();
      if (st.phase === "finished") break;
      const next = c.gates[st.gate] || { x: 0, z: c.length };
      const heading = Math.atan2(next.x - st.x, Math.max(24, next.z - st.z));
      const steer = Math.max(-0.95, Math.min(0.95, (heading - st.heading) * 2.5));
      api.step(1, { ...neutral, steer, brake: st.vz > 30 });
    }
    return api.getState();
  });
  expect(finish.phase).toBe("finished");
  expect(finish.gate).toBe(42);
  expect(finish.finishBeamTime).not.toBeNull();
  expect(finish.finishBeamTriggeredBy).toBe("hand");
  await page.waitForFunction(
    () => (window as any).__ski.getState().celebrationTime > 0.45,
    {}, { timeout: 15000 },
  );
  await page.screenshot({ path: "test-results/superg-finish-reach.png" });
  await expect(page.locator("#modal")).toBeVisible({ timeout: 15000 });
  // Preserve the SG records and replay workflow after removing other courses.
  if (finish.missed === 0) {
    const records = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("alpine-ski-pro:cortina-2026:42g-v2") ?? "null")?.records?.SG ?? []);
    expect(records.length).toBeGreaterThan(0);
  }
  await page.locator("#replay").click();
  await expect(page.locator("#replay-controls")).toBeVisible();
  await page.locator('[data-replay-speed="0.5"]').click();
  expect(await page.evaluate(() => (window as any).__ski.getState().replaySpeed)).toBe(0.5);
  await page.locator("#replay-seek").evaluate((el: HTMLInputElement) => {
    el.value = "300";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(await page.evaluate(() => (window as any).__ski.getState().replayTime))
    .toBeGreaterThan(1);
  expect(errors).toEqual([]);
});
