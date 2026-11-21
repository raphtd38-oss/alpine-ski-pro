/**
 * Alpine Ski Pro - unified, contact-driven Super-G human motion.
 *
 * This is a newly authored procedural biomechanics controller, NOT mocap.
 * It drives one coherent body pose from the simulator's 120 Hz ski forces.
 * Feet remain owned by the dual-ski ground/flight IK in the race director;
 * this module never changes course position, physics or replay timing.
 *
 * Design: edge release -> crossover/extension -> outside-leg loading ->
 * counter-angulated carve -> release; independently start push, aerial
 * absorption, landing and finish reach. Filtered in seconds, not frames.
 */
import type { SGSourceFrame, SGPose } from "./superg-carve-kinematics";

export interface HumanMotionDiagnostics {
  compression: number;
  crossover: number;
  commitment: number;
  outsideLoad: number;
  tuck: number;
}

const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
const sat = (v: number) => clamp(v, 0, 1);
const smoothstep = (a: number, b: number, value: number) => {
  const t = sat((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};

type Channels = {
  bank: number; height: number; side: number; fore: number;
  pelvisRoll: number; torsoPitch: number; torsoRoll: number;
  chestPitch: number; chestRoll: number; headPitch: number;
};

export class SuperGHumanReconstruction {
  private channels: Channels | null = null;
  private diagnostics: HumanMotionDiagnostics = {
    compression: 0, crossover: 0, commitment: 0, outsideLoad: .5, tuck: 0,
  };

  reset(): void {
    this.channels = null;
    this.diagnostics = {
      compression: 0, crossover: 0, commitment: 0, outsideLoad: .5, tuck: 0,
    };
  }

  getDiagnostics(): HumanMotionDiagnostics {
    return {...this.diagnostics};
  }

  sample(raw: SGPose, frame: SGSourceFrame, dt: number): SGPose {
    const speed = Math.max(0, raw.speed);
    const starting = raw.startPhase < 2.1;
    const prestart = raw.startPhase < 0;
    const pushing = !prestart && starting;
    const flight = sat(Math.max(raw.airborne, frame.height > .06 ? 1 : 0));
    const landing = sat(raw.landing);
    const release = raw.phase === "release" || raw.phase === "transition";
    const crossover = release ? smoothstep(.06, .85, Math.abs(raw.edgeRate)) : 0;
    const grip = sat(raw.engagement) * (1 - .62 * sat(raw.skid));
    const outsideLoad = clamp(raw.outsideLoadFraction, .5, .93);
    const force = sat(raw.lateralG / 2.1);
    const commitment = grip * (.68 + .32 * force) * (1 - .72 * crossover);
    const outsideBias = sat((outsideLoad - .5) / .43);
    const speedTuck = starting ? 0 : smoothstep(12, 29, speed);
    const tuck = sat(raw.tuck * speedTuck * (1 - .33 * commitment)
      + .24 * raw.finishReach);
    const extension = sat(crossover + .85 * raw.startExtension);
    const push = pushing ? sat(raw.startPoleImpulse) : 0;
    const brace = prestart ? sat(raw.startBrace) : 0;
    const compression = sat(.55 * commitment + .36 * landing + .18 * tuck
      + .24 * push - .42 * extension);
    const sideSign = Math.sign(raw.edge);
    // The rigid two skis establish a stable stance. We never fake the
    // deep two-leg crouch by translating both feet into the same hip.
    const target: Channels = {
      bank: clamp(raw.bankDeg * (.61 + .16 * force), -42, 42),
      height: clamp(
        .984 - .085 * tuck - .055 * commitment - .055 * landing
          - .042 * brace - .045 * push + .066 * extension
          + .035 * flight - .025 * raw.finishReach, .805, 1.045),
      side: clamp(raw.pelvisShiftM * (.64 + .14 * outsideBias), -.24, .24),
      fore: clamp(-.023 - .042 * tuck - .019 * commitment
        - .028 * raw.finishReach, -.115, .01),
      pelvisRoll: clamp(sideSign * commitment * (2 + 5 * force), -8, 8),
      // Bind-pose correction and downhill pitch are applied once by director.
      // Hip hinging is the major source of aero tuck, not a folded upper back.
      torsoPitch: 14 + 18 * tuck + 7 * brace + 5 * push
        + 2 * commitment + 6 * raw.finishReach,
      torsoRoll: clamp(sideSign * commitment * (11 + 5 * force), -17, 17),
      chestPitch: 2 + 5 * tuck + 2 * commitment,
      chestRoll: clamp(sideSign * commitment * 7, -9, 9),
      headPitch: -clamp(6 + 9 * tuck + 3 * brace, 4, 20),
    };
    if (!this.channels || !Number.isFinite(dt) || dt > .25) {
      this.channels = {...target};
    } else {
      // Contact-dependent acceleration of the entire chain makes the edge
      // switch readable without discontinuous pose snaps or fake keyframes.
      const seconds = clamp(dt, 0, .08);
      const supportHz = 13;
      const trunkHz = 9;
      const filtered: Channels = {...this.channels};
      for (const key of Object.keys(target) as (keyof Channels)[]) {
        const rate = key === "height" || key === "side" || key === "bank"
          ? supportHz : trunkHz;
        const w = 1 - Math.exp(-rate * seconds);
        filtered[key] += (target[key] - filtered[key]) * w;
      }
      this.channels = filtered;
    }
    const c = this.channels;
    this.diagnostics = {compression, crossover, commitment, outsideLoad, tuck};
    return {
      ...raw,
      bankDeg: c.bank,
      pelvisHeightM: c.height,
      pelvisShiftM: c.side,
      pelvisForeAftM: c.fore,
      pelvisRollDeg: c.pelvisRoll,
      pelvisYawDeg: clamp(raw.pelvisYawDeg * .4, -3, 3),
      spinePitchDeg: c.torsoPitch,
      spineRollDeg: c.torsoRoll,
      chestPitchDeg: c.chestPitch,
      chestRollDeg: c.chestRoll,
      chestYawDeg: clamp(raw.chestYawDeg * .62, -9, 9),
      headPitchDeg: c.headPitch,
      headRollDeg: clamp(-sideSign * commitment * 3.5, -5, 5),
      headYawDeg: clamp(raw.headYawDeg * .4, -3, 3),
      tuck,
      // Leave both physical ski axes, edge rolls and boot contact intact.
      leftFoot: raw.leftFoot,
      rightFoot: raw.rightFoot,
      outsideSide: raw.outsideSide,
    };
  }
}
