import { describe, expect, it } from "vitest";
import { detailRange, chooseDetailVisibility } from "../src/render/scenery-lod";

describe("Studio Kit scenery LOD", () => {
  it("uses successively larger distance budgets for visual quality", () => {
    expect(detailRange("fir", "low")).toBeLessThan(detailRange("fir", "medium"));
    expect(detailRange("fir", "medium")).toBeLessThan(detailRange("fir", "high"));
    expect(detailRange("fir", "high")).toBeLessThan(detailRange("fir", "ultra"));
    expect(detailRange("chalet", "high")).toBeGreaterThan(detailRange("fir", "high"));
    expect(detailRange("sapling", "low")).toBeLessThan(detailRange("pine", "low"));
  });
  it("does not flicker when crossing the culling threshold", () => {
    const limit = 150;
    expect(chooseDetailVisibility(true, 157, limit, 12)).toBe(true);
    expect(chooseDetailVisibility(true, 163, limit, 12)).toBe(false);
    expect(chooseDetailVisibility(false, 145, limit, 12)).toBe(false);
    expect(chooseDetailVisibility(false, 137, limit, 12)).toBe(true);
  });
  it("has safe limits for malformed camera coordinates", () => {
    expect(chooseDetailVisibility(true, Number.NaN, 150)).toBe(false);
    expect(chooseDetailVisibility(true, -1, 150)).toBe(false);
    expect(chooseDetailVisibility(false, 10, 150)).toBe(true);
  });
});
