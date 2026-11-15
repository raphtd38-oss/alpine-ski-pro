import * as pc from "playcanvas";
import type { Course, SkierState, Quality } from "../game/types";
import { terrainHeight } from "../game/course";
import { material, meshEntity } from "./geometry";
export class SnowEffects {
  root = new pc.Entity("Snow effects");
  trail: pc.Entity;
  spray: pc.Entity;
  positions: number[];
  indices: number[];
  cursor = 0;
  lastX = 0;
  lastZ = 0;
  hasLast = false;
  particles: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    life: number;
  }[] = [];
  mat: pc.StandardMaterial;
  sprayMat: pc.StandardMaterial;
  constructor(
    public app: pc.Application,
    public c: Course,
    public quality: Quality,
  ) {
    app.root.addChild(this.root);
    this.mat = material("Ski grooves", "#a4becd");
    this.mat.opacity = 0.38;
    this.mat.blendType = pc.BLEND_NORMAL;
    this.mat.depthWrite = false;
    this.mat.update();
    const count = { low: 260, medium: 500, high: 900, ultra: 1400 }[quality];
    this.positions = Array(count * 12).fill(0);
    this.indices = [];
    for (let i = 0; i < count; i++) {
      const n = i * 4;
      this.indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
    }
    this.trail = meshEntity(
      app.graphicsDevice,
      this.root,
      "Persistent ski tracks",
      this.positions,
      this.indices,
      this.mat,
    );
    this.trail.render!.castShadows = false;
    this.sprayMat = material("Powder crystals", "#f0f7fa");
    this.sprayMat.emissive.set(0.1, 0.12, 0.14);
    this.sprayMat.update();
    this.spray = meshEntity(
      app.graphicsDevice,
      this.root,
      "Carving snow spray",
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 2],
      this.sprayMat,
    );
    this.spray.render!.castShadows = false;
  }
  update(s: SkierState, dt: number, active: boolean) {
    if (
      active &&
      s.height < 0.05 &&
      Math.hypot(s.vx, s.vz) > 1 &&
      (!this.hasLast || Math.hypot(s.x - this.lastX, s.z - this.lastZ) > 0.4)
    ) {
      if (this.hasLast) {
        for (const side of [-0.17, 0.17]) {
          const x = s.x + Math.cos(s.heading) * side,
            z = s.z - Math.sin(s.heading) * side,
            px = this.lastX + Math.cos(s.heading) * side,
            pz = this.lastZ - Math.sin(s.heading) * side;
          const width = 0.022 + s.slip * 0.006;
          const v = [
            px - width,
            terrainHeight(px, pz, this.c) + 0.025,
            pz,
            px + width,
            terrainHeight(px, pz, this.c) + 0.025,
            pz,
            x + width,
            terrainHeight(x, z, this.c) + 0.025,
            z,
            x - width,
            terrainHeight(x, z, this.c) + 0.025,
            z,
          ];
          this.positions.splice(this.cursor * 12, 12, ...v);
          this.cursor = (this.cursor + 1) % (this.positions.length / 12);
        }
        const mesh = this.trail.render!.meshInstances[0].mesh!;
        mesh.setPositions(this.positions);
        mesh.update();
      }
      this.lastX = s.x;
      this.lastZ = s.z;
      this.hasLast = true;
    }
    if (
      active &&
      s.height < 0.1 &&
      Math.hypot(s.vx, s.vz) > 4 &&
      (Math.abs(s.edge) > 0.15 || s.slip > 1) &&
      this.quality !== "low"
    ) {
      const n = Math.min(6, Math.ceil(Math.abs(s.edge) * 3 + s.slip * 0.3));
      for (let i = 0; i < n && this.particles.length < 140; i++)
        this.particles.push({
          x: s.x,
          y: terrainHeight(s.x, s.z, this.c) + 0.12,
          z: s.z,
          vx: -s.edge * (2 + Math.random() * 4),
          vy: 1 + Math.random() * 2,
          vz: -1 - Math.random() * 3,
          life: 0.35 + Math.random() * 0.35,
        });
    }
    const p: number[] = [],
      idx: number[] = [];
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const a = this.particles[i];
      a.life -= dt;
      if (a.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.z += a.vz * dt;
      a.vy -= 6 * dt;
      const k = p.length / 3,
        r = 0.025 + a.life * 0.05;
      p.push(a.x - r, a.y, a.z, a.x + r, a.y, a.z, a.x, a.y + r * 2, a.z);
      idx.push(k, k + 1, k + 2);
    }
    if (!p.length) {
      p.push(0, -1000, 0, 0, -1000, 0, 0, -1000, 0);
      idx.push(0, 1, 2);
    }
    const mesh = this.spray.render!.meshInstances[0].mesh!;
    mesh.setPositions(p);
    mesh.setNormals(
      Array(p.length)
        .fill(0)
        .map((_, i) => (i % 3 === 1 ? 1 : 0)),
    );
    mesh.setIndices(idx);
    mesh.update();
  }
  reset() {
    this.positions.fill(0);
    this.cursor = 0;
    this.hasLast = false;
    this.particles = [];
    const mesh = this.trail.render!.meshInstances[0].mesh!;
    mesh.setPositions(this.positions);
    mesh.update();
  }
  destroy() {
    this.root.destroy();
    this.mat.destroy();
    this.sprayMat.destroy();
  }
}
