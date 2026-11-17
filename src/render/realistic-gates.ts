import * as pc from "playcanvas";
import type { Course, Gate, Quality } from "../game/types";
import type { PoleState } from "../game/poles";
import { terrainHeight } from "../game/course";
import { shape } from "./geometry";

/**
 * Alpine Ski Pro — rendu de porte entièrement déformable.
 *
 * Une porte :
 *   - deux groupes gauche/droite de piquets indépendants,
 *   - chaque groupe : un piquet intérieur et un piquet extérieur,
 *   - deux fanions, chacun attaché physiquement aux deux tiges,
 *   - une toile simulée par contraintes de distance (PBD/Verlet).
 *
 * AUCUNE boîte de collision au milieu de la porte.
 * Race valide le passage, PoleSimulation simule les impacts.
 */

const POLE_LENGTH = 1.98;
const FLAG_BOTTOM = 1.13 / POLE_LENGTH;
const FLAG_TOP = 1.76 / POLE_LENGTH;
const PARTNER_DISTANCE = 1.03;
const EXTRA_PANEL_Z = -0.08;
const MAX_RENDER_DISTANCE = 145;
const TWO_PI = Math.PI * 2;

const clamp = (x: number, a: number, b: number) =>
  Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Vec3 = [number, number, number];

function vlength(x: number, y: number, z: number): number {
  return Math.hypot(x, y, z);
}

function makeVisualEntity(
  parent: pc.Entity,
  name: string,
  mesh: pc.Mesh,
  material: pc.Material,
  castShadows = false,
): pc.Entity {
  const entity = new pc.Entity(name);
  entity.addComponent("render", {
    meshInstances: [new pc.MeshInstance(mesh, material)],
  });
  entity.render!.castShadows = castShadows;
  parent.addChild(entity);
  return entity;
}

/**
 * Une vraie courbe intégrée : la base est quasi droite, le milieu fléchit
 * progressivement et la pointe se déplace le plus. Pas de rotation globale.
 * Les paramètres angleX/angleZ proviennent du ressort amorti à 120 Hz.
 */
export class DeformableGatePole {
  readonly entity: pc.Entity;
  readonly mesh: pc.Mesh;
  readonly rings: number;
  readonly sides: number;
  readonly centres: Float32Array;
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly base: pc.Vec3;
  private lastX = Number.NaN;
  private lastZ = Number.NaN;
  private lastTip = Number.NaN;
  private lastPhase = Number.NaN;
  private lastImpact = Number.NaN;

