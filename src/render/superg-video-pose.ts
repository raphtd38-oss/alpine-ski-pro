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
  if (!Number.isFinite(startPhase) || startPhase >= 0) return 0;
  return smoothstep(0.1, 1.20, 1.35 + startPhase);
}
