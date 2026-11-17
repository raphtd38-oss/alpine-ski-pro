import { describe, expect, it } from "vitest";
import { estimateRaceLoad } from "../src/render/superg-load-transfer";
import { SuperGCompetitionPose } from "../src/render/superg-carve-kinematics";
import { selectFloodlightStations, CORTINA_LIGHT_STATIONS } from "../src/render/cortina-atmosphere";
import { skiSnowMark, snowPlumeSource } from "../src/game/snow-contact";
import { initialState } from "../src/game/physics";
import { BANNER_CRASH_THRESHOLD } from "../src/game/banner-contact";
import { COURSES } from "../src/game/course";

const baseline = { speedMps: 30, edge: 1, engagement: 0.90,
  pressure: 1.35, skid: 0.05, physicsLoad: .87 };
describe("ultimate Super-G: physically informed, visual-only 25-bone pose", () => {
  it("tracks lateral acceleration, speed, radius and actual ski loading", () => {
    const lowSpeed = estimateRaceLoad({ ...baseline, speedMps: 12 });
    const race = estimateRaceLoad(baseline);
    expect(race.lateralG).toBeGreaterThan(lowSpeed.lateralG);
    expect(race.equilibriumLeanDeg).toBeGreaterThan(lowSpeed.equilibriumLeanDeg);
    expect(race.outsideLoad).toBeGreaterThan(race.insideLoad);
    expect(race.outsideLoad).toBeLessThanOrEqual(0.93);
    expect(race.equivalentRadiusM).toBeGreaterThan(24);
  });
  it("reduces commitment on ice skid without altering 120 Hz physics", () => {
    const carve = estimateRaceLoad(baseline);
    const skid = estimateRaceLoad({ ...baseline, skid: 1 });
    expect(skid.lateralG).toBeLessThan(carve.lateralG);
    expect(skid.gripCommitment).toBeLessThan(carve.gripCommitment);
    expect(skid.outsideLoad).toBeLessThan(carve.outsideLoad);
  });
  it("always produces finite bounded loads for bad legacy replay data", () => {
    const p = estimateRaceLoad({ speedMps: NaN, edge: Infinity,
      engagement: -1, skid: Infinity, pressure: NaN, physicsLoad: NaN });
    expect(Object.values(p).every(Number.isFinite)).toBe(true);
    expect(p.insideLoad + p.outsideLoad).toBeCloseTo(1, 8);
  });
  it("smooths edge changes without cross-wiring the outside ski", () => {
    const pose = new SuperGCompetitionPose();
    let left, right;
    for (let i = 0; i < 85; i++) left = pose.sample({
      t: i / 60, z: i * 0.42, x: 0, heading: .07, edge: .95,
      vx: 3, vz: 29, height: 0, fallen: 0, tuck: .4,
      load: .88, pressure: 1.3, skid: .15,
    }, 1 / 60);
    expect(left!.outsideSide).toBe("L");
    expect(left!.leftFoot.visualLoad).toBeGreaterThan(left!.rightFoot.visualLoad);
    expect(left!.lateralG).toBeGreaterThan(0.1);
    for (let i = 0; i < 120; i++) right = pose.sample({
      t: (85 + i) / 60, z: 35 + i * .4, x: 0, heading: -.06, edge: -.95,
      vx: -3, vz: 29, height: 0, fallen: 0, tuck: .4,
      load: .12, pressure: 1.3, skid: .1,
    }, 1 / 60);
    expect(right!.outsideSide).toBe("R");
    expect(right!.rightFoot.visualLoad).toBeGreaterThan(right!.leftFoot.visualLoad);
    expect(right!.rightFoot.edgeRollDeg).toBeGreaterThan(40);
    expect(right!.leftFoot.edgeRollDeg).toBeGreaterThan(40);
    expect(right!.pelvisShiftM).toBeLessThan(0);
  });
});

describe("physical spotlight safety budget and snow spraying from BOTH outside skis", () => {
  it("selects the closest stations with strict light budget", () => {
    expect(CORTINA_LIGHT_STATIONS).toHaveLength(15);
    for (const budget of [0, 1, 2, 3, 4]) {
      const positions = selectFloodlightStations(780, budget);
      expect(positions.length).toBeLessThanOrEqual(budget);
      expect(new Set(positions).size).toBe(positions.length);
      expect(positions.every(i => i >= 0 && i < 15)).toBe(true);
    }
    expect(selectFloodlightStations(99999, 4)).toEqual([]);
    expect(selectFloodlightStations(780, 1)).toEqual([5]);
  });
  it("reverses snow load correctly: the outside ski sprays harder in both turns", () => {
    const s = initialState();
    s.edge = -.95;
    s.load = .13;
    s.pressure = 1.5;
    s.skid = .4;
    const right = skiSnowMark(s, 1);
    const left = skiSnowMark(s, -1);
    expect(right.outside).toBe(true);
    expect(right.load).toBeGreaterThan(left.load);
    expect(right.ridgeHeightM).toBeGreaterThan(left.ridgeHeightM);
    const outside = snowPlumeSource(s, 1, 30, 0.5);
    const inside = snowPlumeSource(s, 5, 30, 0.5);
    expect(outside.skiSide).toBe(1);
    expect(inside.skiSide).toBe(-1);
    expect(outside.strength).toBeGreaterThan(inside.strength);
  });
  it("does not change the established banner crash rule or number of course gates", () => {
    expect(BANNER_CRASH_THRESHOLD).toBe(0.45);
    expect(COURSES.SG.gates).toHaveLength(34);
  });
});
