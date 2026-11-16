import { chromium } from "@playwright/test";
const url = process.env.SKI_URL || "http://127.0.0.1:5174/?quality=medium";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--enable-unsafe-swiftshader",
    "--disable-dev-shm-usage",
    ...(process.env.WEBGPU
      ? ["--enable-unsafe-webgpu", "--use-angle=swiftshader"]
      : []),
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }),
  errors = [];
page.on("pageerror", (e) => {
  errors.push(e.message);
  console.log("PAGE ERROR", e.message.slice(0, 500));
});
page.on("console", (m) => {
  if (m.type() === "error" && errors.length < 5)
    console.log("GPU ERROR", m.text().slice(0, 500));
});
try {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator("#loading").waitFor({ state: "detached", timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "docs/screenshots/menu.png", timeout: 90000 });
  const device = await page.locator("#renderer-info").textContent();
  console.log("Graphics:", device);
  await page.locator("#play").click();
  const debug = await page.evaluate(() => !!window.__ski);
  if (debug) {
    await page.evaluate(() => {
      const api = window.__ski,
        base = { steer: 0, brake: false, tuck: false, jump: false };
      api.step(361, base);
      for (let i = 0; i < 15000; i++) {
        const s = api.getState(),
          c = api.getCourse();
        if (s.z > c.length - 45) break;
        const g = c.gates[s.gate] || { x: 0, z: c.length + 10 };
        api.step(1, {
          ...base,
          steer: Math.max(
            -0.9,
            Math.min(
              0.9,
              (Math.atan2(g.x - s.x, Math.max(6, g.z - s.z)) - s.heading) * 3,
            ),
          ),
          brake: s.vz > 12,
        });
      }
    });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: "docs/screenshots/finish-arena.png",
      timeout: 90000,
    });
    console.log("Race:", await page.evaluate(() => window.__ski.getState()));
  } else {
    await page.waitForTimeout(7000);
    console.log("Production HUD:", await page.locator("#time").textContent());
    await page.screenshot({ path: "docs/screenshots/production.png" });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press("Escape");
  await page.locator("#home").click();
  await page.screenshot({ path: "docs/screenshots/mobile.png" });
  console.log("Errors:", errors);
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
