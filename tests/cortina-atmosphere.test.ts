import { describe, expect, it } from "vitest";
import { COURSES } from "../src/game/course";
import {
  CORTINA_2026, CORTINA_TURN_WAYPOINTS,
  superGCenterX, superGGateRacingOffset,
} from "../src/game/superg";

describe("Cortina race environment layout", () => {
  it("preserves the surveyed race measurements, without inventing gate GPS", () => {
    expect(CORTINA_2026.officialCourseLengthM).toBe(2105);
    expect(CORTINA_2026.verticalDropM).toBe(635);
    expect(CORTINA_TURN_WAYPOINTS).toHaveLength(24);
    expect(superGCenterX(970)).toBeGreaterThan(100);
  });

  it("positions every race gate on alternating playable Super-G turns", () => {
    const course = COURSES.SG;
    expect(course.gates).toHaveLength(42);
    for (const gate of course.gates) {
      const offset = gate.x - superGCenterX(gate.z);
      expect(Number.isFinite(offset)).toBe(true);
      expect(Math.abs(offset)).toBeGreaterThan(5);
      expect(Math.abs(offset)).toBeLessThan(14);
      expect(Math.abs(offset) + gate.width / 2).toBeLessThan(course.width / 2 - 5);
      expect(offset).toBeCloseTo(superGGateRacingOffset(gate.id, gate.z), 6);
    }
    for (let i = 1; i < course.gates.length; i++) {
      const previous = course.gates[i - 1], current = course.gates[i];
      expect(current.z).toBeGreaterThan(previous.z);
      const sideA = Math.sign(previous.x - superGCenterX(previous.z));
      const sideB = Math.sign(current.x - superGCenterX(current.z));
      expect(sideA).not.toBe(sideB);
    }
  });
});
