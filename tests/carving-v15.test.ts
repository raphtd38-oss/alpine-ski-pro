import { describe, expect, it } from "vitest";
import { COURSES, EQUIPMENT } from "../src/game/course";
import { FIXED_DT, initialState, stepPhysics } from "../src/game/physics";
import { PoleSimulation } from "../src/game/poles";
import { replayAt } from "../src/game/race";
import type { Controls } from "../src/game/types";

const steer: Controls = { steer: 0.7, tuck: false, brake: false, jump: false };
const neutral: Controls = { ...steer, steer: 0 };

describe("V1.5 racing feedback and animation channels", () => {
  it("progressively loads the outside ski and unwinds after a turn", () => {
    const state = { ...initialState(), vz: 19 };
    stepPhysics(state, steer, EQUIPMENT.SL, COURSES.SL, FIXED_DT);
    expect(state.load).toBeGreaterThan(0.5);
    expect(state.load).toBeLessThan(0.52);
    for (let i = 0; i < 90; i++)
      stepPhysics(state, steer, EQUIPMENT.SL, COURSES.SL, FIXED_DT);
    expect(state.load).toBeGreaterThan(0.67);
    const loaded = state.load;
    for (let i = 0; i < 190; i++)
      stepPhysics(state, neutral, EQUIPMENT.SL, COURSES.SL, FIXED_DT);
    expect(Math.abs(state.load - 0.5)).toBeLessThan(
      Math.abs(loaded - 0.5) * 0.15,
    );
  });

  it("provides deterministic hardpack chatter, but none on soft snow", () => {
    const hard = { ...initialState(), vz: 19 };
    const soft = { ...initialState(), vz: 19 };
    for (let i = 0; i < 100; i++) {
      stepPhysics(hard, steer, EQUIPMENT.SL, COURSES.SL, FIXED_DT, 0.82);
      stepPhysics(soft, steer, EQUIPMENT.SL, COURSES.SL, FIXED_DT, 1.07);
    }
    expect(hard.chatter).toBeGreaterThan(soft.chatter + 0.2);
    expect(soft.chatter).toBe(0);
    expect(hard.chatter).toBeLessThanOrEqual(1);
  });

  it("makes pole contact visible to the rig without changing gate validity", () => {
    const course = { ...COURSES.SL, gates: [{ id: 0, x: 0, z: 10, width: 7 }] };
    const poles = new PoleSimulation(course);
    const before = { ...initialState(), x: 3.18, z: 9, vz: 18 };
    const state = { ...before, z: 11 };
    poles.update(before, state, FIXED_DT);
    expect(poles.lastImpacts).toBe(1);
    expect(state.poleImpact).toBeGreaterThan(0);
    const impact = state.poleImpact;
    for (let i = 0; i < 40; i++)
      stepPhysics(state, neutral, EQUIPMENT.SL, course, FIXED_DT);
    expect(state.poleImpact).toBeLessThan(impact * 0.01);
    expect(Number.isFinite(state.x + state.z)).toBe(true);
  });

  it("interpolates new channels and preserves older recorded replays", () => {
    const base = {
      t: 0, x: 0, z: 0, heading: 0, edge: 0,
      height: 0, tuck: 0, fallen: 0,
    };
    const modern = [
      { ...base, load: 0.5, chatter: 0, poleImpact: 0, slip: 0 },
      { ...base, t: 1, z: 20, load: 0.88, chatter: 0.8, poleImpact: 1, slip: 3 },
    ];
    const frame = replayAt(modern, 0.5);
    expect(frame?.load).toBeCloseTo(0.69, 4);
    expect(frame?.poleImpact).toBeCloseTo(0.5, 4);
    expect(frame?.chatter).toBeCloseTo(0.4, 4);
    expect(frame?.slip).toBeCloseTo(1.5, 4);
    expect(replayAt([base, { ...base, t: 1 }], 0.5)?.load).toBe(0.5);
  });
});
