import { describe, expect, it } from "vitest";
import { computeSkiSoundMix } from "../src/game/audio-mix";

describe("ski sound mixer", () => {
  it("stays silent while the game is inactive", () => {
    const m = computeSkiSoundMix(25, 0.8, 5, false);
    expect(m.glide + m.carving + m.ice + m.wind).toBe(0);
  });
  it("increases wind with speed and carving with edge pressure", () => {
    const slow = computeSkiSoundMix(6, 0.2, 0, true);
    const fast = computeSkiSoundMix(26, 0.2, 0, true);
    const hardTurn = computeSkiSoundMix(26, 0.85, 0, true);
    expect(fast.wind).toBeGreaterThan(slow.wind);
    expect(hardTurn.carving).toBeGreaterThan(fast.carving);
  });
  it("increases the brittle icy scraping layer with slipping", () => {
    const steady = computeSkiSoundMix(18, 0.5, 0.1, true);
    const slip = computeSkiSoundMix(18, 0.5, 7, true);
    expect(slip.ice).toBeGreaterThan(steady.ice);
  });
  it("clamps broken or extreme simulation samples to finite, safe values", () => {
    for (const n of [Number.NaN, Number.POSITIVE_INFINITY, 1e8]) {
      const mix = computeSkiSoundMix(n, n, n, true, n);
      expect(Object.values(mix).every(Number.isFinite)).toBe(true);
      expect(mix.wind).toBeLessThanOrEqual(0.52);
    }
  });
});
