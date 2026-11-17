import { describe, it, expect } from "vitest";
import { FIXED_DT, FixedClock, initialState, stepPhysics } from "../src/game/physics";
import { COURSES, EQUIPMENT, courseCenterX } from "../src/game/course";
import { Race, replayAt, formatTime } from "../src/game/race";
import { startPushAcceleration } from "../src/game/start-gate";
import { clamp, type Controls } from "../src/game/types";

const sg = COURSES.SG;
const gear = EQUIPMENT.SG;
const neutral: Controls = { steer: 0, tuck: false, brake: false, jump: false };

function simulate(control: Controls, seconds = 12) {
  const state = initialState();
  for (let i = 0; i < seconds / FIXED_DT; i++) {
    stepPhysics(state, control, gear, sg, FIXED_DT);
  }
  return state;
}

describe("Super-G-only 120Hz simulation", () => {
  it("has one live race with the original 34 gates and speed equipment", () => {
    expect(Object.keys(COURSES)).toEqual(["SG"]);
    expect(Object.keys(EQUIPMENT)).toEqual(["SG"]);
    expect(sg.gates).toHaveLength(34);
    expect(sg.length).toBe(1980);
    expect(gear.length).toBeGreaterThan(2);
  });

  it("accelerates down the slope without non-finite state", () => {
    const s = simulate(neutral);
    expect(s.z).toBeGreaterThan(90);
    expect(s.vz).toBeGreaterThan(10);
    expect(Number.isFinite(s.x + s.z + s.balance)).toBe(true);
  });

  it("is deterministic at 30, 60 and 144 rendering FPS", () => {
    const states = [30, 60, 144].map(fps => {
      const s = initialState(), clock = new FixedClock();
      for (let frame = 0; frame < fps * 10; frame++)
        clock.advance(1 / fps, dt => stepPhysics(s, neutral, gear, sg, dt));
      return s;
    });
    for (const s of states) {
      expect(s.z).toBeCloseTo(states[0].z, 7);
      expect(s.vz).toBeCloseTo(states[0].vz, 7);
    }
  });

  it("braking dissipates speed and tuck reduces aerodynamic drag", () => {
    expect(simulate({ ...neutral, brake: true }).vz)
      .toBeLessThan(simulate(neutral).vz * 0.75);
    expect(simulate({ ...neutral, tuck: true }).vz)
      .toBeGreaterThan(simulate(neutral).vz);
  });

  it("rolls onto an edge progressively without teleporting", () => {
    const s = simulate(neutral, 5);
    const vx = s.vx;
    stepPhysics(s, { ...neutral, steer: 1 }, gear, sg, FIXED_DT);
    expect(s.edge).toBeGreaterThan(0);
    expect(s.edge).toBeLessThan(0.1);
    expect(Math.abs(s.vx - vx)).toBeLessThan(0.3);
  });

  it("progressively loads the outside ski and lets it relax", () => {
    const s = { ...initialState(), vz: 18 };
    for (let i=0; i<90; i++)
      stepPhysics(s, { ...neutral, steer: 0.55 }, gear, sg, FIXED_DT);
    expect(s.load).toBeGreaterThan(0.6);
    const loaded = s.load;
    for (let i=0; i<190; i++)
      stepPhysics(s, neutral, gear, sg, FIXED_DT);
    expect(Math.abs(s.load - 0.5)).toBeLessThan(Math.abs(loaded - 0.5));
  });

  it("recovers safely from contact with a Super-G safety net", () => {
    const s = { ...initialState(), x: sg.width / 2 - 0.6, vx: 30, vz: 20 };
    stepPhysics(s, neutral, gear, sg, 0.05);
    const centre = courseCenterX(s.z, sg);
    expect(Math.abs(s.x - centre)).toBeLessThan(sg.width / 2);
    expect(s.vx).toBeLessThan(0);
    expect(s.fallen).toBeGreaterThan(0);
  });

  it("preserves gate crossing interpolation and disqualification", () => {
    const c = { ...sg, gates: [{ id: 0, x: 0, z: 10, width: 3 }], length: 12 };
    const valid = new Race(c, "SG");
    valid.phase = "racing";
    valid.update({ ...initialState(), x: -5, z: 5 },
      { ...initialState(), x: 5, z: 15 }, 1, false);
    expect(valid.gateStatus).toEqual(["passed"]);
    const missed = new Race(c, "SG");
    missed.phase = "racing";
    missed.update({ ...initialState(), x: 5, z: 5 },
      { ...initialState(), x: 5, z: 15 }, 1, false);
    expect(missed.result?.valid).toBe(false);
    expect(missed.missed).toBe(1);
  });

  it("can complete the existing Super-G race on fixed physics steps", () => {
    const s=initialState(), race=new Race(sg, "SG");
    race.phase="racing";
    for (let i=0; i<28000 && race.phase==="racing"; i++) {
      const next=sg.gates[race.nextGate] ?? { x: 0, z: sg.length };
      const heading=Math.atan2(next.x-s.x,Math.max(24,next.z-s.z));
      const steer=clamp((heading-s.heading)*2.5,-0.95,0.95);
      const prev={...s};
      stepPhysics(s, {...neutral, steer, brake:s.vz>30}, gear, sg, FIXED_DT);
      s.vz += startPushAcceleration("SG",i*FIXED_DT)*FIXED_DT;
      race.update(prev,s,FIXED_DT,false);
    }
    expect(race.phase).toBe("finished");
    expect(race.nextGate).toBe(34);
    expect(race.frames.length).toBeGreaterThan(200);
  });

  it("keeps SG replays and precise hundredths formatting", () => {
    const a={t:0,x:0,z:0,heading:0,edge:0,height:0,tuck:0,fallen:0};
    expect(replayAt([a,{...a,t:1,z:12,x:4}],0.5)?.x).toBe(2);
    expect(replayAt([],3)).toBeNull();
    expect(formatTime(60.018)).toBe("01:00.01");
  });
});
