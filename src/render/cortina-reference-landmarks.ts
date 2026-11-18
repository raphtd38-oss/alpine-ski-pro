import * as pc from "playcanvas";
import type { Course, Quality } from "../game/types";
import { courseCenterX, terrainHeight } from "../game/course";
import { material, meshEntity, rng } from "./geometry";

/**
 * Photographic-reference pass for Cortina's Tofane environment.
 *
 * Original hand-authored landmarks, NOT surveyed terrain or an official digital
 * twin. Only scenery is added; no race geometry, timing, gates or collision
 * surfaces are changed. The six owner-provided photos guide shapes and colour.
 * Wide, repeatable meshes are batched to keep PlayCanvas/WebGL draw calls low.
 */
export const CORTINA_REFERENCE_DETAIL: Record<Quality, {
  rockFaces: number; rockSections: number; rockLevels: number;
  nearTrees: number; looseStones: number;
}> = {
  low:    { rockFaces: 3, rockSections: 13, rockLevels: 8,  nearTrees: 12,  looseStones: 32 },
  medium: { rockFaces: 5, rockSections: 19, rockLevels: 10, nearTrees: 35,  looseStones: 76 },
  high:   { rockFaces: 7, rockSections: 25, rockLevels: 12, nearTrees: 76,  looseStones: 135 },
  ultra:  { rockFaces: 8, rockSections: 33, rockLevels: 15, nearTrees: 122, looseStones: 200 },
};

export const CORTINA_REFERENCE_ROCK_FACES = [
  { name: "Schuss — left stratified rock corridor", station: 139, side: -1, offset: 100, span: 174, height: 130 },
  { name: "Schuss — right dolomite shoulder", station: 176, side: 1, offset: 100, span: 177, height: 150 },
  { name: "Duca d'Aosta — exposed limestone ledge", station: 350, side: -1, offset: 112, span: 132, height: 103 },
  { name: "Delta — stepped rock buttress", station: 700, side: 1, offset: 119, span: 147, height: 116 },
  { name: "Gran Curvone — high fractured cliff", station: 915, side: -1, offset: 139, span: 204, height: 143 },
  { name: "Scarpadon — shaded stone gully", station: 1190, side: 1, offset: 128, span: 165, height: 128 },
  { name: "Rumerlo — lower crags and snowy shelves", station: 1540, side: -1, offset: 145, span: 185, height: 105 },
  { name: "Finish approach — wooded limestone outcrop", station: 1920, side: 1, offset: 137, span: 142, height: 74 },
] as const;

/** Visual placement in the game's SCHEMATIC course coordinates (metres). */
export function cortinaReferenceFootprints(course: Course, quality: Quality) {
  return CORTINA_REFERENCE_ROCK_FACES
    .slice(0, CORTINA_REFERENCE_DETAIL[quality].rockFaces)
    .map(face => ({
      name: face.name,
      z: face.station,
      x: courseCenterX(face.station, course) + face.side * face.offset,
      clearance: face.offset - course.width / 2,
      height: face.height,
    }));
}

type Batch = { positions: number[]; indices: number[]; colors: number[] };
const batch = (): Batch => ({ positions: [], indices: [], colors: [] });
type Tint = readonly [number, number, number];
function v(out: Batch, x: number, y: number, z: number, tint: Tint): number {
  const index = out.positions.length / 3;
  out.positions.push(x, y, z);
  out.colors.push(tint[0], tint[1], tint[2], 1);
  return index;
}
function triangle(out: Batch, a: number, b: number, c: number) {
  out.indices.push(a, b, c);
}
function quad(out: Batch, a: number, b: number, c: number, d: number) {
  triangle(out, a, b, c);
  triangle(out, b, d, c);
}

/**
 * A continuous, faceted limestone ridge instead of isolated rock cones.
 * The terrace lines and erosion seams are actual triangles. The snow is a
 * separate patch mesh on ledges; it is not a flat white paint overlay.
 */
