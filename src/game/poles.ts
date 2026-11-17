import type { Course, SkierState } from "./types";
import { clamp } from "./types";
import { detectBannerContact } from "./banner-contact";

/**
 * AlpIne Ski Pro — portes de Super-G souples (simulation 120 Hz).
 *
 * Chaque porte possède deux panneaux indépendants. Chaque panneau est tenu
 * par un piquet intérieur (celui qui peut être frappé) ET un piquet extérieur.
 * Ces deux piquets sont couplés par la toile, mais jamais soudés ensemble.
 *
 * Un passage correct est jugé dans Race et NON par cette simulation.
 * Les contacts ne sont donc jamais des murs invisibles.
 */
export interface PoleState {
  x: number;
  z: number;
  gate: number;
  side: number;
  angleX: number;
  angleZ: number;
  omegaX: number;
  omegaZ: number;
  /** Flexion transmise au deuxième piquet à travers le fanion. */
  partnerAngleX: number;
  partnerAngleZ: number;
  partnerOmegaX: number;
  partnerOmegaZ: number;
  contact: boolean;
  partnerContact: boolean;
  impacts: number;
  tipAmp: number;
  tipPhase: number;
  recoilArmed: boolean;
  recoilStrength: number;
  /** Hauteur approximative du contact pour moduler la courbure (m). */
  impactHeight: number;
  /** Énergie transmise à la toile (0..1), amortie après le choc. */
  clothEnergy: number;
  /** Animated ground sweep of the impacted inner and outer shafts, 0..1. */
  flatten: number;
  partnerFlatten: number;
  flattenHold: number;
}

export type ImpactKind = "none" | "shin" | "arm";

export const tipVibration = (p: Pick<PoleState, "tipAmp" | "tipPhase">) =>
  p.tipAmp * Math.sin(p.tipPhase);

const MAX_BEND = 1.40;
const SKIER_MASS = 82;
const INNER_INERTIA = 0.42;
const OUTER_INERTIA = 0.48;
const INNER_STIFFNESS = 19;
const INNER_DAMPING = 3.25;
const OUTER_STIFFNESS = 24;
const OUTER_DAMPING = 4.15;
const CLOTH_COUPLING = 7.0;
const CLOTH_RELATIVE_DAMPING = 0.70;

function integrateAxis(
  angle: number,
  omega: number,
  partnerAngle: number,
  partnerOmega: number,
  dt: number,
): [number, number, number, number] {
  // Deux ressorts/amortisseurs couplés (semi-implicit Euler stable à 120 Hz).
  // La toile transmet progressivement l'impulsion au piquet extérieur.
  const difference = angle - partnerAngle;
  const relativeVelocity = omega - partnerOmega;
  const coupling = CLOTH_COUPLING * difference +
    CLOTH_RELATIVE_DAMPING * relativeVelocity;
  const innerAccel =
    (-INNER_STIFFNESS * angle - INNER_DAMPING * omega - coupling) /
    INNER_INERTIA;
  const outerAccel =
    (-OUTER_STIFFNESS * partnerAngle - OUTER_DAMPING * partnerOmega +
      coupling) /
    OUTER_INERTIA;

  omega += innerAccel * dt;
  partnerOmega += outerAccel * dt;
  angle += omega * dt;
  partnerAngle += partnerOmega * dt;

  angle = clamp(angle, -MAX_BEND, MAX_BEND);
  partnerAngle = clamp(partnerAngle, -MAX_BEND * 0.65, MAX_BEND * 0.65);
  if (Math.abs(angle) >= MAX_BEND) omega *= 0.23;
  if (Math.abs(partnerAngle) >= MAX_BEND * 0.65) partnerOmega *= 0.35;
  return [angle, omega, partnerAngle, partnerOmega];
}

export class PoleSimulation {
  poles: PoleState[] = [];
  lastImpacts = 0;
  lastImpactKind: ImpactKind = "none";
  lastImpactStrength = 0;
  lastRebounds = 0;
  lastReboundSide = 0;
  lastReboundStrength = 0;
  readonly length = 2;
  lastBannerHit = false;
  lastBannerCrash = false;
  lastBannerSide = 0;
  lastBannerGate = -1;
  lastBannerPenetration = 0;
  private readonly touchedBanners = new Set<string>();
  readonly mass = 0.38;
  readonly spring = INNER_STIFFNESS;
  readonly damping = INNER_DAMPING;

