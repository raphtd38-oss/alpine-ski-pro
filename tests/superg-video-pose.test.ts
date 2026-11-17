import { describe, expect, it } from "vitest";
import {
  superGEdgePose, superGStartBrace, superGLegIK,
  superGSkiFootLift, superGFinishGesture, superGRacerBank,
} from "../src/render/superg-video-pose";

describe("visible carve banking", () => {
  it("leans into either turn but returns upright when flat", () => {
    expect(superGRacerBank(0, 0)).toBe(0);
    expect(superGRacerBank(.8, .8)).toBeLessThan(-20);
    expect(superGRacerBank(-.8, .8)).toBeGreaterThan(20);
    expect(superGRacerBank(.8, .8)).toBeCloseTo(-superGRacerBank(-.8, .8));
  });
  it("releases bank on a jump and never produces extreme tilt", () => {
    expect(superGRacerBank(1, 1, 1)).toBe(0);
    expect(Math.abs(superGRacerBank(2, 3))).toBeLessThanOrEqual(34);
  });
});

describe("source-video guided Super-G animation intent (rendering only)", () => {
  it("keeps neutral straight-line stance without forced edge lean", () => {
    const pose = superGEdgePose(0, 0.5, 0, 0);
    expect(pose.engagement).toBe(0);
    expect(pose.hipDrop).toBe(0);
    expect(pose.hipInside).toBe(0);
    expect(pose.insideLegShortening).toBe(0);
  });

  it("lowers the hips when loading a real, gripping edge", () => {
    const outside = superGEdgePose(1, 1.1, 0.0, 0);
    expect(outside.engagement).toBeGreaterThan(0.85);
    expect(outside.hipDrop).toBeGreaterThan(0.055);
    expect(outside.hipDrop).toBeLessThan(0.13);
    expect(outside.hipInside).toBeGreaterThan(0.06);
    expect(outside.outsideLegLength).toBeGreaterThan(0);
    expect(outside.insideLegShortening).toBeGreaterThan(
      outside.outsideLegLength,
    );
  });

  it("mirrors left/right turns without introducing an asymmetric pelvis bias", () => {
    const a = superGEdgePose(0.9, 0.9);
    const b = superGEdgePose(-0.9, 0.9);
    expect(a.hipInside).toBeCloseTo(-b.hipInside);
    expect(a.hipDrop).toBeCloseTo(b.hipDrop);
    expect(a.pelvicAngle).toBeCloseTo(b.pelvicAngle);
  });

  it("attenuates aggressive carve on skids or when skis lose snow contact", () => {
    const grip = superGEdgePose(1, 1, 0, 0);
    const skid = superGEdgePose(1, 1, 1, 0);
    expect(skid.hipDrop).toBeLessThan(grip.hipDrop / 2);
    const air = superGEdgePose(1, 1, 0, 1);
    expect(air.engagement).toBe(0);
    expect(air.hipDrop).toBe(0);
  });

  it("loads the upper body progressively before departure, not on GO only", () => {
    expect(superGStartBrace(-3)).toBe(0);
    expect(superGStartBrace(-1.5)).toBe(0);
    expect(superGStartBrace(-0.8)).toBeGreaterThan(0);
    expect(superGStartBrace(-0.3)).toBeGreaterThan(
      superGStartBrace(-0.8),
    );
    expect(superGStartBrace(-0.01)).toBe(1);
    expect(superGStartBrace(0)).toBe(1);
    expect(superGStartBrace(0.01)).toBe(1);
    expect(superGStartBrace(0.25)).toBeGreaterThan(0);
    expect(superGStartBrace(0.6)).toBe(0);
  });
});

describe("actual 25-bone racer ski/boot contact IK", () => {
  // Forward kinematics measured from the donated GLB rest-pose (metres).
  function bootSoleHeight(pelvisY: number, hip: number, knee: number,
    ankle: number): number {
    const rad = Math.PI / 180;
    const rotateY = (y: number, z: number, angle: number) =>
      y * Math.cos(angle * rad) - z * Math.sin(angle * rad);
    return pelvisY - 0.070 +
      rotateY(-0.370, -0.191, hip) +
      rotateY(-0.319, 0.122, hip + knee) +
      rotateY(-0.126, 0.027, hip + knee + ankle);
  }

  it("does not drive attached race skis underground while crouching", () => {
    for (const y of [1.01, 0.95, 0.87, 0.77, 0.69, 0.61, 0.57, 0.52]) {
      const solved = superGLegIK(y);
      expect(bootSoleHeight(y, solved.hipPitch, solved.kneePitch,
        solved.anklePitch)).toBeCloseTo(0.125, 4);
      expect(Number.isFinite(solved.hipPitch)).toBe(true);
      expect(Math.abs(solved.kneePitch)).toBeLessThan(115);
    }
  });

  it("flexes the knee and levels the race boot rather than moving its sole", () => {
    const standing = superGLegIK(1.01);
    const tuck = superGLegIK(0.69);
    expect(standing.hipPitch).toBeCloseTo(0, 3);
    expect(standing.kneePitch).toBeCloseTo(0, 3);
    expect(tuck.hipPitch).toBeGreaterThan(25);
    expect(tuck.kneePitch).toBeLessThan(-60);
    expect(tuck.hipPitch + tuck.kneePitch + tuck.anklePitch).toBeCloseTo(0);
  });

  it("offsets outside/inside ski contact to counter pelvis roll", () => {
    expect(superGSkiFootLift(1, 1)).toBeCloseTo(-0.13);
    expect(superGSkiFootLift(-1, 1)).toBeCloseTo(0.12);
    expect(superGSkiFootLift(0.0001, 1)).toBe(0);
    for (const footLift of [-0.13, 0.12]) {
      const solved = superGLegIK(0.61, footLift);
      const actual = bootSoleHeight(0.61, solved.hipPitch, solved.kneePitch,
        solved.anklePitch);
      expect(actual).toBeCloseTo(0.125 + footLift, 4);
    }
  });

  it("keeps the deliberate low finish reach independent of race timing", () => {
    expect(superGFinishGesture(0)).toEqual({
      drop: 0, forward: 0, armReach: 0,
    });
    const finish = superGFinishGesture(1);
    expect(finish.drop).toBeGreaterThan(0.1);
    expect(finish.forward).toBeGreaterThan(0);
    expect(finish.armReach).toBe(1);
  });
});
