import * as pc from "playcanvas";
import type { Course, Quality } from "../game/types";
import { courseCenterX, terrainHeight } from "../game/course";
import { beam, color, material, meshEntity, shape } from "./geometry";

/**
 * Cortina sunset set dressing, all original procedural geometry.
 * No real floodlight plan or 3D survey has been published for this build.
 * Emissive lamp heads are always visible; only nearby non-shadow-casting
 * omni lights are enabled, keeping mobile GPUs from processing 15 lights.
 */
export const CORTINA_LIGHT_STATIONS = [
  78, 205, 338, 482, 622, 775, 927, 1065,
  1210, 1350, 1480, 1625, 1760, 1895, 2040,
] as const;

const SKY_RAMP = [
  { y: -1, rgb: [0.43, 0.38, 0.48] },
  { y: -0.16, rgb: [0.79, 0.50, 0.51] },
  { y: 0.02, rgb: [0.99, 0.61, 0.43] },
  { y: 0.17, rgb: [0.91, 0.56, 0.55] },
  { y: 0.48, rgb: [0.53, 0.47, 0.67] },
  { y: 1, rgb: [0.21, 0.34, 0.58] },
] as const;

function skyColor(height: number): [number, number, number] {
  for (let i = 1; i < SKY_RAMP.length; i++) {
    const b = SKY_RAMP[i], a = SKY_RAMP[i - 1];
    if (height <= b.y) {
      const t = Math.max(0, Math.min(1, (height - a.y) / (b.y - a.y)));
      const smooth = t * t * (3 - 2 * t);
      return [
        a.rgb[0] + (b.rgb[0] - a.rgb[0]) * smooth,
        a.rgb[1] + (b.rgb[1] - a.rgb[1]) * smooth,
        a.rgb[2] + (b.rgb[2] - a.rgb[2]) * smooth,
      ];
    }
  }
  return [...SKY_RAMP[SKY_RAMP.length - 1].rgb];
}

