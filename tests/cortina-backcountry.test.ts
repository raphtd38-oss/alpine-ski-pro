import { expect, it } from "vitest";
import { COURSES, courseCenterX, terrainHeight } from "../src/game/course";
import { buildCortinaBackcountry } from "../src/render/cortina-backcountry";

it("grounds distant ridges without covering the race mesh or reversing normals", () => {
  const course = COURSES.SG;
  for (const quality of ["low", "medium", "high", "ultra"] as const) {
    const {positions: p, indices, uvs} = buildCortinaBackcountry(course, quality);
    expect(uvs.length).toBe(p.length / 3 * 2);
    expect(indices.length / 3).toBeLessThan(45000);
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i], y = p[i + 1], z = p[i + 2];
      expect(Number.isFinite(y)).toBe(true);
      expect(Math.abs(x - courseCenterX(z, course))).toBeGreaterThanOrEqual(220 - 1e-9);
      expect(y).toBe(terrainHeight(x, z, course));
    }
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
      expect((p[b + 2] - p[a + 2]) * (p[c] - p[a]) -
        (p[b] - p[a]) * (p[c + 2] - p[a + 2])).toBeGreaterThan(0);
    }
  }
});
