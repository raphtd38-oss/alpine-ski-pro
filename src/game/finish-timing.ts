import { clamp } from "./types";

/**
 * Alpine speed-race finish reach. Designed for the low photoelectric beam:
 * the forward hand is down near the skier's knees, NOT raised in celebration.
 *
 * This is a stylized original animation/geometry approximation, not an
 * authoritative FIS stopwatch or body-tracking measurement.
 */
export function finishReachAmount(
  courseId: string, z: number, finishZ: number,
  speed: number, fallen = 0,
): number {
  if (courseId !== "SG" || fallen > 0 || speed < 8 ||
    !Number.isFinite(z) || !Number.isFinite(finishZ) ||
    !Number.isFinite(speed)) return 0;
  // Lean begins during the final 14 metres, fully extended at 4 metres.
  const t = clamp((14 - (finishZ - z)) / 10, 0, 1);
  return t * t * (3 - 2 * t);
}

/** Geometric forward clearance from the skier reference point to the hand.
 * The 0.62m offset only applies when the arm extends low enough for the beam.
 * The competitor still has to cross completely for a valid official result.
 */
export function lowHandLead(reach: number): number {
  return 0.62 * clamp(reach, 0, 1);
}

/** Sub-tick interpolation of when the first beam-crossing body part reaches
 * the finish plane. Returns null if there is no crossing this fixed tick.
 */
export function finishBeamFraction(
  previousZ: number, nextZ: number,
  previousLead: number, nextLead: number, finishZ: number,
): number | null {
  const a = previousZ + Math.max(0, previousLead);
  const b = nextZ + Math.max(0, nextLead);
  if (!(a < finishZ && b >= finishZ) || b <= a) return null;
  return clamp((finishZ - a) / (b - a), 0, 1);
}
