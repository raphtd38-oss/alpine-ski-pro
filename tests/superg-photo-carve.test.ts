import { describe, expect, it } from "vitest";
import { SuperGCompetitionPose, SG_RACE_DEFAULTS } from "../src/render/superg-carve-kinematics";
import type { Frame } from "../src/game/types";

function runCarve(edge: number, skid = 0, height = 0) {
  const rig = new SuperGCompetitionPose();
  let pose = rig.sample({ t: 0, x: 0, z: 0, heading: 0, edge: 0, height: 0,
    tuck: 0, fallen: 0 }, 0);
  for (let i = 1; i <= 90; i++) {
    const f: Frame = { t: i / 60, x: i * 0.12, z: i * 0.5,
      vx: 7.2, vz: 30, heading: Math.atan2(7.2, 30), edge,
      height, tuck: 0.4, fallen: 0, skid, pressure: 1.22,
      flex: 0.7, startPhase: 12 };
    pose = rig.sample(f, 1 / 60);
  }
  return pose;
}

describe("photo-inspired Super-G carve posture", () => {
  it("banks both directions and leaves skis on their independently controlled edges", () => {
    const left = runCarve(1);
    const right = runCarve(-1);
    expect(left.bankDeg).toBeLessThan(-30);
    expect(right.bankDeg).toBeGreaterThan(30);
    expect(left.leftFoot.edgeRollDeg).toBeLessThan(-45);
    expect(right.rightFoot.edgeRollDeg).toBeGreaterThan(45);
    expect(left.outsideSide).toBe("L");
    expect(right.outsideSide).toBe("R");
    expect(left.leftFoot.outside).toBe(true);
    expect(right.rightFoot.outside).toBe(true);
  });
  it("keeps a lower centre of mass and bounded angles even on a hard edge", () => {
    const pose = runCarve(1);
    expect(pose.pelvisHeightM).toBeGreaterThanOrEqual(SG_RACE_DEFAULTS.minPelvisHeightM);
    expect(pose.pelvisHeightM).toBeLessThan(0.80);
    expect(Math.abs(pose.bankDeg)).toBeLessThanOrEqual(SG_RACE_DEFAULTS.maxBankDeg + 0.001);
    expect(Math.abs(pose.leftFoot.edgeRollDeg)).toBeLessThanOrEqual(SG_RACE_DEFAULTS.maxSkiEdgeDeg + 0.001);
    expect(Math.abs(pose.pelvisShiftM)).toBeGreaterThan(0.16);
    expect(pose.leftArm.shoulderRollDeg).not.toBe(pose.rightArm.shoulderRollDeg);
  });
  it("reduces edge commitment during skid and flight", () => {
    const grip = runCarve(1);
    const skid = runCarve(1, 1);
    const flight = runCarve(1, 0, 0.5);
    expect(skid.engagement).toBeLessThan(grip.engagement);
    expect(flight.engagement).toBe(0);
    expect(flight.phase).toBe("airborne");
    expect(flight.bankDeg).toBeCloseTo(0, 1);
  });
  it("animates start-house glove preparation before the pole-drive brace", () => {
    const rig = new SuperGCompetitionPose();
    const frame = (startPhase: number): Frame => ({
      t: 0, x: 0, z: 0, heading: 0, edge: 0,
      startPhase, height: 0, tuck: 0, fallen: 0,
    });
    const early = rig.sample(frame(-4), 1 / 60);
    const preparing = rig.sample(frame(-2.95), 1 / 60);
    const bracing = rig.sample(frame(-0.4), 1 / 60);
    const racing = rig.sample(frame(0.5), 1 / 60);
    expect(early.startPreparation).toBe(0);
    expect(preparing.startPreparation).toBeGreaterThan(0.6);
    expect(preparing.leftArm.wristPitchDeg).not.toBeCloseTo(
      preparing.rightArm.wristPitchDeg);
    expect(bracing.startPreparation).toBe(0);
    expect(racing.startPreparation).toBe(0);
    expect(racing.startPoleImpulse).toBeGreaterThanOrEqual(0);
  });
  it("does not require velocity channels in old replay frames", () => {
    const rig = new SuperGCompetitionPose();
    const sample = rig.sample({ t: 1, x: 0, z: 10, heading: 0,
      edge: 0.7, height: 0, tuck: 1, fallen: 0 }, 1 / 60);
    expect(Number.isFinite(sample.leftFoot.yawOffsetDeg)).toBe(true);
    expect(Number.isFinite(sample.rightFoot.snowClearanceM)).toBe(true);
  });
});
