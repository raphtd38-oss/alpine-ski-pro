import { clamp, type SkierState } from "./types";

/** Pure, render-engine independent helpers for ski grooves and snow spray.
 * The geometry follows each ski's previous and current edge orientation so
 * tracks no longer shear sideways whenever the athlete carves across the slope.
 */
export type TrackSample = Pick<SkierState, "x" | "z" | "heading">;
export type HeightAt = (x: number, z: number) => number;

export function skiTrackQuad(
  previous: TrackSample,
  current: TrackSample,
  skiOffset: number,
  halfWidth: number,
  heightAt: HeightAt,
): number[] {
  const ax = previous.x + Math.cos(previous.heading) * skiOffset;
  const az = previous.z - Math.sin(previous.heading) * skiOffset;
  const bx = current.x + Math.cos(current.heading) * skiOffset;
  const bz = current.z - Math.sin(current.heading) * skiOffset;
  const dx = bx - ax;
  const dz = bz - az;
  const length = Math.hypot(dx, dz);
  // The ribbon's width is perpendicular to the path actually travelled,
  // not to world X. This also works for a near-stationary skier.
  const nx = length > 1e-6 ? dz / length : Math.cos(current.heading);
  const nz = length > 1e-6 ? -dx / length : -Math.sin(current.heading);
  const width = clamp(halfWidth, 0.012, 0.09);
  const corners: [number, number][] = [
    [ax - nx * width, az - nz * width],
    [ax + nx * width, az + nz * width],
    [bx + nx * width, bz + nz * width],
    [bx - nx * width, bz - nz * width],
  ];
  return corners.flatMap(([x, z]) => [x, heightAt(x, z) + 0.021, z]);
}

export function snowSprayVelocity(
  state: Pick<SkierState, "vx" | "vz" | "heading" | "edge" | "slip">,
  variation: number,
) {
  const speed = Math.hypot(state.vx, state.vz);
  const side = state.edge >= 0 ? -1 : 1;
  const sideSpeed = 1.6 + clamp(speed * 0.11, 0, 4.8) + clamp(state.slip * 0.2, 0, 2);
  const behind = 0.85 + speed * 0.055;
  const scale = 0.78 + clamp(variation, 0, 1) * 0.44;
  return {
    x: (side * Math.cos(state.heading) * sideSpeed - Math.sin(state.heading) * behind) * scale,
    y: 0.95 + clamp(speed * 0.035, 0, 1.2) + clamp(variation, 0, 1) * 1.1,
    z: (-side * Math.sin(state.heading) * sideSpeed - Math.cos(state.heading) * behind) * scale,
  };
}
