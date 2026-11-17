import { describe, expect, it } from "vitest";
import { Race } from "../src/game/race";
import { initialState } from "../src/game/physics";
import { COURSES } from "../src/game/course";

// A speed-race gate has two separate fabric panels beside the OPEN corridor.
// Impacting the spring-loaded poles is handled independently by PoleSimulation.
const course = {
  ...COURSES.SG,
  length: 120,
  gates: [{ id: 0, x: 2, z: 40, width: 7.6 }],
};
function cross(prevX: number, x: number, prevHeight = 0, endHeight = 0) {
  const race = new Race(course, "SG");
  race.phase = "racing";
  const before = { ...initialState(), x: prevX, z: 39, height: prevHeight };
  const after = { ...initialState(), x, z: 41, height: endHeight };
  race.update(before, after, 1 / 60, false);
  return race;
}
describe("Super-G passable fabric gates", () => {
  it("counts a normal center pass", () => {
    const r = cross(2, 2);
    expect(r.gateStatus).toEqual(["passed"]);
    expect(r.missed).toBe(0);
  });
  it("counts an airborne pass between the two poles", () => {
    const r = cross(2, 2, 2.1, 3.6);
    expect(r.gateStatus).toEqual(["passed"]);
    expect(r.missed).toBe(0);
  });
  it("permits a close graze of the flexible inside pole", () => {
    const r = cross(5.55, 5.55, 0, 0);
    expect(r.gateStatus).toEqual(["passed"]);
  });
  it("evaluates the interpolated intersection, not the final position", () => {
    const r = cross(-4, 8);
    expect(r.gateStatus).toEqual(["passed"]);
  });
  it("does not disqualify a legal ski-edge brush of the inside pole", () => {
    const r = cross(5.84, 5.84);
    expect(r.gateStatus).toEqual(["passed"]);
  });
  it("still penalizes passing entirely outside the corridor", () => {
    const r = cross(8, 8);
    expect(r.gateStatus).toEqual(["missed"]);
    expect(r.missed).toBe(1);
  });
});
