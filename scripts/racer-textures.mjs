// Deterministic original 256px PBR albedo atlases embedded in the skinned GLB.
// No internet, proprietary texture, Canvas or Blender dependency.
import { deflateSync } from "node:zlib";

function chunk(type, payload) {
  const name = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4), crc = Buffer.alloc(4);
  len.writeUInt32BE(payload.length);
  let c = 0xffffffff;
  for (const byte of Buffer.concat([name, payload])) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  crc.writeUInt32BE((c ^ 0xffffffff) >>> 0);
  return Buffer.concat([len, name, payload, crc]);
}

const glyphs = [
  ["01111","10000","10000","11110","10001","10001","01110"], // 6
  ["00100","01100","00100","00100","00100","00100","01110"], // 1
];

/** A muted real-scale woven structure, hand-made carbon pattern, original
 * numbered race bib and iridescent visor. Materials tint these neutral maps. */
function texture(kind) {
  const w = 256, h = 256, raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    const row = y * (w * 4 + 1);
    for (let x = 0; x < w; x++) {
      const fibers = ((x * 19 + y * 31 + ((x * y) >> 4)) & 15) - 7;
      const wave = Math.sin((x + y) * .37) * 2.9 + Math.sin(y * .19) * 3.5;
      let light = 249 + wave * .25 + fibers * .2;
      if (kind === "woven") {
        light = 224 + wave + fibers * .95 -
          (x % 24 < 2 ? 9 : 0) - (y % 31 < 2 ? 8 : 0);
      } else if (kind === "carbon") {
        light = 218 + ((x + y * 2) % 11 < 4 ? 13 : -5) + wave * .5;
      } else if (kind === "visor") {
        light = 196 + Math.sin((x + y) * .017) * 28 +
          (y < 38 ? 18 : 0) + wave;
      } else if (kind === "bib") {
        if (y > 25 && y < 39 && x > 29 && x < 227) light = 74;
        // Bib 61: original 5x7 bitmap glyphs, not a brand or real sponsor.
        for (let i = 0; i < 2; i++) {
          const cx = Math.floor((x - 63 - i * 72) / 12);
          const cy = Math.floor((y - 90) / 12);
          if (cx >= 0 && cx < 5 && cy >= 0 && cy < 7 &&
              glyphs[i][cy][cx] === "1") light = 22;
        }
      }
      const at = row + 1 + x * 4;
      const grey = Math.max(0, Math.min(255, Math.round(light)));
      raw[at] = raw[at + 1] = raw[at + 2] = grey;
      raw[at + 3] = 255;
    }
  }
  const hdr = Buffer.alloc(13);
  hdr.writeUInt32BE(w, 0);
  hdr.writeUInt32BE(h, 4);
  hdr[8] = 8; // 8-bit RGBA
  hdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk("IHDR", hdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Additional PBR maps implement the player's 2026 Studio Kit race_fabric
// recipe (micro-woven height -> OpenGL tangent normal + glTF packed ORM).
// They are all deterministic PNGs embedded in the GLB at build time, without
// a costly runtime dependency on Python/Numpy/Pillow or external downloads.
function microHeight(kind, x, y) {
  const u = x / 256, v = y / 256;
  const fleck = Math.sin(u * 167 + v * 113) * 0.016 +
    Math.sin(u * 83 - v * 137) * 0.009;
  if (kind === "woven")
    return 0.50 + 0.078 * Math.sin(u * Math.PI * 2 * 58) *
      Math.sin(v * Math.PI * 2 * 58) + fleck;
  if (kind === "carbon")
    return 0.50 + 0.052 * Math.sin((u + v) * Math.PI * 2 * 36) *
      Math.cos((u - v) * Math.PI * 2 * 32) + fleck * 0.55;
  if (kind === "bib")
    return 0.50 + 0.028 * Math.sin(u * Math.PI * 2 * 48) *
      Math.sin(v * Math.PI * 2 * 48) + fleck * 0.2;
  // Smooth mirrored goggles: almost no bump, very low base roughness.
  return 0.50 + Math.sin(u * 21 + v * 15) * 0.0025;
}

function extraPbrTexture(kind, map) {
  const w = 256, h = 256, raw = Buffer.alloc(h * (w * 4 + 1));
  const clamp8 = (v) => Math.max(0, Math.min(255, Math.round(v)));
  for (let y = 0; y < h; y++) {
    const row = y * (w * 4 + 1);
    for (let x = 0; x < w; x++) {
      const p = row + 1 + x * 4;
      const height = microHeight(kind, x, y);
      if (map === "normal") {
        const dx = (microHeight(kind, x + 1, y) -
          microHeight(kind, x - 1, y)) * 0.5;
        const dy = (microHeight(kind, x, y + 1) -
          microHeight(kind, x, y - 1)) * 0.5;
        const nx = -dx * 3.6, ny = -dy * 3.6, nz = 1;
        const norm = Math.hypot(nx, ny, nz);
        raw[p] = clamp8((nx / norm * .5 + .5) * 255);
        raw[p + 1] = clamp8((ny / norm * .5 + .5) * 255);
        raw[p + 2] = clamp8((nz / norm * .5 + .5) * 255);
      } else {
        // glTF ORM: R=occlusion, G=roughness, B=metallic.
        const base = kind === "visor" ? 158 :
          kind === "carbon" ? 210 : kind === "woven" ? 229 : 236;
        raw[p] = clamp8(238 - Math.max(0, .5 - height) * 42);
        raw[p + 1] = clamp8(base + (height - .5) * 93);
        raw[p + 2] = 255; // do not accidentally zero out PBR metallicFactor
      }
      raw[p + 3] = 255;
    }
  }
  const hdr = Buffer.alloc(13);
  hdr.writeUInt32BE(w, 0);hdr.writeUInt32BE(h, 4);
  hdr[8] = 8;hdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk("IHDR", hdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export const RACER_TEXTURE_NAMES = ["woven","carbon","bib","visor"];
export function originalRacerTextures() {
  const base = RACER_TEXTURE_NAMES.map((kind) => ({
    kind, map: "albedo", png: texture(kind),
  }));
  const detail = RACER_TEXTURE_NAMES.flatMap((kind) => [
    {kind, map: "normal", png: extraPbrTexture(kind, "normal")},
    {kind, map: "orm", png: extraPbrTexture(kind, "orm")},
  ]);
  return [...base, ...detail];
}
