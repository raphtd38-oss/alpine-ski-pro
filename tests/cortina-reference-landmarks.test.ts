import { describe, expect, it } from "vitest";
import { COURSES } from "../src/game/course";
import {
  CORTINA_REFERENCE_DETAIL,
  CORTINA_REFERENCE_ROCK_FACES,
  cortinaReferenceFootprints,
} from "../src/render/cortina-reference-landmarks";

describe("Cortina 2026 photographic-reference landmark safety", () => {
  it("retains a bounded 3D detail budget on each graphics tier", () => {
    expect(CORTINA_REFERENCE_DETAIL.low.nearTrees).toBeLessThan(20);
    expect(CORTINA_REFERENCE_DETAIL.high.nearTrees).toBeGreaterThan(CORTINA_REFERENCE_DETAIL.medium.nearTrees);
    expect(CORTINA_REFERENCE_DETAIL.ultra.nearTrees).toBeLessThan(130);
    expect(CORTINA_REFERENCE_DETAIL.low.rockSections).toBeLessThan(CORTINA_REFERENCE_DETAIL.high.rockSections);
    expect(CORTINA_REFERENCE_DETAIL.ultra.rockFaces).toBe(CORTINA_REFERENCE_ROCK_FACES.length);
  });

  it("keeps every authored rock landmark safely outside the Super-G corridor", () => {
    const course = COURSES.SG;
    const positions = cortinaReferenceFootprints(course, "ultra");
    expect(positions.length).toBe(8);
    for (const p of positions) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(p.clearance).toBeGreaterThan(60);
      expect(p.z).toBeGreaterThan(0);
      expect(p.z).toBeLessThan(course.length);
      expect(p.height).toBeGreaterThan(50);
    }
    expect(course.gates).toHaveLength(42);
  });

  it("describes schematic photo-referenced place names rather than gate GPS", () => {
    const names = CORTINA_REFERENCE_ROCK_FACES.map(p => p.name).join(" ");
    expect(names).toContain("Schuss");
    expect(names).toContain("Scarpadon");
    expect(names).toContain("Rumerlo");
  });
});
