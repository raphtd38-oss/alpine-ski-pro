import { clamp, type SkierState } from "./types";

/**
 * Pure visual snow-contact model for the two skis.
 * The 120 Hz ski physics, collision detection and race time are unchanged.
 * Returns where displaced snow should appear and how wide an edge mark is.
 */
export type SnowSkiSide = -1 | 1;
export type SnowContactState = Pick<SkierState,
  "edge" | "load" | "pressure" | "slip" | "skid" | "height">;

export interface SkiSnowMark {
  visible: boolean;
  outside: boolean;
  load: number;
  halfWidthM: number;
  ridgeOffsetM: number;
  ridgeHalfWidthM: number;
  ridgeHeightM: number;
}

export function skiSnowMark(
  state: SnowContactState,
  side: SnowSkiSide,
): SkiSnowMark {
  const grounded = Number.isFinite(state.height) && state.height < 0.05;
  const edge = clamp(Math.abs(state.edge), 0, 1.1) / 1.1;
  const pressure = clamp(state.pressure, 0.5, 1.6);
  const skid = clamp(state.skid, 0, 1);
  const outside = (state.edge >= 0 ? -1 : 1) === side;
  const weight = clamp(state.load, 0, 1);
  // A stronger carve loads the outside ski, lightening the inside line.
  const load = clamp(outside ? weight : 1 - weight, 0.08, 0.96);
  const compression = clamp(load * pressure * (0.3 + edge * 0.7), 0, 1.5);
  return {
    visible: grounded,
    outside,
    load,
    // One clean cut on hardpack, wider displaced powder if skidding.
    halfWidthM: clamp(0.012 + compression * 0.020 + skid * 0.016,
      0.012, 0.063),
    ridgeOffsetM: side * (0.032 + skid * 0.008 + edge * 0.007),
    ridgeHalfWidthM: clamp(0.010 + compression * 0.007 + skid * 0.006,
      0.010, 0.033),
    ridgeHeightM: 0.009 + compression * 0.017,
  };
}

export interface SnowPlumeSource {
  skiSide: SnowSkiSide;
  xOffsetM: number;
  strength: number;
  liftMps: number;
  radiusM: number;
}

/** Visible spray emanates from the weighted downhill edge, not the pelvis. */
export function snowPlumeSource(
  state: SnowContactState,
  particleIndex: number,
  speed: number,
  random01: number,
): SnowPlumeSource {
  const outside: SnowSkiSide = state.edge >= 0 ? -1 : 1;
  const skiSide: SnowSkiSide = particleIndex % 5 === 0 ? -outside : outside;
  const mark = skiSnowMark(state, skiSide);
  const r = clamp(random01, 0, 1);
  const speedFactor = clamp(speed / 30, 0, 1.7);
  return {
    skiSide,
    xOffsetM: skiSide * 0.18 + (r - 0.5) * 0.1,
    strength: 0.25 + mark.load * 0.75,
    liftMps: 0.22 + mark.load * 0.8 + speedFactor * 0.35,
    radiusM: 0.011 + r * 0.018 + mark.load * 0.012,
  };
}

/** Broad lateral powder cloud when the racer slides after a fabric crash. */
export function crashSnowEnergy(gateCrashElapsed: number): number {
  if (!Number.isFinite(gateCrashElapsed) ||
    gateCrashElapsed < 0 || gateCrashElapsed > 2.1) return 0;
  const phase = 1 - gateCrashElapsed / 2.1;
  return 1.5 * phase * phase + 0.3 * phase;
}
