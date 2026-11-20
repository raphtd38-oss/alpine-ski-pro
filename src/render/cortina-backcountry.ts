import * as pc from "playcanvas";
import type { Course, Quality } from "../game/types";
import { courseCenterX, terrainHeight } from "../game/course";
import { meshEntity } from "./geometry";

/** The race mesh ends 220 m from its axis. Rock ridges extend beyond it;
 * their bases need continuous ground rather than a visible gap to the sky.
 * This coarse outer mesh samples the same height field without changing it. */
export function buildCortinaBackcountry(course: Course, quality: Quality) {
  const columns = {low: 12, medium: 18, high: 24, ultra: 28}[quality];
  const step = {low: 20, medium: 12, high: 9, ultra: 6}[quality];
  const length = course.length + 240, rows = Math.ceil(length / step);
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [];
  for (const side of [-1, 1]) {
    const start = positions.length / 3;
    for (let j = 0; j <= rows; j++) {
      const z = -100 + j * length / rows;
      for (let i = 0; i <= columns; i++) {
        const x = courseCenterX(z, course) + side * (220 + i / columns * 340);
        positions.push(x, terrainHeight(x, z, course), z);
        uvs.push(x / 7, z / 7);
      }
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
      const a = start + j * (columns + 1) + i, b = a + columns + 1;
      if (side > 0) indices.push(a, b, a + 1, a + 1, b, b + 1);
      else indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  return {positions, indices, uvs};
}

export function addCortinaBackcountry(app: pc.Application, root: pc.Entity,
  course: Course, quality: Quality, snow: pc.StandardMaterial): void {
  const mesh = buildCortinaBackcountry(course, quality);
  const ground = meshEntity(app.graphicsDevice, root,
    "Continuous backcountry beneath the distant Tofane rock ridges",
    mesh.positions, mesh.indices, snow, undefined, mesh.uvs);
  ground.render!.castShadows = false;
}
