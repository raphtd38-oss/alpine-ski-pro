import { describe, expect, it } from "vitest";
import { snowPlumeIntensity } from "../src/game/snow";

describe("Studio Kit snow feedback", () => {
  const quiet = {edge: 0, slip: 0, landingShock: 0, height: 0};
  it("shows spray on first post-jump touchdown even with flat skis", () => {
    expect(snowPlumeIntensity(quiet, 27)).toBe(0);
    expect(snowPlumeIntensity({...quiet, landingShock: .6}, 27))
      .toBeGreaterThan(1);
    expect(snowPlumeIntensity({...quiet, landingShock: .6, height: .4}, 27))
      .toBe(0);
  });
  it("adds balanced carving/scraping spray at high speeds", () => {
    expect(snowPlumeIntensity({...quiet, edge:.7}, 22)).toBeGreaterThan(1);
    expect(snowPlumeIntensity({...quiet, slip:4}, 22))
      .toBeGreaterThan(0.45);
    expect(snowPlumeIntensity({...quiet, edge:.7, slip:5}, 22))
      .toBeGreaterThan(snowPlumeIntensity({...quiet, edge:.7}, 22));
  });
  it("stays bounded and does not leak NaN on malformed speed", () => {
    expect(snowPlumeIntensity({...quiet, edge:10, slip:100,
      landingShock:10}, 40)).toBeLessThanOrEqual(4.5);
    expect(snowPlumeIntensity(quiet, Number.NaN)).toBe(0);
    expect(snowPlumeIntensity({...quiet, landingShock:1}, 2)).toBe(0);
  });
});
