import type { Course } from "./types";

/** Advisory skiing line for training only, not an autopilot.
 * Piecewise cubic Hermite interpolation follows the center of each gate while
 * maintaining a smooth tangent on either side of gate crossings.
 */
export function trainingLineX(course: Course, z: number): number {
  const points = [
    { x: 0, z: 3 },
    ...course.gates.map((g) => ({ x: g.x, z: g.z })),
    { x: 0, z: course.length },
  ];
  const target = Math.max(3, Math.min(course.length, Number.isFinite(z) ? z : 3));
  let i = 0;
  while (i < points.length - 2 && target > points[i + 1].z) i++;
  const a = points[i], b = points[i + 1];
  const prev = points[Math.max(0, i - 1)];
  const next = points[Math.min(points.length - 1, i + 2)];
  const length = Math.max(0.001, b.z - a.z);
  const u = Math.max(0, Math.min(1, (target - a.z) / length));
  const m0 = (b.x - prev.x) / Math.max(0.001, b.z - prev.z);
  const m1 = (next.x - a.x) / Math.max(0.001, next.z - a.z);
  const x = (2 * u ** 3 - 3 * u ** 2 + 1) * a.x +
    (u ** 3 - 2 * u ** 2 + u) * length * m0 +
    (-2 * u ** 3 + 3 * u ** 2) * b.x +
    (u ** 3 - u ** 2) * length * m1;
  return Math.max(-course.width / 2 + 1.5, Math.min(course.width / 2 - 1.5, x));
}
