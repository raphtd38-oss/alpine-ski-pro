/**
 * Original procedural Dolomite escarpments for Cortina 2026.
 *
 * Rather than cones/cylinders, each massif is a *lateral rock shelf* with a
 * jagged continuous crest along its length, sediment seams, erosion gullies,
 * fractured vertical faces and snow retained on shaded ledges. This is art,
 * not a 3D terrain survey or official Olympia delle Tofane geometry.
 *
 * Pure TypeScript: deterministic, tested without a browser/WebGL dependency.
 */
export interface RockBatch {
  positions: number[];
  indices: number[];
  colors: number[];
  uvs: number[];
}
export interface DolomiteRidge {
  x: number;
  z: number;
  radius: number;
  height: number;
  seed: number;
  /** Heightfield ground at x,z, game remains collision authority. */
  ground: (x: number, z: number) => number;
  /** Number of longitudinal samples. */
  segments?: number;
  /** Width samples from near cliff face to mountain back. */
  strata?: number;
  /** 1 = symmetric; values over 1 elongate the cliff along the course. */
  elongation?: number;
}
const sat = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const fract = (v: number) => v - Math.floor(v);
const hash = (a: number, b: number, seed: number) =>
  fract(Math.sin(a * 127.1 + b * 311.7 + seed * 19.7) * 43758.5453);
function valueNoise(a: number, b: number, seed: number): number {
  const ix = Math.floor(a), iz = Math.floor(b);
  const u = a - ix, v = b - iz;
  const fx = u * u * (3 - 2 * u), fz = v * v * (3 - 2 * v);
  return lerp(
    lerp(hash(ix, iz, seed), hash(ix + 1, iz, seed), fx),
    lerp(hash(ix, iz + 1, seed), hash(ix + 1, iz + 1, seed), fx),
    fz,
  );
}

/** Pure mesh generator: does not alter the race track, snow, or physics. */
export function appendDolomiteRidge(batch: RockBatch, ridge: DolomiteRidge): void {
  const lengthSamples = Math.max(8, Math.min(96, Math.round(ridge.segments ?? 22)));
  const depthSamples = Math.max(6, Math.min(48, Math.round(ridge.strata ?? 14)));
  const r = Math.max(2, ridge.radius);
  const halfLength = r * Math.max(1.3, ridge.elongation ?? 1.95);
  const halfDepth = r * 1.42;
  const start = batch.positions.length / 3;
  const phase = ridge.seed * .29;

  for (let j = 0; j <= lengthSamples; j++) {
    const longitudinal = j / lengthSamples;
    const zRel = longitudinal * 2 - 1;
    const z = ridge.z + zRel * halfLength;
    const endFade = Math.pow(Math.max(0, 1 - zRel * zRel), .46);
    // Broad ridge with several independent shoulders along the entire face.
    const crest = .69 +
      .20 * Math.sin(5.9 * zRel + phase) +
      .13 * Math.sin(12.7 * zRel - phase * 1.2) +
      .08 * Math.cos(20.3 * zRel + phase * .63);
    const ridgeHeight = ridge.height * Math.max(.24, crest) * endFade;

    for (let k = 0; k <= depthSamples; k++) {
      const across = k / depthSamples;
      const xRel = across * 2 - 1;
      const x = ridge.x + xRel * halfDepth;
      // A broad erosion platform, a steep inner wall and a broken talus foot.
      // Mirroring the profile keeps both valley-facing walls correctly oriented.
      const inward = ridge.x >= 0 ? across : 1 - across;
      const shoulder = .38 + .045 * Math.sin(zRel * 6 + phase);
      const front = Math.min(1, inward / shoulder);
      const rear = Math.max(0, (inward - .68) / .32);
      const faceProfile = Math.pow(front, .36) * Math.pow(1 - rear, 1.25);
      // Vertical gullies scar the cliff; ledges remain nearly horizontal.
      const coarse = valueNoise(6 * across, 7 * longitudinal, ridge.seed) - .5;
      const fine = valueNoise(23 * across, 27 * longitudinal, ridge.seed + 21) - .5;
      const gully = Math.pow(Math.max(0, Math.sin(zRel * 18.2 +
        xRel * 3.7 + phase)), 12);
      const pocket = 1 - gully * .23;
      const shelf = Math.sin(across * 24 + longitudinal * 2.1 + phase);
      const stratum = -.022 * Math.pow(Math.max(0, shelf), 8);
      const sculpt = sat(faceProfile * pocket * (1 + coarse * .19 + fine * .065 + stratum));
      const height = Math.max(0, ridgeHeight * sculpt);
      const y = ridge.ground(x, z) + height;
      batch.positions.push(x, y, z);
      batch.uvs.push(z / 6 + x / 60, y / 6);
      // Orange sunlit faces, bluish shadowed fissures and small isolated
      // snow deposits in the highest north-facing gullies.
      const illum = .77 + .13 * Math.sin(zRel * 4.4 + 1.7) - .17 * gully +
        .12 * coarse;
      const altitude = height / Math.max(1, ridge.height);
      const snow = altitude > .82 && (
        (fine > .13 && gully < .44) ||
        (altitude > .83 && (k + 3 * j + ridge.seed) % 7 < 4)
      );
      const rgb: [number, number, number] = snow
        ? [.81 + altitude * .13, .86 + altitude * .09, .87 + altitude * .07]
        : [
          sat(.91 * illum + .08 * altitude),
          sat(.89 * illum + .08 * altitude),
          sat(.86 * illum + .10 * altitude),
        ];
      batch.colors.push(rgb[0], rgb[1], rgb[2], 1);
    }
  }
  const stride = depthSamples + 1;
  for (let j = 0; j < lengthSamples; j++)
    for (let k = 0; k < depthSamples; k++) {
      const a = start + j * stride + k, b = a + stride;
      batch.indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
}

export const newRockBatch = (): RockBatch =>
  ({ positions: [], indices: [], colors: [], uvs: [] });
