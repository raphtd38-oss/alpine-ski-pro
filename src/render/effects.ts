import * as pc from "playcanvas";
import type { Course, SkierState, Quality } from "../game/types";
import { terrainHeight } from "../game/course";
import { skiTrackQuad, snowSprayVelocity, type TrackSample } from "../game/snow";
import { material, meshEntity, rng } from "./geometry";

interface Crystal {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

export class SnowEffects {
  root = new pc.Entity("Snow effects");
  trail: pc.Entity;
  spray: pc.Entity;
  positions: number[];
  indices: number[];
  cursor = 0;
  lastSample: TrackSample | null = null;
  particles: Crystal[] = [];
  random = rng(20261116);
  emissionTime = 0;
  sprayDrawTime = 0;
  mat: pc.StandardMaterial;
  sprayMat: pc.StandardMaterial;
  particleLimit: number;

  constructor(
    public app: pc.Application,
    public c: Course,
    public quality: Quality,
  ) {
    app.root.addChild(this.root);
    this.mat = material("Carved ski grooves", "#9bb4c1");
    this.mat.opacity = 0.43;
    this.mat.blendType = pc.BLEND_NORMAL;
    this.mat.depthWrite = false;
    this.mat.cull = pc.CULLFACE_NONE;
    this.mat.update();

    const count = { low: 260, medium: 500, high: 900, ultra: 1400 }[quality];
    this.particleLimit = { low: 0, medium: 65, high: 115, ultra: 180 }[quality];
    this.positions = Array(count * 12).fill(0);
    // Park the as-yet unwritten trail triangles below the mountain.
    for (let i = 1; i < this.positions.length; i += 3) this.positions[i] = -1000;
    this.indices = [];
    const upNormals: number[] = [];
    for (let i = 0; i < count; i++) {
      const n = i * 4;
      this.indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
      for (let v = 0; v < 4; v++) upNormals.push(0, 1, 0);
    }
    this.trail = meshEntity(
      app.graphicsDevice,
      this.root,
      "Persistent slope-following ski tracks",
      this.positions,
      this.indices,
      this.mat,
    );
    this.trail.render!.castShadows = false;
    const trailMesh = this.trail.render!.meshInstances[0].mesh!;
    trailMesh.setNormals(upNormals);
    trailMesh.update();

    this.sprayMat = material("Carving powder crystals", "#f0f7fa");
    this.sprayMat.emissive.set(0.08, 0.1, 0.12);
    this.sprayMat.cull = pc.CULLFACE_NONE;
    this.sprayMat.opacity = 0.86;
    this.sprayMat.blendType = pc.BLEND_NORMAL;
    this.sprayMat.depthWrite = false;
    this.sprayMat.update();
    this.spray = meshEntity(
      app.graphicsDevice,
      this.root,
      "Speed-relative carving spray",
      [0, -1000, 0, 0, -1000, 0, 0, -1000, 0],
      [0, 1, 2],
      this.sprayMat,
    );
    this.spray.render!.castShadows = false;
    this.spray.enabled = false;
  }

