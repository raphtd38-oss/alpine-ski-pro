import { describe, expect, it } from "vitest";
import { Race } from "../src/game/race";
import { COURSES } from "../src/game/course";
import { initialState } from "../src/game/physics";
import {
  ALPINE_START_GATE, startGateAngle, startGateImpulseFraction,
  startPoleContact, startPushAcceleration, startDriveBlend,
} from "../src/game/start-gate";

describe("V1.11 FIS-style Super-G start mechanism", () => {
  it("uses exactly one dimensionally plausible lower-leg wand", () => {
    expect(ALPINE_START_GATE.wandLength).toBeGreaterThanOrEqual(0.5);
    expect(ALPINE_START_GATE.wandLength).toBeLessThanOrEqual(0.8);
    expect(ALPINE_START_GATE.height).toBeGreaterThanOrEqual(0.35);
    expect(ALPINE_START_GATE.height).toBeLessThanOrEqual(0.5);
    expect(ALPINE_START_GATE.triggerAngle).toBeGreaterThanOrEqual(10);
    expect(ALPINE_START_GATE.triggerAngle).toBeLessThanOrEqual(30);
  });
  it("only starts the time at a crossing of the actual 20-degree gate", () => {
    const threshold = ALPINE_START_GATE.contactBeginZ +
      ALPINE_START_GATE.triggerAngle / ALPINE_START_GATE.degreesPerMetre;
    expect(startGateAngle("SG", threshold)).toBeCloseTo(20);
    expect(startGateImpulseFraction("SG", threshold - .1, threshold + .1))
      .toBeCloseTo(.5);
    expect(startGateImpulseFraction("SG", threshold - .1, threshold + .1, 2, 2))
      .toBeNull();
    expect(startGateImpulseFraction("GS", threshold - .1, threshold + .1))
      .toBeNull();
    expect(startGateImpulseFraction("SG", threshold + .1, threshold + .2))
      .toBeNull();
    expect(startGateAngle("SG", 5.8)).toBe(ALPINE_START_GATE.maximumAngle);
  });
  it("counts SG time from the mechanical impulse, not GO", () => {
    const race = new Race(COURSES.SG, "SG");
    race.start();
    race.phase = "racing";
    const prev = { ...initialState(), z: 4.00 };
    const next = { ...initialState(), z: 4.16, vz: 6 };
    const dt = 1 / 120;
    race.launchTime = 0.65;
    race.update(prev, next, dt, false);
    expect(race.time).toBe(0);
    race.openStartGate(0.25, dt);
    race.update(prev, next, dt, false);
    expect(race.startGateOpened).toBe(true);
    expect(race.startGateImpulseTime).toBeCloseTo(0.65 - dt * 0.75, 8);
    expect(race.time).toBeCloseTo(dt * 0.75, 8);
    const slalom = new Race(COURSES.SL, "SL");
    slalom.start();
    expect(slalom.startGateOpened).toBe(true);
  });
  it("synchronizes the acceleration with three actual snow contacts", () => {
    for (const t of [0.10, 0.53, 0.98]) {
      expect(startPoleContact("SG", t)).toBeGreaterThan(.99);
      expect(startPushAcceleration("SG", t)).toBeGreaterThan(3);
    }
    expect(startPushAcceleration("SG", 2)).toBe(0);
    expect(startPoleContact("SL", 0.53)).toBe(0);
    expect(startDriveBlend("SG", -1)).toBeGreaterThan(0);
    expect(startDriveBlend("SG", 1.7)).toBe(0);
  });
});