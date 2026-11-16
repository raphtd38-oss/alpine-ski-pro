import { clamp, type Course, type Weather } from "./types";

/**
 * Original deterministic piste surface. All tracks sample the same field:
 * visual hardpack changes and grip never depend on render FPS or randomness.
 * Variations are subtle on purpose so the first SL remains approachable.
 */
export interface SnowSurface {
  ice: number;
  packed: number;
  grip: number;
}
export function sampleSnowSurface(
  x: number,
  z: number,
  _course: Course,
  weather: Weather = "clear",
): SnowSurface {
  if (!Number.isFinite(x) || !Number.isFinite(z))
    return { ice: 0, packed: 0.5, grip: weather === "snow" ? 0.82 : 1 };
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
  const base = weather === "snow" ? 0.82 : 1;
  return {
    ice,
    packed,
    grip: base * (1 - ice * 0.095 + (packed - 0.5) * 0.025),
  };
}
