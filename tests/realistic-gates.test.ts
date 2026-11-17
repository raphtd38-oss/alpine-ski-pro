import { describe, expect, it } from "vitest";
import { COURSES } from "../src/game/course";
import { initialState } from "../src/game/physics";
import { PoleSimulation } from "../src/game/poles";
import { Race } from "../src/game/race";

const gate = { id: 0, x: 0, z: 10, width: 7.6 };
const course = { ...COURSES.SG, length: 100, gates: [gate] };
const DT = 1 / 120;
const target = gate.width / 2;

describe("Super-G elastic gate pairs", () => {
  it("keeps 2 physical pole pairs per gate", () => {
    const p = new PoleSimulation(course);
    expect(p.poles).toHaveLength(2);
    expect(p.poles[0].partnerAngleX).toBe(0);
    expect(p.poles[1].partnerAngleX).toBe(0);
  });

  it("bends the struck pole then transmits a delayed, damped deflection", () => {
    const simulation = new PoleSimulation(course);
    const before = { ...initialState(), x: target, z: 9, vz: 23 };
    const after = { ...before, z: 11 };
    simulation.update(before, after, DT);
    expect(simulation.lastImpacts).toBe(1);
    expect(simulation.poles[1].omegaX).toBeGreaterThan(0);
    const partnerInitial = Math.abs(simulation.poles[1].partnerAngleX);
    const farAway = { ...after, z: 40, vx: 0, vz: 0 };
    let partnerMaximum = partnerInitial;
    for (let i = 0; i < 50; i++) {
      simulation.update(farAway, farAway, DT);
      partnerMaximum = Math.max(partnerMaximum,
        Math.abs(simulation.poles[1].partnerAngleX));
    }
    expect(partnerMaximum).toBeGreaterThan(partnerInitial + 0.001);
    expect(simulation.poles[1].clothEnergy).toBeLessThan(1);
  });

  it("recovers to the upright rest state", () => {
    const sim = new PoleSimulation(course);
    const before = { ...initialState(), x: target, z: 9, vz: 21 };
    const after = { ...before, z: 11 };
    sim.update(before, after, DT);
    const away = { ...after, z: 45, vx: 0, vz: 0 };
    for (let i = 0; i < 120 * 6; i++) sim.update(away, away, DT);
    expect(Math.abs(sim.poles[1].angleX)).toBeLessThan(0.001);
    expect(Math.abs(sim.poles[1].partnerAngleX)).toBeLessThan(0.001);
  });

  it("lets a skier pass through the open corridor without wall collision", () => {
    const sim = new PoleSimulation(course);
    const race = new Race(course, "SG");
    race.phase = "racing";
    const before = { ...initialState(), x: 0, z: 9, vz: 27 };
    const after = { ...before, z: 11 };
    sim.update(before, after, DT);
    race.update(before, after, DT, false);
    expect(sim.lastImpacts).toBe(0);
    expect(race.gateStatus).toEqual(["passed"]);
  });

  it("counts a pole brush without treating the entire fanion as a wall", () => {
    const sim = new PoleSimulation(course);
    const race = new Race(course, "SG");
    race.phase = "racing";
    const before = { ...initialState(), x: target - 0.26, z: 9, vz: 20 };
    const after = { ...before, z: 11 };
    sim.update(before, after, DT);
    race.update(before, after, DT, false);
    expect(sim.lastImpacts).toBe(1);
    expect(race.gateStatus).toEqual(["passed"]);
  });
  it("responds visibly to a near arm brush without blocking the corridor", () => {
    const sim = new PoleSimulation(course);
    // 0.69m from the pole: a real racer can still hit with a forearm/guard.
    const before = { ...initialState(), x: target - 0.69, z: 9, vz: 28 };
    const after = { ...before, z: 11 };
    sim.update(before, after, DT);
    expect(sim.lastImpacts).toBe(1);
    expect(sim.poles[1].tipAmp).toBeGreaterThan(0.015);
    expect(sim.poles[1].clothEnergy).toBeGreaterThan(0.20);
    const away = { ...after, z: 40, vx: 0, vz: 0 };
    let peak = 0;
    for (let i = 0; i < 25; i++) {
      sim.update(away, away, DT);
      peak = Math.max(peak, Math.abs(sim.poles[1].angleX));
    }
    expect(peak).toBeGreaterThan(0.12);
  });

  it("never bends the poles when skier stays in the center of the opening", () => {
    const sim = new PoleSimulation(course);
    const before = { ...initialState(), x: 0, z: 9, vz: 26 };
    const after = { ...before, z: 11 };
    sim.update(before, after, DT);
    expect(sim.lastImpacts).toBe(0);
    expect(sim.poles.every(p => p.angleX === 0 && p.partnerAngleX === 0)).toBe(true);
  });

});