import * as pc from "playcanvas";
import type { Course, Quality } from "../game/types";
import { courseCenterX, terrainHeight } from "../game/course";
import { CORTINA_LIGHT_STATIONS } from "./cortina-atmosphere";
import { color, material, meshEntity } from "./geometry";

/**
 * High-impact sunset accents derived from original procedural textures.
 * The image used for art direction is NOT sampled into the runtime.
 * The small optical haloes are batched into one draw call. The actual spots
 * illuminate the snow; no painted light pools bypass their distance budget.
 */
export function createCortinaLightAccents(
  app: pc.Application, root: pc.Entity, course: Course, quality: Quality,
): { materials: pc.StandardMaterial[]; textures: pc.Texture[] } {
  const canvas = document.createElement("canvas");
  const size = 192;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const radial = ctx.createRadialGradient(size / 2, size / 2, 1,
    size / 2, size / 2, size / 2 - 2);
  radial.addColorStop(0.00, "rgba(255,249,224,0.94)");
  radial.addColorStop(0.13, "rgba(255,240,195,0.68)");
  radial.addColorStop(0.32, "rgba(255,219,156,0.35)");
  radial.addColorStop(0.66, "rgba(255,197,139,0.08)");
  radial.addColorStop(1.00, "rgba(255,180,125,0)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, size, size);
  const tex = new pc.Texture(app.graphicsDevice, {
    name: "Cortina original soft floodlight glow", mipmaps: true,
  });
  tex.setSource(canvas);
  tex.addressU = tex.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
  tex.anisotropy = 2;
  const glow = material("Cortina LED soft bloom sprites", "#000000");
  glow.useLighting = false;
  glow.useFog = false;
  glow.emissiveMap = tex;
  glow.emissive = color("#fff2d5");
  glow.emissiveIntensity = 1.15;
  glow.opacityMap = tex;
  glow.opacityMapChannel = "a";
  glow.opacity = .32;
  glow.blendType = pc.BLEND_ADDITIVEALPHA;
  glow.depthWrite = false;
  glow.cull = pc.CULLFACE_NONE;
  glow.update();

  const p: number[] = [], idx: number[] = [], uv: number[] = [];
  const quad = (centerX: number, centerY: number, centerZ: number,
    halfWidth: number, halfHeight: number) => {
    const n = p.length / 3;
    p.push(
      centerX - halfWidth, centerY - halfHeight, centerZ,
      centerX + halfWidth, centerY - halfHeight, centerZ,
      centerX - halfWidth, centerY + halfHeight, centerZ,
      centerX + halfWidth, centerY + halfHeight, centerZ,
    );
    uv.push(0, 0, 1, 0, 0, 1, 1, 1);
    idx.push(n, n + 1, n + 2, n + 2, n + 1, n + 3);
  };
  for (const [i, z] of CORTINA_LIGHT_STATIONS.entries()) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = courseCenterX(z, course) +
      side * (course.width / 2 + 16 + (i % 3) * 1.6);
    const y = terrainHeight(x, z, course) + 18.5;
    quad(x, y, z - .64, 3.7, 2.5);
    if (quality === "high" || quality === "ultra")
      quad(x, y, z - .70, 5.8, 3.9);
  }
  const halo = meshEntity(app.graphicsDevice, root,
    "Cortina sunset projector glow with original additive haloes",
    p, idx, glow, undefined, uv);
  halo.render!.castShadows = false;

  return { materials: [glow], textures: [tex] };
}
