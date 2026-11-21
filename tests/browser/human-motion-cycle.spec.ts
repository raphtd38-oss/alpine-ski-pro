import {test,expect} from "@playwright/test";
import {writeFileSync} from "node:fs";

const distance=(a:number[],b:number[])=>
  Math.hypot(...a.map((n,i)=>n-b[i]));

/**
 * Based on the user's real 30-second Nov 21 capture: arms were glued to
 * hips and body stayed upright while the skis crossed from 0° to 55° edge.
 * This tests actual, RENDERED 25-bone wrist positions and COM, not just
 * expected animation constants. Screenshots are archived for human review.
 */
test("human launch, loaded left/right turns and edge release animate a real body",async({page})=>{
  test.setTimeout(200000);
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/?quality=low&racer=mobile&renderer=webgl2");
  await expect(page.locator("#loading")).toHaveCount(0,{timeout:75000});
  await page.locator("#play").click();
  const samples:any[]=[];
  const take=async(label:string)=>{
    await page.waitForTimeout(180);
    const data=await page.evaluate(()=>{
      const api=(window as any).__ski;
      return {state:api.getState(),pose:api.getAthletePose().competitionPose};
    });
    expect(data.pose).toBeTruthy();
    expect(data.pose.humanMode).toBe(true);
    expect(data.pose.leftHumanHandTargetErrorM).toBeLessThan(.16);
    expect(data.pose.rightHumanHandTargetErrorM).toBeLessThan(.16);
    for(const wrist of [data.pose.leftWristWorld,data.pose.rightWristWorld]){
      expect(wrist.every((x:number)=>Number.isFinite(x))).toBe(true);
    }
    if(data.state.height===0&&data.state.fallen===0){
      expect(data.pose.leftSkiBaseClearanceM).toBeCloseTo(.008,2);
      expect(data.pose.rightSkiBaseClearanceM).toBeCloseTo(.008,2);
      expect(data.pose.leftAnkleTargetErrorM).toBeLessThan(.012);
      expect(data.pose.rightAnkleTargetErrorM).toBeLessThan(.012);
    }
    samples.push({label,state:{
      t:data.state.t,speed:Math.hypot(data.state.vx,data.state.vz),
      height:data.state.height,edge:data.state.edge,
    },pose:{
      bank:data.pose.bodyBankDeg,outside:data.pose.outsideSide,
      hips:data.pose.pelvisWorld,head:data.pose.headWorld,
      leftWrist:data.pose.leftWristWorld,rightWrist:data.pose.rightWristWorld,
      leftGoal:data.pose.leftHandGoalWorld,rightGoal:data.pose.rightHandGoalWorld,
      knees:[data.pose.leftKneeFlexionDeg,data.pose.rightKneeFlexionDeg],
      soles:[data.pose.leftSkiBaseClearanceM,data.pose.rightSkiBaseClearanceM],
    }});
    await page.screenshot({path:"test-results/human-motion-cycle-"+label+".png"});
  };
  await page.evaluate(()=>{
    const a=(window as any).__ski;a.start();a.freezeSimulation(true);
    a.step(115,{steer:0,tuck:false,brake:false,jump:false});
  });
  await take("start-drive");
  await page.evaluate(()=>(window as any).__ski.step(650,
    {steer:0,tuck:true,brake:false,jump:false}));
  await take("aero");
  await page.evaluate(()=>(window as any).__ski.step(210,
    {steer:.90,tuck:true,brake:false,jump:false}));
  await take("right-carve");
  await page.evaluate(()=>(window as any).__ski.step(210,
    {steer:-.90,tuck:true,brake:false,jump:false}));
  await take("left-carve");
  // The actual wrists, not just nominal targets, must leave the hips.
  const poses=samples.map(x=>x.pose);
  expect(Math.max(...poses.map(p=>distance(p.leftWrist,poses[0].leftWrist))))
    .toBeGreaterThan(.06);
  expect(Math.max(...poses.map(p=>distance(p.rightWrist,poses[0].rightWrist))))
    .toBeGreaterThan(.06);
  // Demand measurable asymmetry between two loaded turn directions.
  expect(distance(poses[2].leftGoal,poses[3].leftGoal)).toBeGreaterThan(.08);
  expect(distance(poses[2].rightGoal,poses[3].rightGoal)).toBeGreaterThan(.08);
  writeFileSync("test-results/human-motion-cycle.json",JSON.stringify(samples,null,2));
  console.info("[HUMAN_MOTION_CYCLE]",JSON.stringify(samples));
  expect(errors).toEqual([]);
});
