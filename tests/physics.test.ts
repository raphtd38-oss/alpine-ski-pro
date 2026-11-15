import { describe, it, expect } from "vitest";
import {
  FIXED_DT,
  FixedClock,
  initialState,
  stepPhysics,
} from "../src/game/physics";
import { COURSES, EQUIPMENT } from "../src/game/course";
import { Race, replayAt } from "../src/game/race";
import { clamp, type Controls } from "../src/game/types";
const neutral: Controls = { steer: 0, tuck: false, brake: false, jump: false };
function run(control: Controls, seconds = 12, e = EQUIPMENT.SL) {
  const s = initialState();
  for (let i = 0; i < seconds / FIXED_DT; i++)
    stepPhysics(s, control, e, COURSES.SL, FIXED_DT);
  return s;
}
describe("fixed-step ski simulation", () => {
  it("accelerates downhill and conserves finite state", () => {
    const s = run(neutral);
    expect(s.z).toBeGreaterThan(100);
    expect(s.vz).toBeGreaterThan(10);
    expect(Number.isFinite(s.vx + s.z + s.balance)).toBe(true);
  });
  it("is identical at 30, 60 and 144 render FPS", () => {
    const states = [30, 60, 144].map((fps) => {
      const s = initialState(),
        clock = new FixedClock();
      for (let f = 0; f < fps * 10; f++)
        clock.advance(1 / fps, (dt) =>
          stepPhysics(s, neutral, EQUIPMENT.SL, COURSES.SL, dt),
        );
      return s;
    });
    for (const s of states) {
      expect(s.z).toBeCloseTo(states[0].z, 8);
      expect(s.vz).toBeCloseTo(states[0].vz, 8);
    }
  });
  it("braking dissipates energy and tuck reduces drag", () => {
    expect(run({ ...neutral, brake: true }).vz).toBeLessThan(
      run(neutral).vz * 0.65,
    );
    expect(run({ ...neutral, tuck: true }).vz).toBeGreaterThan(run(neutral).vz);
  });
  it("edge transition is progressive; steering cannot snap momentum", () => {
    const s = run(neutral, 5),
      vx = s.vx;
    stepPhysics(
      s,
      { ...neutral, steer: 1 },
      EQUIPMENT.SL,
      COURSES.SL,
      FIXED_DT,
    );
    expect(s.edge).toBeGreaterThan(0);
    expect(s.edge).toBeLessThan(0.1);
    expect(Math.abs(s.vx - vx)).toBeLessThan(0.3);
  });
  it("short-radius skis generate a tighter turn than downhill skis", () => {
    const a = run(neutral, 5),
      b = { ...a };
    for (let i = 0; i < 120; i++) {
      stepPhysics(
        a,
        { ...neutral, steer: 0.4 },
        EQUIPMENT.SL,
        COURSES.SL,
        FIXED_DT,
      );
      stepPhysics(
        b,
        { ...neutral, steer: 0.4 },
        EQUIPMENT.DH,
        COURSES.SL,
        FIXED_DT,
      );
    }
    expect(a.x).toBeGreaterThan(b.x + 0.5);
  });
  it("jump lands and does not retrigger while held", () => {
    const s = run(neutral, 3);
    for (let i = 0; i < 20; i++)
      stepPhysics(
        s,
        { ...neutral, jump: true },
        EQUIPMENT.SL,
        COURSES.SL,
        FIXED_DT,
      );
    expect(s.height).toBeGreaterThan(0);
    for (let i = 0; i < 180; i++)
      stepPhysics(
        s,
        { ...neutral, jump: true },
        EQUIPMENT.SL,
        COURSES.SL,
        FIXED_DT,
      );
    expect(s.height).toBe(0);
  });
  it("safety-net collision keeps the skier on the piste", () => {
    const s = initialState();
    s.x = 14;
    s.vx = 30;
    stepPhysics(s, neutral, EQUIPMENT.SL, COURSES.SL, 0.05);
    expect(s.x).toBeLessThanOrEqual(14.3);
    expect(s.fallen).toBeGreaterThan(0);
  });
});
describe("race rules", () => {
  it("checks interpolated crossings, not the position after a long step", () => {
    const c = { ...COURSES.SL, gates: [{ id: 0, x: 0, z: 10, width: 3 }] };
    const r = new Race(c, "SL");
    r.phase = "racing";
    const a = { ...initialState(), x: -5, z: 5 },
      b = { ...a, x: 5, z: 15 };
    r.update(a, b, 1, false);
    expect(r.gateStatus).toEqual(["passed"]);
  });
  it("rejects a missed gate and never records a valid result", () => {
    const c = {
      ...COURSES.SL,
      length: 12,
      gates: [{ id: 0, x: 6, z: 10, width: 3 }],
    };
    const r = new Race(c, "SL");
    r.phase = "racing";
    r.update(
      { ...initialState(), z: 3 },
      { ...initialState(), z: 15 },
      1,
      false,
    );
    expect(r.result?.valid).toBe(false);
    expect(r.result?.missed).toBe(1);
    expect(r.time).toBeCloseTo(0.75);
  });
  it("replays interpolate between recorded samples", () => {
    const a = {
        t: 0,
        x: 0,
        z: 0,
        heading: 0,
        edge: 0,
        height: 0,
        tuck: 0,
        fallen: 0,
      },
      b = { ...a, t: 1, x: 4, z: 12 };
    expect(replayAt([a, b], 0.5)?.x).toBe(2);
    expect(replayAt([], 3)).toBeNull();
  });
  it("a full SL course can be completed with steering and braking inputs only", () => {
    const s = initialState(),
      c = COURSES.SL,
      r = new Race(c, "SL");
    r.phase = "racing";
    for (let i = 0; i < 120 * 150 && r.phase === "racing"; i++) {
      const gate = c.gates[r.nextGate];
      const target = gate ?? { x: 0, z: c.length + 10 };
      const dz = Math.max(6, target.z - s.z);
      const desired = Math.atan2(target.x - s.x, dz);
      const steer = clamp((desired - s.heading) * 3.0, -0.9, 0.9);
      const control = { ...neutral, steer, brake: s.vz > 12 };
      const prev = { ...s };
      stepPhysics(s, control, EQUIPMENT.SL, c, FIXED_DT);
      r.update(prev, s, FIXED_DT, false);
    }
    expect(r.phase).toBe("finished");
    expect(r.missed).toBe(0);
    expect(r.result?.valid).toBe(true);
    expect(r.frames.length).toBeGreaterThan(600);
  });
});
