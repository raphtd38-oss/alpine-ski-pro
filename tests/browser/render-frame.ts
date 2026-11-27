import type { Page } from "@playwright/test";

/** Let PlayCanvas render the latest fixed-step state before reading its bones or wand. */
export async function waitForGameFrame(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}
