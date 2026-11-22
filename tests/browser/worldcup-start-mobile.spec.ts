import {test,expect} from "@playwright/test";

test("mobile-sized start TV retains next skier, staff and responsive lower-third",async({browser})=>{
  test.setTimeout(230000);
  const context=await browser.newContext({
    viewport:{width:390,height:844},deviceScaleFactor:2,
    isMobile:true,hasTouch:true,
  });
  const page=await context.newPage();
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/?quality=low&racer=mobile&renderer=webgl2");
  await expect(page.locator("#loading")).toHaveCount(0,{timeout:90000});
  await page.locator("#play").tap();
  const state=await page.evaluate(()=>(window as any).__ski.getState());
  expect(state.athleteVariant).toBe("mobile");
  expect(state.worldCupStart.waitingRacers).toBeGreaterThanOrEqual(1);
  expect(state.worldCupStart.winterOutfits).toBeGreaterThanOrEqual(3);
  expect(state.worldCupStart.staticSkierModels).toBe(0);
  expect(state.worldCupStart.liveClocks).toBe(2);
  await expect(page.locator("#worldcup-tv-start-lowerthird")).toHaveClass(/active/);
  await page.screenshot({path:"test-results/worldcup-start-tv-mobile-390px.png"});
  await page.waitForTimeout(600);
  expect((await page.evaluate(()=>(window as any).__ski.getState()))
    .worldCupStart.animatedRacers).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
  await context.close();
});
