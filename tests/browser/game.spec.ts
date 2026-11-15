import { test, expect } from "@playwright/test";
test("renders a real 3D scene, responds to keys, pauses, restarts and changes equipment", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?quality=low");
  await expect(page.locator("#loading")).toHaveCount(0, { timeout: 45000 });
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
  await page.locator('[data-gear="GS"]').click();
  await page.locator("#play").click();
  await page.waitForTimeout(600);
  expect(errors).toEqual([]);
});
test("completes a valid slalom, persists the result and plays a replay", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?quality=low");
  await expect(page.locator("#loading")).toHaveCount(0, { timeout: 45000 });
  await page.locator("#play").click();
  const result = await page.evaluate(() => {
    const api = (window as any).__ski,
      neutral = { steer: 0, tuck: false, brake: false, jump: false };
    api.step(361, neutral);
    for (let i = 0; i < 18000; i++) {
      const s = api.getState();
      if (s.phase === "finished") return s;
      const c = api.getCourse(),
        g = c.gates[s.gate] || { x: 0, z: c.length + 10 };
      const desired = Math.atan2(g.x - s.x, Math.max(6, g.z - s.z));
      api.step(1, {
        ...neutral,
        steer: Math.max(-0.9, Math.min(0.9, (desired - s.heading) * 3)),
        brake: s.vz > 12,
      });
    }
    return api.getState();
  });
  expect(result.phase).toBe("finished");
  expect(result.missed).toBe(0);
  await expect(page.locator(".result-badge")).toContainText("RECORD");
  await page.screenshot({ path: "test-results/results.png" });
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("alpine-ski-pro:v1")!).completed,
    ),
  ).toBe(1);
  await page.locator("#replay").click();
  await expect(page.locator("#modal")).toBeHidden();
  await page.waitForTimeout(500);
  await expect(page.locator("#race-status")).toHaveText("REPLAY");
  expect(errors).toEqual([]);
});
