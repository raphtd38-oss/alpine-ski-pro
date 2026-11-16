import { describe, expect, it } from "vitest";
import { textureFlagWidth, gateFlagFlutter } from "../src/game/gates-visual";
describe("competition flag visuals", () => {
  it("keeps narrow flags inside the paired gates", () => {
    expect(textureFlagWidth(3.8)).toBeLessThanOrEqual(1.15);
    expect(textureFlagWidth(16)).toBeLessThanOrEqual(1.15);
  });
  it("reacts to pole displacement without non-finite values", () => {
    for (const turn of [-1, 0, 1]) {
      const degrees = gateFlagFlutter(12.5, turn, 0.24);
      expect(Number.isFinite(degrees)).toBe(true);
      expect(Math.abs(degrees)).toBeLessThan(20);
    }
  });
});
