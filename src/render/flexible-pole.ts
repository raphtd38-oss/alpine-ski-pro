import * as pc from "playcanvas";

/**
 * Original deformable slalom/flex-gate shaft for Alpine Ski Pro.
 * The gameplay / 120 Hz collision impulse remains owned by PoleSimulation.
 * Only active poles upload fresh vertices. No third-party assets are used.
 */
export class FlexiblePoleMesh {
  readonly entity: pc.Entity;
  private readonly mesh: pc.Mesh;
  private readonly positions: Float32Array;
  private readonly normals: Float32Array;
  private readonly rings: number;
  private readonly sides: number;
  private readonly length = 1.98;
  private readonly centres: Float32Array;
  private lastAx = Number.NaN;
  private lastAz = Number.NaN;
  private lastTip = Number.NaN;
  private lastPhase = Number.NaN;

  constructor(
    device: pc.GraphicsDevice,
    parent: pc.Entity,
    mat: pc.Material,
    highDetail: boolean,
  ) {
    this.rings = highDetail ? 20 : 12;
    this.sides = highDetail ? 10 : 7;
    const verts = (this.rings + 1) * (this.sides + 1);
    this.positions = new Float32Array(verts * 3);
    this.normals = new Float32Array(verts * 3);
    this.centres = new Float32Array((this.rings + 1) * 3);
    const uvs = new Float32Array(verts * 2);
    const indices: number[] = [];
    for (let ring = 0; ring <= this.rings; ring++) {
      for (let side = 0; side <= this.sides; side++) {
        const v = ring * (this.sides + 1) + side;
        uvs[2 * v] = side / this.sides;
        uvs[2 * v + 1] = ring / this.rings * 2.35;
        if (ring < this.rings && side < this.sides) {
          const a = v, b = a + this.sides + 1;
          indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
    }
    this.mesh = new pc.Mesh(device);
    this.mesh.clear(true, false);
    this.mesh.setIndices(indices);
    this.mesh.setUvs(0, uvs);
    this.entity = new pc.Entity("Flexible slalom pole");
    this.entity.addComponent("render", {
      meshInstances: [new pc.MeshInstance(this.mesh, mat)],
    });
    this.entity.tags.add("pole");
    parent.addChild(this.entity);
    this.bend(0, 0, 0, 0);
    this.entity.render!.castShadows = highDetail;
  }

  /**
   * The centreline is an integrated elastic arc, not a rotated straight tube.
   * Ax is forward flex around X, Az is lateral flex around Z.
   * Tip shake adds a small travelling mode along the upper fiberglass.
   * Return value is the cap attachment point in hinge-local coordinates.
   */
  bend(ax: number, az: number, tipAmp: number, phase: number): [number, number, number] {
    if (!Number.isFinite(ax + az + tipAmp + phase)) return [0, this.length, 0];
    if (
      Math.abs(ax - this.lastAx) < 0.0005 &&
      Math.abs(az - this.lastAz) < 0.0005 &&
      Math.abs(tipAmp - this.lastTip) < 0.0005 &&
      (tipAmp < 0.0005 || Math.abs(phase - this.lastPhase) < 0.01)
    ) {
      const i = this.rings * 3;
      return [this.centres[i], this.centres[i + 1], this.centres[i + 2]];
    }
    this.lastAx = ax;
    this.lastAz = az;
    this.lastTip = tipAmp;
    this.lastPhase = phase;
    const total = Math.hypot(ax, az);
    const directionX = total > 1e-7 ? -az / total : 1;
    const directionZ = total > 1e-7 ? ax / total : 0;
    const tipMode = Math.max(-0.07, Math.min(0.07, tipAmp * Math.sin(phase)));
    const deflection = Math.min(2.36, total * 1.75);
    const step = this.length / this.rings;
    let x = 0, y = 0, z = 0;
    for (let ring = 0; ring <= this.rings; ring++) {
      if (ring) {
        const t = (ring - 0.5) / this.rings;
        const theta = deflection * Math.pow(t, 0.54) +
          tipMode * Math.sin(t * Math.PI * 1.5) * t;
        const travel = step * Math.sin(theta);
        x += directionX * travel;
        z += directionZ * travel;
        y += step * Math.cos(theta);
      }
      const centre = ring * 3;
      this.centres[centre] = x;
      this.centres[centre + 1] = y;
      this.centres[centre + 2] = z;
      const t = ring / this.rings;
      const theta = deflection * Math.pow(t, 0.54) +
        tipMode * Math.sin(t * Math.PI * 1.5) * t;
      const c = Math.cos(theta), s = Math.sin(theta);
      const r = 0.018 - 0.003 * t;
      for (let side = 0; side <= this.sides; side++) {
        const angle = 2 * Math.PI * side / this.sides;
        const radial = Math.cos(angle), around = Math.sin(angle);
        // An orthonormal basis perpendicular to the curved centreline.
        const nx = radial * directionX * c - around * directionZ;
        const ny = -radial * s;
        const nz = radial * directionZ * c + around * directionX;
        const i = (ring * (this.sides + 1) + side) * 3;
        this.positions[i] = x + r * nx;
        this.positions[i + 1] = y + r * ny;
        this.positions[i + 2] = z + r * nz;
        this.normals[i] = nx;
        this.normals[i + 1] = ny;
        this.normals[i + 2] = nz;
      }
    }
    this.mesh.setPositions(this.positions);
    this.mesh.setNormals(this.normals);
    this.mesh.update();
    const last = this.rings * 3;
    return [this.centres[last], this.centres[last + 1], this.centres[last + 2]];
  }
}
