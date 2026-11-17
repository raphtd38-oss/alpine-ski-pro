/** Original procedural granite PBR sampled from the user's Studio Kit
 * granite_alpine / slate_ridge recipe. Kept tiny and deterministic.
 * This supplements (does not replace) the CC0 photo snow and 3D models.
 */
const byte = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const field = (x: number, y: number) => {
  const coarse = Math.sin(x * 0.061 + Math.sin(y * .028) * 1.3) *
    Math.cos(y * .057 - x * .016);
  const slate = Math.sin(y * .18 + x * .032) * .18;
  const grain = Math.sin(x * 1.93 + y * .83) *
    Math.sin(y * 1.41 - x * 1.17);
  return {coarse, slate, grain,
    height:.5+coarse*.18+slate*.17+grain*.065};
};
export interface GraniteTexel {
  diffuse: readonly [number, number, number];
  normal: readonly [number, number, number];
  roughness: number;
}
export function graniteTexel(x: number, y: number): GraniteTexel {
  const p = field(x, y);
  const dx = (field(x + 1, y).height - field(x - 1, y).height) * .5;
  const dy = (field(x, y + 1).height - field(x, y - 1).height) * .5;
  const nx = -dx * 4, ny = -dy * 4, nz = 1;
  const length = Math.hypot(nx, ny, nz);
  const brightness = p.coarse * 18 + p.grain * 15 + p.slate * 19;
  return {
    diffuse:[byte(202 + brightness),byte(214 + brightness),
      byte(220 + brightness)],
    normal:[byte((nx / length * .5 + .5) * 255),
      byte((ny / length * .5 + .5) * 255),
      byte((nz / length * .5 + .5) * 255)],
    roughness:byte(217+p.coarse*15+p.grain*12),
  };
}
