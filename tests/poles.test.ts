import { it, expect } from "vitest";
import { PoleSimulation } from "../src/game/poles";
import { COURSES } from "../src/game/course";
import { initialState } from "../src/game/physics";
import { Race } from "../src/game/race";
it("swept impact deflects the hinge, exchanges momentum and does not invalidate a legal ski crossing", () => {
  const course = { ...COURSES.SL, gates: [{ id: 0, x: 0, z: 10, width: 7 }] };
  const poles = new PoleSimulation(course),
    race = new Race(course, "SL");
  race.phase = "racing";
  const previous = { ...initialState(), x: 3.18, z: 9, vz: 18 },
    s = { ...previous, z: 11 };
  poles.update(previous, s, 1 / 120);
  race.update(previous, s, 1 / 120, false);
  expect(poles.lastImpacts).toBe(1);
  expect(poles.poles[1].omegaX).toBeGreaterThan(0);
  expect(s.vz).toBeLessThan(18);
  expect(s.vz).toBeGreaterThan(17.8);
  expect(race.gateStatus).toEqual(["passed"]);
  const away = { ...s, z: 30 };
  for (let i = 0; i < 120 * 5; i++) poles.update(away, away, 1 / 120);
  expect(Math.abs(poles.poles[1].angleX)).toBeLessThan(0.001);
  expect(poles.poles[1].impacts).toBe(1);
});
it("a skier away from a pole receives no collision impulse", () => {
  const poles = new PoleSimulation(COURSES.SL),
    s = { ...initialState(), vz: 15 };
  poles.update(s, s, 1 / 120);
  expect(poles.lastImpacts).toBe(0);
  expect(s.vz).toBe(15);
});
