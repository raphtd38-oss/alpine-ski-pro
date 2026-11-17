import type { Course, Discipline, Equipment } from "./types";
import { superGRelief, superGCenterX, superGGateZ } from "./superg";

/** Only the Super-G course and equipment are available in the game.
 * This removes the other course layouts from the production module, not just
 * from the menu. The reusable physics and World Cup start remain unchanged.
 */
export const courseCenterX = (z: number, _course: Course): number =>
  superGCenterX(z);

export const EQUIPMENT: Record<Discipline, Equipment> = {
  SG: {
    id: "SG",
    name: "Velocity 205",
    length: 2.05,
    radius: 36,
    stiffness: 0.92,
    grip: 1.07,
    response: 3.8,
    stability: 0.94,
  },
};

export const COURSES: Record<Discipline, Course> = {
  SG: {
    id: "SG",
    name: "Glacier Express — Super-G",
    subtitle: "Crêtes, compressions et sauts. Une course de vitesse.",
    length: 1980,
    grade: 0.276,
    width: 62,
    gates: Array.from({ length: 34 }, (_, i) => {
      const z = superGGateZ(i);
      return {
        id: i,
        x: superGCenterX(z) +
          Math.sin(i * 1.37 + 0.45) * 5.4 +
          Math.sin(i * 0.41) * 1.9,
        z,
        width: i % 9 === 7 ? 10 : 7.6,
      };
    }),
  },
};

/** Keep the original height field, including crossfall, bank and race runout. */
export function terrainHeight(x: number, z: number, c: Course): number {
  const roll = Math.sin(z * 0.024) * 0.65 + Math.sin(z * 0.057) * 0.17;
  const localX = x - courseCenterX(z, c);
  const bank = Math.pow(Math.max(0, Math.abs(localX) - c.width / 2), 1.3) * 0.19;
  const crossfall =
    Math.sin(z * 0.008 + 0.3) *
    Math.max(-1, Math.min(1, localX / 32)) * 0.9;
  const jump = superGRelief(z);
  const start = c.length - 45;
  const span = 90;
  const t = Math.max(0, Math.min(1, (z - start) / span));
  const fall = z <= start ? z : start + span * (t - (t * t) / 2);
  return -fall * c.grade + roll + bank + jump + crossfall +
    Math.sin(localX * 0.1) * 0.12;
}
export function gradient(x: number, z: number, c: Course): [number, number] {
  const d = 0.15;
  return [
    (terrainHeight(x + d, z, c) - terrainHeight(x - d, z, c)) / (2 * d),
    (terrainHeight(x, z + d, c) - terrainHeight(x, z - d, c)) / (2 * d),
  ];
}
