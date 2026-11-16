/** Tiny, original CPU-generated PBR texel field: no external image assets.
 * Soft corduroy ridges, fine grain and anisotropic micro normals.
 */
const bound = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
export interface SnowTexel {
  diffuse: readonly [number, number, number];
  normal: readonly [number, number, number];
  roughness: number;
}
export function snowTexel(x: number, y: number): SnowTexel {
  const phase = ((x + 1.4 * Math.sin(y * 0.04)) * Math.PI) / 9;
  const ridges = Math.pow((1 + Math.cos(phase)) * 0.5, 12);
  const terrain = (Math.sin(x * 0.07 + y * 0.03) +
    Math.sin(x * 0.019 - y * 0.08)) * 0.5;
  const fract = (a: number) => a - Math.floor(a);
  const grain = fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) - 0.5;
  const base = 238 - ridges * 16 + terrain * 3.3 + grain * 13;
  const nx = bound(128 + Math.sin(phase) * 20 + grain * 10);
  const ny = bound(128 + Math.cos(y * 0.06 + x * 0.018) * 7 + grain * 7);
  return {
    diffuse: [bound(base - 1), bound(base + 2), bound(base + 5)],
    normal: [nx, ny, bound(248 - Math.abs(nx - 128) * 0.08)],
    roughness: bound(180 + ridges * 28 + grain * 17),
  };
}
