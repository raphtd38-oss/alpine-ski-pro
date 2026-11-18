import * as pc from "playcanvas";
import type { Course, Quality } from "../game/types";
import { courseCenterX, terrainHeight } from "../game/course";
import { beam, material, meshEntity, rng, shape } from "./geometry";
import { appendDolomiteRidge } from "./cortina-geology";

/** Original procedural Cortina skyline and trackside details from the supplied
 * 2026 3D pack. Schematic, not GIS or official photogrammetry.
 * Gates, flags, physics, and blue dye belong to the existing World class.
 */
const LIMITS: Record<Quality, { cliffs: number; scree: number; trees: number }> = {
  low: { cliffs: 9, scree: 30, trees: 30 },
  medium: { cliffs: 15, scree: 60, trees: 75 },
  high: { cliffs: 23, scree: 115, trees: 125 },
  ultra: { cliffs: 31, scree: 170, trees: 230 },
};

function taperedCliff(
  vertices: number[], indices: number[], colors: number[],
  uvs: number[], x: number, y: number, z: number, radius: number,
  height: number, noiseSeed: number, course: Course,
) {
  // Replace the old 11-sided tower with a stratified, asymmetric wall.
  // The root base stays on the exact visual terrain outside the ski lane.
  appendDolomiteRidge({
    positions: vertices, indices, colors, uvs,
  }, {
    x, z, radius, height, seed: noiseSeed,
    ground: (xx, zz) => y +
      terrainHeight(xx, zz, course) - terrainHeight(x, z, course),
    segments: 22, strata: 14, elongation: 1.55,
  });
}

function chalet(
  root: pc.Entity, x: number, z: number, c: Course,
  facade: pc.Material, timber: pc.Material, roof: pc.Material, stone: pc.Material,
  name: string, scale = 1,
) {
  const base = terrainHeight(x, z, c) + 0.65;
  const building = new pc.Entity(name);
  root.addChild(building);
  const w = 9.5 * scale, d = 7 * scale, h = 5.2 * scale;
  shape(building, "box", name + " — stone foundation",
    [x, base + h * 0.24, z], [w * 1.05, h * 0.5, d * 1.05], stone);
  shape(building, "box", name + " — larch facade",
    [x, base + h * 0.74, z], [w, h * 0.55, d], facade);
  for (const side of [-1, 1]) {
    const yy = base + h + 0.75 * scale;
    beam(building, new pc.Vec3(x, yy + 2.1 * scale, z),
      new pc.Vec3(x + side * (w * 0.58), yy, z),
      0.20 * scale, roof, name + " — rafters");
    shape(building, "box", name + " — gutter",
      [x + side * (w * 0.51), yy, z],
      [0.19 * scale, 0.14 * scale, d * 1.2], roof);
  }
  for (const side of [-1, 1]) {
    const panel = shape(building, "box", name + " — snow roof panel",
      [x + side * w * 0.255, base + h + 1.37 * scale, z],
      [w * 0.66, 0.20 * scale, d * 1.24], roof);
    panel.setEulerAngles(0, 0, side * 25);
  }
  for (const side of [-1, 1])
    for (const along of [-1, 1])
      shape(building, "box", name + " — window",
        [x + side * (w * 0.505), base + h * 0.75,
          z + along * (d * 0.27)],
        [0.13 * scale, 1.05 * scale, 1.1 * scale], timber);
  shape(building, "box", name + " — entrance",
    [x, base + 0.9 * scale, z - d * 0.504],
    [1.4 * scale, 1.8 * scale, 0.15 * scale], timber);
}

