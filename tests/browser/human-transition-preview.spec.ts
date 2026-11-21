import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";

/**
 * The first human-pose experiment is A/B, not an automatic deployment.
 * It must be measured in the exact same course state and chase camera.
 */
test("compare human start extension to original crouched pose on real racer GLB", async ({page}) => {
  test.setTimeout(160000);
  const results: Record<string,any> = {};
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  for(const mode of ["original","human-v2"]){
    const suffix=mode==="human-v2"?"&pose=human-v2":"";
    await page.goto("/?quality=low&racer=mobile&renderer=webgl2"+suffix);
    await expect(page.locator("#loading")).toHaveCount(0,{timeout:65000});
    await page.locator("#play").click();
    await page.evaluate(()=>{
      const api=(window as any).__ski;
      api.start();api.freezeSimulation(true);
      api.step(283,{steer:0,tuck:false,brake:false,jump:false});
      api.step(270,{steer:.85,tuck:true,brake:false,jump:false});
    });
    await page.waitForTimeout(350);
    const data=await page.evaluate(()=>{
      const api=(window as any).__ski;
      return {state:api.getState(), athlete:api.getAthletePose()};
    });
    expect(data.athlete.competitionPose).toBeTruthy();
    const diag=data.athlete.competitionPose;
    expect(diag.leftSkiBaseClearanceM).toBeCloseTo(0.008,2);
    expect(diag.rightSkiBaseClearanceM).toBeCloseTo(0.008,2);
    expect(diag.leftAnkleTargetErrorM).toBeLessThan(0.005);
    expect(diag.rightAnkleTargetErrorM).toBeLessThan(0.005);
    results[mode]={
      speed:Math.hypot(data.state.vx,data.state.vz),
      crouch:data.athlete.crouch, tuck:data.athlete.tuck,
      pelvisHeightM:diag.pelvisHeightM,bank:diag.bodyBankDeg,
      leftKnee:diag.leftKneeFlexionDeg,rightKnee:diag.rightKneeFlexionDeg,
      leftSole:diag.leftSkiBaseClearanceM,rightSole:diag.rightSkiBaseClearanceM,
    };
    await page.screenshot({path:"test-results/human-pose-"+mode+"-early-drive.png"});
  }
  expect(results["human-v2"].speed).toBeCloseTo(results.original.speed,3);
  expect(results["human-v2"].pelvisHeightM)
    .toBeGreaterThan(results.original.pelvisHeightM+0.06);
  writeFileSync("test-results/human-pose-comparison.json",JSON.stringify(results,null,2));
  expect(errors).toEqual([]);
});
