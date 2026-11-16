#!/usr/bin/env node
/** Optional desktop tools for Alpine Ski Pro. Nothing here ships to players.
 * External programs are never invoked through shell interpolation. */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const action = process.argv[2] ?? "doctor";
const cli = "gltf-transform";
function executable(name) {
  const check = spawnSync(name, ["--version"], {
    encoding: "utf8", timeout: 8000,
  });
  return !check.error && check.status === 0;
}
function run(name, args) {
  const proc = spawnSync(name, args, { stdio: "inherit" });
  if (proc.error) throw proc.error;
  if (proc.status !== 0) process.exit(proc.status || 1);
}
if (action === "doctor") {
  const apps = [
    ["blender", "modélisation / animation / rigging",
      "https://www.blender.org/download/"],
    [cli, "optimisation GLB / WebP / KTX2",
      "https://gltf-transform.dev/cli"],
    ["ktx", "outils Khronos GPU / KTX2",
      "https://github.com/KhronosGroup/KTX-Software"],
    ["gltf_validator", "validateur officiel Khronos",
      "https://github.com/KhronosGroup/glTF-Validator"],
  ];
  for (const [command, description, url] of apps) {
    console.log((executable(command) ? "✓" : "○") + " " + command +
      " — " + description + "\n  " + url);
  }
  console.log("\nInstaller glTF Transform : npm install --global @gltf-transform/cli");
  console.log("Chercher un asset CC0 : npm run assets:search -- snow --type texture");
} else if (action === "inspect" || action === "webp") {
  const source = process.argv[3], output = process.argv[4];
  if (!source || !existsSync(source) || !source.toLowerCase().endsWith(".glb")) {
    console.error("Usage: node scripts/asset_tools.mjs " + action +
      " <input.glb>" + (action === "webp" ? " <output.glb>" : ""));
    process.exit(2);
  }
  if (action === "webp" &&
      (!output || !output.toLowerCase().endsWith(".glb") ||
      resolve(source) === resolve(output) || existsSync(output))) {
    console.error("Refusing to overwrite source or an existing output GLB.");
    process.exit(2);
  }
  if (!executable(cli)) {
    console.error("Install: npm install --global @gltf-transform/cli");
    process.exit(2);
  }
  run(cli, action === "inspect" ? ["inspect", source] :
    ["optimize", source, output, "--texture-compress", "webp"]);
  if (action === "webp") {
    console.log("Validate GLB, skin names, PBR maps, animations and gameplay " +
      "before replacing any production asset.");
  }
} else {
  console.error("Usage: node scripts/asset_tools.mjs doctor | inspect <GLB> | webp <input.glb> <new-output.glb>");
  process.exit(2);
}
