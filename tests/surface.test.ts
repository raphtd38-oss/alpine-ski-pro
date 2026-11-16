import { describe, expect, it } from "vitest";
import { COURSES } from "../src/game/course";
import { sampleSnowSurface } from "../src/game/surface";
import { snowTexel } from "../src/render/snow-texture";
describe("piste snow hardness and grip", () => {
  it("is deterministic for the same piste position and weather", () => {
    expect(sampleSnowSurface(2, 128, COURSES.SL))
      .toEqual(sampleSnowSurface(2, 128, COURSES.SL));
  });
  it("changes gradually and gently across piste sections", () => {
    const a = sampleSnowSurface(1, 150, COURSES.SL);
    const b = sampleSnowSurface(1.2, 150.2, COURSES.SL);
    expect(Math.abs(a.grip - b.grip)).toBeLessThan(0.01);
    for (let z = 0; z < 500; z += 10) {
      const surface = sampleSnowSurface(1, z, COURSES.SL);
      expect(surface.grip).toBeGreaterThan(0.88);
      expect(surface.grip).toBeLessThan(1.02);
      expect(surface.ice).toBeGreaterThanOrEqual(0);
      expect(surface.ice).toBeLessThanOrEqual(1);
    }
  });
  it("keeps snow weather less grippy than the same clear-weather area", () => {
    for (let z = 0; z < 550; z += 25) {
      const clear = sampleSnowSurface(-2, z, COURSES.SL, "clear");
      const fresh = sampleSnowSurface(-2, z, COURSES.SL, "snow");
      expect(fresh.grip).toBeLessThan(clear.grip);
    }
  });
  it("produces finite in-range PBR texels with meaningful variations", () => {
    const first = snowTexel(0, 0), second = snowTexel(9, 38);
    expect(snowTexel(9, 38)).toEqual(second);
    for (const c of [...first.diffuse, ...first.normal, first.roughness,
      ...second.diffuse, ...second.normal, second.roughness])
      expect(c).toBeGreaterThanOrEqual(0);
    expect(first).not.toEqual(second);
    for (const c of [...first.diffuse, ...first.normal, first.roughness])
      expect(c).toBeLessThanOrEqual(255);
  });
});
