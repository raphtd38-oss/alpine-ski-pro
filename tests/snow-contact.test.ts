import { describe, expect, it } from "vitest";
import { initialState } from "../src/game/physics";
import {
  skiSnowMark, snowPlumeSource, crashSnowEnergy,
} from "../src/game/snow-contact";
import { SuperGCompetitionPose } from "../src/render/superg-carve-kinematics";

describe("competition ski-to-snow contact", () => {
  const initial = initialState();
  it("leaves two distinct grooves; outside ski displaces more snow", () => {
    const state = { ...initial, edge: .95, load: .85, pressure: 1.3,
      skid: .2, height: 0 };
    const outside = skiSnowMark(state, -1);
    const inside = skiSnowMark(state, 1);
    expect(outside.visible).toBe(true);
    expect(inside.visible).toBe(true);
    expect(outside.load).toBeGreaterThan(inside.load);
    expect(outside.halfWidthM).toBeGreaterThan(inside.halfWidthM);
    expect(outside.ridgeHeightM).toBeGreaterThan(inside.ridgeHeightM);
    expect(outside.ridgeOffsetM).toBeLessThan(0);
    expect(inside.ridgeOffsetM).toBeGreaterThan(0);
  });
  it("snow marks disappear airborne, remain bounded under hard skidding", () => {
    const base = { ...initial, edge: 1.1, load: 1, pressure: 1.7,
      skid: 1, height: .3 };
    expect(skiSnowMark(base, -1).visible).toBe(false);
    const grounded = skiSnowMark({ ...base, height: 0 }, -1);
    expect(grounded.halfWidthM).toBeLessThanOrEqual(.063);
    expect(grounded.ridgeHalfWidthM).toBeLessThanOrEqual(.033);
  });
  it("outer- and inner-ski plumes originate at different boot locations", () => {
    const state = { ...initial, edge: 1, load: .84, pressure: 1.2,
      skid: .1, height: 0 };
    const outside = snowPlumeSource(state, 1, 26, .6);
    const inside = snowPlumeSource(state, 5, 26, .6);
    expect(outside.skiSide).toBe(-1);
    expect(inside.skiSide).toBe(1);
    expect(outside.strength).toBeGreaterThan(inside.strength);
    expect(outside.xOffsetM).toBeLessThan(0);
    expect(inside.xOffsetM).toBeGreaterThan(0);
  });
  it("fall creates a temporary snow cloud with smooth decay", () => {
    expect(crashSnowEnergy(-1)).toBe(0);
    expect(crashSnowEnergy(0)).toBeGreaterThan(1.5);
    expect(crashSnowEnergy(.7)).toBeGreaterThan(crashSnowEnergy(1.4));
    expect(crashSnowEnergy(2.2)).toBe(0);
  });
  it("both skis remain aligned with direction of travel, inside tip slightly freer", () => {
    const poser = new SuperGCompetitionPose();
    let pose;
    for (let i = 0; i <= 70; i++) {
      pose = poser.sample({
        t:i/60, x:0, z:i*0.35, heading:.2, edge:.95,
        vx:6.7, vz:25, height:0, tuck:.45, fallen:0, skid:.3,
        pressure:1.25, load:.8, startPhase:9,
      },1/60);
    }
    expect(pose!.rightFoot.outside).toBe(true);
    expect(pose!.rightFoot.visualLoad).toBeGreaterThan(pose!.leftFoot.visualLoad);
    expect(Math.abs(pose!.leftFoot.yawOffsetDeg)).toBeLessThanOrEqual(6);
    expect(Math.abs(pose!.rightFoot.yawOffsetDeg)).toBeLessThanOrEqual(6);
    expect(pose!.leftFoot.foreAftM).toBeLessThan(0);
    expect(pose!.leftFoot.releaseLiftM).toBeGreaterThanOrEqual(0);
  });
});
