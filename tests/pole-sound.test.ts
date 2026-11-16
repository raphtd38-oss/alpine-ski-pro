import { describe, expect, it } from "vitest";
import { poleImpactMix } from "../src/game/pole-sound";
describe("spring gate sound", () => {
  it("makes a fast knock stronger without exceeding safe envelope", () => {
    const slow = poleImpactMix(6, false);
    const fast = poleImpactMix(29, false);
    expect(fast.crack).toBeGreaterThan(slow.crack);
    expect(fast.body).toBeGreaterThan(slow.body);
    expect(fast.cloth).toBe(0);
    expect(fast.crack).toBeLessThan(0.25);
  });
  it("adds original fabric movement only for flagged gates", () => {
    expect(poleImpactMix(15, true).cloth).toBeGreaterThan(0);
    expect(poleImpactMix(15, false).cloth).toBe(0);
  });
  it("handles invalid simulation inputs without NaNs", () => {
    for(const speed of [NaN, Infinity, -100]){
      expect(Object.values(poleImpactMix(speed, true)).every(Number.isFinite)).toBe(true);
    }
  });
});
