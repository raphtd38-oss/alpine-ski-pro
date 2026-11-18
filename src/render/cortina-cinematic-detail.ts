import * as pc from "playcanvas";
import type { Course, Quality } from "../game/types";
import { courseCenterX, terrainHeight } from "../game/course";
import { material, meshEntity, rng, shape, beam } from "./geometry";
import { appendDolomiteRidge, newRockBatch } from "./cortina-geology";

/**
 * Cinematic, original Cortina scenery inspired by the owner's sunset image.
 * Render geometry only: NEVER changes terrainHeight, ski collisions, or gates.
 * Every large detail group is a single mesh, with explicit mobile budgets.
 */
export const CORTINA_SCENIC_BUDGET: Record<Quality, {
  woodland: number; mountainSpurs: number; corduroyTracks: number;
  netStep: number;
}> = {
  low: { woodland: 95, mountainSpurs: 5, corduroyTracks: 0, netStep: 12 },
  medium: { woodland: 235, mountainSpurs: 8, corduroyTracks: 13, netStep: 9 },
  high: { woodland: 440, mountainSpurs: 12, corduroyTracks: 24, netStep: 7 },
  ultra: { woodland: 640, mountainSpurs: 17, corduroyTracks: 28, netStep: 6 },
};

type Points = { p: number[]; i: number[]; colors: number[] };
function group(): Points { return { p: [], i: [], colors: [] }; }
function vert(g: Points, x: number, y: number, z: number,
  rgb: readonly [number, number, number], alpha = 1): number {
  const index = g.p.length / 3;
  g.p.push(x, y, z);
  g.colors.push(rgb[0], rgb[1], rgb[2], alpha);
  return index;
}
function face(g: Points, a: number, b: number, c: number) {
  g.i.push(a, b, c);
}

/**
 * Small CC0-independent limestone normal map built deterministically from
 * sediment ridges and hairline cracks. Tiled UVs follow actual rock vertices,
 * not a flat normal applied to each entire mountain face.
 */
function buildDolomiteNormalMap(
  app: pc.Application, quality: Quality,
): pc.Texture | null {
  // Even mobile gets an inexpensive normal map: plain flat cliff
  // triangles were too smooth to resemble limestone in real race views.
  const size = quality === "ultra" ? 384 :
    quality === "high" ? 256 : quality === "medium" ? 128 : 96;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  const data = context.createImageData(size, size);
  const heightAt = (x: number, y: number): number => {
    const TAU = 2 * Math.PI;
    const strata = Math.sin(TAU * (14 * y + 1.2 * x)) * .46 +
      Math.cos(TAU * (6 * y - .55 * x)) * .20;
    const vein = Math.cos(TAU * (12 * x + 3 * y)) * .11;
    const fractured = Math.pow(
      Math.max(0, Math.sin(TAU * (5 * x - 2 * y))), 18) * .20;
    return strata + vein - fractured;
  };
  const du = 1 / size;
  const out = data.data;
  for (let v = 0; v < size; v++)
    for (let u = 0; u < size; u++) {
      const x = u / size, y = v / size;
      const dx = heightAt(x + du, y) - heightAt(x - du, y);
      const dy = heightAt(x, y + du) - heightAt(x, y - du);
      const nx = -dx * 1.8, ny = -dy * 1.8, nz = 1;
      const length = Math.hypot(nx, ny, nz);
      const index = (v * size + u) * 4;
      out[index] = Math.round(127.5 + 127.5 * nx / length);
      out[index + 1] = Math.round(127.5 + 127.5 * ny / length);
      out[index + 2] = Math.round(127.5 + 127.5 * nz / length);
      out[index + 3] = 255;
    }
  context.putImageData(data, 0, 0);
  const tex = new pc.Texture(app.graphicsDevice, {
    name: "Original Cortina layered dolomite tangent-space normal atlas",
    mipmaps: true,
  });
  tex.setSource(canvas);
  tex.addressU = tex.addressV = pc.ADDRESS_REPEAT;
  tex.anisotropy = quality === "medium" ? 2 : 4;
  return tex;
}

/**
 * Ridged limestone with horizontal sediment ledges, hard silhouettes, warm
 * west-facing highlights and snow on the cold summit. Stylized geometry, not DEM.
 */