function sunsetSky(app: pc.Application, root: pc.Entity, course: Course) {
  const p: number[] = [], colors: number[] = [], idx: number[] = [];
  const latitude = 24, longitude = 56, radius = 1650;
  // A common centre keeps the skier inside the dome for the full 2.1 km run.
  const cx = 0, cy = -310, cz = course.length * 0.5;
  for (let j = 0; j <= latitude; j++) {
    const phi = -Math.PI / 2 + (j / latitude) * Math.PI;
    const v = Math.sin(phi), cosPhi = Math.cos(phi);
    const rgb = skyColor(v);
    for (let i = 0; i <= longitude; i++) {
      const theta = (i / longitude) * Math.PI * 2;
      p.push(cx + radius * cosPhi * Math.cos(theta),
        cy + radius * v,
        cz + radius * cosPhi * Math.sin(theta));
      // Subtle horizontal bands evoke the warm violet Dolomite afterglow.
      const gold = Math.pow(Math.max(0, Math.sin(theta + 0.75)), 6) *
        Math.max(0, 1 - Math.abs(v - 0.10) * 2.5) * 0.085;
      // Sunset cirrus streaks fade toward the zenith and horizon; this is
      // still a single static sky mesh, not particles or a video texture.
      const lowClouds = Math.exp(-Math.pow((v - 0.16) / 0.31, 2));
      const filament =
        Math.pow(Math.max(0,
          0.64 * Math.sin(theta * 11.5 + v * 33.1) +
          0.36 * Math.cos(theta * 21.7 - v * 17.2)
        ), 5) * lowClouds * 0.18;
      colors.push(Math.min(1, rgb[0] + gold + filament),
        Math.min(1, rgb[1] + gold * 0.28 + filament * 0.37),
        Math.min(1, rgb[2] + filament * 0.16), 1);
    }
  }
  for (let j = 0; j < latitude; j++)
    for (let i = 0; i < longitude; i++) {
      const a = j * (longitude + 1) + i, b = a + longitude + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const mat = material("Cortina procedural sunset sky", "#000000");
  mat.useLighting = false;
  mat.useFog = false;
  mat.diffuseVertexColor = false;
  mat.emissiveVertexColor = true;
  mat.emissive = new pc.Color(1, 1, 1);
  mat.cull = pc.CULLFACE_NONE;
  mat.depthWrite = false;
  mat.update();
  const sky = meshEntity(app.graphicsDevice, root,
    "Cortina sunset sky dome — original color gradient", p, idx, mat, colors);
  sky.render!.castShadows = false;
  return mat;
}

interface FloodLamp {
  z: number;
  light: pc.Entity;
  baseIntensity: number;
}

/** Pure distance priority for capped dynamic spotlights (can be unit tested). */
export function selectFloodlightStations(
  skierZ: number, budget: number, radius = 165,
): number[] {
  const limit = Math.max(0, Math.floor(Number.isFinite(budget) ? budget : 0));
  return CORTINA_LIGHT_STATIONS
    .map((z, index) => ({ z, index, distance: Math.abs(z - skierZ) }))
    .filter(item => item.distance < radius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(item => item.index);
}

/** Returns registered materials and a fast position-dependent light update. */
export function createCortinaAtmosphere(
  app: pc.Application, root: pc.Entity, course: Course, quality: Quality,
): { materials: pc.StandardMaterial[]; update: (skierZ: number) => void } {
  const sky = sunsetSky(app, root, course);
  const steel = material("Floodlight steel lattice", "#6f757c", 0.48, 0.40);
  const joint = material("Floodlight electrical box", "#4a515b", 0.14, 0.27);
  const white = material("Floodlight illuminated LED front", "#fff4da", 0.02, 0.12);
  white.emissive = color("#ffead0");
  white.emissiveIntensity = 4.3;
  white.useFog = false;
  white.update();
  const insulation = material("Floodlight protective orange padding", "#d95522", 0, 0.18);
  const lamps: FloodLamp[] = [];
  const panelP: number[] = [], panelI: number[] = [];

  const addPanel = (x: number, y: number, z: number) => {
    const n = panelP.length / 3;
    // Lamp heads face approaching racers; both faces are visible.
    panelP.push(x - 0.37, y - 0.22, z - 0.20,
      x + 0.37, y - 0.22, z - 0.20,
      x - 0.37, y + 0.22, z - 0.20,
      x + 0.37, y + 0.22, z - 0.20);
    panelI.push(n, n + 1, n + 2, n + 2, n + 1, n + 3);
  };

  for (const [i, z] of CORTINA_LIGHT_STATIONS.entries()) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = courseCenterX(z, course) +
      side * (course.width / 2 + 16 + (i % 3) * 1.6);
    const y = terrainHeight(x, z, course);
    const top = y + 18.5;
    const column = shape(root, "cylinder", "Cortina floodlight pylon",
      [x, y + 9.25, z], [0.31, 18.5, 0.31], steel);
    column.render!.castShadows = false;
    // Braces are structural silhouettes, not collision objects.
    for (const direction of [-1, 1]) {
      beam(root, new pc.Vec3(x + direction * 1.45, y + 1.4, z),
        new pc.Vec3(x, y + 7.3, z), 0.075, steel,
        "Floodlight lattice diagonal");
      beam(root, new pc.Vec3(x + direction * 0.85, y + 10.5, z),
        new pc.Vec3(x, top - 1.0, z), 0.055, steel,
        "Floodlight lattice upper brace");
    }
    shape(root, "box", "Floodlight LED lamp housing",
      [x, top, z], [5.4, 2.0, 0.36], joint).render!.castShadows = false;
    shape(root, "cylinder", "Floodlight orange safety protection",
      [x, y + 0.8, z], [0.46, 1.6, 0.46],
      insulation).render!.castShadows = false;
    for (let col = -2; col <= 2; col++)
      for (const row of [-0.5, 0.5])
        addPanel(x + col * 0.94, top + row * 0.76, z);
    // Physically lit surface and nearby PBR objects: spots point into the
    // course, not horizontally and not down the entity's -Z axis. In
    // PlayCanvas, spots shine along local -Y, hence setFromDirections.
    const source = new pc.Vec3(x - side * 1.5, top - 0.25, z - 0.8);
    const targetZ = Math.min(course.length, z + 8);
    const targetX = courseCenterX(targetZ, course) - side * 4;
    const target = new pc.Vec3(
      targetX, terrainHeight(targetX, targetZ, course) + 1, targetZ);
    const light = new pc.Entity("Cortina PBR spotlight aimed at ski corridor");
    light.setLocalPosition(source);
    light.setLocalRotation(new pc.Quat().setFromDirections(
      new pc.Vec3(0, -1, 0), target.sub(source).normalize(),
    ));
    const baseIntensity = quality === "low" ? 3.6 :
      quality === "medium" ? 5.3 : 7.2;
    light.addComponent("light", {
      type: "spot", color: color("#fff1d9"),
      intensity: baseIntensity, range: 135,
      innerConeAngle: 24, outerConeAngle: 47,
      castShadows: false,
      shadowResolution: quality === "ultra" ? 512 : 256,
      shadowBias: 0.22, normalOffsetBias: 0.06,
    });
    light.enabled = false;
    root.addChild(light);
    lamps.push({ z, light, baseIntensity });
  }
  white.cull = pc.CULLFACE_NONE;
  white.update();
  meshEntity(app.graphicsDevice, root,
    "Cortina illuminated LED panels — single batched mesh",
    panelP, panelI, white).render!.castShadows = false;

  let lastSector = -1;
  const budget = quality === "ultra" ? 4 :
    quality === "high" ? 3 : quality === "medium" ? 2 : 1;
  const update = (skierZ: number) => {
    // Update every ~8 m, not every 120-Hz physics tick.
    const sector = Math.round(skierZ / 8);
    if (sector === lastSector) return;
    lastSector = sector;
    const nearestIds = selectFloodlightStations(skierZ, budget);
    const nearest = new Set(nearestIds);
    // Gradual switch-on: intensities rise as the run descends into dusk.
    // Sunset remains artistic (not a simulated astronomical clock).
    const dusk = Math.max(0, Math.min(1, (skierZ - 80) / 900));
    lamps.forEach((item, index) => {
      const active = nearest.has(index);
      item.light.enabled = active;
      if (!active) return;
      const light = item.light.light!;
      light.intensity = item.baseIntensity * (0.68 + dusk * 0.32);
      // Shadow budget: one 256/512 px shadow map for the nearest lamp only,
      // preserving the player's responsive 60 Hz physics and mobile FPS.
      light.castShadows = (quality === "high" || quality === "ultra") &&
        index === nearestIds[0];
    });
  };
  update(0);
  return { materials: [sky, steel, joint, white, insulation], update };
}
