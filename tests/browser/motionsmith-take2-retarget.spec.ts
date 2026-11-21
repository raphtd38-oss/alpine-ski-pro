import { test,expect } from "@playwright/test";
import { writeFileSync } from "node:fs";

/** Side-by-side actual PlayCanvas 25-bone GLB, at identical race timestamps. */
test("MotionSmith Take2 overlays the real athlete without moving ski contacts",async({page})=>{
  test.setTimeout(180000);
  const errors: string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  const observations:Record<string,unknown>={};
  for(const mode of ["baseline","take2"]){
    await page.goto("/?quality=low&racer=mobile&renderer=webgl2"+
      (mode==="take2"?"&motion=take2":""));
    await expect(page.locator("#loading")).toHaveCount(0,{timeout:75000});
    await page.locator("#play").click();
    await page.evaluate(()=>{
      const api=(window as any).__ski;
      api.start();api.freezeSimulation(true);
      api.step(850,{steer:0.0,tuck:true,brake:false,jump:false});
      api.step(210,{steer:0.88,tuck:true,brake:false,jump:false});
    });
    await page.waitForTimeout(380);
    const info=await page.evaluate(()=>{
      const api=(window as any).__ski;
      return {state:api.getState(),pose:api.getAthletePose().competitionPose};
    });
    expect(info.state.athleteSeamless).toBe(true);
    expect(info.pose).toBeTruthy();
    expect(info.pose.leftSkiBaseClearanceM).toBeCloseTo(0.008,2);
    expect(info.pose.rightSkiBaseClearanceM).toBeCloseTo(0.008,2);
    expect(info.pose.leftAnkleTargetErrorM).toBeLessThan(.008);
    expect(info.pose.rightAnkleTargetErrorM).toBeLessThan(.008);
    expect(info.pose.leftSkiDirectionErrorDeg).toBeLessThan(.1);
    expect(info.pose.rightSkiDirectionErrorDeg).toBeLessThan(.1);
    expect(info.pose.motionSource).toBe(mode==="take2"?"MotionSmith Take2":"procedural");
    if(mode==="take2")expect(info.pose.sourceMotionWeight).toBeGreaterThan(0);
    observations[mode]={
      t:info.state.t, speed:Math.hypot(info.state.vx,info.state.vz),
      x:info.state.x,z:info.state.z,
      motion:info.pose.motionSource,weight:info.pose.sourceMotionWeight,
      sourceTime:info.pose.sourceMotionSeconds,
      pelvis:info.pose.pelvisWorld,
      pelvisHeightM:info.pose.pelvisHeightM,
      knees:[info.pose.leftKneeFlexionDeg,info.pose.rightKneeFlexionDeg],
      ankleErrors:[info.pose.leftAnkleTargetErrorM,info.pose.rightAnkleTargetErrorM],
      skiSoles:[info.pose.leftSkiBaseClearanceM,info.pose.rightSkiBaseClearanceM],
    };
    await page.screenshot({path:"test-results/motionsmith-"+mode+"-loaded-carve.png"});
  }
  const a=observations.baseline as any,b=observations.take2 as any;
  expect(b.speed).toBeCloseTo(a.speed,4);
  expect(b.x).toBeCloseTo(a.x,4);
  expect(b.z).toBeCloseTo(a.z,4);
  // The actual source uses both compression and extension, depending on
  // the phase; do not falsely require UPWARD motion on every sampled frame.
  expect(Math.abs(b.pelvisHeightM-a.pelvisHeightM)).toBeGreaterThan(0.015);
  expect(Math.abs(b.pelvisHeightM-a.pelvisHeightM)).toBeLessThan(0.11);
  // Even the lower-body retargeted knee pole must make some measured
  // difference, without sacrificing the left/right ski contact invariants.
  expect(Math.max(...a.knees.map((v:number,i:number)=>Math.abs(v-b.knees[i]))))
    .toBeGreaterThan(0.1);
  writeFileSync("test-results/motionsmith-take2-ab.json",
    JSON.stringify(observations,null,2));
  console.info("[MOTIONSMITH_TAKE2_AB]",JSON.stringify(observations));
  expect(errors).toEqual([]);
});
