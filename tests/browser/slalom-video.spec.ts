import { test, expect } from "@playwright/test";

// Real PlayCanvas renderer capture: generate a legal SL run using the game's
// own 120 Hz solver, then record its in-game replay from two camera angles.
// No invented footage or pre-rendered screenshots are used.
test.use({
  viewport: { width: 960, height: 540 },
  video: { mode: "on", size: { width: 960, height: 540 } },
});

const neutral = { steer: 0, tuck: false, brake: false, jump: false };

async function createRealSlalomReplay(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto("/?quality=medium&renderer=webgl2");
  await expect(page.locator("#loading")).toHaveCount(0, { timeout: 60000 });
  await page.locator("#play").click();
  const race = await page.evaluate((idle) => {
    const api = (window as any).__ski;
    // The countdown uses the exact same fixed-step simulation.
    api.step(361, idle);
    for (let step = 0; step < 18000; step++) {
      const s = api.getState();
      if (s.phase === "finished") return s;
      const course = api.getCourse();
      const gate = course.gates[s.gate] || { x: 0, z: course.length + 10 };
      const desired = Math.atan2(gate.x - s.x, Math.max(6, gate.z - s.z));
      api.step(1, {
        ...idle,
        steer: Math.max(-0.9, Math.min(0.9, (desired - s.heading) * 3)),
        brake: s.vz > 12,
      });
    }
    return api.getState();
  }, neutral);
  expect(race.course).toBe("SL");
  expect(race.phase).toBe("finished");
  expect(race.missed).toBe(0);
  await expect(page.locator("#replay")).toBeVisible();
  await page.locator("#replay").click();
  await expect(page.locator("#race-status")).toHaveText("REPLAY");
  return errors;
}

for (const clip of [
  { name: "slalom-sl-poursuite", title: "SL — caméra de poursuite", presses: 1 },
  { name: "slalom-sl-rapprochee", title: "SL — caméra rapprochée", presses: 2 },
]) {
  test(clip.title + " : capture d'une vraie descente", async ({ page }, testInfo) => {
    const errors = await createRealSlalomReplay(page);
    // Replay starts in TV view (index 3). C cycles to chase (0), then close (1).
    for (let i = 0; i < clip.presses; i++) await page.keyboard.press("KeyC");
    await page.waitForTimeout(17000);
    expect(errors).toEqual([]);
    // The recorded page is genuine WebGL browser gameplay. Save a stable
    // filename into the GitHub Actions browser-evidence artifact.
    const video = page.video();
    expect(video).not.toBeNull();
    await page.close();
    await video!.saveAs(testInfo.outputPath(clip.name + ".webm"));
  });
}
