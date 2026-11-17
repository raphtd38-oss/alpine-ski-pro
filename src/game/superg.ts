export { startPushAcceleration } from "./start-gate";
/**
 * Olympia delle Tofane, Cortina d'Ampezzo — reference-derived playable rebuild.
 * FIS 12 February 2026 women's Super-G: 2195m -> 1560m, 635m drop, 2105m.
 * IMPORTANT: horizontal waypoints and crests are ORIGINAL SCHEMATIC placements,
 * not surveyed gate coordinates, GNSS or a laser-scanned course.
 */
export const CORTINA_2026 = {
  venue: "Tofane Alpine Skiing Centre",
  run: "Olympia delle Tofane",
  discipline: "SG",
  date: "2026-02-12",
  startElevationM: 2195,
  finishElevationM: 1560,
  verticalDropM: 635,
  officialCourseLengthM: 2105,
  officialGates: 43,
  officialTurningGates: 39,
  accuracy: "schematic visual reconstruction; no surveyed race route or gate coordinates",
} as const;

/** Nominal race stations and transverse displacement in metres. */
export const CORTINA_TURN_WAYPOINTS = [
  { z: 0, x: 0, name: "Départ Super-G — Schuss" },
  { z: 90, x: -4, name: "Approche de la gorge" },
  { z: 195, x: 1, name: "Schuss — couloir rocheux" },
  { z: 295, x: 24, name: "Saut Duca d'Aosta" },
  { z: 375, x: -10, name: "Sortie Duca" },
  { z: 495, x: -48, name: "Traversée haute" },
  { z: 590, x: -72, name: "Entrée du Delta" },
  { z: 685, x: -32, name: "Delta — courbe aveugle" },
  { z: 780, x: 42, name: "Relance vers le Curvone" },
  { z: 875, x: 107, name: "Gran Curvone — ouverture" },
  { z: 970, x: 120, name: "Gran Curvone — grande courbe" },
  { z: 1070, x: 69, name: "Scarpadon — changement de pente" },
  { z: 1180, x: -17, name: "Scarpadon — plongée" },
  { z: 1270, x: -77, name: "Festis" },
  { z: 1380, x: -86, name: "Pale di Rumerlo — entrée" },
  { z: 1470, x: -37, name: "Traversée de Rumerlo" },
  { z: 1580, x: 21, name: "Pale di Rumerlo" },
  { z: 1660, x: 36, name: "Passage de forêt" },
  { z: 1760, x: -14, name: "Diagonale finale — entrée" },
  { z: 1850, x: -79, name: "Diagonale finale" },
  { z: 1935, x: -81, name: "Avant le dentino" },
  { z: 2010, x: -38, name: "Dentino — saut final" },
  { z: 2070, x: -6, name: "Schuss d'arrivée" },
  { z: 2105, x: 0, name: "Arrivée Rumerlo" },
] as const;

export const CORTINA_ELEVATION_WAYPOINTS = [
  [0, 2195], [90, 2175], [190, 2111], [280, 2073],
  [380, 2033], [490, 1992], [610, 1955], [760, 1918],
  [870, 1890], [1020, 1850], [1140, 1815], [1280, 1760],
  [1440, 1717], [1600, 1676], [1750, 1648],
  [1900, 1618], [2000, 1583], [2105, 1560],
] as const;

function interpolateSmooth(points: readonly (readonly [number, number])[], z: number): number {
  const n = points.length;
  if (!Number.isFinite(z)) return points[0][1];
  if (z <= points[0][0]) {
    const [a, b] = points;
    return a[1] + (b[1] - a[1]) * (z - a[0]) / (b[0] - a[0]);
  }
  for (let i = 0; i < n - 1; i++) {
    const a = points[i], b = points[i + 1];
    if (z > b[0]) continue;
    const h = b[0] - a[0];
    const before = points[Math.max(0, i - 1)];
    const after = points[Math.min(n - 1, i + 2)];
    const m0 = (b[1] - before[1]) / (b[0] - before[0]);
    const m1 = (after[1] - a[1]) / (after[0] - a[0]);
    const t = (z - a[0]) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * a[1] +
      (t3 - 2 * t2 + t) * h * m0 +
      (-2 * t3 + 3 * t2) * b[1] +
      (t3 - t2) * h * m1;
  }
  const a = points[n - 2], b = points[n - 1];
  return b[1] + (z - b[0]) * (b[1] - a[1]) / (b[0] - a[0]);
}
const CENTER_KNOTS: readonly (readonly [number, number])[] =
  CORTINA_TURN_WAYPOINTS.map(p => [p.z, p.x] as const);
