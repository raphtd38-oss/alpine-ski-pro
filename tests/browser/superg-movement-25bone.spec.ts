import { test, expect } from "@playwright/test";

test("Super-G 25-joint skier: grounded feet, attached grips and fluid low edge", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?quality=low&racer=mobile&renderer=webgl2");
  await expect(page.locator("#loading")).toHaveCount(0, { timeout: 60000 });
  await page.locator("#play").click();

  // We advance only the existing deterministic 120Hz simulator, without
  // changing its physical start, pole contacts, timing or race gates.
  await page.evaluate(() => {
    const api = (window as any).__ski;
    api.start();
    api.freezeSimulation(true);
    api.step(283, { steer: 0, tuck: false, brake: false, jump: false });
  });
  await page.waitForTimeout(200);
  const preStart = await page.evaluate(() =>
    (window as any).__ski.getAthletePose());
  expect(preStart.seamless).toBe(true);
  expect(preStart.pelvis).toBeGreaterThan(0.35);
  expect(preStart.pelvis).toBeLessThan(1.1);
  expect(preStart.poleGripError[0]).toBeLessThan(0.08);
  expect(preStart.poleGripError[1]).toBeLessThan(0.08);
  await page.screenshot({ path: "test-results/sg-25bone-prestart-brace.png" });

  await page.evaluate(() => {
    const api = (window as any).__ski;
    api.step(225, { steer: 0.88, tuck: true, brake: false, jump: false });
  });
  await page.waitForTimeout(240);
  const loaded = await page.evaluate(() =>
    (window as any).__ski.getAthletePose());
  expect(Number.isFinite(loaded.edge)).toBe(true);
  expect(Number.isFinite(loaded.crouch)).toBe(true);
  expect(loaded.crouch).toBeGreaterThan(0.07);
  // Foot bones are centred inside boots, not at the metal edge. The edge
  // and terrain slope can affect a boot's apparent clearance by centimetres.
  expect(loaded.leftBoot).toBeGreaterThan(-0.20);
  expect(loaded.rightBoot).toBeGreaterThan(-0.20);
  expect(loaded.leftBoot).toBeLessThan(0.55);
  expect(loaded.rightBoot).toBeLessThan(0.55);
  expect(loaded.poleGripError[0]).toBeLessThan(0.08);
  expect(loaded.poleGripError[1]).toBeLessThan(0.08);
  await page.screenshot({ path: "test-results/sg-25bone-low-edge-contact.png" });
  expect(errors).toEqual([]);
});
