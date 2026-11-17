import * as pc from "playcanvas";
import type { Course, SkierState, Quality } from "../game/types";
import { terrainHeight } from "../game/course";
import { skiTrackQuad, snowSprayVelocity, snowPlumeIntensity, type TrackSample } from "../game/snow";
import { skiSnowMark, snowPlumeSource, crashSnowEnergy } from "../game/snow-contact";
import { sampleSnowSurface } from "../game/surface";
import { material, meshEntity, rng } from "./geometry";

interface Crystal {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  size: number;
}

export class SnowEffects {
  root = new pc.Entity("Snow effects");
  trail: pc.Entity;
  /** Thin pale shoulders of freshly displaced powder beside each edge groove. */
  ridges: pc.Entity;
  spray: pc.Entity;
  positions: number[];
  ridgePositions: number[];
  indices: number[];
  cursor = 0;
  lastSample: TrackSample | null = null;
  particles: Crystal[] = [];
  random = rng(20261116);
  emissionTime = 0;
  sprayDrawTime = 0;
  mat: pc.StandardMaterial;
  ridgeMat: pc.StandardMaterial;
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
    this.particleLimit = { low: 18, medium: 65, high: 115, ultra: 180 }[quality];
    this.positions = Array(count * 12).fill(0);
    this.ridgePositions = Array(count * 12).fill(0);
    // Unused ribbon cells stay well below the mountainside; they never flash
    // at the start when the geometry buffer is still empty.
    for (let i = 1; i < this.positions.length; i += 3) {
      this.positions[i] = -1000;
      this.ridgePositions[i] = -1000;
    }
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

    this.ridgeMat = material("Raised fresh snow along ski edges", "#ecf5f7");
    this.ridgeMat.opacity = 0.53;
    this.ridgeMat.blendType = pc.BLEND_NORMAL;
    this.ridgeMat.depthWrite = false;
    this.ridgeMat.cull = pc.CULLFACE_NONE;
    this.ridgeMat.update();
    this.ridges = meshEntity(
      app.graphicsDevice, this.root,
      "Dual outside ski edge snow ridges",
      this.ridgePositions, this.indices, this.ridgeMat,
    );
    this.ridges.render!.castShadows = false;
    const ridgeMesh = this.ridges.render!.meshInstances[0].mesh!;
    ridgeMesh.setNormals(upNormals);
    ridgeMesh.update();

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
        const ground = (x: number, z: number) => terrainHeight(x, z, this.c);
        for (const skiSide of [-1, 1] as const) {
          const skiOffset = skiSide * 0.18;
          const contact = skiSnowMark(s, skiSide);
          const cut = skiTrackQuad(this.lastSample, current, skiOffset,
            contact.halfWidthM, ground);
          const ridge = skiTrackQuad(this.lastSample, current,
            skiOffset + contact.ridgeOffsetM,
            contact.ridgeHalfWidthM, ground);
          const offset = this.cursor * 12;
          for (let k = 0; k < 12; k++) {
            this.positions[offset + k] = cut[k];
            this.ridgePositions[offset + k] =
              k % 3 === 1 ? ridge[k] + contact.ridgeHeightM : ridge[k];
          }
          this.cursor = (this.cursor + 1) % (this.positions.length / 12);
        }
        const grooveMesh = this.trail.render!.meshInstances[0].mesh!;
        grooveMesh.setPositions(this.positions);
        grooveMesh.update();
        const ridgeMesh = this.ridges.render!.meshInstances[0].mesh!;
        ridgeMesh.setPositions(this.ridgePositions);
        ridgeMesh.update();
      }
      this.lastSample = current;
    }

    const crashEnergy = crashSnowEnergy(s.gateCrashElapsed);
    const snow = sampleSnowSurface(s.x, s.z, this.c);
    const plumeIntensity = Math.max(
      snowPlumeIntensity(s, speed) *
        (0.82 + 0.34 * snow.depth + 0.14 * snow.ice),
      crashEnergy * 1.55,
    );
    const emitting =
      active && grounded && this.particleLimit > 0 && plumeIntensity > 0.22;
    if (emitting) {
      // Emit by elapsed time, not by frames, so 30/60/144 Hz remain comparable.
      this.emissionTime = Math.min(this.emissionTime + dt, 0.1);
      const tick = 1 / 40;
      while (this.emissionTime >= tick) {
        this.emissionTime -= tick;
        const n = Math.min(
          this.quality === "low" ? 4 : 11,
          Math.ceil(plumeIntensity * (1.75 + snow.depth * .45)),
        );
        for (let i = 0; i < n && this.particles.length < this.particleLimit; i++) {
          const random = this.random();
          const source = snowPlumeSource(s, i, speed, random);
          const v = snowSprayVelocity(s, this.random());
          // The loaded OUTSIDE ski creates the long trailing fan; the
          // unweighted inside ski contributes only a fine drifting spray.
          const energy = 0.48 + source.strength * 0.70;
          v.x *= energy;
          v.z *= energy;
          v.y = (v.y * 0.43 + source.liftMps) *
            (0.62 + source.strength * .46) +
            s.landingShock * (0.7 + this.random() * 1.6);
          if (crashEnergy > 0) {
            // A body/ski slide throws a much lower, wider fan of crystals.
            v.x += (this.random() - .5) * 6.4 * crashEnergy;
            v.z += (this.random() - .5) * 3.8 * crashEnergy;
            v.y += crashEnergy * 0.85;
          }
          const lateral = source.xOffsetM + (this.random() - .5) * .09;
          const x = s.x + Math.cos(s.heading) * lateral;
          const z = s.z - Math.sin(s.heading) * lateral;
          this.particles.push({
            x, y: terrainHeight(x, z, this.c) + .05,
            z,
            vx: v.x,
            vy: v.y,
            vz: v.z,
            life: (.27 + this.random() * .55 +
              s.landingShock * .16 + crashEnergy * .10) *
              (0.65 + source.strength * .36),
            size: source.radiusM * (.72 + this.random() * .72) *
              (crashEnergy > 0 ? 1.35 : 1),
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
      const radius = Math.min(0.09, a.size +
        Math.max(0, a.life) * (a.size * .58));
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
    if (p.length === 0) {
      this.spray.enabled = false;
      return;
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
    this.ridgePositions.fill(0);
    for (let i = 1; i < this.positions.length; i += 3) {
      this.positions[i] = -1000;
      this.ridgePositions[i] = -1000;
    }
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
    const ridge = this.ridges.render!.meshInstances[0].mesh!;
    ridge.setPositions(this.ridgePositions);
    ridge.update();
  }

  destroy() {
    this.root.destroy();
    this.mat.destroy();
    this.ridgeMat.destroy();
    this.sprayMat.destroy();
  }
}
