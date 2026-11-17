import type { Course, Discipline, Equipment } from "./types";
import {
  CORTINA_2026, superGRelief, superGCenterX,
  superGGateZ, superGGateRacingOffset, cortinaReferenceElevation,
} from "./superg";

/** Cortina 2026 inspired course; waypoints are a schematic reconstruction,
 * not surveyed GPS. Gate visuals/physics and blue dye stay unchanged. */
export const courseCenterX = (z: number, _course: Course): number =>
  superGCenterX(z);

export const EQUIPMENT: Record<Discipline, Equipment> = {
  SG: {
    id: "SG", name: "Velocity 205", length: 2.05, radius: 36,
    stiffness: 0.92, grip: 1.07, response: 3.8, stability: 0.94,
  },
};

export const COURSES: Record<Discipline, Course> = {
  SG: {
    id: "SG",
    name: "Cortina d'Ampezzo — Olympia delle Tofane",
    subtitle: "Super-G olympique 2026 · Schuss · Duca d'Aosta · Delta · Scarpadon · Rumerlo",
    length: CORTINA_2026.officialCourseLengthM,
    grade: CORTINA_2026.verticalDropM / CORTINA_2026.officialCourseLengthM,
    width: 62,
    // 34 playable gate groups, realigned to wide Super-G turns.
    // Official 43 gate coordinates are not surveyed here.
    gates: Array.from({ length: 34 }, (_, i) => {
      const z = superGGateZ(i);
      return {
        id: i,
        x: superGCenterX(z) + superGGateRacingOffset(i, z),
        z,
        width: i % 9 === 7 ? 10 : 7.6,
      };
    }),
  },
};

/** Same height field for visible snow, slope normals, physics, jumps and snow dye.
 * z denotes nominal course station, not surveyed 3D arc length. */
export function terrainHeight(x: number, z: number, c: Course): number {
  const localX = x - courseCenterX(z, c);
  const shoulder = c.width / 2;
  const outside = Math.max(0, Math.abs(localX) - shoulder);
  // Keep the racing corridor clear, build a high Dolomite shoulder outside it.
  const bank = Math.pow(outside, 1.22) * (
    z < 450 ? 0.35 : z < 1200 ? 0.22 : 0.115
  );
  const direction = Math.sin(z * 0.006 + 0.3);
  const crossfall = Math.max(-1, Math.min(1, localX / 37)) *
    (0.66 * direction + 0.31 * Math.sin(z * 0.017 + 1.1));
  const taper = Math.max(0, Math.min(1, z / 35, (c.length - z) / 35));
  const waves = taper * (
    0.32 * Math.sin(z * 0.029 + 0.1) +
    0.12 * Math.sin(z * 0.064 + 0.3)
  );
  return cortinaReferenceElevation(z) - CORTINA_2026.startElevationM +
    superGRelief(z) + bank + taper * crossfall + waves +
    taper * 0.075 * Math.sin(localX * 0.1);
}

export function gradient(x: number, z: number, c: Course): [number, number] {
  const d = 0.15;
  return [
    (terrainHeight(x + d, z, c) - terrainHeight(x - d, z, c)) / (2 * d),
    (terrainHeight(x, z + d, c) - terrainHeight(x, z - d, c)) / (2 * d),
  ];
}
