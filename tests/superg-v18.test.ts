import { describe, expect, it } from "vitest";
import { COURSES, courseCenterX, terrainHeight } from "../src/game/course";
import { initialState, stepPhysics, FIXED_DT } from "../src/game/physics";
import { Race, replayAt } from "../src/game/race";
import {
  SUPER_G_CENTRE_KNOTS, superGCenterX, superGGateZ, superGSector,
} from "../src/game/superg";
import { sampleSnowSurface } from "../src/game/surface";
import {
  finishReachAmount, finishBeamFraction, lowHandLead,
} from "../src/game/finish-timing";

describe("V1.8 Super-G winding route, markers and FIS-inspired finish", () => {
  it("sweeps laterally across a real multi-sector mountainside", () => {
    expect(superGCenterX(0)).toBe(0);
    expect(superGCenterX(COURSES.SG.length)).toBe(0);
    expect(superGCenterX(590)).toBeLessThan(-60);
    expect(superGCenterX(970)).toBeGreaterThan(100);
    const xs = Array.from({ length: 212 }, (_, i) => superGCenterX(i * 10));
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(175);
    for (let i = 1; i < xs.length; i++)
      expect(Math.abs(xs[i] - xs[i - 1])).toBeLessThan(12);
    expect(SUPER_G_CENTRE_KNOTS.length).toBeGreaterThan(12);
    expect(superGSector(350)).toBe("glacier");
    expect(superGSector(700)).toBe("canyon");
    expect(superGSector(1250)).toBe("spruce");
    expect(superGSector(1800)).toBe("finish");
  });

  it("varies turning-gate separations, all beyond 25 metres", () => {
    const g = COURSES.SG.gates;
    expect(g.length).toBe(34);
    const distances = g.slice(1).map((gate, i) =>
      Math.hypot(gate.z - g[i].z, gate.x - g[i].x));
    expect(Math.min(...distances)).toBeGreaterThan(25);
    expect(Math.max(...distances) - Math.min(...distances))
      .toBeGreaterThan(20);
    expect(g.every((gate, i) => gate.z === superGGateZ(i))).toBe(true);
    expect(g.every(gate => gate.width >= 6 && gate.width <= 12)).toBe(true);
    expect(g[g.length - 1].z).toBeLessThan(COURSES.SG.length - 100);
  });

  it("shifts snow and terrain shoulder with the winding corridor", () => {
    const sg = COURSES.SG;
    for(const z of [320, 770, 1150, 1530]) {
      const center = courseCenterX(z, sg);
      expect(center).toBeCloseTo(superGCenterX(z), 6);
      expect(sampleSnowSurface(center, z, sg).depth).toBe(0);
      expect(sampleSnowSurface(center + sg.width / 2, z, sg).depth)
        .toBeGreaterThan(0.5);
      const slopeEdge = terrainHeight(center + sg.width / 2, z, sg);
      const highBank = terrainHeight(center + sg.width / 2 + 24, z, sg);
      expect(highBank).toBeGreaterThan(slopeEdge + 4);
    }
  });

  it("recovers inward after safety-net contact instead of freezing at 120 Hz", () => {
    const course = COURSES.SG;
    const state = { ...initialState(),
      z: 360, x: superGCenterX(360) - course.width / 2 - 0.2,
      vx: -7, vz: 22 };
    const control = { steer: 0, tuck: false, brake: false, jump: false };
    stepPhysics(state, control, {
      id:"SG", name:"velocity", length:2.05, radius:36,
      stiffness:.92, grip:1.07, response:3.8, stability:.94,
    }, course, FIXED_DT);
    expect(state.vx).toBeGreaterThan(4);
    expect(state.vz).toBeGreaterThan(6);
    for (let i = 0; i < 130; i++)
      stepPhysics(state, control, {
        id:"SG", name:"velocity", length:2.05, radius:36,
        stiffness:.92, grip:1.07, response:3.8, stability:.94,
      }, course, FIXED_DT);
    expect(state.z).toBeGreaterThan(371);
    expect(Number.isFinite(state.x + state.vx + state.vz)).toBe(true);
  });

  it("reaches downward and forward before the beam but not while falling", () => {
    const end = COURSES.SG.length;
    expect(finishReachAmount("SG", end - 40, end, 35)).toBe(0);
    expect(finishReachAmount("SG", end - 9, end, 35)).toBeGreaterThan(0);
    expect(finishReachAmount("SG", end - 3, end, 35)).toBe(1);
    expect(finishReachAmount("SG", end - 3, end, 5)).toBe(0);
    expect(finishReachAmount("GS", end - 3, end, 35)).toBe(0);
    expect(finishReachAmount("SG", end - 3, end, 35, 1)).toBe(0);
    expect(lowHandLead(1)).toBeCloseTo(0.62);
    expect(finishBeamFraction(COURSES.SG.length - 0.8, COURSES.SG.length - 0.65, 0.62, 0.62, COURSES.SG.length))
      .toBeNull();
    expect(finishBeamFraction(COURSES.SG.length - 0.7, COURSES.SG.length - 0.5, 0.62, 0.62, COURSES.SG.length))
      .toBeCloseTo(0.4, 4);
  });

  it("records the hand interruption earlier than the skier body crossing", () => {
    const sg = COURSES.SG;
    const state = { ...initialState(), z: sg.length - 1.5,
      vz: 24, fallen: 0 };
    const race = new Race(sg, "SG");
    race.phase = "racing";
    const dz = 24 / 120, dt = 1 / 120;
    let beamZ = 0, reachedFinish = false;
    for (let i = 0; i < 30; i++) {
      const prev = { ...state };
      state.z += dz;
      race.update(prev, state, dt, true);
      if (race.finishBeamTriggeredBy && !beamZ) beamZ = state.z;
      if (race.result !== null) {
        reachedFinish = true;
        break;
      }
    }
    expect(beamZ).toBeGreaterThan(sg.length - 1);
    expect(beamZ).toBeLessThan(sg.length);
    expect(race.finishBeamTriggeredBy).toBe("hand");
    expect(reachedFinish).toBe(true);
    expect(race.result?.time).toBeCloseTo(race.finishBeamTime!, 8);
    expect(race.frames.some(f => (f.finishReach ?? 0) > 0.2)).toBe(true);
    const first = race.frames[0];
    const last = race.frames[race.frames.length - 1];
    expect(replayAt([first, last], (first.t + last.t) / 2)?.finishReach)
      .toBeGreaterThan(0.5);
  });
});
