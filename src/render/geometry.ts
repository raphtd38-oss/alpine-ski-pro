import * as pc from "playcanvas";
export const color = (hex: string) => new pc.Color().fromString(hex);
export function material(name: string, hex: string, metal = 0, gloss = 0.25) {
  const m = new pc.StandardMaterial();
  m.name = name;
  m.diffuse = color(hex);
  m.useMetalness = true;
  m.metalness = metal;
  m.gloss = gloss;
  m.update();
  return m;
}
export function meshEntity(
  device: pc.GraphicsDevice,
  parent: pc.Entity,
  name: string,
  positions: number[],
  indices: number[],
  mat: pc.Material,
  colors?: number[],
  uvs?: number[],
): pc.Entity {
  const mesh = new pc.Mesh(device);
  mesh.setPositions(positions);
  mesh.setNormals(pc.calculateNormals(positions, indices));
  mesh.setIndices(indices);
  if (colors) mesh.setColors(colors);
  if (uvs) mesh.setUvs(0, uvs);
  mesh.update(pc.PRIMITIVE_TRIANGLES);
  const e = new pc.Entity(name);
  e.addComponent("render", { meshInstances: [new pc.MeshInstance(mesh, mat)] });
  parent.addChild(e);
  return e;
}
export function shape(
  parent: pc.Entity,
  type: "box" | "cylinder" | "sphere" | "capsule" | "cone" | "plane",
  name: string,
  pos: number[],
  scale: number[],
  mat: pc.Material,
): pc.Entity {
  const e = new pc.Entity(name);
  e.addComponent("render", { type, material: mat });
  e.setLocalPosition(pos[0], pos[1], pos[2]);
  e.setLocalScale(scale[0], scale[1], scale[2]);
  parent.addChild(e);
  return e;
}
export function beam(
  parent: pc.Entity,
  a: pc.Vec3,
  b: pc.Vec3,
  r: number,
  mat: pc.Material,
  name = "beam",
) {
  const delta = b.clone().sub(a);
  const e = shape(
    parent,
    "cylinder",
    name,
    a.clone().add(b).mulScalar(0.5).toArray(),
    [r, delta.length(), r],
    mat,
  );
  e.setRotation(new pc.Quat().setFromDirections(pc.Vec3.UP, delta.normalize()));
  return e;
}
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
