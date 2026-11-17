import { describe, expect, it } from "vitest";
import { edgeBite, nextSkid, tiltGripFactor } from "../src/game/carving";
import { cameraShake, speedFov } from "../src/game/camera-rig";
import { sampleSnowSurface } from "../src/game/surface";
import { classifySnow, snowLabel } from "../src/game/snow-model";
import { computeSkiSoundMix } from "../src/game/audio-mix";
import { poleImpactMix } from "../src/game/pole-sound";
import { FIXED_DT, initialState, stepPhysics } from "../src/game/physics";
import { COURSES, EQUIPMENT } from "../src/game/course";
import { PoleSimulation, tipVibration } from "../src/game/poles";
import { replayAt } from "../src/game/race";
import type { Controls, Frame } from "../src/game/types";

const neutral: Controls = { steer: 0, tuck: false, brake: false, jump: false };

describe("V1.6 — supplied best-of mechanics", () => {
  it("progressively bites without making flat skis uncontrollable", () => {
    expect(edgeBite(0)).toBe(0);
    expect(edgeBite(-0.45)).toBeCloseTo(edgeBite(0.45));
    expect(edgeBite(0.45)).toBeGreaterThan(edgeBite(0.16));
    expect(tiltGripFactor(0)).toBeGreaterThanOrEqual(0.9);
    expect(tiltGripFactor(0.9)).toBe(1);
  });

  it("skid hysteresis keeps a released edge sliding until the turn relaxes", () => {
    let skid = 0;
    for (let i = 0; i < 150; i++) skid = nextSkid(skid, 13, 10, FIXED_DT);
    expect(skid).toBeGreaterThan(0.9);
    const held = nextSkid(skid, 9.4, 10, FIXED_DT);
    expect(held).toBeCloseTo(skid);
    for (let i = 0; i < 240; i++) skid = nextSkid(skid, 5, 10, FIXED_DT);
    expect(skid).toBeLessThan(0.05);
  });

  it("models safe changes in pressure over terrain", () => {
    const s = { ...initialState(), vz: 23 };
    let lowest = 2, highest = 0;
    for (let i = 0; i < 600; i++) {
      stepPhysics(s, neutral, EQUIPMENT.SG, COURSES.SG, FIXED_DT);
      lowest = Math.min(lowest, s.pressure);
      highest = Math.max(highest, s.pressure);
      expect(Number.isFinite(s.pressure + s.skid + s.x)).toBe(true);
    }
    expect(lowest).toBeGreaterThanOrEqual(0.6);
    expect(highest).toBeLessThanOrEqual(1.5);
    expect(highest - lowest).toBeGreaterThan(0.02);
  });

  it("piste shoulders collect powder; extra snow causes greater drag", () => {
    const course = COURSES.SG;
    const mid = sampleSnowSurface(0, 90, course, "clear");
    const edge = sampleSnowSurface(course.width / 2 - 1, 90, course, "clear");
    expect(mid.depth).toBe(0);
    expect(edge.depth).toBeGreaterThan(0.5);
    expect(classifySnow(edge)).toBe("powder");
    expect(snowLabel(edge)).toBe("POUDREUSE");
    expect(sampleSnowSurface(0, 90, course, "snow").depth).toBeGreaterThan(0);
    const slide = (depth: number) => {
      const s = { ...initialState(), vz: 18 };
      for (let i = 0; i < 220; i++) {
        stepPhysics(s, { ...neutral, steer: 0.2 }, EQUIPMENT.SG,
          COURSES.SG, FIXED_DT, 1, 0, depth);
      }
      return Math.hypot(s.vx, s.vz);
    };
    expect(slide(0.8)).toBeLessThan(slide(0));
  });

  it("camera FOV responds to speed but stays bounded", () => {
    expect(speedFov(58, 0)).toBe(58);
    expect(speedFov(58, 30)).toBeGreaterThan(speedFov(58, 10));
    expect(speedFov(58, 1e9)).toBeLessThan(69.1);
    expect(cameraShake(0, 1, 30, 1).x).toBe(0);
    expect(Math.abs(cameraShake(1, 1, 70, 0.5).x)).toBeLessThan(0.02);
  });

  it("mixes hardpack chatter and powder while retaining existing wind", () => {
    const baseline = computeSkiSoundMix(25, 0.7, 0, true, 0.9);
    const rich = computeSkiSoundMix(25, 0.7, 0, true, 0.9,
      { chatter: 1, skid: 0.5, depth: 0.9 });
    expect(baseline.rattle).toBe(0);
    expect(baseline.powder).toBe(0);
    expect(rich.rattle).toBeGreaterThan(0);
    expect(rich.powder).toBeGreaterThan(0);
    expect(rich.wind).toBe(baseline.wind);
  });

  it("separates shin guard impacts from glancing arm strikes", () => {
    const c = { ...COURSES.SG, gates: [{ id: 0, x: 0, z: 10, width: 7 }] };
    const strike = (x: number) => {
      const poles = new PoleSimulation(c);
      const before = { ...initialState(), x, z: 9, vz: 18 };
      const s = { ...before, z: 11 };
      poles.update(before, s, FIXED_DT);
      return { poles, s };
    };
    const direct = strike(3.5), glance = strike(3.18);
    expect(direct.poles.lastImpactKind).toBe("shin");
    expect(glance.poles.lastImpactKind).toBe("arm");
    expect(direct.s.vz).toBeLessThan(glance.s.vz);
    expect(direct.poles.poles[1].tipAmp).toBeGreaterThan(0);
    const first = direct.poles.poles[1].tipAmp;
    const away = { ...direct.s, z: 40 };
    for (let i = 0; i < 120; i++)
      direct.poles.update(away, away, FIXED_DT);
    expect(direct.poles.poles[1].tipAmp).toBeLessThan(first * 0.01);
    expect(Number.isFinite(tipVibration(direct.poles.poles[1]))).toBe(true);
    expect(poleImpactMix(20, false, "shin").body)
      .toBeGreaterThan(poleImpactMix(20, false, "arm").body);
  });

  it("new replay channels interpolate and old save frames still load", () => {
    const base: Frame = {
      t: 0, x: 0, z: 0, heading: 0, edge: 0, height: 0, tuck: 0, fallen: 0,
    };
    const old = replayAt([base, { ...base, t: 1, z: 10 }], 0.5);
    expect(old?.pressure).toBe(1);
    expect(old?.skid).toBe(0);
    const updated = replayAt(
      [{ ...base, pressure: 1, skid: 0 },
       { ...base, t: 1, pressure: 1.4, skid: 1 }], 0.5);
    expect(updated?.pressure).toBeCloseTo(1.2);
    expect(updated?.skid).toBeCloseTo(0.5);
  });
});