  constructor(
    device: pc.GraphicsDevice,
    parent: pc.Entity,
    material: pc.Material,
    base: pc.Vec3,
    quality: Quality,
  ) {
    this.base = base.clone();
    this.rings = quality === "low" ? 12 : quality === "medium" ? 16 : 22;
    this.sides = quality === "low" ? 7 : 10;
    const vertexCount = (this.rings + 1) * (this.sides + 1);
    this.centres = new Float32Array((this.rings + 1) * 3);
    this.positions = new Float32Array(vertexCount * 3);
    this.normals = new Float32Array(vertexCount * 3);
    const uv = new Float32Array(vertexCount * 2);
    const indices: number[] = [];

    for (let y = 0; y <= this.rings; y++) {
      for (let side = 0; side <= this.sides; side++) {
        const n = y * (this.sides + 1) + side;
        uv[n * 2] = side / this.sides;
        uv[n * 2 + 1] = y / this.rings;
        if (y < this.rings && side < this.sides) {
          const a = n;
          const b = a + this.sides + 1;
          indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
    }

    this.mesh = new pc.Mesh(device);
    this.mesh.clear(true, false);
    this.mesh.setIndices(indices);
    this.mesh.setUvs(0, uv);
    this.bend(0, 0, 0, 0, 1.25);
    this.entity = makeVisualEntity(
      parent,
      "Flexible slalom pole",
      this.mesh,
      material,
      quality !== "low",
    );
    this.entity.tags.add("pole");
    this.entity.setLocalPosition(base);
  }

  /** Retourne la position du centre du piquet en coordonnées locales du pivot. */
  sample(t: number): Vec3 {
    const at = clamp(t, 0, 1) * this.rings;
    const lo = Math.min(this.rings, Math.floor(at));
    const hi = Math.min(this.rings, lo + 1);
    const w = at - lo;
    return [
      this.base.x + lerp(this.centres[lo * 3], this.centres[hi * 3], w),
      this.base.y + lerp(this.centres[lo * 3 + 1], this.centres[hi * 3 + 1], w),
      this.base.z + lerp(this.centres[lo * 3 + 2], this.centres[hi * 3 + 2], w),
    ];
  }

  bend(
    ax: number,
    az: number,
    tipAmp = 0,
    phase = 0,
    impactHeight = 1.25,
  ): void {
    if (!Number.isFinite(ax + az + tipAmp + phase + impactHeight)) return;
    if (
      Math.abs(ax - this.lastX) < 0.00035 &&
      Math.abs(az - this.lastZ) < 0.00035 &&
      Math.abs(tipAmp - this.lastTip) < 0.00035 &&
      Math.abs(impactHeight - this.lastImpact) < 0.001 &&
      (tipAmp < 0.00035 || Math.abs(phase - this.lastPhase) < 0.01)
    ) return;
    this.lastX = ax;
    this.lastZ = az;
    this.lastTip = tipAmp;
    this.lastPhase = phase;
    this.lastImpact = impactHeight;

    // Les angles sont orientés autour de X et Z ; la déflexion latérale
    // correspond donc respectivement à Z+ et X- (sens d'une vraie rotation).
    const angle = clamp(Math.hypot(ax, az), 0, 1.40);
    const directionX = angle < 1e-7 ? 0 : -az / angle;
    const directionZ = angle < 1e-7 ? 1 : ax / angle;
    const hit = clamp(impactHeight / POLE_LENGTH, 0.18, 0.95);
    const step = POLE_LENGTH / this.rings;
    let x = 0;
    let y = 0;
    let z = 0;

    for (let ring = 0; ring <= this.rings; ring++) {
      const t = ring / this.rings;
      const theta = angle * Math.pow(t, hit < 0.5 ? 1.20 : 1.58) +
        clamp(tipAmp, -0.18, 0.18) *
          Math.pow(t, 2.4) * Math.sin(phase + 4 * t);
      if (ring > 0) {
        const u = (ring - 0.5) / this.rings;
        const inBetweenTheta = angle *
            Math.pow(u, hit < 0.5 ? 1.20 : 1.58) +
          clamp(tipAmp, -0.18, 0.18) *
            Math.pow(u, 2.4) * Math.sin(phase + 4 * u);
        x += step * Math.sin(inBetweenTheta) * directionX;
        y += step * Math.cos(inBetweenTheta);
        z += step * Math.sin(inBetweenTheta) * directionZ;
      }
      const centre = ring * 3;
      this.centres[centre] = x;
      this.centres[centre + 1] = y;
      this.centres[centre + 2] = z;

      // Anneaux circulaires perpendiculaires à la tangente locale.
      const c = Math.cos(theta);
      const sn = Math.sin(theta);
      const radius = 0.019 - 0.004 * t;
      for (let j = 0; j <= this.sides; j++) {
        const phi = TWO_PI * j / this.sides;
        const radial = Math.cos(phi);
        const around = Math.sin(phi);
        const nx = radial * directionX * c - around * directionZ;
        const ny = -radial * sn;
        const nz = radial * directionZ * c + around * directionX;
        const v = (ring * (this.sides + 1) + j) * 3;
        this.positions[v] = x + radius * nx;
        this.positions[v + 1] = y + radius * ny;
        this.positions[v + 2] = z + radius * nz;
        this.normals[v] = nx;
        this.normals[v + 1] = ny;
        this.normals[v + 2] = nz;
      }
    }
    this.mesh.setPositions(this.positions);
    this.mesh.setNormals(this.normals);
    this.mesh.update();
  }

  destroy(): void {
    this.mesh.destroy();
  }
}

/**
 * Un panneau de toile 3D de 10-14 x 5-8 cellules.
 * Toutes les lignes aux extrémités sont attachées aux piquets.
 * Les cellules libres suivent une petite simulation tissu (Verlet/PBD).
 * La texture rouge/bleue existante de World est réutilisée telle quelle.
 */
export class ElasticGateFlag {
  readonly entity: pc.Entity;
  readonly mesh: pc.Mesh;
  readonly positions: Float32Array;
  readonly previous: Float32Array;
  readonly normals: Float32Array;
  readonly indices: number[] = [];
  readonly cols: number;
  readonly rows: number;
  readonly stride: number;
  private readonly restH: number;
  private readonly restV: number;
  private readonly restD: number;
  private elapsed = 0;
  private readonly highQuality: boolean;

  constructor(
    device: pc.GraphicsDevice,
    parent: pc.Entity,
    material: pc.Material,
    private readonly inner: DeformableGatePole,
    private readonly outer: DeformableGatePole,
    quality: Quality,
    private readonly outerOffset = new pc.Vec3(),
  ) {
    this.cols = quality === "low" ? 10 : 14;
    this.rows = quality === "low" ? 5 : 8;
    this.stride = this.cols + 1;
    this.highQuality = quality === "high" || quality === "ultra";
    const count = this.stride * (this.rows + 1);
    this.positions = new Float32Array(count * 3);
    this.previous = new Float32Array(count * 3);
    this.normals = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2);
    this.restH = PARTNER_DISTANCE / this.cols * 1.015;
    this.restV = (FLAG_TOP - FLAG_BOTTOM) * POLE_LENGTH / this.rows * 1.015;
    this.restD = Math.hypot(this.restH, this.restV) * 1.01;

    for (let row = 0; row <= this.rows; row++) {
      for (let col = 0; col <= this.cols; col++) {
        const vertex = row * this.stride + col;
        uv[vertex * 2] = col / this.cols;
        uv[vertex * 2 + 1] = 1 - row / this.rows;
        if (row < this.rows && col < this.cols) {
          const a = vertex;
          const b = a + this.stride;
          this.indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
    }

    this.placeAtRest();
    this.mesh = new pc.Mesh(device);
    this.mesh.clear(true, false);
    this.mesh.setIndices(this.indices);
    this.mesh.setUvs(0, uv);
    this.computeNormals();
    this.mesh.setPositions(this.positions);
    this.mesh.setNormals(this.normals);
    this.mesh.update();
    this.entity = makeVisualEntity(parent, "Gate textile flag", this.mesh, material);
  }

  private point(row: number, col: number): number {
    return (row * this.stride + col) * 3;
  }

  private anchor(row: number, col: number, dest: Float32Array): void {
    const v = row / this.rows;
    const u = col / this.cols;
    const at = lerp(FLAG_BOTTOM, FLAG_TOP, v);
    const a = this.inner.sample(at);
    const b = this.outer.sample(at);
    const i = this.point(row, col);
    dest[i] = lerp(a[0], b[0] + this.outerOffset.x, u);
    dest[i + 1] = lerp(a[1], b[1] + this.outerOffset.y, u);
    dest[i + 2] = lerp(a[2], b[2] + this.outerOffset.z, u);
  }

  private placeAtRest(): void {
    for (let row = 0; row <= this.rows; row++) {
      for (let col = 0; col <= this.cols; col++) {
        this.anchor(row, col, this.positions);
        const i = this.point(row, col);
        const u = col / this.cols;
        const v = row / this.rows;
        // La toile n'est pas un panneau rigide : légère flèche centrale.
        const sag = Math.sin(Math.PI * u);
        this.positions[i + 1] -= 0.030 * sag;
        this.positions[i + 2] += 0.020 * sag * Math.sin(Math.PI * v);
      }
    }
    this.previous.set(this.positions);
  }

  private pinBorders(): void {
    for (let row = 0; row <= this.rows; row++) {
      const left = this.point(row, 0);
      const right = this.point(row, this.cols);
      this.anchor(row, 0, this.positions);
      this.anchor(row, this.cols, this.positions);
      // Les points attachés suivent les piquets sans vitesse parasite.
      for (let j = 0; j < 3; j++) {
        this.previous[left + j] = this.positions[left + j];
        this.previous[right + j] = this.positions[right + j];
      }
    }
  }

  /** Corrige uniquement l'ÉTIREMENT : une toile se froisse en compression. */
  private constrain(a: number, b: number, rest: number, stiffness: number): void {
    const ia = a * 3;
    const ib = b * 3;
    const dx = this.positions[ib] - this.positions[ia];
    const dy = this.positions[ib + 1] - this.positions[ia + 1];
    const dz = this.positions[ib + 2] - this.positions[ia + 2];
    const length = vlength(dx, dy, dz);
    if (length <= rest || length < 1e-9) return;
    const ca = a % this.stride;
    const cb = b % this.stride;
    const fixedA = ca === 0 || ca === this.cols;
    const fixedB = cb === 0 || cb === this.cols;
    const scalar = (length - rest) / length * stiffness;
    const wa = fixedA ? 0 : fixedB ? 1 : 0.5;
    const wb = fixedB ? 0 : fixedA ? 1 : 0.5;
    for (let k = 0; k < 3; k++) {
      const d = k === 0 ? dx : k === 1 ? dy : dz;
      this.positions[ia + k] += d * scalar * wa;
      this.positions[ib + k] -= d * scalar * wb;
    }
  }

  private constraints(): void {
    for (let row = 0; row <= this.rows; row++) {
      for (let col = 0; col <= this.cols; col++) {
        const a = row * this.stride + col;
        if (col < this.cols) this.constrain(a, a + 1, this.restH, 0.84);
        if (row < this.rows) this.constrain(a, a + this.stride, this.restV, 0.84);
        if (row < this.rows && col < this.cols) {
          this.constrain(a, a + this.stride + 1, this.restD, 0.22);
          this.constrain(a + 1, a + this.stride, this.restD, 0.22);
        }
      }
    }
  }

  private computeNormals(): void {
    for (let row = 0; row <= this.rows; row++) {
      for (let col = 0; col <= this.cols; col++) {
        const left = this.point(row, Math.max(0, col - 1));
        const right = this.point(row, Math.min(this.cols, col + 1));
        const low = this.point(Math.max(0, row - 1), col);
        const high = this.point(Math.min(this.rows, row + 1), col);
        const ux = this.positions[right] - this.positions[left];
        const uy = this.positions[right + 1] - this.positions[left + 1];
        const uz = this.positions[right + 2] - this.positions[left + 2];
        const vx = this.positions[high] - this.positions[low];
        const vy = this.positions[high + 1] - this.positions[low + 1];
        const vz = this.positions[high + 2] - this.positions[low + 2];
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        const size = Math.max(1e-7, vlength(nx, ny, nz));
        const i = this.point(row, col);
        this.normals[i] = nx / size;
        this.normals[i + 1] = ny / size;
        this.normals[i + 2] = nz / size;
      }
    }
  }

  update(dt: number, time: number, impactEnergy: number): void {
    this.elapsed = time;
    // Sans sous-pas, une chute à 30 FPS rendrait le tissu instable.
    const delta = clamp(dt, 0, 1 / 30);
    const iterations = this.highQuality ? 4 : 3;
    const steps = delta > 1 / 80 ? 2 : 1;
    const h = delta / steps;

    for (let sub = 0; sub < steps; sub++) {
      for (let row = 0; row <= this.rows; row++) {
        for (let col = 1; col < this.cols; col++) {
          const i = this.point(row, col);
          const x = this.positions[i];
          const y = this.positions[i + 1];
          const z = this.positions[i + 2];
          const vx = (x - this.previous[i]) * 0.972;
          const vy = (y - this.previous[i + 1]) * 0.972;
          const vz = (z - this.previous[i + 2]) * 0.972;
          this.previous[i] = x;
          this.previous[i + 1] = y;
          this.previous[i + 2] = z;

          const u = col / this.cols;
          const v = row / this.rows;
          const flutter = Math.sin(this.elapsed * 7.1 + u * 8.6 + v * 5.2);
          const ripple = Math.sin(this.elapsed * 4.1 + u * 5.9 - v * 3.7);
          const blow = 0.55 + 0.75 * flutter + 0.28 * ripple;
          const strike = clamp(impactEnergy, 0, 1) *
            Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
          this.positions[i] = x + vx + 0.12 * flutter * h * h;
          this.positions[i + 1] = y + vy - 2.1 * h * h;
          this.positions[i + 2] = z + vz + (blow + 25 * strike) * h * h;
        }
      }
      this.pinBorders();
      for (let it = 0; it < iterations; it++) {
        this.constraints();
        this.pinBorders();
      }
    }
    this.computeNormals();
    this.mesh.setPositions(this.positions);
    this.mesh.setNormals(this.normals);
    this.mesh.update();
  }

  destroy(): void {
    this.mesh.destroy();
  }
}

/**
 * Un unique couple de fanions, à gauche OU à droite du couloir.
 * Le fanion se trouve à l'extérieur de la ligne d'entrée de la porte.
 */
class FlagPair {
  readonly hinge: pc.Entity;
  readonly partner: pc.Entity;
  readonly inner: DeformableGatePole;
  readonly outer: DeformableGatePole;
  readonly flag: ElasticGateFlag;
  private readonly innerTip: pc.Entity;
  private readonly outerTip: pc.Entity;
  private readonly clips: { entity: pc.Entity; outer: boolean; t: number }[] = [];

  constructor(
    device: pc.GraphicsDevice,
    parent: pc.Entity,
    course: Course,
    gate: Gate,
    side: number,
    poleMaterial: pc.StandardMaterial,
    clothMaterial: pc.StandardMaterial,
    clipMaterial: pc.StandardMaterial,
    quality: Quality,
    gateHeight: number,
  ) {
    const innerX = gate.x + side * gate.width / 2;
    const outerX = innerX + side * PARTNER_DISTANCE;
    const innerY = terrainHeight(innerX, gate.z, course);
    const outerY = terrainHeight(outerX, gate.z + EXTRA_PANEL_Z, course);
    this.hinge = new pc.Entity("Pole hinge");
    this.hinge.setLocalPosition(innerX - gate.x, innerY - gateHeight, 0);
    parent.addChild(this.hinge);

    this.inner = new DeformableGatePole(
      device, this.hinge, poleMaterial, new pc.Vec3(), quality,
    );
    this.partner = new pc.Entity("Second pole of flag pair");
    this.hinge.addChild(this.partner);
    const otherBase = new pc.Vec3(
      outerX - innerX,
      outerY - innerY,
      EXTRA_PANEL_Z,
    );
    this.outer = new DeformableGatePole(
      device, this.partner, poleMaterial, new pc.Vec3(), quality,
    );
    this.partner.setLocalPosition(otherBase);

    // Pour le calcul du drapeau, toutes les coordonnées doivent être celles
    // du pivot intérieur, y compris le second piquet.
    // Son mesh est enfant d'une entité déplacée, mais ses points restitués
    // sont décalés manuellement dans l'espace du fanion.
    this.flag = new ElasticGateFlag(
      device,
      this.hinge,
      clothMaterial,
      this.inner,
      this.outer,
      quality,
      otherBase,
    );

    // Conservons les noms attendus par les tests et le debug du jeu.
    this.innerTip = shape(
      this.hinge, "sphere", "Pole elastic upper section",
      [0, POLE_LENGTH, 0], [0.052, 0.052, 0.052], poleMaterial,
    );
    this.outerTip = shape(
      this.partner, "sphere", "Outer pole protective cap",
      [0, POLE_LENGTH, 0], [0.052, 0.052, 0.052], poleMaterial,
    );
    const innerBoot = shape(
      this.hinge, "cylinder", "Flexible pole rubber joint",
      [0, 0.08, 0], [0.082, 0.16, 0.082], clipMaterial,
    );
    innerBoot.render!.castShadows = false;
    shape(this.partner, "cylinder", "Partner flexible pole rubber joint",
      [0, 0.08, 0], [0.082, 0.16, 0.082], clipMaterial);

    for (const outer of [false, true]) {
      for (const t of [FLAG_BOTTOM + 0.04, FLAG_TOP - 0.04]) {
        const entity = shape(
          this.hinge, "box", "Flexible fabric strap",
          [0, 0, 0], [0.07, 0.075, 0.086], clipMaterial,
        );
        entity.render!.castShadows = false;
        this.clips.push({ entity, outer, t });
      }
    }
    this.updateStraps();
  }

  private updateStraps(): void {
    for (const { entity, outer, t } of this.clips) {
      const p = outer ? this.flagOuterPoint(t) : this.inner.sample(t);
      entity.setLocalPosition(p[0], p[1], p[2]);
    }
  }

  private flagOuterPoint(t: number): Vec3 {
    const pos = this.outer.sample(t);
    const offset = this.partner.getLocalPosition();
    return [pos[0] + offset.x, pos[1] + offset.y, pos[2] + offset.z];
  }

  update(state: PoleState, dt: number, time: number): void {
    this.inner.bend(
      state.angleX,
      state.angleZ,
      state.tipAmp,
      state.tipPhase,
      state.impactHeight,
    );
    this.outer.bend(
      state.partnerAngleX,
      state.partnerAngleZ,
      state.tipAmp * 0.38,
      state.tipPhase - 0.33,
      state.impactHeight,
    );
    const inTip = this.inner.sample(1);
    const outTip = this.outer.sample(1);
    this.innerTip.setLocalPosition(inTip[0], inTip[1], inTip[2]);
    // La pointe extérieure est déjà parente du piquet décalé.
    this.outerTip.setLocalPosition(outTip[0], outTip[1], outTip[2]);
    this.updateStraps();
    this.flag.update(dt, time, state.clothEnergy);
  }

  destroy(): void {
    this.inner.destroy();
    this.outer.destroy();
    this.flag.destroy();
  }
}

/**
 * Adaptateur prêt pour World.gates() et World.updateGates().
 * Le comptage des 34 portes, 68 fanions et 68 paires est conservé.
 */
export class RealisticSuperGGate {
  readonly entity: pc.Entity;
  private readonly left: FlagPair;
  private readonly right: FlagPair;
  private readonly gateZ: number;

  constructor(
    device: pc.GraphicsDevice,
    parent: pc.Entity,
    course: Course,
    gate: Gate,
    poleMaterial: pc.StandardMaterial,
    clothMaterial: pc.StandardMaterial,
    clipMaterial: pc.StandardMaterial,
    quality: Quality,
  ) {
    this.gateZ = gate.z;
    const baseY = terrainHeight(gate.x, gate.z, course);
    this.entity = new pc.Entity(`Gate ${gate.id + 1}`);
    this.entity.setLocalPosition(gate.x, baseY, gate.z);
    parent.addChild(this.entity);
    this.left = new FlagPair(
      device, this.entity, course, gate, -1, poleMaterial,
      clothMaterial, clipMaterial, quality, baseY,
    );
    this.right = new FlagPair(
      device, this.entity, course, gate, +1, poleMaterial,
      clothMaterial, clipMaterial, quality, baseY,
    );
  }

  update(
    leftPole: PoleState | undefined,
    rightPole: PoleState | undefined,
    dt: number,
    time: number,
    focusZ?: number,
  ): void {
    if (Number.isFinite(focusZ) &&
        Math.abs(this.gateZ - focusZ!) > MAX_RENDER_DISTANCE) return;
    if (leftPole) this.left.update(leftPole, dt, time);
    if (rightPole) this.right.update(rightPole, dt, time);
  }

  destroy(): void {
    this.left.destroy();
    this.right.destroy();
  }
}