function addReferenceCliffs(
  app: pc.Application, root: pc.Entity, course: Course, quality: Quality,
  materials: pc.StandardMaterial[],
) {
  const rock = batch();
  const snowfall = batch();
  const { rockSections, rockLevels, rockFaces } = CORTINA_REFERENCE_DETAIL[quality];
  for (const [faceIndex, face] of CORTINA_REFERENCE_ROCK_FACES.slice(0, rockFaces).entries()) {
    const base = rock.positions.length / 3;
    const seed = faceIndex * 11.77 + 0.8;
    const sample = (j: number, k: number) => {
      const along = j / rockSections;
      const z = face.station + (along - .5) * face.span;
      const localOffset = face.offset + 6.5 * Math.sin(along * 11 + seed) +
        2.6 * Math.sin(along * 37 + seed * 2);
      // Stay well outside the 62m racing corridor, including at cliff bases.
      const x0 = courseCenterX(z, course) + face.side * localOffset;
      const t = k / rockLevels;
      const silhouette = .53 + .32 * Math.sin(Math.PI * along) +
        .09 * Math.sin(along * 18 + seed) + .055 * Math.cos(along * 35 - seed);
      const h = face.height * Math.max(.31, silhouette);
      const stratification = (k % 4 === 0 ? 2.3 : k % 4 === 1 ? -1.1 : .25);
      const lateral = 7.7 * Math.sin(t * 2.8 + along * 6 + seed) +
        4.4 * Math.sin(t * 15.3 + along * 9.1 + seed * 2) +
        stratification;
      const x = x0 + face.side * lateral;
      const y = terrainHeight(x0, z, course) - 2.2 + t * h +
        1.1 * Math.sin(along * 32 + t * 18);
      return { x, y, z, t, along };
    };
    for (let j = 0; j <= rockSections; j++) {
      for (let k = 0; k <= rockLevels; k++) {
        const point = sample(j, k);
        const strata = Math.sin(k * 3.7 + j * .55) * .055;
        const exposed = .80 + .14 * Math.sin(j * 1.13 + seed);
        const shade = (1 - .10 * (1 - point.t)) * exposed;
        const warm = .66 + Math.max(0, Math.sin(j * .27 + seed)) * .22;
        v(rock, point.x, point.y, point.z, [
          Math.min(1, (.65 + warm * .30 + strata) * shade),
          Math.min(1, (.64 + warm * .19 + strata) * shade),
          Math.min(1, (.61 + warm * .13 + strata) * shade),
        ]);
      }
    }
    for (let j = 0; j < rockSections; j++) {
      for (let k = 0; k < rockLevels; k++) {
        const a = base + j * (rockLevels + 1) + k;
        const b = a + rockLevels + 1;
        quad(rock, a, b, a + 1, b + 1);
        // Snow collects on irregular, upward-facing erosion shelves.
        if (k > rockLevels * .47 && (k % 3 === 0) &&
            (j + faceIndex * 3) % 5 !== 0) {
          const p0 = sample(j, k), p1 = sample(j + 1, k);
          const q0 = sample(j, k + 1), q1 = sample(j + 1, k + 1);
          const aS = v(snowfall, p0.x - face.side * .48, p0.y + .32, p0.z,
            [.87, .91, .92]);
          const bS = v(snowfall, p1.x - face.side * .48, p1.y + .30, p1.z,
            [.91, .94, .95]);
          const cS = v(snowfall, (p0.x + q0.x) / 2 - face.side * .64,
            p0.y + (q0.y - p0.y) * .43 + .35, p0.z,
            [.77, .84, .87]);
          const dS = v(snowfall, (p1.x + q1.x) / 2 - face.side * .64,
            p1.y + (q1.y - p1.y) * .43 + .32, p1.z,
            [.80, .87, .90]);
          quad(snowfall, aS, bS, cS, dS);
        }
      }
    }
  }
  const cliffMaterial = material("Cortina 2026 limestone fracture faces", "#ffffff", 0, .12);
  cliffMaterial.diffuseVertexColor = true;
  cliffMaterial.cull = pc.CULLFACE_NONE;
  cliffMaterial.update();
  materials.push(cliffMaterial);
  const e = meshEntity(app.graphicsDevice, root,
    "Cortina reference: continuous Schuss and Duca limestone ridges",
    rock.positions, rock.indices, cliffMaterial, rock.colors);
  e.render!.castShadows = quality === "high" || quality === "ultra";

  if (snowfall.indices.length) {
    const snowMaterial = material("Cortina snow lodged on dolomite shelves", "#ffffff", 0, .10);
    snowMaterial.diffuseVertexColor = true;
    snowMaterial.cull = pc.CULLFACE_NONE;
    snowMaterial.update();
    materials.push(snowMaterial);
    meshEntity(app.graphicsDevice, root, "Irregular shelf snow on rock strata",
      snowfall.positions, snowfall.indices, snowMaterial,
      snowfall.colors).render!.castShadows = false;
  }
}

/** Detailed foreground spruces and seasonally bare winter larches.
 * Background trees remain in the original batched woodland LOD.
 */
