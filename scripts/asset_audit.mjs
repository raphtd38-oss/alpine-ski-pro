#!/usr/bin/env node
/**
 * Fail closed when a developer adds binary 3D/texture files without documented
 * provenance. Inspects binary GLB headers, JSON structure and known file budgets.
 * No network requests, external npm packages or GPU required.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { extname, join, relative } from "node:path";
import assert from "node:assert/strict";
const pack = JSON.parse(readFileSync(new URL("./alpine-pack.json", import.meta.url), "utf8"));
const requirePack = process.argv.includes("--require-pack");
const JSON_MODE = process.argv.includes("--json");
const manifest = new Map();
manifest.set("public/assets/skier.glb", {
  source: "scripts/build_skier_pro.mjs",
  license: "original",
  // Current unchanged generator embeds four RGBA textures: 1,094,208 bytes.
  max: 1_200_000,
});
for (const variant of [
  { name: "seamless-full.glb", bytes: 17_259_488 },
  { name: "seamless-mobile.glb", bytes: 5_539_148 },
]) {
  manifest.set("public/assets/racer/" + variant.name, {
    source: "User-supplied Alpine_SuperG_Coureur_Monobloc_Anime_2026(2).zip, original seamless 25-bone rig",
    license: "original, user-supplied CC0-style grant",
    exact: variant.bytes,
    max: variant.bytes,
  });
}
for (const model of pack.models) manifest.set(
  "public/assets/alpine/" + model.key + ".glb",
  { source: pack.source + " (model " + model.id + ")", license: pack.license,
    exact: model.bytes, max: 1_000_000 },
);
for (const texture of pack.textures) manifest.set(
  "public/assets/alpine/" + texture.key + ".jpg",
  { source: texture.source ?? pack.textureSource, license: texture.license ?? pack.textureLicense,
    exact: texture.bytes, md5: texture.md5, max: 3_000_000 },
);
const extensions = new Set([
  ".glb", ".gltf", ".fbx", ".obj", ".blend", ".ktx2",
  ".jpg", ".jpeg", ".png", ".webp", ".hdr", ".exr",
]);
const errors = [], files = [];
function scan(root) {
  if (!existsSync(root)) return;
  for (const dirent of readdirSync(root, { withFileTypes: true })) {
    const name = join(root, dirent.name);
    if (dirent.isDirectory()) scan(name);
    else if (dirent.isFile() && extensions.has(extname(name).toLowerCase())) {
      files.push(name.split("\\").join("/"));
    }
  }
}
function inspectGLB(bytes) {
  assert.ok(bytes.length >= 28, "GLB file too small");
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, "Invalid GLB magic");
  assert.equal(bytes.readUInt32LE(4), 2, "Not glTF 2.0");
  assert.equal(bytes.readUInt32LE(8), bytes.length, "GLB length mismatch");
  let offset = 12, json = null;
  while (offset + 8 <= bytes.length) {
    const len = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    offset += 8;
    assert.ok(len % 4 === 0 && offset + len <= bytes.length,
      "Invalid GLB chunk bounds");
    if (type === 0x4e4f534a) {
      assert.equal(json, null, "Duplicate GLB JSON chunk");
      json = JSON.parse(bytes.toString("utf8", offset, offset + len));
    }
    offset += len;
  }
  assert.equal(offset, bytes.length, "Trailing bytes after GLB chunks");
  assert.ok(json && json.asset && json.asset.version === "2.0",
    "Missing glTF 2.0 asset declaration");
  assert.ok(Array.isArray(json.meshes) && json.meshes.length,
    "GLB has no mesh");
  let triangles = 0;
  for (const mesh of json.meshes) {
    for (const primitive of mesh.primitives ?? []) {
      if ((primitive.mode ?? 4) !== 4) continue;
      const idx = primitive.indices;
      const pos = primitive.attributes?.POSITION;
      if (idx !== undefined) triangles += Math.floor((json.accessors?.[idx]?.count ?? 0) / 3);
      else triangles += Math.floor((json.accessors?.[pos]?.count ?? 0) / 3);
    }
  }
  return {
    meshes: json.meshes.length,
    materials: json.materials?.length ?? 0,
    skins: json.skins?.length ?? 0,
    animations: json.animations?.length ?? 0,
    triangles,
    extensions: json.extensionsUsed ?? [],
  };
}
scan("public/assets");
for (const name of files) {
  const registered = manifest.get(name);
  if (!registered) {
    errors.push(name + " : asset inconnu / provenance et licence non enregistrées");
    continue;
  }
  try {
    const size = statSync(name).size;
    if (registered.exact && size !== registered.exact)
      throw Error("upstream size changed (" + size + " vs " + registered.exact + ")");
    if (size > registered.max) throw Error("size budget exceeded " + size);
    if (registered.md5)
      assert.equal(createHash("md5").update(readFileSync(name)).digest("hex"),
        registered.md5, "Texture content differs from the audited source");
    const asset = { path: name, bytes: size, license: registered.license,
      source: registered.source };
    if (name.endsWith(".glb"))
      Object.assign(asset, inspectGLB(readFileSync(name)));
    files[files.indexOf(name)] = asset;
  } catch (error) {
    errors.push(name + " : " + String(error));
  }
}
if (requirePack) {
  for (const [name, entry] of manifest) {
    if (entry.license === "CC0-1.0" && !existsSync(name))
      errors.push(name + " : modèle/texture CC0 attendu dans le build manquant");
  }
}
const report = { scanned: files.filter((entry) => typeof entry !== "string"),
  missingOptional: [...manifest.keys()].filter((name) => !existsSync(name)),
  errors };
if (JSON_MODE) console.log(JSON.stringify(report, null, 2));
else {
  for (const item of report.scanned)
    console.log([item.path, Math.round(item.bytes / 1024) + " KiB",
      item.license, item.triangles === undefined ? "" :
      item.triangles + " tris / " + item.skins + " skins / " +
      item.animations + " animations"].filter(Boolean).join(" | "));
  if (report.missingOptional.length && !requirePack)
    console.log("Assets facultatifs absents localement : " +
      report.missingOptional.length + " (télécharger avec npm run assets:alpine)");
  for (const err of errors) console.error("[asset audit] " + err);
  console.log("Asset audit: " + (errors.length ? "FAILED" : "OK"));
}
if (errors.length) process.exitCode = 1;
