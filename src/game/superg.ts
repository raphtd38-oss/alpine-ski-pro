/**
 * Original Super-G mountain profile, inspired by the layout principles of
 * Alpine World Cup speed courses (NOT a real/homologated course survey).
 * Height values are metres; the same function drives the rendered terrain,
 * its gradient, the carving solver and automatic airborne motion.
 */
export const SUPER_G_ROLLERS = [
  { z: 316, width: 17, height: 4.1, name: "Crête des Aiguilles" },
  { z: 675, width: 18, height: 4.8, name: "Saut du Glacier" },
  { z: 1085, width: 16, height: 3.7, name: "Dos d'Âne" },
  { z: 1415, width: 18, height: 4.7, name: "Table de la Combe" },
  { z: 1685, width: 22, height: 3.2, name: "Cassure du Mur" },
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
    grounded && speed > 16 && curvature < -0.013 &&
    1 + (speed * speed * curvature) / 9.81 < 0.18;
}

/** A short, damped double-pole push, only at the race start. */
export function startPushAcceleration(courseId: string, time: number): number {
  if (courseId !== "SG" || time < 0 || time >= 1.5) return 0;
  const impulse = 4.6 * Math.exp(-time * 2.0);
  const second = 3.1 * Math.exp(-Math.pow((time - 0.58) / 0.19, 2));
  return impulse + second;
}
