import { describe, expect, it } from "vitest";
import { COURSES } from "../src/game/course";
import { trainingLineX } from "../src/game/guide";
describe("training gate guidance", () => {
  it("crosses the centre of every slalom gate", () => {
    for (const g of COURSES.SL.gates)
      expect(trainingLineX(COURSES.SL, g.z)).toBeCloseTo(g.x, 9);
  });
  it("is smooth and stays within the course boundaries", () => {
    const c = COURSES.SL;
    let previous = trainingLineX(c, 3);
    for (let z = 4; z <= c.length; z++) {
      const x = trainingLineX(c, z);
      expect(Number.isFinite(x)).toBe(true);
      expect(Math.abs(x)).toBeLessThan(c.width / 2 - 1);
      expect(Math.abs(x - previous)).toBeLessThan(2.5);
      previous = x;
    }
  });
  it("clamps positions beyond start/finish", () => {
    expect(trainingLineX(COURSES.SL, -100)).toBe(trainingLineX(COURSES.SL, 3));
    expect(trainingLineX(COURSES.SL, 1e9)).toBe(trainingLineX(COURSES.SL, COURSES.SL.length));
  });
});
