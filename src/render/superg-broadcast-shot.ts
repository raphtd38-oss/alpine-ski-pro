/**
 * Original race-broadcast camera planner.
 *
 * Visual inspiration: owner's 82 s TV clip of the Olympic MEN'S Super-G
 * (Bormio/Stelvio, NOT the women's Olympia delle Tofane at Cortina).
 * Reproduce the editing language: long-lens side tracking, an elevated wide
 * shot, fast athlete tracking and visible carved snow. None of the stations
 * are surveyed TV camera locations, gate coordinates or a 2026 camera plan.
 *
 * This is render-only and does not read or modify race physics.
 */
export interface BroadcastShot {
  id: number;
  side: -1 | 1;
  lateralM: number;
  trailingM: number;
  heightAboveGroundM: number;
  focusAheadM: number;
  fovDeg: number;
}

export const BROADCAST_STATIONS = [
  0, 225, 455, 680, 915, 1165, 1420, 1660, 1915, 2105,
] as const;
const PRESETS = [
  { side: -1, lateral: 22, trailing: 23, height: 10, fov: 39 },
  { side:  1, lateral: 27, trailing: 29, height: 14, fov: 37 },
  { side: -1, lateral: 37, trailing: 12, height: 18, fov: 41 },
  { side:  1, lateral: 21, trailing: 35, height: 12, fov: 34 },
  { side: -1, lateral: 30, trailing: 20, height: 14, fov: 37 },
  { side:  1, lateral: 36, trailing: 10, height: 19, fov: 40 },
  { side: -1, lateral: 26, trailing: 32, height: 13, fov: 36 },
  { side:  1, lateral: 41, trailing: 15, height: 19, fov: 43 },
  { side: -1, lateral: 27, trailing: 34, height: 14, fov: 40 },
] as const;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** A shot is continuous within a sector; a cut is intentional at its boundary. */
export function planSuperGBroadcastShot(z: number, speedMps: number): BroadcastShot {
  const station = clamp(Number.isFinite(z) ? z : 0, 0, 2104.99);
  const speed = clamp(Number.isFinite(speedMps) ? speedMps : 0, 0, 65);
  let id = PRESETS.length - 1;
  for (let i = 0; i < PRESETS.length; i++) {
    if (station < BROADCAST_STATIONS[i + 1]) { id = i; break; }
  }
  const preset = PRESETS[id];
  const fast = clamp((speed - 18) / 20, 0, 1);
  return {
    id,
    side: preset.side as -1 | 1,
    lateralM: preset.lateral + fast * 3,
    trailingM: preset.trailing + fast * 2,
    heightAboveGroundM: preset.height + fast * 2.5,
    focusAheadM: 2.3 + fast * 4.0,
    fovDeg: preset.fov - fast * 2.0,
  };
}

/** Flight/reception should remain visible in the broadcast framing. */
export function broadcastFlightFraming(
  shot: BroadcastShot, heightM: number, landingShock: number,
): BroadcastShot {
  const air = clamp((Number.isFinite(heightM) ? heightM : 0) / 1.2, 0, 1);
  const landing = clamp(Number.isFinite(landingShock) ? landingShock : 0, 0, 1);
  return {
    ...shot,
    // Pull back slightly for a jump instead of cropping the skis/poles.
    lateralM: shot.lateralM + air * 4 + landing * 1.5,
    heightAboveGroundM: shot.heightAboveGroundM + air * 3,
    fovDeg: shot.fovDeg + air * 3,
  };
}
