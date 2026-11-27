import {test,expect} from "@playwright/test";

test("ten-second TV start pauses at the gate and hands timing back to the race", async ({page}) => {
  await page.goto("/?quality=low&racer=mobile&renderer=webgl2");
  await expect(page.locator("#loading")).toHaveCount(0, {timeout: 90000});
  const overlay = page.locator("#worldcup-tv-start-lowerthird");
  await page.locator("#tv-start").click();
  await expect(overlay).toHaveAttribute("data-shot", "establishing");
  await page.locator("#pause").click();
  const race = () => page.evaluate(() => {
    const s = (window as any).__ski.getState();
    return { countdown: s.countdown, time: s.time, z: s.z, gate: s.startGateOpened };
  });
  const paused = await race();
  expect(paused.countdown).toBeGreaterThan(3);
  expect(paused.gate).toBe(false);
  expect(paused.time).toBe(0);
  await page.waitForTimeout(600);
  expect(await race()).toEqual(paused);
  await page.locator("#continue").click();
  await expect(overlay).toHaveAttribute("data-shot", "starter-closeup", {timeout: 18000});
  expect((await race()).time).toBe(0);
  await expect(overlay).toContainText("GO", {timeout: 10000});
  await expect.poll(async () => (await race()).time, {timeout: 12000}).toBeGreaterThan(0);
  expect((await race()).gate).toBe(true);
  await expect(overlay).not.toHaveClass(/active/, {timeout: 20000});
  await expect(page.locator("#gates")).toContainText("/ 42");
});

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
  await page.evaluate(()=>(window as any).__ski.step(132,
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