export const SUPER_G_CENTRE_KNOTS = CENTER_KNOTS;
export function superGCenterX(z: number): number {
  return interpolateSmooth(CENTER_KNOTS, z);
}
export function cortinaReferenceElevation(z: number): number {
  return interpolateSmooth(CORTINA_ELEVATION_WAYPOINTS, z);
}

export const SUPER_G_ROLLERS = [
  { z: 316, width: 17, height: 5.1, name: "Salto Duca d'Aosta" },
  { z: 675, width: 19, height: 4.6, name: "Delta — cassure" },
  { z: 1085, width: 17, height: 4.9, name: "Scarpadon" },
  { z: 1415, width: 20, height: 4.5, name: "Pale di Rumerlo" },
  { z: 1685, width: 20, height: 4.2, name: "Rumerlo — replat" },
] as const;

const COMPRESSION_ZONES = [
  { z: 245, width: 31, depth: 1.5 },
  { z: 550, width: 41, depth: 2.5 },
  { z: 932, width: 50, depth: 2.7 },
  { z: 1204, width: 42, depth: 2.2 },
  { z: 1530, width: 44, depth: 2.1 },
] as const;
const gaussian = (z: number, c: number, w: number): number => {
  const t = (z - c) / w; return Math.exp(-0.5 * t * t);
};
export function superGRelief(z: number): number {
  let h = 0;
  const taper = Math.max(0, Math.min(1, z / 40, (CORTINA_2026.officialCourseLengthM - z) / 40));
  h += taper * (0.28 * Math.sin(z * 0.019) + 0.18 * Math.sin(z * 0.043 + 0.6));
  for (const r of SUPER_G_ROLLERS) h += r.height * gaussian(z, r.z, r.width);
  for (const c of COMPRESSION_ZONES) h -= c.depth * gaussian(z, c.z, c.width);
  h += 1.8 * gaussian(z, 1995, 11);
  return h;
}
export function shouldLaunchAtCrest(
  courseId: string, speed: number, curvature: number,
  grounded: boolean,
): boolean {
  return courseId === "SG" && grounded && speed > 18 &&
    curvature < -0.017 &&
    1 + (speed * speed * curvature) / 9.81 < 0.25;
}
export const SUPER_G_LANDING_CLEARANCE = 80;
export const SUPER_G_TAKEOFF_CLEARANCE = 18;
export const SUPER_G_MIN_GATE_SPACING = 36;
function nominalSuperGGateZ(index: number): number {
  let z = 55;
  for (let i = 0; i < index; i++)
    z += 52 + 12 * Math.sin(i * 0.81 + 0.3) + 7 * Math.sin(i * 0.26 - 0.4);
  return z;
}
/** Authored Super-G race line: alternating wide turns, with a restrained
 * lead into the slope's natural bends. Official gate GPS is unavailable. */
export function superGGateRacingOffset(index: number, z: number): number {
  const step = 24;
  const before = superGCenterX(z - step);
  const center = superGCenterX(z);
  const after = superGCenterX(z + step);
  const slope = (after - before) / (2 * step);
  const bend = after - 2 * center + before;
  const direction = index % 2 === 0 ? -1 : 1;
  const magnitude = 8.7 + 1.7 * Math.sin(index * 0.46 + 0.5);
  const courseLead = Math.max(-3.0, Math.min(3.0, slope * 2.2 + bend * 0.5));
  // Never collapse the corridor to a near-straight 'fake' gate in a bend.
  return direction * Math.max(6.25, Math.min(13.5, magnitude + direction * courseLead));
}

export function superGGateZ(index: number): number {
  const count = Math.max(0, Math.floor(Number.isFinite(index) ? index : 0));
  let last = -SUPER_G_MIN_GATE_SPACING;
  for (let i = 0; i <= count; i++) {
    let z = Math.max(nominalSuperGGateZ(i), last + SUPER_G_MIN_GATE_SPACING);
    for (let attempt = 0; attempt <= SUPER_G_ROLLERS.length; attempt++) {
      const before = z;
      for (const roller of SUPER_G_ROLLERS)
        if (z >= roller.z - SUPER_G_TAKEOFF_CLEARANCE &&
            z <= roller.z + SUPER_G_LANDING_CLEARANCE)
          z = roller.z + SUPER_G_LANDING_CLEARANCE + 0.5;
      z = Math.max(z, last + SUPER_G_MIN_GATE_SPACING);
      if (z === before) break;
    }
    last = z;
  }
  return last;
}
export type SuperGSector = "spruce" | "glacier" | "canyon" | "finish";
export function superGSector(z: number): SuperGSector {
  if (z < 480) return "glacier";
  if (z < 1100) return "canyon";
  if (z < 1700) return "spruce";
  return "finish";
}
