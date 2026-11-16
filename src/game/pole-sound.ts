import { clamp } from "./types";
/** Gain envelope for original hinge/fibreglass + textile impacts.
 * These values affect sound only, never physics or gate validity.
 */
export interface PoleImpactMix {
  crack: number;
  body: number;
  cloth: number;
  playbackRate: number;
}
export function poleImpactMix(speedMps: number, banner: boolean): PoleImpactMix {
  const speed = clamp(Number.isFinite(speedMps) ? speedMps : 0, 0, 60);
  const intensity = clamp(speed / 24, 0, 1);
  return {
    crack: 0.055 + intensity * 0.15,
    body: 0.024 + intensity * 0.075,
    cloth: banner ? (0.022 + intensity * 0.085) : 0,
    playbackRate: 0.9 + intensity * 0.25,
  };
}
