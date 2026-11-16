import { describe, expect, it } from "vitest";
import { skiTrackQuad, snowSprayVelocity } from "../src/game/snow";

describe("snow effects geometry", () => {
  const heightAt = (x: number, z: number) => -0.2 * z + 0.03 * x;
  it("keeps both ski trails apart and on the actual slope", () => {
    const before = { x: 0, z: 0, heading: 0 };
    const after = { x: 0, z: 1, heading: 0 };
    const left = skiTrackQuad(before, after, -0.17, 0.03, heightAt);
    const right = skiTrackQuad(before, after, 0.17, 0.03, heightAt);
    expect(left).toHaveLength(12);
    expect((left[0] + left[3]) / 2).toBeCloseTo(-0.17);
    expect((right[0] + right[3]) / 2).toBeCloseTo(0.17);
    for (let i = 0; i < 12; i += 3)
      expect(left[i + 1]).toBeCloseTo(heightAt(left[i], left[i + 2]) + 0.021);
  });

  it("makes track ribbons perpendicular to the travelled curve", () => {
    const p = { x: 0, z: 0, heading: 0 };
    const q = { x: 1, z: 1.5, heading: Math.PI / 4 };
    const v = skiTrackQuad(p, q, 0, 0.04, heightAt);
    const widthX = v[3] - v[0], widthZ = v[5] - v[2];
    const lengthX = v[9] - v[0], lengthZ = v[11] - v[2];
    expect(widthX * lengthX + widthZ * lengthZ).toBeCloseTo(0, 8);
    expect(Math.hypot(widthX, widthZ)).toBeCloseTo(0.08, 8);
  });

  it("supports zero-distance samples without NaN", () => {
    const same = { x: 0, z: 4, heading: Math.PI / 2 };
    expect(skiTrackQuad(same, same, 0.17, 0.03, heightAt).every(Number.isFinite)).toBe(true);
  });

  it("throws snow behind and outward, following the skier's heading", () => {
    const a = snowSprayVelocity(
      { vx: 0, vz: 14, heading: 0, edge: 0.5, slip: 2 },
      0.5,
    );
    expect(a.x).toBeLessThan(0);
    expect(a.z).toBeLessThan(0);
    const b = snowSprayVelocity(
      { vx: 0, vz: 14, heading: 0, edge: -0.5, slip: 2 },
      0.5,
    );
    expect(b.x).toBeGreaterThan(0);
    expect(b.z).toBeLessThan(0);
  });
});
