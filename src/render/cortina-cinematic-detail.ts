import * as pc from "playcanvas";
import type { Course, Quality } from "../game/types";
import { courseCenterX, terrainHeight } from "../game/course";
import { material, meshEntity, rng, shape, beam } from "./geometry";

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
 * Ridged limestone with horizontal sediment ledges, hard silhouettes, warm
 * west-facing highlights and snow on the cold summit. Stylized geometry, not DEM.
 */
function mountainSpurs(
  app: pc.Application, root: pc.Entity, course: Course,
  quality: Quality,
  mats: pc.StandardMaterial[],
) {
  const cfg = CORTINA_SCENIC_BUDGET[quality];
  const rock = group(), snow = group();
  const rand = rng(20260212);
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
    const side = entry.side;
    const cx = courseCenterX(z, course) + side * (entry.dist + (rand() - 0.5) * 25);
    const baseY = terrainHeight(cx, z, course) - 9;
    const height = entry.h * (0.72 + rand() * 0.46);
    const width = entry.w * (0.82 + rand() * 0.40);
    const slices = 13, segments = 13;
    const start = rock.p.length / 3;
    const centerLean = (rand() - .5) * width * .48;
    const ridge = Array.from({length: segments}, () => .84 + rand() * .32);
    for (let level = 0; level <= slices; level++) {
      const t = level / slices;
      const sediment = level % 3 === 0 ? 1.10 : level % 3 === 1 ? .96 : 1;
      const taper = Math.max(.035, (1 - t * .79) * sediment);
      for (let sideIndex = 0; sideIndex < segments; sideIndex++) {
        const a = Math.PI * 2 * sideIndex / segments;
        const jag = .84 + .16 * Math.sin(level * 1.93 + sideIndex * 2.71);
        const r = width * taper * ridge[sideIndex] * jag;
        const x = cx + r * Math.cos(a) + centerLean * t;
        const yy = baseY + t * height +
          (1 - t) * 2.8 * Math.sin(a * 5.1 + level * 1.6);
        const zz = z + r * Math.sin(a) * 1.55;
        const strata = .88 - .13 * Math.abs(Math.sin(level * 1.7));
        const westLit = .67 + .29 * Math.max(0, Math.cos(a - 2.2));
        const lowerShade = (.89 + t * .13) * strata * westLit;
        // Pink limestone from a low amber sunset, cooler shaded faces.
        const rgb: [number, number, number] = [
          Math.min(1, .93 * lowerShade),
          Math.min(1, .78 * lowerShade),
          Math.min(1, .68 * lowerShade),
        ];
        vert(rock, x, yy, zz, rgb);
        // Irregular snow band near upper escarpments, not a solid white cone.
        if (t > .81 && (sideIndex + level * 3) % 5 !== 0)
          vert(snow, x + .12, yy + .34, zz, [.90, .93, .96]);
        else vert(snow, x + .12, yy + .34, zz, [.56, .64, .72], 0);
      }
    }
    for (let level = 0; level < slices; level++)
      for (let j = 0; j < segments; j++) {
        const a = start + level * segments + j;
        const b = start + level * segments + (j + 1) % segments;
        const c = a + segments, d = b + segments;
        face(rock, a, c, b); face(rock, b, c, d);
      }
    // Separate vertex-coloured patches on high ridges; same indexing.
    const snowStart = snow.p.length / 3 - (slices + 1) * segments;
    for (let level = Math.floor(slices * .81); level < slices; level++)
      for (let j = 0; j < segments; j++) {
        const a = snowStart + level * segments + j;
        const b = snowStart + level * segments + (j + 1) % segments;
        const c = a + segments, d = b + segments;
        face(snow, a, c, b); face(snow, b, c, d);
      }
  }
  const rockMat = material("Cortina Tofane pink stratified rock", "#ffffff", 0, .15);
  rockMat.diffuseVertexColor = true;
  rockMat.cull = pc.CULLFACE_NONE;
  rockMat.update();
  mats.push(rockMat);
  const escarpment = meshEntity(app.graphicsDevice, root,
    "Tofane towering layered limestone at sunset", rock.p, rock.i,
    rockMat, rock.colors);
  escarpment.render!.castShadows = quality === "ultra";

  const snowMat = material("Cortina wind-packed snow on ridges", "#e7edf0", 0, .23);
  snowMat.cull = pc.CULLFACE_NONE;
  snowMat.diffuseVertexColor = true;
  snowMat.update();
  mats.push(snowMat);
  // Only triangles with light summit vertices are emitted.
  if (snow.i.length) {
    const cap = meshEntity(app.graphicsDevice, root,
      "Tofane uneven high-altitude snow caps", snow.p, snow.i,
      snowMat, snow.colors);
    cap.render!.castShadows = false;
  }
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
    // Branch whorls make recognisable natural silhouettes, with white tips.
    for (let tier = 0; tier < 6; tier++) {
      const t = tier / 6;
      const by = y + .7 + t * height * .85;
      const r = radius * (1 - .77 * t) * (.78 + rand() * .35);
      const tip = vert(wood, x, by + height * (.22 - .05 * t), z,
        [foliage[0] * 1.35, foliage[1] * 1.25, foliage[2] * 1.25]);
      const indices: number[] = [];
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * Math.PI * 2;
        const tint = .77 + .23 * Math.max(0, Math.sin(a + .35));
        indices.push(vert(wood, x + r * Math.cos(a), by - .07, z + r * Math.sin(a),
          [foliage[0] * tint, foliage[1] * tint, foliage[2] * tint]));
      }
      for (let j = 0; j < sides; j++)
        face(wood, tip, indices[j], indices[(j + 1) % sides]);
      if (snow && (tier >= 3 || (i + tier) % 4 === 0)) {
        const snowTip = vert(wood, x, by + height * (.22 - .05 * t) + .09, z,
          [.80, .88, .90]);
        for (let j = 0; j < sides; j += 2) {
          const a = 2 * Math.PI * j / sides;
          const b = 2 * Math.PI * (j + 1) / sides;
          const v1 = vert(wood, x + r * .78 * Math.cos(a), by + .06,
            z + r * .78 * Math.sin(a), [.69, .77, .79]);
          const v2 = vert(wood, x + r * .78 * Math.cos(b), by + .06,
            z + r * .78 * Math.sin(b), [.91, .95, .94]);
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
): pc.StandardMaterial[] {
  const materials: pc.StandardMaterial[] = [];
  mountainSpurs(app, root, course, quality, materials);
  denseWoodland(app, root, course, quality, materials);
  groomedSnow(app, root, course, quality, materials);
  raceSafetyNets(app, root, course, quality, materials);
  broadcastPlatforms(root, course, quality, materials);
  distantCortinaVillage(app, root, course, quality, materials);
  return materials;
}
