export { startPushAcceleration } from "./start-gate";
/**
 * Original Super-G mountain profile, inspired by the layout principles of
 * Alpine World Cup speed courses (NOT a real/homologated course survey).
 * Height values are metres; the same function drives the rendered terrain,
 * its gradient, the carving solver and automatic airborne motion.
 */
export const SUPER_G_ROLLERS = [
  { z: 316, width: 14, height: 5.0, name: "Crête des Aiguilles" },
  { z: 675, width: 15, height: 5.7, name: "Saut du Glacier" },
  { z: 1085, width: 14, height: 4.9, name: "Dos d'Âne" },
  { z: 1415, width: 16, height: 5.8, name: "Table de la Combe" },
  { z: 1685, width: 18, height: 4.5, name: "Cassure du Mur" },
] as const;
const COMPRESSION_ZONES = [
  { z: 245, width: 35, depth: 1.9 },
  { z: 585, width: 43, depth: 2.8 },
  { z: 935, width: 47, depth: 2.1 },
  { z: 1315, width: 40, depth: 2.5 },
  { z: 1600, width: 45, depth: 1.8 },
] as const;
const bump = (z: number, centre: number, width: number): number => {
  const d = (z - centre) / width;
  return Math.exp(-0.5 * d * d);
};

/** Several different kinds of terrain: shallow ripples, heavy compressions
 * and broad takeoff crests. No repeated sinusoidal roller conveyor. */
export function superGRelief(z: number): number {
  const wave = 1.55 * Math.sin(z * 0.012) +
    0.72 * Math.sin(z * 0.027 + 0.6);
  let height = wave;
  for (const b of SUPER_G_ROLLERS) height += b.height * bump(z, b.z, b.width);
  for (const c of COMPRESSION_ZONES) height -= c.depth * bump(z, c.z, c.width);
  return height;
}

/** At a high-speed convex crest the terrain normal load can vanish.
 * Return a capped upward clearance at departure; flight thereafter is ballistic. */
export function shouldLaunchAtCrest(
  courseId: string, speed: number, curvature: number,
  grounded: boolean,
): boolean {
  return (courseId === "SG" || courseId === "DH") &&
    grounded && speed > 18 && curvature < -0.017 &&
    1 + (speed * speed * curvature) / 9.81 < 0.25;
}


/** Course-centre world coordinates, sampled from broad changes of direction.
 * The line deliberately crosses from wooded traverse to exposed glacier
 * before looping back towards the finish. Smoothstep prevents sharp zigzags
 * and maintains playable direction changes at speed.
 */
export const SUPER_G_CENTRE_KNOTS = [
  [0, 0], [115, 0], [260, 13], [380, 24], [520, 12],
  [660, -16], [805, -24], [945, -5], [1100, 23],
  [1240, 25], [1390, 4], [1525, -23], [1660, -17],
  [1810, 10], [1940, 0], [1980, 0],
] as const;

/** Race-design safety buffer, not an extra rule claimed by the FIS.
 * Leave a genuine landing and regrouping section after the five speed crests.
 * Turning poles still obey the FIS minimum 25 m separation. */
export const SUPER_G_LANDING_CLEARANCE = 80;
export const SUPER_G_TAKEOFF_CLEARANCE = 18;
export const SUPER_G_MIN_GATE_SPACING = 36;

function nominalSuperGGateZ(index: number): number {
  let z = 55;
  for (let i = 0; i < index; i++)
    z += 52 + 12 * Math.sin(i * 0.81 + 0.3) +
      7 * Math.sin(i * 0.26 - 0.4);
  return z;
}

/** Medium and long turns with NO flags across a takeoff or its landing zone.
 * Forward placement preserves gate count and keeps the course finishable.
 * Position is independent of runtime frame rate or state. */
export function superGGateZ(index: number): number {
  const count = Math.max(0, Math.floor(Number.isFinite(index) ? index : 0));
  let last = -SUPER_G_MIN_GATE_SPACING;
  for (let i = 0; i <= count; i++) {
    let z = Math.max(nominalSuperGGateZ(i),
      last + SUPER_G_MIN_GATE_SPACING);
    // A shifted gate could move into another crest's exclusion band,
    // so keep resolving until outside all five regions.
    for (let attempt = 0; attempt <= SUPER_G_ROLLERS.length; attempt++) {
      const before = z;
      for (const roller of SUPER_G_ROLLERS) {
        if (z >= roller.z - SUPER_G_TAKEOFF_CLEARANCE &&
            z <= roller.z + SUPER_G_LANDING_CLEARANCE)
          z = roller.z + SUPER_G_LANDING_CLEARANCE + 0.5;
      }
      z = Math.max(z, last + SUPER_G_MIN_GATE_SPACING);
      if (z === before) break;
    }
    last = z;
  }
  return last;
}

export function superGCenterX(z: number): number {
  if (!Number.isFinite(z)) return 0;
  if (z <= SUPER_G_CENTRE_KNOTS[0][0]) return 0;
  for (let i = 0; i < SUPER_G_CENTRE_KNOTS.length - 1; i++) {
    const [z0, x0] = SUPER_G_CENTRE_KNOTS[i];
    const [z1, x1] = SUPER_G_CENTRE_KNOTS[i + 1];
    if (z <= z1) {
      const u = Math.max(0, Math.min(1, (z - z0) / (z1 - z0)));
      const smooth = u * u * (3 - 2 * u);
      return x0 + (x1 - x0) * smooth;
    }
  }
  return 0;
}

/** Visual sectors that change the geology and vegetation on the course. */
export type SuperGSector = "spruce" | "glacier" | "canyon" | "finish";
export function superGSector(z: number): SuperGSector {
  if (z < 490) return "spruce";
  if (z < 1040) return "glacier";
  if (z < 1640) return "canyon";
  return "finish";
}
