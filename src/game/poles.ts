import type { Course, SkierState } from "./types";
import { clamp } from "./types";
export interface PoleState {
  x: number;
  z: number;
  gate: number;
  side: number;
  angleX: number;
  angleZ: number;
  omegaX: number;
  omegaZ: number;
  contact: boolean;
  impacts: number;
}
/** Slalom breakaway pole: rigid rod on a damped 2-axis torsional hinge.
 * Parameters are gameplay approximations, not measured or certified FIS equipment.
 * Base contact is checked continuously along the skier's swept upper-body footprint.
 * This collision never determines gate validity; Race uses the skis' crossing instead.
 */
export class PoleSimulation {
  poles: PoleState[] = [];
  lastImpacts = 0;
  readonly length = 2;
  readonly mass = 0.38;
  readonly spring = 13;
  readonly damping = 2.6;
  constructor(c: Course) {
    for (const gate of c.gates)
      for (const side of [-1, 1])
        this.poles.push({
          x: gate.x + (side * gate.width) / 2,
          z: gate.z,
          gate: gate.id,
          side,
          angleX: 0,
          angleZ: 0,
          omegaX: 0,
          omegaZ: 0,
          contact: false,
          impacts: 0,
        });
  }
  update(previous: SkierState, s: SkierState, dt: number) {
    this.lastImpacts = 0;
    const inertia = (this.mass * this.length * this.length) / 3;
    for (const p of this.poles) {
      const dx = s.x - previous.x,
        dz = s.z - previous.z;
      const distanceSquared = dx * dx + dz * dz;
      const u = clamp(
        ((p.x - previous.x) * dx + (p.z - previous.z) * dz) /
          Math.max(distanceSquared, 1e-10),
        0,
        1,
      );
      const closestX = previous.x + dx * u,
        closestZ = previous.z + dz * u;
      const inside =
        Math.hypot(p.x - closestX, p.z - closestZ) < 0.46 && s.height < 1.25;
      const speed = Math.hypot(s.vx, s.vz);
      if (
        inside &&
        !p.contact &&
        speed > 0.8 &&
        Math.hypot(p.angleX, p.angleZ) < 1.05
      ) {
        // Momentum exchange is light: a breakaway pole bends instead of stopping the skier.
        const impulse = clamp(speed * 0.16, 0, 3.6),
          nx = s.vx / speed,
          nz = s.vz / speed;
        p.omegaX += (nz * impulse * 1.15) / inertia;
        p.omegaZ -= (nx * impulse * 1.15) / inertia;
        const skierMass = 82;
        s.vx -= (nx * impulse) / skierMass;
        s.vz = Math.max(0, s.vz - (nz * impulse) / skierMass);
        s.balance = clamp(s.balance - impulse * 0.004, 0, 1);
        // Trigger an upper-body recoil without disturbing ski-crossing rules.
        s.poleImpact = Math.max(s.poleImpact, clamp(impulse / 3.6, 0, 1));
        p.impacts++;
        this.lastImpacts++;
      }
      p.contact = inside;
      // Fibreglass bends more strongly near the limit and settles without
      // infinite ringing. The dynamics remain deterministic at 120 Hz.
      const bend = Math.hypot(p.angleX, p.angleZ);
      const restoring = this.spring * (1 + bend * bend * 0.24);
      const damping = this.damping * (1 + bend * 0.18);
      p.omegaX +=
        ((-restoring * p.angleX - damping * p.omegaX) / inertia) * dt;
      p.omegaZ +=
        ((-restoring * p.angleZ - damping * p.omegaZ) / inertia) * dt;
      p.angleX += p.omegaX * dt;
      p.angleZ += p.omegaZ * dt;
      const tilt = Math.hypot(p.angleX, p.angleZ),
        limit = 1.48;
      if (tilt > limit) {
        p.angleX *= limit / tilt;
        p.angleZ *= limit / tilt;
        p.omegaX *= 0.35;
        p.omegaZ *= 0.35;
      }
    }
  }
}