function mountainSpurs(
  app: pc.Application, root: pc.Entity, course: Course,
  quality: Quality, mats: pc.StandardMaterial[],
  textures: pc.Texture[],
) {
  const cfg = CORTINA_SCENIC_BUDGET[quality];
  const rand = rng(20260212);
  // This replaces the former tall ring/cylinder stacks. Each section is a
  // fractured rock *wall* with a jagged, continuous summit silhouette.
  const ridge = newRockBatch();
  const anchors = [
    { z: 85, side: -1, dist: 200, h: 225, w: 52 },
    { z: 150, side: -1, dist: 290, h: 300, w: 67 },
    { z: 310, side: 1, dist: 230, h: 220, w: 63 },
    { z: 545, side: -1, dist: 310, h: 260, w: 85 },
    { z: 750, side: 1, dist: 340, h: 235, w: 88 },
    { z: 1100, side: -1, dist: 275, h: 240, w: 75 },
    { z: 1430, side: 1, dist: 325, h: 260, w: 87 },
    { z: 1820, side: -1, dist: 300, h: 220, w: 70 },
  ];
  for (let n = 0; n < cfg.mountainSpurs; n++) {
    const entry = anchors[n % anchors.length];
    const z = entry.z + (n >= anchors.length ? 65 + rand() * 220 : 0);
    const x = courseCenterX(z, course) +
      entry.side * (entry.dist + (rand() - 0.5) * 25);
    appendDolomiteRidge(ridge, {
      x, z,
      height: entry.h * (quality === "low" ? .66 : .79) *
        (.77 + rand() * .41),
      radius: entry.w * (.85 + rand() * .31),
      seed: 600 + n * 23,
      ground: (xx, zz) => terrainHeight(xx, zz, course) - 10,
      segments: quality === "low" ? 16 : quality === "medium" ? 22 : 30,
      strata: quality === "low" ? 10 : quality === "medium" ? 14 : 19,
      elongation: n % 3 === 0 ? 2.1 : 1.75,
    });
  }
  const rockMat = material("Tofane continuous fractured limestone ridges",
    "#ffffff", 0, .12);
  rockMat.diffuseVertexColor = true;
  rockMat.cull = pc.CULLFACE_NONE;
  const limestoneNormal = buildDolomiteNormalMap(app, quality);
  if (limestoneNormal) {
    rockMat.normalMap = limestoneNormal;
    rockMat.bumpiness = .54;
    textures.push(limestoneNormal);
  }
  rockMat.update();
  mats.push(rockMat);
  const mesh = meshEntity(app.graphicsDevice, root,
    "Tofane multi-peak jagged limestone walls with snow gullies",
    ridge.positions, ridge.indices, rockMat, ridge.colors, ridge.uvs);
  mesh.render!.castShadows = quality === "ultra";
}

