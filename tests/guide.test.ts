import { describe, expect, it } from "vitest";
import { COURSES, courseCenterX } from "../src/game/course";
import { trainingLineX } from "../src/game/guide";
describe("training gate guidance", () => {
  it("crosses the centre of every Super-G gate", () => {
    for (const g of COURSES.SG.gates)
      expect(trainingLineX(COURSES.SG, g.z)).toBeCloseTo(g.x, 9);
  });
  it("is smooth and stays within the course boundaries", () => {
    const c = COURSES.SG;
    let previous = trainingLineX(c, 3);
    for (let z = 4; z <= c.length; z++) {
      const x = trainingLineX(c, z);
      expect(Number.isFinite(x)).toBe(true);
      expect(Math.abs(x - courseCenterX(z, c))).toBeLessThan(c.width / 2 - 1);
      expect(Math.abs(x - previous)).toBeLessThan(2.5);
      previous = x;
    }
  });
  it("clamps positions beyond start/finish", () => {
    expect(trainingLineX(COURSES.SG, -100)).toBe(trainingLineX(COURSES.SG, 3));
    expect(trainingLineX(COURSES.SG, 1e9)).toBe(trainingLineX(COURSES.SG, COURSES.SG.length));
  });
});
