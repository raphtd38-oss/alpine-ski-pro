import {test,expect} from "@playwright/test";
import {writeFileSync} from "node:fs";

/**
 * The generated 25-bone body is not trusted because it loads or compiles.
 * Visually compare IDENTICAL race frames and verify live shoe/ski contact
 * before replacing the public skinned athlete.
 */
test("reconstructed human GLB stays animated and preserves shoe contact in race",async({page})=>{
 test.setTimeout(220000);
 const failures:string[]=[];
 page.on("pageerror",e=>failures.push(e.message));
 const results:Record<string,unknown>={};
 for(const [name,racer] of [["original","mobile"],["reconstructed","human-mobile"]] as const){
  const glbName=racer==="human-mobile"?"seamless-human-mobile.glb":"seamless-mobile.glb";
  const response=page.waitForResponse(res=>res.url().includes(glbName),{timeout:75000});
  await page.goto("/?quality=low&renderer=webgl2&racer="+racer);
  expect((await response).status()).toBe(200);
  await expect(page.locator("#loading")).toHaveCount(0,{timeout:75000});
  await page.locator("#play").click();
  await page.evaluate(()=>{
   const api=(window as any).__ski;api.start();api.freezeSimulation(true);
   api.step(300,{steer:0,tuck:false,brake:false,jump:false});
  });
  await page.waitForTimeout(250);
  const capture=async(phase:string)=>{
   const snap=await page.evaluate(()=>{
    const api=(window as any).__ski;
    return {race:api.getState(),pose:api.getAthletePose().competitionPose};
   });
   const p=snap.pose;
   expect(p).toBeTruthy();
   expect(p.leftSkiBaseClearanceM).toBeCloseTo(.008,2);
   expect(p.rightSkiBaseClearanceM).toBeCloseTo(.008,2);
   expect(p.leftAnkleTargetErrorM).toBeLessThan(.015);
   expect(p.rightAnkleTargetErrorM).toBeLessThan(.015);
   expect(snap.race.fallen).toBe(0);
   await page.screenshot({path:"test-results/rebuilt-25bone-"+name+"-"+phase+".png"});
   return {x:snap.race.x,z:snap.race.z,heading:snap.race.heading,
     speed:Math.hypot(snap.race.vx,snap.race.vz),
     hips:p.pelvisWorld,head:p.headWorld,
     ankleErrors:[p.leftAnkleTargetErrorM,p.rightAnkleTargetErrorM]};
  };
  const samples:Record<string,unknown>={};
  samples.start=await capture("start");
  await page.evaluate(()=>(window as any).__ski.step(530,
    {steer:0,tuck:true,brake:false,jump:false}));
  samples.tuck=await capture("tuck");
  await page.evaluate(()=>(window as any).__ski.step(165,
    {steer:.8,tuck:true,brake:false,jump:false}));
  samples.rightTurn=await capture("right");
  await page.evaluate(()=>(window as any).__ski.step(165,
    {steer:-.8,tuck:true,brake:false,jump:false}));
  samples.leftTurn=await capture("left");
  results[name]=samples;
 }
 const a=results.original as any,b=results.reconstructed as any;
 for(const name of ["start","tuck","rightTurn","leftTurn"]){
  expect(b[name].x).toBeCloseTo(a[name].x,3);
  expect(b[name].z).toBeCloseTo(a[name].z,3);
  expect(b[name].speed).toBeCloseTo(a[name].speed,3);
 }
 writeFileSync("test-results/rebuilt-human-geometry-ab.json",JSON.stringify(results,null,2));
 expect(failures).toEqual([]);
});