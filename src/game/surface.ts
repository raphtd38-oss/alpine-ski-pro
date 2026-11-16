import { clamp, type Course, type Weather } from "./types";
import { courseCenterX } from "./course";

/**
 * Original deterministic piste surface. All tracks sample the same field:
 * visual hardpack changes and grip never depend on render FPS or randomness.
 * Variations are subtle on purpose so the first SL remains approachable.
 */
export interface SnowSurface {
  ice: number;
  packed: number;
  grip: number;
  /** Accumulated soft-snow depth, 0 on the centre of a clear piste. */
  depth: number;
}
export function sampleSnowSurface(
  x: number,
  z: number,
  course: Course,
  weather: Weather = "clear",
): SnowSurface {
  if (!Number.isFinite(x) || !Number.isFinite(z))
    return { ice: 0, packed: 0.5, grip: weather === "snow" ? 0.82 : 1, depth: 0 };
  const large = Math.sin(z * 0.037 + x * 0.028 + Math.sin(z * 0.008) * 0.6);
  const cross = Math.cos(z * 0.017 - x * 0.065 + 1.2);
  const patches = clamp((large * 0.6 + cross * 0.4 + 0.32) / 1.18, 0, 1);
  const ice = patches * patches;
  const packed = clamp(
    0.5 + Math.sin(z * 0.014 + x * 0.022) * 0.28 +
      Math.sin(z * 0.067 - x * 0.013) * 0.18,
    0,
    1,
  );
  // Fresh snow collects at piste shoulders, with a shallow layer in snowfall.
  const verge = clamp((Math.abs(x - courseCenterX(z, course)) - (course.width / 2 - 6)) / 5, 0, 1);
  const depth = clamp(verge * 0.75 + (weather === "snow" ? 0.18 : 0), 0, 1);
  const base = weather === "snow" ? 0.82 : 1;
  return {
    depth,
    ice,
    packed,
    grip: base * (1 - ice * 0.095 + (packed - 0.5) * 0.025),
  };
}
