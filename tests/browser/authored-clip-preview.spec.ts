import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";

/**
 * The native GLB clips are a STUDIO-ONLY visual baseline.
 * Compare them in actual racing scenery at the same deterministic position.
 * Do not promote to gameplay: the native clips are not ground-locked.
 */
test("compare four native ski animations on an actual course segment", async ({page}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  const report: {clip:string, first:unknown, second:unknown, speed:number}[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const clip of ["SG_AERO_TUCK","SG_CARVE_LEFT","SG_CARVE_RIGHT","SG_COMPRESSION"]) {
    await page.goto("/?quality=low&racer=mobile&renderer=webgl2&motion=glb-preview&clip="+clip);
    await expect(page.locator("#loading")).toHaveCount(0,{timeout:75000});
    await page.locator("#play").click();
    await page.evaluate(() => {
      const api=(window as any).__ski;
      api.start();
      api.freezeSimulation(true);
      api.step(740,{steer:0,tuck:true,brake:false,jump:false});
    });
    await page.waitForTimeout(350);
    const first=await page.evaluate(() => (window as any).__ski.getAthletePose().authoredMotion);
    await page.screenshot({path:"test-results/glb-authored-race-"+clip+"-early.png"});
    await page.waitForTimeout(1100);
    const second=await page.evaluate(() => (window as any).__ski.getAthletePose().authoredMotion);
    const state=await page.evaluate(() => (window as any).__ski.getState());
    expect(state.athleteSeamless).toBe(true);
    expect(state.speed ?? Math.hypot(state.vx,state.vz)).toBeGreaterThan(3);
    expect(first?.clip).toBe(clip);
    expect(second?.clip).toBe(clip);
    expect(first?.joints?.Hips).toBeDefined();
    expect(second?.joints?.LeftLeg).toBeDefined();
    report.push({clip,first,second,speed:Math.hypot(state.vx,state.vz)});
    await page.screenshot({path:"test-results/glb-authored-race-"+clip+"-late.png"});
  }
  writeFileSync("test-results/glb-authored-clip-measurements.json",JSON.stringify(report,null,2));
  expect(errors).toEqual([]);
});
