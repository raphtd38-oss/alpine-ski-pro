import {test,expect} from "@playwright/test";

test("real World Cup start paddock stages television cameras, people and live timer",async({page})=>{
  test.setTimeout(230000);
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/?quality=low&racer=mobile&renderer=webgl2");
  await expect(page.locator("#loading")).toHaveCount(0,{timeout:90000});
  await page.locator("#play").click();
  await page.evaluate(()=>{
    const api=(window as any).__ski;
    api.start();api.freezeSimulation(true);
    api.step(10,{steer:0,tuck:false,brake:false,jump:false});
  });
  await page.waitForTimeout(350);
  const state=await page.evaluate(()=>(window as any).__ski.getState());
  const compound=state.worldCupStart;
  expect(compound).toBeTruthy();
  expect(compound.widthM).toBeGreaterThan(10);
  expect(compound.depthM).toBeGreaterThan(20);
  expect(compound.waitingRacers).toBeGreaterThanOrEqual(2);
  expect(compound.coaches).toBeGreaterThanOrEqual(1);
  expect(compound.officials).toBeGreaterThanOrEqual(1);
  expect(compound.liveClocks).toBe(2);
  expect(compound.animatedRacers).toBeGreaterThanOrEqual(2);
  expect(compound.animatedCoaches).toBeGreaterThanOrEqual(1);
  expect(state.timingWands).toBe(1);
  expect(state.startGateOpened).toBe(false);
  const tv=page.locator("#worldcup-tv-start-lowerthird");
  await expect(tv).toHaveClass(/active/);
  await expect(tv).toContainText("ESTABLISHING");
  await page.screenshot({path:"test-results/worldcup-start-tv-establishing.png"});
  await page.evaluate(()=>(window as any).__ski.step(127,
    {steer:0,tuck:false,brake:false,jump:false}));
  await page.waitForTimeout(400);
  await expect(tv).toContainText("ATHLETE QUEUE");
  await page.screenshot({path:"test-results/worldcup-start-tv-athletes-queue.png"});
  await page.evaluate(()=>(window as any).__ski.step(25,
    {steer:0,tuck:false,brake:false,jump:false}));
  await page.waitForTimeout(400);
  await expect(tv).toContainText("COACHES");
  await page.screenshot({path:"test-results/worldcup-start-tv-coach-encouragement.png"});
  await page.evaluate(()=>(window as any).__ski.step(107,
    {steer:0,tuck:false,brake:false,jump:false}));
  await page.waitForTimeout(400);
  await expect(tv).toContainText("STARTER CLOSEUP");
  await page.screenshot({path:"test-results/worldcup-start-tv-starter-closeup.png"});
  await page.evaluate(()=>(window as any).__ski.step(170,
    {steer:0,tuck:false,brake:false,jump:false}));
  await page.waitForTimeout(400);
  await expect(tv).toContainText("LAUNCH");
  await page.screenshot({path:"test-results/worldcup-start-tv-launch.png"});
  const launched=await page.evaluate(()=>(window as any).__ski.getState());
  expect(launched.phase).toBe("racing");
  expect(launched.startGateOpened).toBe(true); // actual 20° wand triggered by this point
  expect(launched.startGateImpulseTime).not.toBeNull();
  await page.evaluate(()=>(window as any).__ski.step(500,
    {steer:0,tuck:true,brake:false,jump:false}));
  await page.waitForTimeout(300);
  await expect(tv).not.toHaveClass(/active/);
  const after=await page.evaluate(()=>(window as any).__ski.getState());
  expect(after.z).toBeGreaterThan(14);
  expect(errors).toEqual([]);
});