/** Layered dark larch/spruce forest and scattered golden larches. */
function denseWoodland(
  app: pc.Application, root: pc.Entity, course: Course, quality: Quality,
  mats: pc.StandardMaterial[],
) {
  const wood = group(), rand = rng(3427002);
  const sides = quality === "low" ? 6 : 8;
  const count = CORTINA_SCENIC_BUDGET[quality].woodland;
  const pine: [number, number, number] = [.075, .17, .135];
  const bluePine: [number, number, number] = [.085, .20, .20];
  const larch: [number, number, number] = [.32, .24, .15];
  for (let i = 0; i < count; i++) {
    const z = -24 + rand() * (course.length + 100);
    // The Schuss and high rocky chute are less wooded.
    if (z < 450 && rand() > .55) continue;
    const sign = i % 2 === 0 ? -1 : 1;
    const dist = course.width / 2 + 12 + Math.pow(rand(), 1.25) * 117;
    const x = courseCenterX(z, course) + sign * dist;
    const y = terrainHeight(x, z, course);
    const height = 7 + rand() * 14;
    const radius = .23 * height;
    const foliage = rand() < .12 ? larch : rand() < .38 ? bluePine : pine;
    const snow = rand() < .73;
    const leanX = (rand() - .5) * height * .12;
    const leanZ = (rand() - .5) * height * .10;
    // Four-sided larch/spruce trunk with subtle bending in alpine wind.
    // Still part of the ONE batched woodland mesh, not per-tree draw calls.
    if (quality !== "low") {
      const trunkRadius = .075 + height * .009;
      const t0 = wood.p.length / 3;
      for (const sy of [0, height * .53])
        for (const [dx, dz] of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
          const fraction = sy / height;
          vert(wood,
            x + dx * trunkRadius + leanX * fraction,
            y + sy,
            z + dz * trunkRadius + leanZ * fraction,
            [.28 - fraction * .06, .20 - fraction * .03, .15]);
        }
      for (let j = 0; j < 4; j++) {
        const n0 = t0 + j, n1 = t0 + (j + 1) % 4;
        face(wood, n0, n0 + 4, n1);
        face(wood, n1, n0 + 4, n1 + 4);
      }
    }
    // Branch whorls make recognisable natural silhouettes, with white tips.
    for (let tier = 0; tier < 6; tier++) {
      const t = tier / 6;
      const by = y + .7 + t * height * .85;
      const r = radius * (1 - .77 * t) * (.78 + rand() * .35);
      const tip = vert(wood,
        x + leanX * (.2 + t * .72),
        by + height * (.22 - .05 * t),
        z + leanZ * (.2 + t * .72),
        [foliage[0] * 1.35, foliage[1] * 1.25, foliage[2] * 1.25]);
      const indices: number[] = [];
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * Math.PI * 2;
        const tint = .77 + .23 * Math.max(0, Math.sin(a + .35));
        indices.push(vert(wood,
          x + leanX * t + r * Math.cos(a),
          by - .07,
          z + leanZ * t + r * Math.sin(a),
          [foliage[0] * tint, foliage[1] * tint, foliage[2] * tint]));
      }
      for (let j = 0; j < sides; j++)
        face(wood, tip, indices[j], indices[(j + 1) % sides]);
      if (snow && (tier >= 3 || (i + tier) % 4 === 0)) {
        const snowTip = vert(wood,
          x + leanX * (.2 + t * .72),
          by + height * (.22 - .05 * t) + .09,
          z + leanZ * (.2 + t * .72),
          [.80, .88, .90]);
        for (let j = 0; j < sides; j += 2) {
          const a = 2 * Math.PI * j / sides;
          const b = 2 * Math.PI * (j + 1) / sides;
          const v1 = vert(wood, x + leanX * t + r * .78 * Math.cos(a),
            by + .06, z + leanZ * t + r * .78 * Math.sin(a),
            [.69, .77, .79]);
          const v2 = vert(wood, x + leanX * t + r * .78 * Math.cos(b),
            by + .06, z + leanZ * t + r * .78 * Math.sin(b),
            [.91, .95, .94]);
          face(wood, snowTip, v1, v2);
        }
      }
    }
  }
  const m = material("Cortina dense mixed winter conifer forest", "#ffffff", 0, .13);
  m.diffuseVertexColor = true;
  m.cull = pc.CULLFACE_NONE;
  m.update();
  mats.push(m);
  const forest = meshEntity(app.graphicsDevice, root,
    "Cortina tall firs, dark spruce and larch winter woodland",
    wood.p, wood.i, m, wood.colors);
  forest.render!.castShadows = false;
}

/** Longitudinal tracks gently shade the groomed snow without affecting physics. */
function groomedSnow(
  app: pc.Application, root: pc.Entity, course: Course, quality: Quality,
  mats: pc.StandardMaterial[],
) {
  const budget = CORTINA_SCENIC_BUDGET[quality].corduroyTracks;
  if (!budget) return;
  const p: number[] = [], idx: number[] = [];
  const pitch = quality === "ultra" ? 4.9 : quality === "high" ? 6.2 : 9.2;
  const left = -course.width / 2 + 4.6;
  const span = course.width - 9.2;
  for (let z = 0; z < course.length; z += pitch) {
    const za = z, zb = Math.min(course.length, z + pitch);
    for (let strip = 0; strip < budget; strip++) {
      const lateral = left + span * (strip + .5) / budget;
      const wav = (value: number) => .038 * Math.sin(value * .052 + strip * .68);
      const xa = courseCenterX(za, course) + lateral + wav(za);
      const xb = courseCenterX(zb, course) + lateral + wav(zb);
      const w = .035;
      const n = p.length / 3;
      p.push(
        xa - w, terrainHeight(xa - w, za, course) + .052, za,
        xa + w, terrainHeight(xa + w, za, course) + .052, za,
        xb - w, terrainHeight(xb - w, zb, course) + .052, zb,
        xb + w, terrainHeight(xb + w, zb, course) + .052, zb,
      );
      idx.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
    }
  }
  const m = material("Cortina fine groomed snow corduroy", "#bcd3e2", 0, .12);
  m.opacity = .23;
  m.blendType = pc.BLEND_NORMAL;
  m.depthWrite = false;
  m.cull = pc.CULLFACE_NONE;
  m.update();
  mats.push(m);
  const marks = meshEntity(app.graphicsDevice, root,
    "Grooming lines following curved Cortina pistes", p, idx, m);
  marks.render!.castShadows = false;
}

