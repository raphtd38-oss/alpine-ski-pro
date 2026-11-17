import { expect, test } from "@playwright/test";

test("ultimate Super-G: actual spotlights and independently pressured carved skis", async ({page}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto("/?quality=low&racer=mobile&renderer=webgl2");
  await expect(page.locator("#loading")).toHaveCount(0, {timeout:60000});
  const light = await page.evaluate(() => (window as any).__ski.getState().cortinaSpotlights);
  expect(light.total).toBe(15);
  expect(light.active).toBeGreaterThanOrEqual(1);
  expect(light.active).toBeLessThanOrEqual(1);
  expect(light.spotlights).toBe(true);
  expect(light.shadows).toBe(0); // mobile: no expensive shadow atlas
  await page.screenshot({path:"test-results/ultimate-cortina-spotlight-start.png"});

  await page.locator("#play").click();
  await page.evaluate(() => {
    const api=(window as any).__ski;
    api.start();
    api.freezeSimulation(true);
    // Keep the same race simulator and race input, never teleport the athlete.
    api.step(283,{steer:0,tuck:false,brake:false,jump:false});
    api.step(270,{steer:.85,tuck:true,brake:false,jump:false});
  });
  await page.waitForTimeout(280);
  const athlete=await page.evaluate(()=>(window as any).__ski.getAthletePose());
  expect(athlete.seamless).toBe(true);
  const pose=athlete.competitionPose;
  expect(pose).toBeTruthy();
  expect(Number.isFinite(pose.lateralG)).toBe(true);
  expect(pose.lateralG).toBeGreaterThanOrEqual(0);
  expect(pose.equivalentTurnRadiusM).toBeGreaterThan(24);
  expect(pose.outsideSkiLoad+pose.insideSkiLoad).toBeCloseTo(1,4);
  expect(Number.isFinite(pose.leftSkiBaseClearanceM)).toBe(true);
  expect(Number.isFinite(pose.rightSkiBaseClearanceM)).toBe(true);
  expect(Math.abs(pose.leftSkiBaseClearanceM)).toBeLessThan(.7);
  expect(Math.abs(pose.rightSkiBaseClearanceM)).toBeLessThan(.7);
  expect(athlete.poleGripError[0]).toBeLessThan(.08);
  expect(athlete.poleGripError[1]).toBeLessThan(.08);
  await page.screenshot({path:"test-results/ultimate-cortina-loaded-carve.png"});
  expect(pageErrors).toEqual([]);
});
