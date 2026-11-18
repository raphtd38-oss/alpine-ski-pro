import * as pc from 'playcanvas';
import { gradient, terrainHeight } from '../game/course';
import type { Course } from '../game/types';

/** Rigid ski plane aligned to the height-field normal, including crossfall.
 * Imported skis point down local -Z. Roll is radians about their local +Z. */
export function skiSurfaceRotation(heading: number, x: number, z: number,
  course: Course, roll: number): pc.Quat {
  const [gx, gz] = gradient(x, z, course);
  const up = new pc.Vec3(-gx, 1, -gz).normalize();
  const forward = new pc.Vec3(Math.sin(heading),
    gx * Math.sin(heading) + gz * Math.cos(heading), Math.cos(heading)).normalize();
  const back = forward.mulScalar(-1);
  const right = new pc.Vec3().cross(up, back).normalize();
  up.cross(back, right).normalize();
  const matrix = new pc.Mat4().set([
    right.x, right.y, right.z, 0, up.x, up.y, up.z, 0,
    back.x, back.y, back.z, 0, 0, 0, 0, 1,
  ]);
  return new pc.Quat().setFromMat4(matrix).mul(
    new pc.Quat().setFromAxisAngle(pc.Vec3.FORWARD.clone().mulScalar(-1), roll * 180 / Math.PI));
}

/** Sole samples in actual foot-local space (pivot 0.125m above base).
 * Tip upturn is excluded: rigid running surface only, not decorative geometry. */
export const SKI_SOLE_SAMPLES = [-0.88, -0.44, 0, 0.44, 0.88].flatMap(z =>
  [-0.046, 0.046].map(x => new pc.Vec3(x, -0.125, z)));

export function minimumSoleClearance(position: pc.Vec3, rotation: pc.Quat,
  course: Course): number {
  return Math.min(...SKI_SOLE_SAMPLES.map(local => {
    const p = rotation.transformVector(local).add(position);
    return p.y - terrainHeight(p.x, p.z, course);
  }));
}
