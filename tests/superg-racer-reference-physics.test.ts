import { describe, expect, it } from "vitest";
import { steeringFromDirections } from "../src/game/input";
import { FIXED_DT, initialState, stepPhysics } from "../src/game/physics";
import { COURSES, EQUIPMENT } from "../src/game/course";
import { SuperGCompetitionPose } from "../src/render/superg-carve-kinematics";
import { estimateRaceLoad } from "../src/render/superg-load-transfer";
import { replayAt } from "../src/game/race";
import type { Controls, Frame } from "../src/game/types";

const gear = EQUIPMENT.SG;
const course = COURSES.SG;
const controls = (steer: number): Controls =>
  ({ steer, tuck: true, brake: false, jump: false });

describe("reference-based World Cup ski physics and 25-bone posture", () => {
  it("uses the same left/right sign for keyboard, touch, gamepad and world X", () => {
    expect(steeringFromDirections(true, false)).toBe(-1);
    expect(steeringFromDirections(false, true)).toBe(1);
    expect(steeringFromDirections(true, true)).toBe(0);
    expect(steeringFromDirections(false, false)).toBe(0);
  });

  it("turns into a held edge without endless synthetic skidding", () => {
    const right = { ...initialState(), vz: 27 };
    const left = { ...initialState(), vz: 27 };
    for (let i = 0; i < 72; i++) {
      stepPhysics(right, controls(0.85), gear, course, FIXED_DT);
      stepPhysics(left, controls(-0.85), gear, course, FIXED_DT);
    }
    expect(right.edge).toBeGreaterThan(0.55);
    expect(left.edge).toBeLessThan(-0.55);
    expect(right.vx).toBeGreaterThan(0);
    expect(left.vx).toBeLessThan(0);
    expect(right.lateralAcceleration).toBeGreaterThan(3);
    expect(left.lateralAcceleration).toBeLessThan(-3);
    expect(right.skid).toBeLessThan(0.65);
    expect(left.skid).toBeLessThan(0.65);
    expect(right.balance).toBeGreaterThan(0.3);
    expect(left.balance).toBeGreaterThan(0.3);
  });

  it("tracks actual contact force instead of guessing a radius from pose", () => {
    const baseline = {
      speedMps: 30, edge: 0.9, engagement: 0.9,
      pressure: 1.2, skid: 0.04, physicsLoad: 0.85,
    };
    const flat = estimateRaceLoad({ ...baseline, lateralAccelerationMps2: 0 });
    const loaded = estimateRaceLoad({
      ...baseline, lateralAccelerationMps2: 15,
    });
    expect(flat.lateralG).toBe(0);
    expect(loaded.lateralG).toBeGreaterThan(1.3);
    expect(loaded.equilibriumLeanDeg).toBeGreaterThan(50);
    expect(loaded.equivalentRadiusM).toBeLessThan(flat.equivalentRadiusM);
  });

  it("creates a noticeably deep real-race silhouette on both carves", () => {
    const sample = (sign: number) => {
      const k = new SuperGCompetitionPose();
      let pose = k.sample({
        t: 0, x: 0, z: 0, heading: 0, edge: 0,
        height: 0, tuck: 0, fallen: 0,
      }, 0);
      for (let i = 1; i <= 90; i++) {
        const frame: Frame = {
          t: i / 60, x: sign * i * 0.11, z: i * 0.48,
          vx: sign * 6.6, vz: 28.8, heading: sign * 0.24,
          edge: sign * 0.94, lateralAcceleration: sign * 17,
          load: sign > 0 ? 0.89 : 0.11, skid: 0.04, flex: 0.7,
          pressure: 1.28, height: 0, tuck: 0.45,
          fallen: 0, startPhase: 12,
        };
        pose = k.sample(frame, 1 / 60);
      }
      return pose;
    };
    const right = sample(1), left = sample(-1);
    expect(right.bankDeg).toBeLessThan(-43);
    expect(left.bankDeg).toBeGreaterThan(43);
    expect(right.pelvisHeightM).toBeLessThan(0.76);
    expect(left.pelvisHeightM).toBeLessThan(0.76);
    expect(right.leftFoot.edgeRollDeg).toBeGreaterThan(52);
    expect(left.rightFoot.edgeRollDeg).toBeLessThan(-52);
    expect(right.outsideSide).toBe("R");
    expect(left.outsideSide).toBe("L");
  });

  it("interpolates real forces in new replay frames and accepts legacy frames", () => {
    const base: Frame = {
      t: 0, x: 0, z: 0, heading: 0, edge: 0, height: 0,
      tuck: 1, fallen: 0, lateralAcceleration: 0,
      vx: 0, vz: 20,
    };
    const middle = replayAt([base, {
      ...base, t: 1, x: 6, z: 24,
      lateralAcceleration: 14, vx: 12, vz: 30,
    }], 0.5);
    expect(middle?.lateralAcceleration).toBeCloseTo(7);
    expect(middle?.vx).toBeCloseTo(6);
    const old = replayAt([
      { ...base, lateralAcceleration: undefined },
      { ...base, t: 1, lateralAcceleration: undefined },
    ], 0.5);
    expect(old?.lateralAcceleration).toBeUndefined();
  });
});
