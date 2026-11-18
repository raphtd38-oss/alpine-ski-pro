import { describe, expect, it } from "vitest";
import { appendDolomiteRidge, newRockBatch } from "../src/render/cortina-geology";
import { snowShoulderLift } from "../src/render/cortina-snow-banks";
import { COURSES, courseCenterX } from "../src/game/course";
import { BANNER_CRASH_THRESHOLD } from "../src/game/banner-contact";

describe("Cortina V1.16 fractured Dolomites geometry", () => {
  const input = {
    x: 98, z: 280, radius: 28, height: 114, seed: 2026,
    ground: (x: number, z: number) => 15 - 0.31 * z + x * 0.03,
    segments: 24, strata: 16,
  };

  it("builds a manifold-like connected grid with all finite vertices, UVs and indices", () => {
    const batch = newRockBatch();
    appendDolomiteRidge(batch, input);
    const vertices = (input.segments + 1) * (input.strata + 1);
    expect(batch.positions).toHaveLength(vertices * 3);
    expect(batch.uvs).toHaveLength(vertices * 2);
    expect(batch.colors).toHaveLength(vertices * 4);
    expect(batch.indices).toHaveLength(input.segments * input.strata * 6);
    expect(batch.positions.every(Number.isFinite)).toBe(true);
    expect(batch.uvs.every(Number.isFinite)).toBe(true);
    expect(batch.colors.every(v => Number.isFinite(v) && v >= 0 && v <= 1)).toBe(true);
    expect(batch.indices.every(i => i >= 0 && i < vertices)).toBe(true);
  });

  it("is deterministic, has non-conical multi-peak silhouette and remains above ground", () => {
    const a = newRockBatch(), b = newRockBatch();
    appendDolomiteRidge(a, input);
    appendDolomiteRidge(b, input);
    expect(a.positions).toEqual(b.positions);
    const crest: number[] = [];
    for (let j = 2; j <= input.segments - 2; j++) {
      const k = 5;
      const n = (j * (input.strata + 1) + k) * 3;
      const x = a.positions[n], y = a.positions[n + 1], z = a.positions[n + 2];
      const above = y - input.ground(x, z);
      expect(above).toBeGreaterThanOrEqual(0);
      crest.push(above);
    }
    const maxima = crest.slice(1,-1).filter((height,i) =>
      height > crest[i] && height > crest[i+2]).length;
    expect(maxima).toBeGreaterThanOrEqual(2);
  });

  it("appends multiple independent ridges without connecting triangles across batch", () => {
    const batch = newRockBatch();
    appendDolomiteRidge(batch, input);
    const firstVertices = batch.positions.length / 3;
    const firstIndices = batch.indices.length;
    appendDolomiteRidge(batch, { ...input, x: -125, seed: 501 });
    expect(batch.positions.length / 3).toBe(firstVertices * 2);
    expect(batch.indices.length).toBe(firstIndices * 2);
    expect(Math.min(...batch.indices.slice(firstIndices))).toBe(firstVertices);
    expect(Math.max(...batch.indices.slice(0, firstIndices))).toBeLessThan(firstVertices);
  });
});

describe("Cortina V1.16 wind sculpted snow does not break the race", () => {
  it("has gentle continuous snow banks and fixed near-race edge clearance", () => {
    for (const side of [-1,1]) {
      for (const z of [0,85,360,1000,2000]) {
        expect(snowShoulderLift(0,z,side)).toBeCloseTo(.055,3);
        expect(snowShoulderLift(1,z,side)).toBeCloseTo(.055,3);
        for (let i=0;i<=80;i++) {
          const height = snowShoulderLift(i/80,z,side);
          expect(height).toBeGreaterThanOrEqual(.025);
          expect(height).toBeLessThan(1);
        }
      }
    }
  });
  it("never moves a race gate, changes FIS-inspired course or banner threshold", () => {
    expect(COURSES.SG.length).toBe(2105);
    expect(COURSES.SG.gates).toHaveLength(34);
    expect(BANNER_CRASH_THRESHOLD).toBe(.45);
    expect(courseCenterX(500,COURSES.SG)).toBeFinite();
  });
});
