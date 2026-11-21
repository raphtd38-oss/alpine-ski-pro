import {test,expect} from "@playwright/test";

test("premium helmet, original numbered bib, human mouth and pre-start warm-up render",async({page})=>{
  test.setTimeout(180000);
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/?quality=low&racer=mobile&renderer=webgl2&bib=27");
  await expect(page.locator("#loading")).toHaveCount(0,{timeout:75000});
  await page.locator("#play").click();
  await page.evaluate(()=>{
    const api=(window as any).__ski;api.start();api.freezeSimulation(true);
    api.step(135,{steer:0,tuck:false,brake:false,jump:false});
  });
  await page.waitForTimeout(350);
  let pose=await page.evaluate(()=>(window as any).__ski.getAthletePose());
  expect(pose.seamless).toBe(true);
  expect(pose.premiumKit).toBe(true);
  expect(pose.bibNumber).toBe(27);
  expect(pose.competitionPose).toBeTruthy();
  expect(pose.competitionPose.warmupBeat).toBe("shake-arms");
  expect(Math.abs(pose.competitionPose.leftWristWorld[1]-
    pose.competitionPose.rightWristWorld[1])).toBeGreaterThan(.05);
  expect(pose.competitionPose.leftAnkleTargetErrorM).toBeLessThan(.015);
  expect(pose.competitionPose.rightAnkleTargetErrorM).toBeLessThan(.015);
  await page.screenshot({path:"test-results/racer-premium-warmup-close-up.png"});
  await page.evaluate(()=>(window as any).__ski.step(
    105,{steer:0,tuck:false,brake:false,jump:false}));
  await page.waitForTimeout(320);
  pose=await page.evaluate(()=>(window as any).__ski.getAthletePose());
  expect(pose.competitionPose.warmupBeat).toBe("flex-legs");
  expect(pose.competitionPose.leftSkiBaseClearanceM).toBeCloseTo(.008,2);
  expect(pose.competitionPose.rightSkiBaseClearanceM).toBeCloseTo(.008,2);
  await page.screenshot({path:"test-results/racer-premium-warmup-shift.png"});
  await page.evaluate(()=>(window as any).__ski.step(
    290,{steer:0,tuck:false,brake:false,jump:false}));
  await page.waitForTimeout(220);
  pose=await page.evaluate(()=>(window as any).__ski.getAthletePose());
  expect(pose.competitionPose.warmupBeat).toBe("ready");
  expect(pose.premiumKit).toBe(true);
  expect(pose.poleGripError[0]).toBeLessThan(.08);
  expect(pose.poleGripError[1]).toBeLessThan(.08);
  await page.screenshot({path:"test-results/racer-premium-race-start.png"});
  expect(errors).toEqual([]);
});
