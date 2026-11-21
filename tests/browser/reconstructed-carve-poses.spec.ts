import {test,expect} from "@playwright/test";
import {writeFileSync} from "node:fs";

/**
 * Full-speed carving on the ACTUAL 25-joint GLB. This uses a controlled
 * render-only Frame through the existing DEV inspectPose API: no hidden
 * gameplay or race physics overrides. Prevent false confidence from the
 * 23 km/h low-edge start-house-only comparison.
 */
test("full-speed left and right ski carve silhouette A/B",async({page})=>{
  test.setTimeout(230000);
  const out:Record<string,any>={};
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  for(const mode of ["human-v3","rebuild"]){
    await page.goto("/?quality=low&racer=mobile&renderer=webgl2&pose="+mode);
    await expect(page.locator("#loading")).toHaveCount(0,{timeout:75000});
    await page.locator("#play").click();
    await page.evaluate(()=>{const a=(window as any).__ski;
      a.start();a.freezeSimulation(true);});
    for(const [turn,edge] of [["left",-.94],["right",.94]] as const){
      const f={
        t:14,x:0,z:330,heading:edge*.16,edge,
        height:0,tuck:1,fallen:0,vx:0,vz:29,
        pressure:1.42,lateralAcceleration:edge*17,
        load:edge>0?.88:.12,skid:.02,flex:.7,startPhase:14,
        edgeLeft:edge,edgeRight:edge,
        skiYawLeft:edge*.16,skiYawRight:edge*.16,
      };
      await page.evaluate(f=>(window as any).__ski.inspectPose(f),f);
      await page.waitForTimeout(750);
      const p=await page.evaluate(()=>(window as any).__ski.getAthletePose().competitionPose);
      expect(p.humanMode).toBe(true);
      expect(p.leftSkiBaseClearanceM).toBeCloseTo(.008,2);
      expect(p.rightSkiBaseClearanceM).toBeCloseTo(.008,2);
      expect(p.leftAnkleTargetErrorM).toBeLessThan(.01);
      expect(p.rightAnkleTargetErrorM).toBeLessThan(.01);
      expect(p.headWorld[1]-p.pelvisWorld[1]).toBeGreaterThan(.35);
      out[mode+"-"+turn]={
        pelvis:p.pelvisWorld,head:p.headWorld,
        knees:[p.leftKneeWorld,p.rightKneeWorld],
        angle:[p.leftKneeFlexionDeg,p.rightKneeFlexionDeg],
        bank:p.bodyBankDeg,hip:p.pelvisHeightM,
        hands:[p.leftHumanHandTargetErrorM,p.rightHumanHandTargetErrorM],
      };
      await page.screenshot({path:"test-results/reconstruction-29mps-"+mode+"-"+turn+".png"});
    }
  }
  writeFileSync("test-results/reconstruction-29mps.json",JSON.stringify(out,null,2));
  console.info("[RECONSTRUCTION_29MPS]",JSON.stringify(out));
  expect(errors).toEqual([]);
});