/** Proper red A-net walls with a light fabric fill and diagonal net yarns. */
function raceSafetyNets(
  app: pc.Application, root: pc.Entity, course: Course, quality: Quality,
  mats: pc.StandardMaterial[],
) {
  const strands: number[] = [], indices: number[] = [];
  const fill: number[] = [], fillIdx: number[] = [];
  const interval = CORTINA_SCENIC_BUDGET[quality].netStep;
  const append = (arr: number[], ind: number[],
    a: [number, number, number], b: [number, number, number],
    thickness: number) => {
    const n = arr.length / 3;
    arr.push(a[0], a[1] - thickness, a[2],
      a[0], a[1] + thickness, a[2],
      b[0], b[1] - thickness, b[2],
      b[0], b[1] + thickness, b[2]);
    ind.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
  };
  for (const side of [-1, 1]) {
    for (let z = 5; z < course.length + 20; z += interval) {
      const zz = Math.min(course.length + 20, z + interval);
      const position = (at: number, height: number): [number, number, number] => {
        const x = courseCenterX(at, course) + side * (course.width / 2 + .67);
        return [x, terrainHeight(x, at, course) + height, at];
      };
      const a = position(z, .12), b = position(zz, .12);
      const c = position(z, 1.93), d = position(zz, 1.93);
      const n = fill.length / 3;
      fill.push(...a, ...b, ...c, ...d);
      fillIdx.push(n, n + 1, n + 2, n + 2, n + 1, n + 3);
      for (const h of [.14, .72, 1.32, 1.91])
        append(strands, indices, position(z,h), position(zz,h), .012);
      // Sloping diamond net stitches (lightweight batched yarns).
      for (let f = 0; f < 4; f++) {
        const from = z + f * interval / 4;
        const to = z + (f + 1) * interval / 4;
        append(strands, indices, position(from,.14), position(to,1.91), .009);
        append(strands, indices, position(from,1.91), position(to,.14), .009);
      }
    }
  }
  const red = material("Cortina mesh fencing threads", "#e4433c", 0, .20);
  red.cull = pc.CULLFACE_NONE;
  red.update();
  mats.push(red);
  const threadMesh = meshEntity(app.graphicsDevice, root,
    "Tall Cortina woven red course safety A nets", strands, indices, red);
  threadMesh.render!.castShadows = false;
  const tinted = material("Cortina transparent safety net backdrop", "#cf2827");
  tinted.opacity = .12;
  tinted.blendType = pc.BLEND_NORMAL;
  tinted.depthWrite = false;
  tinted.cull = pc.CULLFACE_NONE;
  tinted.update();
  mats.push(tinted);
  const backdrop = meshEntity(app.graphicsDevice, root,
    "Cortina translucent red race safety fabric", fill, fillIdx, tinted);
  backdrop.render!.castShadows = false;
}


/**
 * Faraway hillside rooftops and warm chalet windows help sell the valley
 * atmosphere of the reference image. These are not real building footprints.
 */
function distantCortinaVillage(
  app: pc.Application, root: pc.Entity, course: Course, quality: Quality,
  mats: pc.StandardMaterial[],
) {
  if (quality === "low") return;
  const rand = rng(56012026);
  const homes = group(), windows = group();
  const count = quality === "medium" ? 24 : quality === "high" ? 43 : 64;
  for (let i = 0; i < count; i++) {
    const z = 1750 + rand() * 455;
    const x = courseCenterX(z, course) + 145 + rand() * 215;
    const ground = terrainHeight(x, z, course) + .2;
    const w = 4.2 + rand() * 7.4, d = 3.8 + rand() * 5.2;
    const h = 3.2 + rand() * 5.2;
    const cx = x, cz = z;
    const grey: [number,number,number] =
      i % 4 === 0 ? [.57,.52,.48] : [.67,.61,.53];
    const index = homes.p.length / 3;
    const corners = [
      [-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2],
      [-w/2,h,-d/2],[w/2,h,-d/2],[w/2,h,d/2],[-w/2,h,d/2],
    ] as const;
    for(const [dx,dy,dz] of corners) vert(homes,cx+dx,ground+dy,cz+dz,grey);
    for(const [a,b,c] of [
      [0,1,4],[1,5,4],[1,2,5],[2,6,5],
      [2,3,6],[3,7,6],[3,0,7],[0,4,7],
      [4,5,6],[4,6,7],[0,2,1],[0,3,2],
    ]) face(homes,index+a,index+b,index+c);
    const roofHeight = 1.6 + rand()*1.4;
    const peakFront = vert(homes,cx,ground+h+roofHeight,cz-d*.55,
      [.86,.88,.89]);
    const peakRear = vert(homes,cx,ground+h+roofHeight,cz+d*.55,
      [.86,.88,.89]);
    const eaves = [4,5,6,7].map(j=> index+j);
    face(homes,eaves[0],eaves[1],peakFront);
    face(homes,eaves[3],peakRear,eaves[2]);
    face(homes,eaves[0],peakRear,eaves[3]);
    face(homes,eaves[0],peakFront,peakRear);
    face(homes,eaves[1],eaves[2],peakRear);
    face(homes,eaves[1],peakRear,peakFront);
    for(let column = -1; column <= 1; column++) {
      const wx = cx + column * w*.29, wy = ground+h*.57;
      const zWindow = cz-d*.5-.055;
      const n=windows.p.length/3;
      const ww=.36, wh=.58;
      for(const [xx,yy] of [
        [wx-ww,wy-wh],[wx+ww,wy-wh],[wx-ww,wy+wh],[wx+ww,wy+wh],
      ]) vert(windows,xx,yy,zWindow,[.99,.72,.35]);
      face(windows,n,n+1,n+2);
      face(windows,n+2,n+1,n+3);
    }
  }
  const building = material("Original Cortina distant hillside village", "#ffffff",0,.16);
  building.diffuseVertexColor = true;
  building.cull = pc.CULLFACE_NONE;
  building.update();
  mats.push(building);
  meshEntity(app.graphicsDevice,root,
    "Cortina-inspired distant village buildings and snow roofs",
    homes.p,homes.i,building,homes.colors).render!.castShadows=false;

  const lit = material("Cortina warm chalet window glow", "#eec18c",0,.16);
  lit.useLighting = false;
  lit.emissive = new pc.Color(.97,.63,.28);
  lit.emissiveIntensity = 1.6;
  lit.cull = pc.CULLFACE_NONE;
  lit.update();
  mats.push(lit);
  meshEntity(app.graphicsDevice,root,
    "Warm illuminated windows in distant village",
    windows.p,windows.i,lit).render!.castShadows=false;
}