  constructor(private readonly course: Course) {
    for (const gate of course.gates) {
      for (const side of [-1, 1]) {
        this.poles.push({
          x: gate.x + (side * gate.width) / 2,
          z: gate.z,
          gate: gate.id,
          side,
          angleX: 0,
          angleZ: 0,
          omegaX: 0,
          omegaZ: 0,
          partnerAngleX: 0,
          partnerAngleZ: 0,
          partnerOmegaX: 0,
          partnerOmegaZ: 0,
          contact: false,
          partnerContact: false,
          impacts: 0,
          tipAmp: 0,
          tipPhase: 0,
          recoilArmed: false,
          recoilStrength: 0,
          impactHeight: 1.25,
          clothEnergy: 0,
          flatten: 0,
          partnerFlatten: 0,
          flattenHold: 0,
        });
      }
    }
  }

  update(previous: SkierState, current: SkierState, dt: number): void {
    this.lastImpacts = 0;
    this.lastImpactKind = "none";
    this.lastImpactStrength = 0;
    this.lastRebounds = 0;
    this.lastReboundSide = 0;
    this.lastReboundStrength = 0;
    this.lastBannerHit = false;
    this.lastBannerCrash = false;
    this.lastBannerSide = 0;
    this.lastBannerGate = -1;
    this.lastBannerPenetration = 0;

    const step = clamp(dt, 0, 1 / 60);
    const travelX = current.x - previous.x;
    const travelZ = current.z - previous.z;
    const travelSq = travelX * travelX + travelZ * travelZ;
    const speed = Math.hypot(current.vx, current.vz);

    // Speed-gate textile is a collision surface, not a transparent visual.
    // Hit is evaluated at its plane with continuous (swept) crossing.
    // A shallow impact flattens both shafts; >45% depth triggers a full fall.
    const isAlreadyFalling = current.gateCrashElapsed >= 0;
    if (!isAlreadyFalling && speed > 1.5) {
      for (const gate of this.course.gates) {
        if (gate.z < Math.min(previous.z, current.z) - 0.25 ||
            gate.z > Math.max(previous.z, current.z) + 0.25) continue;
        const banner = detectBannerContact(previous, current, gate);
        if (!banner) continue;
        const key = `${banner.gateId}:${banner.side}`;
        if (this.touchedBanners.has(key)) continue;
        this.touchedBanners.add(key);
        const p = this.poles.find((pole) =>
          pole.gate === banner.gateId && pole.side === banner.side);
        if (!p) continue;
        this.lastBannerHit = true;
        this.lastBannerSide = banner.side;
        this.lastBannerGate = banner.gateId;
        this.lastBannerPenetration = banner.penetration;
        p.flattenHold = Math.max(p.flattenHold, 0.57);
        p.clothEnergy = 1;
        p.tipAmp = Math.max(p.tipAmp, 0.17);
        p.impactHeight = 1.34;
        p.recoilArmed = true;
        p.recoilStrength = Math.max(p.recoilStrength, 0.8);
        // The inner pole flexes downhill. The cloth gives a delayed tug
        // on its partner. Flatten animation makes the tip touch the snow.
        p.omegaX += Math.max(2.4, Math.min(8.4, speed * 0.25));
        p.partnerOmegaX += 0.65;
        current.poleImpact = Math.max(current.poleImpact, 0.84);
        current.poleImpactSide = banner.side;

        if (banner.crash) {
          this.lastBannerCrash = true;
          current.gateCrashElapsed = 0.001;
          current.gateCrashSide = banner.side;
          current.gateCrashSeverity = banner.penetration;
          current.fallen = Math.max(current.fallen, 3.05);
          current.balance = Math.min(current.balance, 0.04);
          current.edge = 0;
          // Heavy cloth contact cannot be ghosted through: the skier stops
          // on the entry side and then slides away with damped momentum.
          current.z = Math.min(current.z, gate.z - 0.16);
          current.vz = Math.max(0, current.vz * 0.24);
          current.vx = current.vx * 0.25 - banner.side * 1.2;
          break;
        }
      }
    }

    for (const p of this.poles) {
      // Test sur le segment balayé par le skieur, pas seulement la frame finale.
      // Cela évite de manquer les impacts à grande vitesse.
      const fraction = travelSq < 1e-10
        ? 0
        : clamp(
            ((p.x - previous.x) * travelX +
              (p.z - previous.z) * travelZ) / travelSq,
            0,
            1,
          );
      const nearestX = previous.x + fraction * travelX;
      const nearestZ = previous.z + fraction * travelZ;
      const distance = Math.hypot(p.x - nearestX, p.z - nearestZ);
      const height = previous.height +
        fraction * (current.height - previous.height);
      // Model the racer's shoulders/arms and pole-guards, not just the
      // ski centre point. The former 0.50m threshold barely ever triggered
      // a visible touch in real play, so gates stayed perfectly straight.
      // The middle of a 7.6m gate remains completely collision-free.
      const contact = distance < 0.86 && height < 1.85;

      if (
        contact && !p.contact && speed > 1.5 &&
        Math.hypot(p.angleX, p.angleZ) < 1.15
      ) {
        const kind: ImpactKind = distance < 0.26 ? "shin" : "arm";
        // Soft contact still sends a clearly visible bending wave along the
        // entire fiberglass rod; direct shin impacts remain the strongest.
        const grazing = clamp(1 - distance / 1.26, 0.30, 1);
        const strikeScale = kind === "shin" ? 1 : 0.87;
        const impulse = clamp(speed * 0.28 * grazing * strikeScale, 0, 5.4);
        const vx = current.vx / speed;
        const vz = current.vz / speed;

        // Les angles sont des degrés de liberté du piquet, PAS une rotation
        // rigide du fanion. Le mesh calcule une courbe le long de la tige.
        p.omegaX += (vz * impulse * 1.08) / INNER_INERTIA;
        p.omegaZ -= (vx * impulse * 1.08) / INNER_INERTIA;
        p.impactHeight = kind === "shin" ? 0.63 : 1.34;
        const strength = clamp(impulse / 5.4, 0, 1);
        p.clothEnergy = Math.max(p.clothEnergy, 0.20 + 0.80 * strength);
        p.tipAmp = Math.max(p.tipAmp, strength * 0.19);
        p.recoilArmed = true;
        p.recoilStrength = strength;
        p.impacts++;
        this.lastImpacts++;

        // Légère réaction du skieur, sans le bloquer ni annuler la porte.
        const braking = impulse * (kind === "shin" ? 2.4 : 1.15);
        current.vx -= (vx * braking) / SKIER_MASS;
        current.vz = Math.max(0, current.vz - (vz * braking) / SKIER_MASS);
        current.balance = clamp(
          current.balance - strength * (kind === "shin" ? 0.018 : 0.008),
          0, 1,
        );
        current.poleImpact = Math.max(current.poleImpact, strength);
        current.poleImpactSide = p.side;
        if (strength >= this.lastImpactStrength) {
          this.lastImpactKind = kind;
          this.lastImpactStrength = strength;
        }
      }
      p.contact = contact;

      // Le piquet extérieur peut lui aussi être directement touché, par
      // exemple si le joueur skie hors du corridor. On ne le rend pas rigide.
      const outerX = p.x + p.side * 1.03;
      const outerZ = p.z - 0.08;
      const outerFraction = travelSq < 1e-10
        ? 0
        : clamp(
            ((outerX - previous.x) * travelX +
              (outerZ - previous.z) * travelZ) / travelSq,
            0,
            1,
          );
      const outerNearestX = previous.x + outerFraction * travelX;
      const outerNearestZ = previous.z + outerFraction * travelZ;
      const outerDistance = Math.hypot(
        outerX - outerNearestX, outerZ - outerNearestZ,
      );
      const outerHeight = previous.height +
        outerFraction * (current.height - previous.height);
      const outerContact = outerDistance < 0.80 && outerHeight < 1.85;
      if (
        outerContact && !p.partnerContact && speed > 1.5 &&
        Math.hypot(p.partnerAngleX, p.partnerAngleZ) < 0.95
      ) {
        const impulse = clamp(speed * 0.20 *
          clamp(1 - outerDistance / 1.20, 0.30, 1), 0, 4.0);
        const vx = current.vx / speed;
        const vz = current.vz / speed;
        p.partnerOmegaX += vz * impulse / OUTER_INERTIA;
        p.partnerOmegaZ -= vx * impulse / OUTER_INERTIA;
        p.impactHeight = 1.22;
        const strength = clamp(impulse / 4.0, 0, 1);
        p.clothEnergy = Math.max(p.clothEnergy, 0.16 + 0.84 * strength);
        p.tipAmp = Math.max(p.tipAmp, 0.12 * strength);
        p.recoilArmed = true;
        p.recoilStrength = Math.max(p.recoilStrength, strength);
        current.poleImpact = Math.max(current.poleImpact, strength);
        current.poleImpactSide = p.side;
        current.vx -= vx * impulse / SKIER_MASS;
        current.vz = Math.max(0, current.vz - vz * impulse / SKIER_MASS);
        this.lastImpacts++;
        p.impacts++;
        if (strength >= this.lastImpactStrength) {
          this.lastImpactKind = "arm";
          this.lastImpactStrength = strength;
        }
      }
      p.partnerContact = outerContact;

      const innerX = integrateAxis(
        p.angleX, p.omegaX, p.partnerAngleX, p.partnerOmegaX, step,
      );
      p.angleX = innerX[0];
      p.omegaX = innerX[1];
      p.partnerAngleX = innerX[2];
      p.partnerOmegaX = innerX[3];

      const innerZ = integrateAxis(
        p.angleZ, p.omegaZ, p.partnerAngleZ, p.partnerOmegaZ, step,
      );
      p.angleZ = innerZ[0];
      p.omegaZ = innerZ[1];
      p.partnerAngleZ = innerZ[2];
      p.partnerOmegaZ = innerZ[3];

      // Plafond vectoriel pour éviter une tige physiquement impossible.
      const tilt = Math.hypot(p.angleX, p.angleZ);
      if (tilt > MAX_BEND) {
        p.angleX *= MAX_BEND / tilt;
        p.angleZ *= MAX_BEND / tilt;
        p.omegaX *= 0.35;
        p.omegaZ *= 0.35;
      }

      p.tipAmp *= Math.exp(-6.8 * step);
      if (p.tipAmp < 0.00001) p.tipAmp = 0;
      p.tipPhase = (p.tipPhase + 2 * Math.PI * 16 * step) % (2 * Math.PI);
      p.clothEnergy *= Math.exp(-3.7 * step);
      if (p.clothEnergy < 0.0001) p.clothEnergy = 0;

      // The flexible flag strikes snow on a brush: inner shaft folds first,
      // outer shaft follows the cloth tension with a short physical delay.
      p.flattenHold = Math.max(0, p.flattenHold - step);
      const foldTarget = p.flattenHold > 0 ? 1 : 0;
      const foldRate = foldTarget ? 28 : 3.7;
      p.flatten += (foldTarget - p.flatten) *
        (1 - Math.exp(-foldRate * step));
      const partnerTarget = p.flatten * 0.94;
      p.partnerFlatten += (partnerTarget - p.partnerFlatten) *
        (1 - Math.exp(-(p.flattenHold > 0 ? 11 : 4.5) * step));

      if (
        p.recoilArmed &&
        tilt < 0.095 &&
        p.angleX * p.omegaX + p.angleZ * p.omegaZ < 0
      ) {
        p.recoilArmed = false;
        if (p.recoilStrength > 0.13) {
          this.lastRebounds++;
          if (p.recoilStrength >= this.lastReboundStrength) {
            this.lastReboundSide = p.side;
            this.lastReboundStrength = p.recoilStrength;
          }
        }
      }
    }
  }
}