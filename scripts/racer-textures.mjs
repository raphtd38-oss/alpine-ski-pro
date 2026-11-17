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

export const RACER_TEXTURE_NAMES = ["woven","carbon","bib","visor"];
export function originalRacerTextures() {
  return RACER_TEXTURE_NAMES.map((kind) => ({ kind, png: texture(kind) }));
}