function broadcastPlatforms(
  root: pc.Entity, course: Course, quality: Quality,
  mats: pc.StandardMaterial[],
) {
  if (quality === "low") return;
  const steel = material("Cortina broadcast scaffolding aluminium", "#717882", .46, .37);
  const dark = material("Cortina camera and winter coat", "#262e38", .16, .18);
  const warm = material("Cortina operator orange jacket", "#e76c31", 0, .2);
  mats.push(steel,dark,warm);
  for (const [i, z] of [180, 900, 1865, 2050].entries()) {
    const sign = i % 2 ? 1 : -1;
    const x = courseCenterX(z, course) +
      sign * (course.width / 2 + 14);
    const y = terrainHeight(x,z,course);
    for (const dx of [-2.2, 2.2])
      for (const dz of [-1.8,1.8])
        beam(root,
          new pc.Vec3(x + dx, y + .3, z + dz),
          new pc.Vec3(x + dx, y + 5.0, z + dz),
          .085,steel,"Scaffold upright");
    shape(root,"box","Elevated Cortina camera platform",
      [x,y+4.7,z],[5.4,.17,4.4],steel).render!.castShadows = false;
    for (const dx of [-2.1,2.1])
      beam(root, new pc.Vec3(x+dx,y+1,z-1.8),
        new pc.Vec3(x-dx,y+4.65,z-1.8),
        .08,steel,"Broadcast brace");
    shape(root,"box","World Cup race camera body",
      [x,y+5.75,z-.8],[.48,.45,.95],dark).render!.castShadows=false;
    shape(root,"cylinder","Camera lens shade",
      [x,y+5.7,z-1.37],[.20,.6,.20],dark).render!.castShadows=false;
    shape(root,"capsule","Camera operator winter jacket",
      [x+1.0,y+5.45,z+.6],[.6,1.15,.6],
      i === 2 ? warm : dark).render!.castShadows=false;
    shape(root,"sphere","Camera operator winter helmet",
      [x+1.0,y+6.14,z+.6],[.35,.34,.35],dark).render!.castShadows=false;
  }
}

/** One entrypoint into the World constructor, with all resources owned by World. */
export function addCortinaCinematicDetails(
  app: pc.Application, root: pc.Entity, course: Course, quality: Quality,
): { materials: pc.StandardMaterial[]; textures: pc.Texture[] } {
  const materials: pc.StandardMaterial[] = [];
  const textures: pc.Texture[] = [];
  mountainSpurs(app, root, course, quality, materials, textures);
  denseWoodland(app, root, course, quality, materials);
  groomedSnow(app, root, course, quality, materials);
  raceSafetyNets(app, root, course, quality, materials);
  broadcastPlatforms(root, course, quality, materials);
  distantCortinaVillage(app, root, course, quality, materials);
  return { materials, textures };
}
