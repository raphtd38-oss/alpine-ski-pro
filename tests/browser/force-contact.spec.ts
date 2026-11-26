import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';

test('real rendered feet follow takeoff, landing and edge reversal', async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?quality=low&racer=mobile&renderer=webgl2');
  await expect(page.locator('#loading')).toHaveCount(0,{timeout:60000});
  await page.locator('#play').click();
  const frames:any[]=[];
  await page.evaluate(()=>{
    const api=(window as any).__ski;api.start();api.freezeSimulation(true);
    // 10s prestart (1200 physics ticks) + the same 490-tick run-up as before.
    api.step(1690,{steer:0,tuck:true,brake:false,jump:false});
  });
  // Capture the simulated manual jump, not a fabricated height frame.
  await page.evaluate(()=>{
    const api=(window as any).__ski;
    api.step(1,{steer:0,tuck:true,brake:false,jump:true});
    api.step(20,{steer:0,tuck:true,brake:false,jump:false});
  });
  await page.waitForTimeout(450);
  const air=await page.evaluate(()=>{const a=(window as any).__ski;return {state:a.getState(),pose:a.getAthletePose().competitionPose};});
  frames.push({name:'air',...air});
  expect(air.state.height).toBeGreaterThan(.15);
  expect(air.state.normalForceLeft+air.state.normalForceRight).toBe(0);
  expect(air.pose.leftAnkleTargetErrorM).toBeLessThan(.002);
  expect(air.pose.rightAnkleTargetErrorM).toBeLessThan(.002);
  expect(air.pose.leftSkiBaseClearanceM).toBeGreaterThan(.10);
  expect(air.pose.rightSkiBaseClearanceM).toBeGreaterThan(.10);
  await page.screenshot({path:'test-results/force-contact-flight.png'});
  await page.evaluate(()=>{
    const api=(window as any).__ski;
    for(let i=0;i<240;i++){
      api.step(1,{steer:0,tuck:true,brake:false,jump:false});
      if(api.getState().height===0) break;
    }
  });
  await page.waitForTimeout(450);
  const landed=await page.evaluate(()=>{const a=(window as any).__ski;return {state:a.getState(),pose:a.getAthletePose().competitionPose};});
  frames.push({name:'landing',...landed});
  expect(landed.state.height).toBe(0);
  expect(landed.state.landingShock).toBeGreaterThan(0);
  expect(landed.pose.leftSkiBaseClearanceM).toBeCloseTo(.008,2);
  expect(landed.pose.rightSkiBaseClearanceM).toBeCloseTo(.008,2);
  await page.screenshot({path:'test-results/force-contact-landing.png'});
  for(const sign of [1,-1]){
    for(let i=0;i<6;i++){
      await page.evaluate(sign=>(window as any).__ski.step(12,{steer:sign*.85,tuck:true,brake:false,jump:false}),sign);
      await page.waitForTimeout(160);
      const sample=await page.evaluate(()=>{const a=(window as any).__ski;return {state:a.getState(),pose:a.getAthletePose().competitionPose};});
      frames.push({name:`turn-${sign}-${i}`,...sample});
      if(sample.state.height===0 && sample.state.fallen===0){
        expect(sample.pose.leftAnkleTargetErrorM).toBeLessThan(.005);
        expect(sample.pose.rightAnkleTargetErrorM).toBeLessThan(.005);
      }
      expect(sample.pose.leftLegLengthM).toBeCloseTo(sample.pose.rightLegLengthM,3);
      // GLB bone L is simulator right, so its roll must use right-edge telemetry.
      expect(sample.pose.edgeDegLeft).toBeCloseTo(sample.state.edgeRight*180/Math.PI,1);
      expect(sample.pose.edgeDegRight).toBeCloseTo(sample.state.edgeLeft*180/Math.PI,1);
    }
  }
  writeFileSync('test-results/force-contact-trajectory.json',JSON.stringify(frames,null,2));
  expect(errors).toEqual([]);
});
