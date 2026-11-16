import { clamp } from "./types";

/** Deterministic gameplay approximations contributed in the supplied V1.5 patch.
 * These effects are deliberately conservative to preserve accessible controls
 * and existing race records; they are not a certified biomechanical model. */
export const edgeBite = (edge: number): number => {
  const t = clamp((Math.abs(edge) - 0.05) / 0.52, 0, 1);
  return t * t * (3 - 2 * t);
};

/** Small grip reduction with skis flat, rather than abrupt lateral steering. */
export const tiltGripFactor = (edge: number): number =>
  0.91 + 0.09 * edgeBite(edge);

/** A slipping edge needs a relaxed turn before it fully recovers. */
export function nextSkid(
  skid: number, demand: number, limit: number, dt: number,
): number {
  const ratio = Math.abs(demand) / Math.max(0.1, limit);
  const target = ratio > 1.08 ? 1 : ratio < 0.8 ? 0 : skid;
  return skid + (target - skid) * (1 - Math.exp(-(target > skid ? 6 : 3.5) * dt));
}

/** Hysteresis modestly reduces grip and makes a deep skid cost more energy. */
export const skidGripFactor = (skid: number): number =>
  1 - 0.10 * clamp(skid, 0, 1);

/** Crest unloading and compression change normal pressure, both bounded. */
export const pressureGripFactor = (pressure: number): number =>
  Math.pow(clamp(pressure, 0.55, 1.4), 0.3);

export const softSnowGripFactor = (depth: number): number =>
  1 - 0.18 * clamp(depth, 0, 1);

export const softSnowDrag = (depth: number, speed: number): number =>
  clamp(depth, 0, 1) * (0.028 + 0.0009 * Math.max(0, speed));
