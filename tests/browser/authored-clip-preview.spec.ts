import { test, expect } from "@playwright/test";

/**
 * Studio experiment only. Do not promote raw GLB clips to playable animation
 * until the skis/boots are re-targeted to the physics contacts.
 */
test("renders source GLB ski motions for visual pose comparison", async ({page}) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const clips = ["SG_AERO_TUCK", "SG_CARVE_LEFT", "SG_CARVE_RIGHT", "SG_COMPRESSION"];
  for (const clip of clips) {
    await page.goto("/?quality=low&racer=mobile&renderer=webgl2&motion=glb-preview&clip=" + clip);
    await expect(page.locator("#loading")).toHaveCount(0, {timeout: 75000});
    await page.locator("#play").click();
    await page.waitForTimeout(650);
    const info = await page.evaluate(() => (window as any).__ski.getState());
    expect(info.athleteSeamless).toBe(true);
    await page.screenshot({path: "test-results/glb-authored-" + clip + ".png"});
  }
  expect(errors).toEqual([]);
});
