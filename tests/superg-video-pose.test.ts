import { describe, expect, it } from "vitest";
import { superGEdgePose, superGStartBrace } from "../src/render/superg-video-pose";

describe("source-video guided Super-G animation intent (rendering only)", () => {
  it("keeps neutral straight-line stance without forced edge lean", () => {
    const pose = superGEdgePose(0, 0.5, 0, 0);
    expect(pose.engagement).toBe(0);
    expect(pose.hipDrop).toBe(0);
    expect(pose.hipInside).toBe(0);
    expect(pose.insideLegShortening).toBe(0);
  });

  it("lowers the hips when loading a real, gripping edge", () => {
    const outside = superGEdgePose(1, 1.1, 0.0, 0);
    expect(outside.engagement).toBeGreaterThan(0.85);
    expect(outside.hipDrop).toBeGreaterThan(0.055);
    expect(outside.hipDrop).toBeLessThan(0.08);
    expect(outside.hipInside).toBeGreaterThan(0.06);
    expect(outside.outsideLegLength).toBeGreaterThan(0);
    expect(outside.insideLegShortening).toBeGreaterThan(
      outside.outsideLegLength,
    );
  });

  it("mirrors left/right turns without introducing an asymmetric pelvis bias", () => {
    const a = superGEdgePose(0.9, 0.9);
    const b = superGEdgePose(-0.9, 0.9);
    expect(a.hipInside).toBeCloseTo(-b.hipInside);
    expect(a.hipDrop).toBeCloseTo(b.hipDrop);
    expect(a.pelvicAngle).toBeCloseTo(b.pelvicAngle);
  });

  it("attenuates aggressive carve on skids or when skis lose snow contact", () => {
    const grip = superGEdgePose(1, 1, 0, 0);
    const skid = superGEdgePose(1, 1, 1, 0);
    expect(skid.hipDrop).toBeLessThan(grip.hipDrop / 2);
    const air = superGEdgePose(1, 1, 0, 1);
    expect(air.engagement).toBe(0);
    expect(air.hipDrop).toBe(0);
  });

  it("loads the upper body progressively before departure, not on GO only", () => {
    expect(superGStartBrace(-3)).toBe(0);
    expect(superGStartBrace(-1.5)).toBe(0);
    expect(superGStartBrace(-0.8)).toBeGreaterThan(0);
    expect(superGStartBrace(-0.3)).toBeGreaterThan(
      superGStartBrace(-0.8),
    );
    expect(superGStartBrace(-0.01)).toBe(1);
    expect(superGStartBrace(0)).toBe(0);
  });
});