  update(s: SkierState, dt: number, active: boolean, cameraPosition: pc.Vec3) {
    dt = Math.min(0.1, Math.max(0, dt));
    const speed = Math.hypot(s.vx, s.vz);
    const grounded = s.height < 0.05;
    if (!active || !grounded) {
      // Do not connect tracks across a jump or a restart.
      this.lastSample = null;
    } else if (
      speed > 1 &&
      (!this.lastSample ||
        Math.hypot(s.x - this.lastSample.x, s.z - this.lastSample.z) > 0.34)
    ) {
      const current: TrackSample = { x: s.x, z: s.z, heading: s.heading };
      if (this.lastSample) {
        const halfWidth = Math.min(0.075, 0.025 + s.slip * 0.004);
        const ground = (x: number, z: number) => terrainHeight(x, z, this.c);
        for (const skiOffset of [-0.17, 0.17]) {
          const quad = skiTrackQuad(
            this.lastSample,
            current,
            skiOffset,
            halfWidth,
            ground,
          );
          const offset = this.cursor * 12;
          for (let k = 0; k < 12; k++) this.positions[offset + k] = quad[k];
          this.cursor = (this.cursor + 1) % (this.positions.length / 12);
        }
        const mesh = this.trail.render!.meshInstances[0].mesh!;
        mesh.setPositions(this.positions);
        mesh.update();
      }
      this.lastSample = current;
    }

    const emitting =
      active &&
      grounded &&
      this.particleLimit > 0 &&
      speed > 4 &&
      (Math.abs(s.edge) > 0.15 || s.slip > 1);
    if (emitting) {
      // Emit by elapsed time, not by frames, so 30/60/144 Hz remain comparable.
      this.emissionTime = Math.min(this.emissionTime + dt, 0.1);
      const tick = 1 / 35;
      while (this.emissionTime >= tick) {
        this.emissionTime -= tick;
        const n = Math.min(4, Math.ceil(Math.abs(s.edge) * 2.4 + s.slip * 0.22));
        const outside = s.edge >= 0 ? -1 : 1;
        for (let i = 0; i < n && this.particles.length < this.particleLimit; i++) {
          const v = snowSprayVelocity(s, this.random());
          const lateral = outside * (0.12 + this.random() * 0.13);
          const x = s.x + Math.cos(s.heading) * lateral;
          const z = s.z - Math.sin(s.heading) * lateral;
          this.particles.push({
            x,
            y: terrainHeight(x, z, this.c) + 0.09,
            z,
            vx: v.x,
            vy: v.y,
            vz: v.z,
            life: 0.3 + this.random() * 0.35,
          });
        }
      }
    } else {
      this.emissionTime = 0;
    }

    // Simulate every frame, but upload dynamic mesh buffers at at most 30 Hz.
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const crystal = this.particles[i];
      crystal.life -= dt;
      if (crystal.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      crystal.x += crystal.vx * dt;
      crystal.y += crystal.vy * dt;
      crystal.z += crystal.vz * dt;
      crystal.vy -= 7 * dt;
      // Powder lands on the actual slope instead of sinking through it.
      if (crystal.y <= terrainHeight(crystal.x, crystal.z, this.c) + 0.025)
        crystal.life = 0;
    }

    if (!this.particles.length) {
      this.spray.enabled = false;
      this.sprayDrawTime = 0;
      return;
    }
    this.sprayDrawTime += dt;
    if (this.sprayDrawTime < 1 / 30) return;
    this.sprayDrawTime = 0;

    const p: number[] = [];
    const idx: number[] = [];
    const normals: number[] = [];
    for (const a of this.particles) {
      if (a.life <= 0) continue;
      const k = p.length / 3;
      const radius = Math.min(0.065, 0.016 + a.life * 0.066);
      // Two triangles form a view-facing translucent snowflake. The previous
      // fixed world-space triangles disappeared edge-on when the camera moved.
      const dx = cameraPosition.x - a.x;
      const dy = cameraPosition.y - a.y;
      const dz = cameraPosition.z - a.z;
      const d = Math.max(1e-6, Math.hypot(dx, dy, dz));
      const nx = dx / d, ny = dy / d, nz = dz / d;
      const h = Math.max(1e-5, Math.hypot(nx, nz));
      const rx = nz / h, rz = -nx / h;
      const ux = -ny * nx / h, uy = h, uz = -ny * nz / h;
      const size = radius * 1.7;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        p.push(a.x + rx * size * sx + ux * size * sy,
          a.y + uy * size * sy,
          a.z + rz * size * sx + uz * size * sy);
        normals.push(nx, ny, nz);
      }
      idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
    }
    const mesh = this.spray.render!.meshInstances[0].mesh!;
    mesh.setPositions(p);
    mesh.setNormals(normals);
    mesh.setIndices(idx);
    mesh.update();
    this.spray.enabled = true;
  }

  reset() {
    this.positions.fill(0);
    for (let i = 1; i < this.positions.length; i += 3) this.positions[i] = -1000;
    this.cursor = 0;
    this.lastSample = null;
    this.particles = [];
    this.emissionTime = 0;
    this.sprayDrawTime = 0;
    this.random = rng(20261116);
    this.spray.enabled = false;
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