export function addCortinaScenery(
  app: pc.Application, root: pc.Entity, course: Course, quality: Quality,
): pc.StandardMaterial[] {
  const mStone = material("Cortina pale stratified dolomite", "#ffffff", 0, 0.14);
  mStone.diffuseVertexColor = true;
  mStone.update();
  const scree = material("Cortina scree limestone", "#d5c9b9", 0, 0.15);
  const roof = material("Cortina chalet snow-covered roof", "#e5ebea", 0, 0.15);
  const wall = material("Cortina larch and pale plaster", "#bca68b", 0, 0.17);
  const timber = material("Cortina stained larch wood", "#57473c", 0, 0.12);
  const stone = material("Cortina chalet stone foundations", "#918777", 0, 0.16);
  const steel = material("Cortina chairlift galvanized steel", "#697780", 0.38, 0.34);
  const cable = material("Cortina chairlift rope", "#393f42", 0.45, 0.3);
  const mats = [mStone, scree, roof, wall, timber, stone, steel, cable];
  const q = LIMITS[quality];
  const rand = rng(260212);

  // Limestone cliffs / Schuss pinch and stratified cliffs are one vertex-colored
  // mesh, not dozens of draw calls. They do not obstruct the racing corridor.
  const p: number[] = [], indices: number[] = [],
    colors: number[] = [], uv: number[] = [];
  const shoulders = [
    { z: 75, side: -1, offset: 70, r: 22, h: 85 },
    { z: 96, side: 1, offset: 69, r: 19, h: 91 },
    { z: 155, side: -1, offset: 67, r: 19, h: 69 },
    { z: 172, side: 1, offset: 77, r: 24, h: 98 },
    { z: 265, side: -1, offset: 73, r: 18, h: 54 },
    { z: 326, side: 1, offset: 83, r: 28, h: 65 },
    { z: 905, side: -1, offset: 93, r: 17, h: 35 },
    { z: 1025, side: 1, offset: 87, r: 23, h: 56 },
  ];
  for (const [i, cliff] of shoulders.entries()) {
    const x = courseCenterX(cliff.z, course) + cliff.side * cliff.offset;
    taperedCliff(p, indices, colors, uv,
      x, terrainHeight(x, cliff.z, course) - 2,
      cliff.z, cliff.r, cliff.h, 437 + i * 17, course);
  }
  for (let i = 0; i < q.cliffs; i++) {
    const z = 225 + rand() * 1250;
    const side = rand() < 0.5 ? -1 : 1;
    const distance = 76 + rand() * 110;
    const x = courseCenterX(z, course) + side * distance;
    const factor = z > 1080 ? 0.48 : 1;
    const r = (4 + rand() * 14) * factor;
    taperedCliff(p, indices, colors, uv,
      x, terrainHeight(x, z, course) - 1,
      z, r, (16 + rand() * 53) * factor, 1907 + i * 47, course);
  }
  const rock = meshEntity(app.graphicsDevice, root,
    "CORTINA asymmetric Schuss rock walls and limestone shelves",
    p, indices, mStone, colors, uv);
  rock.render!.castShadows = quality === "high" || quality === "ultra";

  const gravelP: number[] = [], gravelI: number[] = [];
  for (let i = 0; i < q.scree; i++) {
    const z = 180 + rand() * 1400;
    const x = courseCenterX(z, course) + (rand() < 0.5 ? -1 : 1) *
      (42 + rand() * 75);
    const y = terrainHeight(x, z, course) + 0.5;
    const size = 0.9 + rand() * 4.5;
    const n = gravelP.length / 3;
    gravelP.push(x-size, y, z-size, x+size, y+0.2*size, z-size,
      x, y+size*0.9, z, x+size, y, z+size, x-size, y+0.1*size, z+size);
    gravelI.push(n,n+2,n+1, n+1,n+2,n+3, n+3,n+2,n+4, n+4,n+2,n);
  }
  const talus = meshEntity(app.graphicsDevice, root,
    "CORTINA limestone scree batched", gravelP, gravelI, scree);
  talus.render!.castShadows = false;

  chalet(root, courseCenterX(370,course)+93, 370, course,
    wall,timber,roof,stone,"Rifugio Duca d'Aosta approximation",1.35);
  chalet(root, courseCenterX(1490,course)+98, 1490, course,
    wall,timber,roof,stone,"Rumerlo mountain chalet",0.96);
  chalet(root, courseCenterX(2050,course)-86, 2050, course,
    wall,timber,roof,stone,"El Camineto finish hut",1.2);

  // Chairlift follows the curve and remains well outside the piste.
  const pylons = [240, 500, 775, 1040, 1280, 1580, 1800];
  const anchors: pc.Vec3[] = [];
  for (const [i, z] of pylons.entries()) {
    const x = courseCenterX(z, course) + 107 + (i%2 ? 4 : 0);
    const y = terrainHeight(x,z,course);
    const pole = shape(root, "cylinder", "Duca d'Aosta chairlift pylon",
      [x,y+9.5,z],[0.28,19,0.28],steel);
    pole.render!.castShadows = false;
    beam(root, new pc.Vec3(x-4,y+18.9,z),
      new pc.Vec3(x+4,y+18.9,z),0.16,steel,"Chairlift crossarm");
    for (const dx of [-3.2,3.2])
      shape(root,"cylinder","Chairlift pulley",
        [x+dx,y+19.2,z],[0.30,0.28,0.30],steel);
    anchors.push(new pc.Vec3(x,y+19,z));
  }
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i-1], b = anchors[i];
    const mid = a.clone().add(b).mulScalar(0.5);
    mid.y -= 4.2;
    beam(root, a, mid, 0.055,cable,"Chairlift suspended cable");
    beam(root, mid,b,0.055,cable,"Chairlift suspended cable");
  }

  const forestMat = material("Cortina fir woodland vertex-color batched", "#ffffff", 0, 0.14);
  forestMat.diffuseVertexColor = true;
  forestMat.update();
  mats.push(forestMat);
  const fP: number[] = [], fI: number[] = [], fC: number[] = [];
  const addCone = (x: number,y: number,z: number,r: number,h: number,
    tint: readonly number[])=>{
    const n=fP.length/3, sides=7;
    fP.push(x,y+h,z); fC.push(tint[0]*1.05,tint[1]*1.07,tint[2]*1.03,1);
    for(let k=0;k<sides;k++) {
      const angle=k/sides*Math.PI*2;
      fP.push(x+Math.cos(angle)*r,y,z+Math.sin(angle)*r);
      fC.push(tint[0],tint[1],tint[2],1);
    }
    for(let k=0;k<sides;k++)
      fI.push(n,n+1+k,n+1+(k+1)%sides);
  };
  for(let i=0;i<q.trees;i++) {
    const z=760+rand()*1170;
    const side=rand()<0.5?-1:1;
    const x=courseCenterX(z,course)+side*(53+rand()*94);
    if(z>1640&&rand()>.46) continue;
    const y=terrainHeight(x,z,course);
    const h=4+rand()*8;
    const winter=rand()>0.76;
    for(let j=0;j<3;j++) {
      const r=(2.2-j*.48)*(h/8);
      const tint=winter ? [0.42,0.55,0.49] : [0.07,0.18,0.14];
      addCone(x,y+h*(.15+j*.22),z,r,h*.48,tint);
    }
    if(quality!=="low") {
      const n=fP.length/3, r=.13;
      fP.push(x-r,y,z-r,x+r,y,z-r,x+r,y+h*.55,z+r,x-r,y+h*.55,z+r);
      for(let k=0;k<4;k++) fC.push(.24,.22,.17,1);
      fI.push(n,n+1,n+2,n,n+2,n+3);
    }
  }
  if(fI.length) {
    const forest = meshEntity(app.graphicsDevice,root,
      "CORTINA batched fir woodland at Scarpadon and Rumerlo",
      fP,fI,forestMat,fC);
    forest.render!.castShadows=false;
  }
  return mats;
}
