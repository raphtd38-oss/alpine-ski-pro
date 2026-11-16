import { clamp } from "./types";

/** Dynamic field of view and sub-centimetre vibration, independent of physics. */
export function speedFov(baseDeg: number, speed: number): number {
  const v = clamp(Number.isFinite(speed) ? speed : 0, 0, 70);
  return baseDeg + 11 * (1 - Math.exp(-v / 25));
}

export function cameraShake(
  chatter: number, pressure: number, speed: number, t: number,
): { x: number; y: number; z: number } {
  const c = clamp(Number.isFinite(chatter) ? chatter : 0, 0, 1);
  const p = clamp((Number.isFinite(pressure) ? pressure : 1) - 1, -0.6, 0.8);
  const speedScale = clamp((Number.isFinite(speed) ? speed : 0) / 70, 0, 1);
  const amp = c * (0.003 + 0.009 * speedScale);
  return {
    x: Math.sin(t * 71.3) * amp,
    y: Math.sin(t * 93.7 + 1.3) * amp - p * 0.014,
    z: 0,
  };
}
