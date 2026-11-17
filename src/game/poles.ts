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
  /** High-frequency fiberglass tip ringing after impacts. */
  tipAmp: number;
  tipPhase: number;
  recoilArmed: boolean;
  recoilStrength: number;
}
export type ImpactKind = "none" | "shin" | "arm";
export const tipVibration = (p: Pick<PoleState, "tipAmp" | "tipPhase">) =>
  p.tipAmp * Math.sin(p.tipPhase);
/** Slalom breakaway pole: rigid rod on a damped 2-axis torsional hinge.
 * Parameters are gameplay approximations, not measured or certified FIS equipment.
 * Base contact is checked continuously along the skier's swept upper-body footprint.
 * This collision never determines gate validity; Race uses the skis' crossing instead.
 */
export class PoleSimulation {
  poles: PoleState[] = [];
  lastImpacts = 0;
  lastImpactKind: ImpactKind = "none";
  lastImpactStrength = 0;
  lastRebounds = 0;
  lastReboundSide = 0;
  lastReboundStrength = 0;
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
          tipAmp: 0,
          tipPhase: 0,
          recoilArmed: false,
          recoilStrength: 0,
        });
  }
  update(previous: SkierState, s: SkierState, dt: number) {
    this.lastImpacts = 0;
    this.lastImpactKind = "none";
    this.lastImpactStrength = 0;
    this.lastRebounds = 0;
    this.lastReboundSide = 0;
    this.lastReboundStrength = 0;
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
      const offset = Math.hypot(p.x - closestX, p.z - closestZ);
      const inside = offset < 0.46 && s.height < 1.25;
      const speed = Math.hypot(s.vx, s.vz);
      if (
        inside &&
        !p.contact &&
        speed > 0.8 &&
        Math.hypot(p.angleX, p.angleZ) < 1.05
      ) {
        // Close hits are modeled as shin-guard contact; brushes are lighter
        // arm-protection contact. Gameplay approximation, not bodypart IK.
        const kind: ImpactKind = offset < 0.2 ? "shin" : "arm";
        const scale = kind === "shin" ? 1 : 0.55;
        const impulse = clamp(speed * 0.16, 0, 3.6) * scale,
          nx = s.vx / speed,
          nz = s.vz / speed;
        p.omegaX += (nz * impulse * 1.15) / inertia;
        p.omegaZ -= (nx * impulse * 1.15) / inertia;
        const skierMass = 82;
        const slow = kind === "shin" ? 2.5 : 1.25;
        const away = Math.sign(s.x - p.x) || (p.side > 0 ? -1 : 1);
        s.vx -= (nx * impulse * slow) / skierMass;
        s.vx += (away * impulse * 0.75) / skierMass;
        s.vz = Math.max(0, s.vz - (nz * impulse * slow) / skierMass);
        s.balance = clamp(s.balance -
          impulse * (kind === "shin" ? 0.008 : 0.004), 0, 1);
        const strength = clamp(impulse / 3.6, 0, 1);
        s.poleImpact = Math.max(s.poleImpact, strength);
        s.poleImpactSide = p.side;
        p.tipAmp = Math.max(p.tipAmp, strength * 0.15);
        p.recoilArmed = true;
        p.recoilStrength = strength;
        if (strength >= this.lastImpactStrength) {
          this.lastImpactKind = kind;
          this.lastImpactStrength = strength;
        }
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
      p.tipAmp *= Math.exp(-6.5 * dt);
      if (p.tipAmp < 1e-5) p.tipAmp = 0;
      p.tipPhase = (p.tipPhase + 2 * Math.PI * 17 * dt) % (2 * Math.PI);
      p.angleX += p.omegaX * dt;
      p.angleZ += p.omegaZ * dt;
      const tilt = Math.hypot(p.angleX, p.angleZ),
        limit = 1.48;
      // Return click when a bent fiberglass pole recoils through vertical.
      if (p.recoilArmed && tilt < 0.10 &&
          p.angleX * p.omegaX + p.angleZ * p.omegaZ < 0) {
        p.recoilArmed = false;
        if (p.recoilStrength > 0.15) {
          this.lastRebounds++;
          if (p.recoilStrength >= this.lastReboundStrength) {
            this.lastReboundSide = p.side;
            this.lastReboundStrength = p.recoilStrength;
          }
        }
      }
      if (tilt > limit) {
        p.angleX *= limit / tilt;
        p.angleZ *= limit / tilt;
        p.omegaX *= 0.35;
        p.omegaZ *= 0.35;
      }
    }
  }
}
