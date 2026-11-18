
import { describe, expect, it } from "vitest";
import { COURSES, courseCenterX, terrainHeight } from "../src/game/course";
import {
  CORTINA_2026,
  CORTINA_TURN_WAYPOINTS,
  CORTINA_ELEVATION_WAYPOINTS,
  SUPER_G_ROLLERS,
  superGGateZ,
  superGCenterX,
} from "../src/game/superg";

describe("Cortina Olympia delle Tofane Super-G original schematic reconstruction", () => {
  const course = COURSES.SG;

  it("replaces Glacier Express with FIS verified race dimensions", () => {
    expect(Object.keys(COURSES)).toEqual(["SG"]);
    expect(course.name).toContain("Cortina");
    expect(course.length).toBe(2105);
    expect(Math.round(course.length * course.grade)).toBe(635);
    expect(CORTINA_2026.startElevationM).toBe(2195);
    expect(CORTINA_2026.finishElevationM).toBe(1560);
    expect(CORTINA_2026.officialGates).toBe(43);
    expect(CORTINA_2026.officialTurningGates).toBe(39);
    expect(course.gates).toHaveLength(42); // deliberately playable original gates
  });

  it("follows the supplied 24 authored waypoints with continuous interpolation", () => {
    expect(CORTINA_TURN_WAYPOINTS).toHaveLength(24);
    expect(CORTINA_ELEVATION_WAYPOINTS.length).toBeGreaterThan(15);
    for (const point of CORTINA_TURN_WAYPOINTS)
      expect(superGCenterX(point.z)).toBeCloseTo(point.x, 5);
    expect(courseCenterX(0, course)).toBe(0);
    expect(courseCenterX(2105, course)).toBe(0);
    expect(superGCenterX(970)).toBeGreaterThan(100);
    expect(superGCenterX(1380)).toBeLessThan(-80);
  });

  it("keeps the physics height field coherent with 635m drop", () => {
    const start = terrainHeight(0, 0, course);
    const finish = terrainHeight(0, 2105, course);
    expect(start).toBeCloseTo(0, 5);
    expect(finish).toBeCloseTo(-635, 5);
    for (let z = 0; z <= course.length; z += 25) {
      const mid = terrainHeight(courseCenterX(z, course), z, course);
      expect(Number.isFinite(mid)).toBe(true);
    }
  });

  it("avoids landing sectors and keeps the existing gate system", () => {
    expect(SUPER_G_ROLLERS).toHaveLength(5);
    for (let i = 0; i < course.gates.length; i++) {
      const g = course.gates[i];
      expect(g.z).toBeCloseTo(superGGateZ(i), 6);
      expect(g.z).toBeGreaterThan(20);
      expect(g.z).toBeLessThan(2005);
      if (i) expect(g.z - course.gates[i-1].z).toBeGreaterThanOrEqual(35.99);
    }
  });
});
