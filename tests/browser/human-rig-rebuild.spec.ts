import {test,expect} from "@playwright/test";
import {writeFileSync} from "node:fs";

/**
 * Compare two exact identical races on the ACTUAL 25-bone GLB skinned body.
 * Do not accept a green compile as proof of human motion; archive images.
 */
test("human-v3 reduces frog-squat and gorilla back while preserving both skis",async({page})=>{
 test.setTimeout(210000);
 const results:Record<string,any>={};
 const errors:string[]=[];
 page.on("pageerror",e=>errors.push(e.message));
 for(const style of ["old","human-v3"]){
  await page.goto("/?quality=low&racer=mobile&renderer=webgl2"+
    (style==="human-v3"?"&pose=human-v3":""));
  await expect(page.locator("#loading")).toHaveCount(0,{timeout:75000});
  await page.locator("#play").click();
  await page.evaluate(()=>{
   const api=(window as any).__ski;
   api.start();api.freezeSimulation(true);
   api.step(283,{steer:0,tuck:false,brake:false,jump:false});
   api.step(270,{steer:.85,tuck:true,brake:false,jump:false});
  });
  await page.waitForTimeout(250);
  const read=()=>page.evaluate(()=>{
   const api=(window as any).__ski;
   return {state:api.getState(),visual:api.getAthletePose()};
  });
  const snap=await read(),p=snap.visual.competitionPose;
  expect(p).toBeTruthy();
  if(style==="human-v3"){
    expect(p.humanMode).toBe(true);
    expect(p.leftAnkleTargetErrorM).toBeLessThan(.02);
    expect(p.rightAnkleTargetErrorM).toBeLessThan(.02);
    expect(p.headWorld[1]-p.pelvisWorld[1]).toBeGreaterThan(.35);
    expect(p.leftKneeFlexionDeg).toBeLessThan(115);
    expect(p.rightKneeFlexionDeg).toBeLessThan(115);
  }
  expect(p.leftSkiBaseClearanceM).toBeCloseTo(.008,2);
  expect(p.rightSkiBaseClearanceM).toBeCloseTo(.008,2);
  expect(snap.visual.poleGripError[0]).toBeLessThan(.08);
  expect(snap.visual.poleGripError[1]).toBeLessThan(.08);
  results[style]={
   x:snap.state.x,z:snap.state.z,speed:Math.hypot(snap.state.vx,snap.state.vz),
   pelvicHeight:p.pelvisHeightM,pelvis:p.pelvisWorld,bank:p.bodyBankDeg,
   chestWorld:p.chestWorld,headWorld:p.headWorld,
   kneeAngles:[p.leftKneeFlexionDeg,p.rightKneeFlexionDeg],
   realAnkleErrors:[p.leftAnkleTargetErrorM,p.rightAnkleTargetErrorM]
  };
  await page.screenshot({path:"test-results/human-rig-"+style+"-loaded.png"});
  await page.keyboard.press("c");
  await page.waitForTimeout(220);
  await page.screenshot({path:"test-results/human-rig-"+style+"-close.png"});
 }
 const a=results.old,b=results["human-v3"];
 expect(a.x).toBeCloseTo(b.x,3);
 expect(a.z).toBeCloseTo(b.z,3);
 expect(a.speed).toBeCloseTo(b.speed,3);
 // At low speed the ORIGINAL pelvis is already near standing height;
 // the regression was a near-horizontal spine, not missing hip extension.
 const oldHeadHeight=a.headWorld[1]-a.pelvis[1];
 const newHeadHeight=b.headWorld[1]-b.pelvis[1];
 expect(newHeadHeight).toBeGreaterThan(oldHeadHeight+.14);
 expect(Math.abs(b.bank)).toBeLessThan(Math.abs(a.bank)*.6);
 writeFileSync("test-results/human-rig-rebuild.json",JSON.stringify(results,null,2));
 console.info("[HUMAN_RIG_AB]",JSON.stringify(results));
 expect(errors).toEqual([]);
});