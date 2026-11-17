import { clamp } from "../game/types";
import { GATE_CRASH_DURATION_S } from "../game/banner-contact";

/**
 * Independent, original cinematic animation for severe banner impacts.
 * Inspired by real alpine racing falls, without using any CarveMania assets.
 *
 * 0-.2s: shock/arms brace
 * .2-.7s: lateral collapse into the snow
 * .7-1.9s: sideways sliding with skis separating
 * 1.9-3.15s: controlled recovery into a low snow-contact crouch
 *
 * Rendering ONLY: authoritative speed/contact/timer remain in physics.
 */
export interface GateCrashPose {
  active: boolean;
  weight: number;
  bodyRollDeg: number;
  bodyPitchDeg: number;
  bodyYawDeg: number;
  torsoPitchDeg: number;
  pelvisDropM: number;
  cameraLiftM: number;
  snowSpray: number;
  armBrace: number;
  skiSplayDeg: number;
}

const ease = (a: number, b: number, v: number) => {
  const x = clamp((v - a) / Math.max(1e-6, b - a), 0, 1);
  return x * x * (3 - 2 * x);
};

export function gateCrashPose(
  elapsed: number, side: number, severity = 1,
): GateCrashPose {
  if (!Number.isFinite(elapsed) || elapsed < 0 ||
      elapsed >= GATE_CRASH_DURATION_S) {
    return {
      active: false, weight: 0, bodyRollDeg: 0, bodyPitchDeg: 0,
      bodyYawDeg: 0, torsoPitchDeg: 0, pelvisDropM: 0,
      cameraLiftM: 0, snowSpray: 0, armBrace: 0, skiSplayDeg: 0,
    };
  }
  const sign = side < 0 ? -1 : 1;
  const force = clamp(severity, 0.45, 1);
  const hit = ease(0.04, 0.62, elapsed);
  const recover = 1 - ease(1.86, 3.12, elapsed);
  const w = hit * recover;
  const brace = ease(0, 0.12, elapsed) * (1 - ease(2.25, 3.12, elapsed));
  const slide = ease(0.45, 0.85, elapsed) *
    (1 - ease(1.75, 2.7, elapsed));
  return {
    active: true,
    weight: w,
    bodyRollDeg: sign * (76 + 16 * force) * w,
    bodyPitchDeg: (-12 - 13 * force) * w,
    bodyYawDeg: sign * 18 * slide,
    torsoPitchDeg: (14 + 18 * force) * w,
    pelvisDropM: (0.16 + 0.12 * force) * w,
    cameraLiftM: 0.24 * w,
    snowSpray: Math.max(0, 1 - elapsed / 1.75) * (0.5 + force * 0.5),
    armBrace: brace,
    skiSplayDeg: 18 * slide * force,
  };
}
