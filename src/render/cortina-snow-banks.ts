import * as pc from "playcanvas";
import type { Course, Quality } from "../game/types";
import { courseCenterX, terrainHeight } from "../game/course";
import { material, meshEntity } from "./geometry";

/**
 * Wind-sculpted snow shoulders outside the Super-G race corridor.
 * Visual-only: never modify terrainHeight, gate or ski physics. One mesh.
 */
export function addCortinaSnowShoulders(
  app: pc.Application, root: pc.Entity, course: Course, quality: Quality,
): pc.StandardMaterial {
  const longitudinalStep = quality === "low" ? 13 :
    quality === "medium" ? 9 : quality === "high" ? 6 : 4.5;
  const radial = quality === "low" ? 4 : 7;
  const maxZ = course.length + 40;
  const rows = Math.ceil(maxZ / longitudinalStep);
  const p: number[] = [], uv: number[] = [], colors: number[] = [],
    indices: number[] = [];
  for (const side of [-1, 1]) {
    const start = p.length / 3;
    for (let j = 0; j <= rows; j++) {
      const z = Math.min(maxZ, j * longitudinalStep);
      const centerX = courseCenterX(z, course);
      for (let i = 0; i <= radial; i++) {
        const u = i / radial;
        const edgeDistance = course.width / 2 + 1.6 + u * 16;
        const x = centerX + side * edgeDistance;
        const shoulder = Math.sin(u * Math.PI) ** 2;
        const drift = .12 + shoulder * (
          .28 + .20 * Math.sin(z * .037 + side * 2.4) ** 2 +
          .27 * Math.sin(z * .009 + i * 2.5) ** 2
        );
        // Blended snow at the racing edge, accumulations in outer wind shadow.
        const micro = .028 * Math.sin(z * .47 + i * 1.12) *
          Math.cos(z * .13 - u * 4.9);
        const y = terrainHeight(x, z, course) +
          Math.max(.025, drift * shoulder + micro * shoulder + .055);
        p.push(x, y, z);
        uv.push(x * .23, z * .21);
        const dark = .055 * shoulder * (.5 + .5 * Math.sin(z * .1 + u * 7));
        colors.push(
          .91 - dark, .956 - dark * .52, .99 - dark * .08, 1);
      }
    }
    const stride = radial + 1;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < radial; i++) {
        const a = start + j * stride + i;
        const b = a + stride;
        // Both sides are rendered; reverse the winding on the opposite side
        // for correct specular micro-normal response.
        if (side < 0) indices.push(a, b, a + 1, a + 1, b, b + 1);
        else indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
  }
  const mat = material("Cortina wind-packed snow shoulder sculptures",
    "#e9f1f5", 0, .29);
  mat.diffuseVertexColor = true;
  mat.cull = pc.CULLFACE_NONE;
  mat.update();
  const m = meshEntity(app.graphicsDevice, root,
    "Cortina soft snow banks along both curved piste boundaries",
    p, indices, mat, colors, uv);
  m.render!.castShadows = false;
  return mat;
}
