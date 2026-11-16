/**
 * Bundled CC0 asset importer. All binary downloads take place at build time,
 * never inside the game loop. Download urls and licence sources live in
 * scripts/alpine-pack.json; see docs/ASSETS.md.
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
const pack = JSON.parse(readFileSync(new URL("./alpine-pack.json", import.meta.url), "utf8"));
const dest = "public/assets/alpine";
const strict = process.argv.includes("--strict");
mkdirSync(dest, { recursive: true });
let errors = 0;
async function download(url, out, kind, expected = 0) {
  if (existsSync(out)) return "already present";
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      let response;
      try { response = await fetch(url, { signal: controller.signal }); }
      finally { clearTimeout(timeout); }
      if (!response.ok) throw Error("HTTP " + response.status + " for " + url);
      const length = Number(response.headers.get("content-length") || 0);
      if (length > 6_000_000) throw Error("Asset exceeds 6 MB: " + url);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 6_000_000 || bytes.length < 100) throw Error("Unexpected file size: " + url);
      if (kind === "glb") {
        if (expected) assert.equal(bytes.length, expected, "Upstream model bytes changed: " + url);
        assert.equal(bytes.readUInt32LE(0), 0x46546c67, "Not a GLB: " + url);
        assert.equal(bytes.readUInt32LE(4), 2, "Unsupported glTF version");
        assert.equal(bytes.readUInt32LE(8), bytes.length, "Invalid GLB length");
        assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, "Missing JSON chunk");
        const jsonLen = bytes.readUInt32LE(12);
        const document = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLen));
        assert.equal(document.asset.version, "2.0");
        assert.ok(document.meshes?.length, "No mesh in GLB");
      } else {
        assert.equal(bytes[0], 0xff, "Not a JPEG");
        assert.equal(bytes[1], 0xd8, "Not a JPEG");
      }
      writeFileSync(out, bytes);
      return bytes.length + " bytes";
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw lastError;
}
for (const m of pack.models) {
  const url = "https://cdn.3dassets.dev/assets/" + m.id + "/v1/model.glb";
  const out = join(dest, m.key + ".glb");
  try { console.log(m.key, await download(url, out, "glb", m.bytes)); }
  catch (error) { errors++; console.warn("[optional asset]", m.key, String(error)); }
}
for (const t of pack.textures) {
  const out = join(dest, t.key + ".jpg");
  try { console.log(t.key, await download(t.url, out, "jpeg")); }
  catch (error) { errors++; console.warn("[optional texture]", t.key, String(error)); }
}
if (errors && strict) {
  console.error(errors + " licensed asset downloads failed");
  process.exitCode = 1;
} else console.log("Alpine CC0 asset sync completed; unavailable files use procedural fallbacks.");
