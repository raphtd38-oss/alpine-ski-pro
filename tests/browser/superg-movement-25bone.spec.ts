import { test, expect } from "@playwright/test";

test("Super-G 25-joint skier: early start stays balanced with grounded feet and attached grips", async ({ page }) => {
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
  // This fixture is only ~1.2s after GO. A deep high-speed crouch here was
  // the bug: steering alone should not collapse the pelvis at walking speed.
  const contact = loaded.competitionPose;
  expect(contact.leftAnkleTargetErrorM).toBeLessThan(0.005);
  expect(contact.rightAnkleTargetErrorM).toBeLessThan(0.005);
  expect(contact.leftSkiBaseClearanceM).toBeCloseTo(0.008, 2);
  expect(contact.rightSkiBaseClearanceM).toBeCloseTo(0.008, 2);
  expect(Math.abs(contact.bodyBankDeg)).toBeLessThan(18);
  expect(contact.leftKneeFlexionDeg).toBeGreaterThan(8);
  expect(contact.rightKneeFlexionDeg).toBeGreaterThan(8);
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
