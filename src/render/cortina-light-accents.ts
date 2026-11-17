import * as pc from "playcanvas";
import type { Course, Quality } from "../game/types";
import { courseCenterX, terrainHeight } from "../game/course";
import { CORTINA_LIGHT_STATIONS } from "./cortina-atmosphere";
import { color, material, meshEntity } from "./geometry";

/**
 * High-impact sunset accents derived from original procedural textures.
 * The image used for art direction is NOT sampled into the runtime.
 * All effect meshes are batched to two draw calls, plus shared materials.
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
  const glow = material("Cortina LED soft bloom sprites", "#ffffff");
  glow.useLighting = false;
  glow.useFog = false;
  glow.emissiveMap = tex;
  glow.emissive = color("#fff2d5");
  glow.emissiveIntensity = 1.75;
  glow.opacityMap = tex;
  glow.opacityMapChannel = "a";
  glow.opacity = .55;
  glow.blendType = pc.BLEND_ADDITIVE;
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
    quad(x, y, z - .64, 5.0, 3.4);
    if (quality === "high" || quality === "ultra")
      quad(x, y, z - .70, 8.2, 5.9);
  }
  const halo = meshEntity(app.graphicsDevice, root,
    "Cortina sunset projector glow with original additive haloes",
    p, idx, glow, undefined, uv);
  halo.render!.castShadows = false;

  // Unlike a flat decal, a tessellated light pool conforms to real ground
  // relief. It is translucent and contains no physical collision triangles.
  // Blue racing dye remains above it and fully readable.
  const poolP: number[] = [], poolIdx: number[] = [], poolUV: number[] = [];
  const cellX = quality === "low" ? 4 : 7;
  const cellZ = quality === "low" ? 5 : 8;
  for (const [i, z] of CORTINA_LIGHT_STATIONS.entries()) {
    const side = i % 2 === 0 ? -1 : 1;
    const centreX = courseCenterX(z, course) + side * 10;
    const width = 63, length = 77;
    const start = poolP.length / 3;
    for (let j = 0; j <= cellZ; j++) {
      const v = j / cellZ;
      const zz = z + (v - .5) * length;
      for (let k = 0; k <= cellX; k++) {
        const u = k / cellX;
        const xx = centreX + (u - .5) * width +
          courseCenterX(zz, course) - courseCenterX(z, course);
        poolP.push(xx, terrainHeight(xx, zz, course) + .043, zz);
        poolUV.push(u, v);
      }
    }
    for (let j = 0; j < cellZ; j++)
      for (let k = 0; k < cellX; k++) {
        const a = start + j * (cellX + 1) + k;
        const b = a + cellX + 1;
        poolIdx.push(a, b, a + 1, a + 1, b, b + 1);
      }
  }
  const pool = material("Cortina warm floodlight reflections on groomed snow", "#ffffff");
  pool.useLighting = false;
  pool.emissiveMap = tex;
  pool.emissive = color("#ffe4bd");
  pool.emissiveIntensity = quality === "low" ? .16 : .28;
  pool.opacityMap = tex;
  pool.opacityMapChannel = "a";
  pool.opacity = quality === "low" ? .11 : .20;
  pool.blendType = pc.BLEND_NORMAL;
  pool.depthWrite = false;
  pool.cull = pc.CULLFACE_NONE;
  pool.update();
  const pools = meshEntity(app.graphicsDevice, root,
    "Soft light pools painted on curved Cortina piste",
    poolP, poolIdx, pool, undefined, poolUV);
  pools.render!.castShadows = false;

  return { materials: [glow, pool], textures: [tex] };
}
