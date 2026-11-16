import { describe, expect, it } from "vitest";
import { AdaptiveQuality } from "../src/game/performance";

function frames(performance: AdaptiveQuality, fps: number, seconds: number) {
  const updates = [];
  for (let i = 0; i < fps * seconds; i++) {
    const update = performance.sample(1 / fps);
    if (update) updates.push(update);
  }
  return updates;
}
describe("adaptive graphics", () => {
  it("starts at high quality and lowers only rendering resolution under sustained load", () => {
    const p = new AdaptiveQuality(1.5, 0.75);
    expect(frames(p, 30, 1)).toHaveLength(0); // smoothing grace period
    frames(p, 30, 12);
    expect(p.ratio).toBeLessThan(1.5);
    expect(p.ratio).toBeGreaterThanOrEqual(0.75);
  });
  it("never imposes a 40 FPS cap or reduces quality on a fast display", () => {
    const p = new AdaptiveQuality(1.5, 0.75);
    frames(p, 144, 20);
    expect(p.ratio).toBe(1.5);
    expect(p.shadowScale).toBe(1);
  });
  it("recovers visual detail when performance improves", () => {
    const p = new AdaptiveQuality(1.5, 0.8);
    frames(p, 30, 20);
    const degraded = p.ratio;
    expect(degraded).toBeLessThan(1.5);
    frames(p, 90, 20);
    expect(p.ratio).toBeGreaterThan(degraded);
  });
  it("ignores suspended frames and never drops below the visual floor", () => {
    const p = new AdaptiveQuality(1.5, 0.8);
    for (let i = 0; i < 1000; i++) p.sample(1 / 25);
    expect(p.ratio).toBeGreaterThanOrEqual(0.8);
    const before = p.ratio;
    for (let i = 0; i < 100; i++) {
      expect(p.sample(1.5)).toBeNull();
      expect(p.sample(1 / 30, false)).toBeNull();
    }
    expect(p.ratio).toBe(before);
  });
});
