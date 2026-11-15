import type { Course, Discipline, Equipment } from "./types";
export const EQUIPMENT: Record<Discipline, Equipment> = {
  SL: {
    id: "SL",
    name: "Precision 165",
    length: 1.65,
    radius: 12.5,
    stiffness: 0.72,
    grip: 1.04,
    response: 6.8,
    stability: 0.72,
  },
  GS: {
    id: "GS",
    name: "Arc 188",
    length: 1.88,
    radius: 24,
    stiffness: 0.84,
    grip: 1.1,
    response: 5.0,
    stability: 0.86,
  },
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
  DH: {
    id: "DH",
    name: "Apex 218",
    length: 2.18,
    radius: 48,
    stiffness: 0.98,
    grip: 0.98,
    response: 3.1,
    stability: 1.0,
  },
};
export const COURSES: Record<Discipline, Course> = Object.fromEntries(
  (
    [
      [
        "SL",
        "Les Aiguilles",
        "Le rythme. La précision. La ligne.",
        570,
        0.245,
        30,
        22,
        23,
        3.8,
        7.2,
      ],
      [
        "GS",
        "La Combe",
        "De grandes courbes, sans compromis.",
        1000,
        0.26,
        44,
        18,
        49,
        9,
        11,
      ],
      [
        "SG",
        "Glacier Express",
        "Laissez parler la vitesse.",
        1550,
        0.28,
        58,
        16,
        87,
        13,
        17,
      ],
      [
        "DH",
        "Face Nord",
        "Tout droit vers vos limites.",
        2100,
        0.3,
        70,
        14,
        138,
        17,
        23,
      ],
    ] as const
  ).map(
    ([
      id,
      name,
      subtitle,
      length,
      grade,
      width,
      n,
      space,
      swing,
      gateWidth,
    ]) => [
      id,
      {
        id,
        name,
        subtitle,
        length,
        grade,
        width,
        gates: Array.from({ length: n }, (_, i) => ({
          id: i,
          x: Math.sin((i * Math.PI) / 2 + 0.5) * swing,
          z: 40 + i * space,
          width: gateWidth,
        })),
      },
    ],
  ),
) as Record<Discipline, Course>;
/** Same continuous height field for rendering, ground contact, pitch and gravity. */
export function terrainHeight(x: number, z: number, c: Course): number {
  const roll = Math.sin(z * 0.024) * 0.65 + Math.sin(z * 0.057) * 0.17;
  const bank = Math.pow(Math.max(0, Math.abs(x) - c.width / 2), 1.3) * 0.19;
  const jump = c.id === "DH" || c.id === "SG" ? Math.sin(z * 0.041) * 1.05 : 0;
  return -z * c.grade + roll + bank + jump + Math.sin(x * 0.1) * 0.12;
}
export function gradient(x: number, z: number, c: Course): [number, number] {
  const d = 0.15;
  return [
    (terrainHeight(x + d, z, c) - terrainHeight(x - d, z, c)) / (2 * d),
    (terrainHeight(x, z + d, c) - terrainHeight(x, z - d, c)) / (2 * d),
  ];
}
