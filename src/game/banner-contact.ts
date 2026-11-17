import type { Gate, SkierState } from "./types";
import { clamp } from "./types";

/**
 * Legal Super-G passage is through the clear corridor between inner poles.
 * The two speed gate banners are cloth OUTSIDE that corridor, not ghost meshes.
 * A shallow strike folds the banner down. Once more than 45% of the cloth width
 * is penetrated by the skier centre, the racer loses balance and crashes.
 *
 * The contact is resolved in the fixed 120 Hz simulation, NEVER from rendered
 * mesh polygons (render FPS and animation LOD must not affect race outcomes).
 */
export const BANNER_PANEL_WIDTH_M = 1.03;
export const BANNER_GRAZE_REACH_M = 0.43;
export const BANNER_CRASH_THRESHOLD = 0.45;
export const BANNER_CONTACT_HALF_DEPTH_M = 0.19;
export const BANNER_MAX_SKIER_HEIGHT_M = 2.05;
export const GATE_CRASH_DURATION_S = 3.15;

export interface BannerContact {
  gateId: number;
  side: -1 | 1;
  penetration: number;
  crash: boolean;
  x: number;
  z: number;
  /** Hit near the inner edge produces 0, at the far edge produces 1. */
  fabricDepth: number;
}

/**
 * Checks a swept skier path against the plane of the physical fabric.
 * Works with >60km/h gate crossings; a point-only test could tunnel.
 * Does NOT consider the open middle corridor a wall.
 */
export function detectBannerContact(
  before: Pick<SkierState, "x" | "z" | "height">,
  after: Pick<SkierState, "x" | "z" | "height">,
  gate: Gate,
): BannerContact | null {
  if (!Number.isFinite(before.x + before.z + before.height +
    after.x + after.z + after.height + gate.x + gate.z + gate.width)) return null;

  const planeZ = gate.z - 0.04;
  if (Math.max(before.z, after.z) < planeZ - BANNER_CONTACT_HALF_DEPTH_M ||
      Math.min(before.z, after.z) > planeZ + BANNER_CONTACT_HALF_DEPTH_M)
    return null;

  const dz = after.z - before.z;
  let t = 0;
  if (Math.abs(dz) > 1e-8) {
    t = clamp((planeZ - before.z) / dz, 0, 1);
  } else {
    // A skier who moves sideways at the banner plane may also hit the cloth.
    if (Math.abs(after.z - planeZ) > BANNER_CONTACT_HALF_DEPTH_M) return null;
    t = 0.5;
  }
  const x = before.x + (after.x - before.x) * t;
  const height = before.height + (after.height - before.height) * t;
  if (height > BANNER_MAX_SKIER_HEIGHT_M) return null;

  let best: BannerContact | null = null;
  for (const side of [-1, 1] as const) {
    const innerX = gate.x + side * gate.width / 2;
    const fabricDepth = side * (x - innerX);
    if (fabricDepth < -BANNER_GRAZE_REACH_M ||
        fabricDepth > BANNER_PANEL_WIDTH_M + BANNER_GRAZE_REACH_M) continue;
    const penetration = clamp(fabricDepth / BANNER_PANEL_WIDTH_M, 0, 1);
    const hit = {
      gateId: gate.id,
      side,
      penetration,
      crash: penetration > BANNER_CRASH_THRESHOLD,
      x,
      z: planeZ,
      fabricDepth,
    };
    if (!best || hit.penetration > best.penetration) best = hit;
  }
  return best;
}
