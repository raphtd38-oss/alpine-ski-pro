import type { Quality } from "../game/types";

/** Adapted from the player's 2026 Studio Kit LOD recipe.
 * Cull only imported high-detail meshes; the batched forest and mountains
 * remain as the continuous distant backdrop and the 120Hz course never moves.
 * A dead band stops shimmering when the chase camera crosses the threshold.
 */
const PROFILE: Record<Quality, number> = {
  low: 85, medium: 145, high: 215, ultra: 290,
};
export function detailRange(key: string, quality: Quality): number {
  const base = PROFILE[quality];
  if (key === "chalet" || key === "guesthouse") return base * 1.45;
  if (key === "wayfinding") return base * 0.95;
  if (key === "sapling") return base * 0.75;
  return base;
}
export function chooseDetailVisibility(
  previouslyVisible: boolean,
  distance: number,
  maximumDistance: number,
  hysteresis = 12,
): boolean {
  if (!Number.isFinite(distance) || distance < 0) return false;
  const margin = Math.max(0, hysteresis);
  return previouslyVisible
    ? distance <= maximumDistance + margin
    : distance < Math.max(0, maximumDistance - margin);
}
