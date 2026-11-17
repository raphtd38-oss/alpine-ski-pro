import { clamp } from "../game/types";

/** Visual-only Super-G pose envelopes calibrated from the player's two
 * comparison videos recorded on 17 Nov 2026.
 * These are artist estimates, NOT measured 3D joint angles or FIS rules.
 * Keep simulation/clock/contacts independent of this render-side logic.
 */
export interface EdgePose {
  /** Strength of the engaged, snow-contact carve, 0..1. */
  engagement: number;
  /** Additional pelvis descent in metres while loading the edge. */
  hipDrop: number;
  /** Additional displacement toward the inside of the turn, metres. */
  hipInside: number;
  /** Extra lengthening of the pressure-bearing outside leg, metres. */
  outsideLegLength: number;
  /** Extra flexion of the inside leg, metres. */
  insideLegShortening: number;
  /** Extra side angulation of the pelvis, degrees, unsigned. */
  pelvicAngle: number;
  /** Head counter-rotation to keep eyes oriented downhill, degrees. */
  headCounterAngle: number;
}
function smoothstep(a: number, b: number, value: number): number {
  const u = clamp((value - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
}

/** Real filmed Super-G turns (around 10–12 s, 53–56 s and 60–64 s)
 * do not keep a fixed knee flexion. The outside leg can extend when loaded
 * while the pelvis drops to the inside and the upper body stays over skis.
 */
export function superGEdgePose(
  edge: number,
  load: number,
  skid = 0,
  airborne = 0,
): EdgePose {
  const pressure = clamp(load / 1.2, 0, 1);
  const grip = 1 - 0.65 * clamp(skid, 0, 1);
  const contact = 1 - clamp(airborne, 0, 1);
  const engagement = smoothstep(0.22, 0.94, Math.abs(edge)) *
    (0.65 + 0.35 * pressure) * grip * contact;
  return {
    engagement,
    hipDrop: engagement * (0.040 + 0.035 * pressure),
    hipInside: Math.sign(edge) * engagement * (0.055 + 0.035 * pressure),
    outsideLegLength: engagement * (0.018 + 0.019 * pressure),
    insideLegShortening: engagement * (0.030 + 0.030 * pressure),
    pelvicAngle: engagement * (4.5 + 5.5 * pressure),
    headCounterAngle: engagement * 4.5,
  };
}

/** Visual anticipation before the GO signal.
 * In the real start footage, the athlete dips down shortly before leaving
 * the gate (roughly source-video 5.2–6.2 s); these numbers are an envelope,
 * not a claim of sub-frame measurement from a changing TV camera.
 * Main reports minus the countdown remaining in seconds.
 */
export function superGStartBrace(startPhase: number): number {
  if (!Number.isFinite(startPhase)) return 0;
  if (startPhase < 0) {
    // An anticipation: bend the knees and load both poles BEFORE the wand.
    return smoothstep(-1.25, -0.15, startPhase);
  }
  // Crucial continuity at GO: the brace must NOT snap from 1 to 0.
  // Extend the knees into the first two double-pole strokes.
  return 1 - smoothstep(0.035, 0.42, startPhase);
}

/** Rest-pose measurements of the original, one-piece 25-joint Super-G GLB.
 * Local +Y is up; the racer faces local -Z and is rotated 180 degrees by the
 * PlayCanvas renderer. These are model-specific, NOT universal human ratios.
 */
const SG_LEG = Object.freeze({
  thighY: -0.370,
  thighZ: -0.191,
  shinY: -0.319,
  shinZ: 0.122,
  hipFromPelvisY: -0.070,
  bootFromAnkleY: -0.126,
  soleHeightY: 0.125,
});
export interface SuperGLegIK {
  hipPitch: number;
  kneePitch: number;
  anklePitch: number;
  /** Position of the skier's foot above the local piste (metres). */
  footHeight: number;
}

/** Sagittal two-link inverse kinematics respecting the ACTUAL GLB bone
 * directions, including the shin's forward-offset heel. The old solver
 * borrowed angles from the 18-bone avatar and drove these boots underground
 * whenever the athlete crouched. This solver keeps the boot sole on snow
 * as the pelvis changes height; the outer/inner legs can receive different
 * targets from the renderer.
 *
 * Degrees returned are local X rotations about hip and knee bone pivots.
 * y is the pelvis pivot height relative to the snow, NOT absolute world Y.
 */
export function superGLegIK(
  pelvisY: number,
  footLift = 0,
): SuperGLegIK {
  const aY = SG_LEG.thighY, aZ = SG_LEG.thighZ;
  const bY = SG_LEG.shinY, bZ = SG_LEG.shinZ;
  const upper = Math.hypot(aY, aZ), lower = Math.hypot(bY, bZ);
  const ankleY = SG_LEG.soleHeightY + footLift - SG_LEG.bootFromAnkleY;
  const dy = ankleY - (pelvisY + SG_LEG.hipFromPelvisY);
  const dz = aZ + bZ; // keep fore/aft foot projection independent of knee flex
  const length = clamp(Math.hypot(dy, dz),
    Math.abs(upper - lower) + 0.0001, upper + lower - 0.0001);
  const triangle = clamp(
    (upper * upper + length * length - lower * lower) /
      (2 * upper * length), -1, 1);
  // Select the solution with the knee projecting toward the ski tip (-Z in
  // this rig). The opposite cosine branch bends the knee backwards.
  const thighDirection = Math.atan2(dz, dy) + Math.acos(triangle);
  const thighRest = Math.atan2(aZ, aY);
  const normalize = (angle: number) =>
    Math.atan2(Math.sin(angle), Math.cos(angle));
  const hipAngle = normalize(thighDirection - thighRest);
  const kneeY = aY * Math.cos(hipAngle) - aZ * Math.sin(hipAngle);
  const kneeZ = aY * Math.sin(hipAngle) + aZ * Math.cos(hipAngle);
  const shinDirection = Math.atan2(dz - kneeZ, dy - kneeY);
  const shinRest = Math.atan2(bZ, bY);
  const kneeAngle = normalize(shinDirection - shinRest - hipAngle);
  const deg = 180 / Math.PI;
  return {
    hipPitch: hipAngle * deg,
    kneePitch: kneeAngle * deg,
    anklePitch: -(hipAngle + kneeAngle) * deg,
    footHeight: SG_LEG.soleHeightY + footLift,
  };
}

/** Engaged carve heel geometry compensation for the 25-bone rig: a tilted
 * pelvis naturally lifts the outside boot and drives the inner boot lower.
 * Subtract/raise just enough of the 2D IK target to retain snow contact under
 * both skis, permitting the inside ski a small release. Signed 'outside'
 * is the physical outside-leg channel for this side of the turn.
 */
export function superGSkiFootLift(outside: number, engagement: number): number {
  if (Math.abs(outside) < 0.02) return 0;
  const strength = clamp(engagement, 0, 1);
  return (outside > 0 ? -0.13 : 0.12) * strength;
}

/** Render-side finish choreography requested by the player. The real
 * broadcast did not show the glove close enough to derive this gesture.
 * Never feed this function into the physics chrono/beam solver.
 */
export function superGFinishGesture(reach: number): {
  drop: number;
  forward: number;
  armReach: number;
} {
  const a = smoothstep(0, 0.92, clamp(reach, 0, 1));
  return { drop: a * 0.105, forward: a * 0.07, armReach: a };
}