function addNearForest(
  app: pc.Application, root: pc.Entity, course: Course, quality: Quality,
  materials: pc.StandardMaterial[],
) {
  const forest = batch();
  const rand = rng(26021207);
  const total = CORTINA_REFERENCE_DETAIL[quality].nearTrees;
  for (let i = 0; i < total; i++) {
    const z = 470 + rand() * (course.length - 520);
    const side = i % 2 ? 1 : -1;
    const distance = course.width / 2 + 22 + Math.pow(rand(), .72) * 72;
    const x = courseCenterX(z, course) + side * distance;
    const ground = terrainHeight(x, z, course) + .06;
    const h = 8 + rand() * 15;
    const radius = h * (.17 + rand() * .055);
    const larch = rand() < .19;
    const needles: Tint = rand() < .5 ? [.079, .187, .149] : [.085, .172, .161];
    const wood: Tint = [.27, .235, .205];
    const drifted = rand() < .56;
    // Visible tapered, four-sided trunk; varied whorls are not whole-tree cones.
    const base: number[] = [], top: number[] = [];
    for (let j = 0; j < 4; j++) {
      const angle = 2 * Math.PI * j / 4;
      base.push(v(forest, x + .17 * Math.cos(angle), ground,
        z + .17 * Math.sin(angle), wood));
      top.push(v(forest, x + .045 * Math.cos(angle), ground + h,
        z + .045 * Math.sin(angle), wood));
    }
    for (let j = 0; j < 4; j++)
      quad(forest, base[j], base[(j+1)%4], top[j], top[(j+1)%4]);
    const tiers = larch ? 8 : 9;
    for (let tier = 0; tier < tiers; tier++) {
      const t = (tier + .28) / tiers;
      const branchY = ground + h * t;
      const length = radius * Math.pow(1 - t, .81) * (.72 + rand() * .46);
      const rotation = (tier % 2) * .31 + rand() * .11;
      const count = larch ? 7 : 9;
      for (let j = 0; j < count; j++) {
        const a = (j / count) * Math.PI * 2 + rotation;
        const dx = Math.cos(a), dz = Math.sin(a);
        const elevation = larch ? .20 : -.20;
        const bx = x + dx * length, bz = z + dz * length;
        const by = branchY + length * elevation + .04 * Math.sin(i+j);
        const mid = v(forest, x + dx * .12, branchY + .03, z + dz * .12,
          wood);
        const left = v(forest, bx - dz * (larch ? .035 : length * .20),
          by - (larch ? .028 : .13), bz + dx * (larch ? .035 : length * .20),
          larch ? wood : needles);
        const right = v(forest, bx + dz * (larch ? .035 : length * .20),
          by + (larch ? .035 : .25), bz - dx * (larch ? .035 : length * .20),
          larch ? wood : needles);
        triangle(forest, mid, left, right);
        if (!larch && drifted && tier > 2 && (tier + j + i) % 4 === 0) {
          const snowA = v(forest, x + dx * length * .55,
            branchY + .16, z + dz * length * .55, [.84,.89,.91]);
          const snowB = v(forest, bx - dz * length * .10,
            by + .26, bz + dx * length * .10, [.90,.94,.94]);
          const snowC = v(forest, bx + dz * length * .10,
            by + .25, bz - dx * length * .10, [.77,.84,.87]);
          triangle(forest, snowA, snowB, snowC);
        }
        if (larch && tier % 2 === 0) {
          const twig = v(forest, bx + dx * .12, by + length * .18,
            bz + dz * .12, [.34,.29,.23]);
          triangle(forest, mid, left, twig);
        }
      }
    }
  }
  const treeMaterial = material("Cortina winter spruce and bare larch details", "#ffffff", 0, .16);
  treeMaterial.diffuseVertexColor = true;
  treeMaterial.cull = pc.CULLFACE_NONE;
  treeMaterial.update();
  materials.push(treeMaterial);
  meshEntity(app.graphicsDevice, root,
    "Foreground Cortina spruce branch whorls and leafless larches",
    forest.positions, forest.indices, treeMaterial,
    forest.colors).render!.castShadows = false;
}

/** Photographic foreground detail: irregular debris on safe exterior shoulders. */
function addTalus(
  app: pc.Application, root: pc.Entity, course: Course, quality: Quality,
  materials: pc.StandardMaterial[],
) {
  const debris = batch(), rand = rng(20260091);
  for (let i = 0; i < CORTINA_REFERENCE_DETAIL[quality].looseStones; i++) {
    const z = 70 + rand() * (course.length - 145);
    const side = i % 2 ? 1 : -1;
    const x = courseCenterX(z, course) + side *
      (course.width / 2 + 11 + rand() * 105);
    const y = terrainHeight(x, z, course) + .14;
    const s = .23 + Math.pow(rand(), 2) * 2.7;
    const tint: Tint = i % 5 ? [.48,.46,.43] : [.69,.57,.46];
    const a = v(debris,x-s,y,z-s,tint);
    const b = v(debris,x+s*.85,y+.05*s,z-s*.4,tint);
    const c = v(debris,x+s*.13,y+s*.82,z+.07*s,
      [.70,.67,.60]);
    const d = v(debris,x+s*.6,y,z+s,tint);
    const e = v(debris,x-s*.92,y+.03*s,z+s*.7,tint);
    triangle(debris,a,c,b);
    triangle(debris,b,c,d);
    triangle(debris,d,c,e);
    triangle(debris,e,c,a);
  }
  const rubble = material("Cortina weathered limestone talus", "#ffffff", 0, .13);
  rubble.diffuseVertexColor = true;
  rubble.cull = pc.CULLFACE_NONE;
  rubble.update();
  materials.push(rubble);
  meshEntity(app.graphicsDevice, root,
    "Cortina limestone gravel and small boulders outside piste",
    debris.positions, debris.indices, rubble,
    debris.colors).render!.castShadows = false;
}

export function addCortinaReferenceLandmarks(
  app: pc.Application, root: pc.Entity, course: Course, quality: Quality,
): pc.StandardMaterial[] {
  const materials: pc.StandardMaterial[] = [];
  addReferenceCliffs(app, root, course, quality, materials);
  addNearForest(app, root, course, quality, materials);
  addTalus(app, root, course, quality, materials);
  return materials;
}
