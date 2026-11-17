import { describe, expect, it } from "vitest";
import { COURSES, EQUIPMENT, terrainHeight } from "../src/game/course";
import { FIXED_DT, initialState, stepPhysics } from "../src/game/physics";
import { SUPER_G_ROLLERS, SUPER_G_LANDING_CLEARANCE, SUPER_G_TAKEOFF_CLEARANCE, SUPER_G_MIN_GATE_SPACING, superGRelief, shouldLaunchAtCrest, startPushAcceleration } from "../src/game/superg";
import { Race, replayAt } from "../src/game/race";
import type { Controls } from "../src/game/types";

const neutral: Controls = { steer: 0, tuck: false, brake: false, jump: false };
const sg = COURSES.SG;

describe("World-Cup-inspired Super-G course", () => {
  it("has a substantial elevation drop, spaced flag gates and varied turns", () => {
    expect(sg.length).toBeGreaterThanOrEqual(1800);
    expect(sg.length).toBeLessThanOrEqual(2600);
    const drop = terrainHeight(0, 3, sg) - terrainHeight(0, sg.length, sg);
    expect(drop).toBeGreaterThan(400);
    expect(drop).toBeLessThan(650);
    expect(sg.gates.length).toBeGreaterThanOrEqual(30);
    for (let i = 1; i < sg.gates.length; i++)
      expect(sg.gates[i].z - sg.gates[i - 1].z).toBeGreaterThanOrEqual(25);
    expect(sg.gates.every(g => g.width >= 6 && g.width <= 12)).toBe(true);
    expect(Math.max(...sg.gates.map(g => g.x))).toBeGreaterThan(10);
    expect(Math.min(...sg.gates.map(g => g.x))).toBeLessThan(-10);
  });

  it("never forces a gate in a World-Cup-style jump takeoff or landing sector", () => {
    // The FIS specifies a general 25m turning-pole minimum; the larger
    // 80m landing buffer is an additional playable course-design choice.
    expect(SUPER_G_LANDING_CLEARANCE).toBeGreaterThanOrEqual(75);
    expect(SUPER_G_MIN_GATE_SPACING).toBeGreaterThanOrEqual(25);
    for (const jump of SUPER_G_ROLLERS) {
      const firstAfter = sg.gates.find(g => g.z > jump.z);
      expect(firstAfter, jump.name).toBeDefined();
      expect(firstAfter!.z - jump.z, jump.name)
        .toBeGreaterThan(SUPER_G_LANDING_CLEARANCE);
      for (const gate of sg.gates)
        expect(
          gate.z < jump.z - SUPER_G_TAKEOFF_CLEARANCE ||
          gate.z > jump.z + SUPER_G_LANDING_CLEARANCE,
          `${jump.name}: unsafe gate ${gate.id} at z=${gate.z.toFixed(1)}`,
        ).toBe(true);
    }
    const gap = sg.gates.slice(1).map((g,i)=>g.z-sg.gates[i].z);
    expect(Math.min(...gap)).toBeGreaterThanOrEqual(SUPER_G_MIN_GATE_SPACING-0.01);
    expect(sg.gates[sg.gates.length-1].z)
      .toBeLessThan(sg.length-100);
  });

  it("creates multiple distinct compressions and crests, not a flat ramp", () => {
    for (const c of SUPER_G_ROLLERS) {
      const apex = superGRelief(c.z);
      const nearby = (superGRelief(c.z - 24) + superGRelief(c.z + 24)) / 2;
      expect(apex).toBeGreaterThan(nearby + 1);
    }
    expect(shouldLaunchAtCrest("SG", 30, -0.025, true)).toBe(true);
    expect(shouldLaunchAtCrest("SL", 30, -0.025, true)).toBe(false);
    expect(shouldLaunchAtCrest("SG", 12, -0.025, true)).toBe(false);
  });

  it("skiers become airborne automatically over a speed-event crest and land", () => {
    const state = { ...initialState(), z: 242, vz: 26 };
    let highest = 0, airborneTicks = 0, landed = false;
    for (let i = 0; i < 1150; i++) {
      const wasAirborne = state.height > 0;
      stepPhysics(state, neutral, EQUIPMENT.SG, sg, FIXED_DT);
      highest = Math.max(highest, state.height);
      if (state.height > 0.01) airborneTicks++;
      if (wasAirborne && state.height === 0) landed = true;
      expect(Number.isFinite(state.x + state.z + state.height)).toBe(true);
      if (state.z > 470) break;
    }
    expect(highest).toBeGreaterThan(0.08);
    expect(airborneTicks).toBeGreaterThan(8);
    expect(landed).toBe(true);
    expect(state.z).toBeGreaterThan(345);
  });

  it("releases the start with two short pushes only for SG", () => {
    expect(startPushAcceleration("SG", 0)).toBeGreaterThan(4);
    expect(startPushAcceleration("SG", 0.58)).toBeGreaterThan(2);
    expect(startPushAcceleration("SG", 2)).toBe(0);
    expect(startPushAcceleration("SL", 0.5)).toBe(0);
  });

  it("does not change slalom physics or timing", () => {
    const state = initialState();
    const race = new Race(COURSES.SL, "SL");
    race.phase = "racing";
    for (let i = 0; i < 180; i++) {
      const prev = { ...state };
      stepPhysics(state, neutral, EQUIPMENT.SL, COURSES.SL, FIXED_DT);
      race.update(prev, state, FIXED_DT, false);
    }
    expect(state.height).toBe(0);
    expect(state.z).toBeGreaterThan(3);
    const frame = replayAt([
      {t: 0,x:0,z:0,heading:0,edge:0,height:0,tuck:0,fallen:0},
      {t: 1,x:1,z:3,heading:0,edge:0,height:0,tuck:0,fallen:0},
    ], 0.5);
    expect(frame?.startPush).toBe(0);
    expect(frame?.finishGesture).toBe(0);
  });
});
