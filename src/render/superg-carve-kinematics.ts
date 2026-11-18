/**
 * Alpine Ski Pro — Super-G competition animation model (visual ONLY).
 *
 * Designed for the existing PlayCanvas 2.24.1 / TypeScript game:
 *   - SG only; course, collisions, timing, replay physics remain authoritative.
 *   - Input is the actual src/game/types.ts Frame, with optional velocity hints.
 *   - All filters are dt-based, bounded and replay-seek aware.
 *   - Outputs independent commands for BOTH skis and an articulated racer.
 *
 * The values in this file are animation design parameters, not measurements
 * from FIS biomechanical telemetry. Tune the rig on the real track camera.
 *
 * Visual axes of the donated 25-bone GLB:
 *   +Y up; the original mesh faces -Z; the game's rig yaw is +180 degrees.
 *   A bank sign matches the game's current superGRacerBank convention.
 *
 * No dependency on PlayCanvas: can be unit-tested on Node directly.
 */

import type { Frame } from "../game/types";
import { SUPER_G_START_STROKES } from "../game/start-gate";
import { estimateRaceLoad } from "./superg-load-transfer";

export type SkiSide = "L" | "R";
export type EdgePhase =
  | "flat" | "release" | "transition" | "engage" | "loaded" | "airborne";

export type SGSourceFrame = Frame & {
  /** Optional render-only hints; older replay formats omit these. */
  vx?: number;
  vz?: number;
  speed?: number;
  /** This is not the physical heading of either individual ski. */
  skiHeading?: number;
};

export interface SGAnimationTuning {
  // all angles are in DEGREES unless explicitly labelled otherwise
  edgeResponseHz: number;
  heightResponseHz: number;
  bankResponseHz: number;
  armResponseHz: number;
  maxBankDeg: number;
  maxSkiEdgeDeg: number;
  maxInsideDivergenceDeg: number;
  maxSnowSkidYawDeg: number;
  maxPelvisShiftM: number;
  minPelvisHeightM: number;
  maxPelvisHeightM: number;
  stanceHalfWidthM: number;
  innerSkiStaggerM: number;
  slopeContactClearanceM: number;
  skiHalfWidthM: number;
  /** Keep waist below shoulders even in a very strong carve. */
  chestCounterRollDeg: number;
}

/** Tuning for a race-like silhouette, bounded for browser robustness. */
export const SG_RACE_DEFAULTS: Readonly<SGAnimationTuning> = Object.freeze({
  edgeResponseHz: 9.5,
  heightResponseHz: 8.0,
  bankResponseHz: 8.5,
  armResponseHz: 9.5,
  maxBankDeg: 46,
  maxSkiEdgeDeg: 68,
  maxInsideDivergenceDeg: 2.3,
  maxSnowSkidYawDeg: 4,
  maxPelvisShiftM: 0.29,
  minPelvisHeightM: 0.55,
  maxPelvisHeightM: 1.01,
  stanceHalfWidthM: 0.18,
  innerSkiStaggerM: 0.038,
  slopeContactClearanceM: 0.008,
  skiHalfWidthM: 0.046,
  chestCounterRollDeg: 15,
});

export interface SGFootPose {
  side: SkiSide;
  /** True when this ski bears most of the carved-turn load. */
  outside: boolean;
  /** Heel-to-toe heading correction relative to Frame.heading. */
  yawOffsetDeg: number;
  /** Actual independent visual ski-base roll (snow-edge angle). */
  edgeRollDeg: number;
  /** Small fore-aft stance adjustment without changing race simulation. */
  foreAftM: number;
  /** Contact plane clearance for the steel edge. */
  snowClearanceM: number;
  /** Extra unweighting during turn transitions or flight, metres. */
  releaseLiftM: number;
  /** Normalized intended load, NOT a measured force in Newtons. */
  visualLoad: number;
  /** Boot cuff pitch: boots/ski stay mechanically connected. */
  bootPitchDeg: number;
}

export interface SGArmPose {
  shoulderPitchDeg: number;
  shoulderRollDeg: number;
  upperArmPitchDeg: number;
  upperArmYawDeg: number;
  elbowPitchDeg: number;
  wristPitchDeg: number;
  /** Fraction of pole actively planted during the three start impulses. */
  poleContact: number;
  /** Normalized tip trailing direction (0 = vertical, 1 = swept behind). */
  trailing: number;
}

export interface SGPose {
  /** Set through the athlete's root entity, not the physical SkierState. */
  bankDeg: number;
  headingDeg: number;
  /** Downhill-facing centre of mass, represented as an animated pelvis. */
  pelvisHeightM: number;
  pelvisShiftM: number;
  pelvisForeAftM: number;
  pelvisRollDeg: number;
  pelvisYawDeg: number;
  spinePitchDeg: number;
  spineRollDeg: number;
  chestPitchDeg: number;
  chestRollDeg: number;
  chestYawDeg: number;
  headPitchDeg: number;
  headRollDeg: number;
  headYawDeg: number;
  /** Race stance: 0=neutral; 1=full speed tuck. */
  tuck: number;
  /** Strong angle on one edge does NOT mean both legs are equally bent. */
  engagement: number;
  outsideSide: SkiSide | null;
  phase: EdgePhase;
  /** Negative in pre-start, positive after breaking the start wand. */
  startPhase: number;
  startBrace: number;
  /** Visual-only preparation gestures before the start wand opens. */
  startPreparation: number;
  startExtension: number;
  startPoleImpulse: number;
  finishReach: number;
  landing: number;
  airborne: number;
  leftFoot: SGFootPose;
  rightFoot: SGFootPose;
  leftArm: SGArmPose;
  rightArm: SGArmPose;
  /** Debug values for testers; NOT gameplay forces. */
  skid: number;
  edge: number;
  edgeRate: number;
  pressure: number;
  speed: number;
  slipAngleDeg: number;
  /** Procedural visual load based on speed, edge and actual physics pressure. */
  lateralG: number;
  equivalentRadiusM: number;
  outsideLoadFraction: number;
}

const PI = Math.PI;
const RAD = 180 / PI;
const clamp = (x: number, a: number, b: number) =>
  Math.max(a, Math.min(b, Number.isFinite(x) ? x : a));
const sat = (x: number) => clamp(x, 0, 1);
const safe = (x: number | undefined, fallback = 0) =>
  Number.isFinite(x) ? x! : fallback;
const smooth = (a: number, b: number, rate: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-Math.max(0, rate) * clamp(dt, 0, 0.1)));
const smoothstep = (a: number, b: number, value: number) => {
  const t = sat((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const pulse = (x: number, midpoint: number, width: number) => {
  if (width <= 0) return 0;
  const y = (x - midpoint) / width;
  return Math.exp(-0.5 * y * y);
};
const angleDiff = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));

interface Scratch {
  edge: number;
  bank: number;
  pelvisY: number;
  pelvisX: number;
  tuck: number;
  edgeRate: number;
  start: number;
  pole: number;
  armL: number;
  armR: number;
  load: number;
  lastFrameTime: number;
  lastPosZ: number;
  initialized: boolean;
}

const newScratch = (): Scratch => ({
  edge: 0, bank: 0, pelvisY: 1.01, pelvisX: 0,
  tuck: 0, edgeRate: 0, start: 0, pole: 0,
  armL: 0, armR: 0, load: 0.5, lastFrameTime: NaN,
  lastPosZ: NaN, initialized: false,
});

/**
 * Visual solver state is per athlete (player and ghost cannot share it).
 * You may reset() on restart, course changes, replay seeks and teleports.
 * Nothing here mutates the Frame, the equipment, or the fixed-step simulation.
 */
export class SuperGCompetitionPose {
  private state: Scratch = newScratch();
  readonly tuning: SGAnimationTuning;

  constructor(overrides: Partial<SGAnimationTuning> = {}) {
    this.tuning = { ...SG_RACE_DEFAULTS, ...overrides };
  }

  reset(): void { this.state = newScratch(); }

  private preStartBrace(phase: number): number {
    if (phase < -1.3) return 0;
    if (phase < 0) return smoothstep(-1.3, -0.06, phase);
    return 1 - smoothstep(0.035, 0.39, phase);
  }

  private propulsion(phase: number): number {
    if (phase < 0 || phase > 1.8) return 0;
    // Original game already computes three propulsion impulses. This is ONLY
    // an animated complement, and is never added to velocity or the clock.
    // Same waveform as src/game/start-gate.ts / startPoleContact.
    // Do not invent pulse centres unrelated to the race physics.
    return Math.max(...SUPER_G_START_STROKES.map((s) =>
      Math.exp(-Math.pow((phase - s.centre) / s.duration, 2))));
  }

  private launchExtension(phase: number): number {
    if (phase < 0 || phase > 1.6) return 0;
    // Flexion -> leg extension -> next compression over three strokes.
    // The leg extends just AFTER each physical pole contact; damping the
    // amplitude keeps the knees from visibly popping at the end of a stroke.
    return sat(SUPER_G_START_STROKES.reduce((sum, s, index) =>
      sum + (0.78 - index * 0.12) *
        pulse(phase, s.centre + 0.11, s.duration * 0.71), 0));
  }

  sample(frame: SGSourceFrame, dt: number): SGPose {
    const T = this.tuning, S = this.state;
    const elapsed = safe(frame.t, 0), z = safe(frame.z, 0);
    // Animation state must never blend a finish pose into a restarted run.
    const replaySeek = S.initialized && (
      (Number.isFinite(S.lastFrameTime) && elapsed < S.lastFrameTime - 0.1) ||
      (Number.isFinite(S.lastPosZ) && Math.abs(z - S.lastPosZ) > 42) ||
      dt > 0.30 || dt < 0
    );
    if (replaySeek) this.reset();
    const a = this.state;
    a.lastFrameTime = elapsed;
    a.lastPosZ = z;
    a.initialized = true;
    const sDt = clamp(dt, 0, 0.1);

    const edgeTarget = clamp(safe(frame.edge), -1.1, 1.1);
    const previousEdge = a.edge;
    a.edge = smooth(a.edge, edgeTarget, T.edgeResponseHz, sDt);
    const rawRate = sDt <= 0 ? 0 : (a.edge - previousEdge) / sDt;
    a.edgeRate = smooth(a.edgeRate, rawRate, 13, sDt);
    const edge = a.edge, sideSign = Math.sign(edge);
    const edgeAbs = Math.abs(edge);
    const skid = sat(safe(frame.skid));
    const flight = sat(safe(frame.height) * 2.5);
    const contact = 1 - flight;
    const landing = sat(safe(frame.landingShock));
    const pressure = clamp(safe(frame.pressure, 1), 0.5, 1.55);
    const flex = clamp(safe(frame.flex), 0, 1.4);

    const vx = safe(frame.vx), vz = safe(frame.vz);
    const hasVelocity = Number.isFinite(frame.vx) && Number.isFinite(frame.vz);
    const speed = hasVelocity ? Math.hypot(vx, vz) :
      clamp(safe(frame.speed, 18), 0, 70);
    const velocityHeading = hasVelocity && speed > 1 ?
      Math.atan2(vx, vz) : safe(frame.heading);
    const heading = safe(frame.heading);
    // A *skidding* ski points partly across the travel direction. The ski
    // does not simply rotate to follow velocity, nor does it teleport when
    // the line changes or when a replay omits velocity channels.
    const slipAngleDeg = clamp(angleDiff(heading, velocityHeading) * RAD, -25, 25);

    const grip = 1 - 0.52 * skid;
    const engagement = smoothstep(0.10, 0.86, edgeAbs) *
      (0.77 + 0.23 * sat(pressure / 1.3)) * grip * contact;
    const loadTransfer = estimateRaceLoad({
      speedMps: speed, edge, engagement, pressure, skid,
      physicsLoad: frame.load,
    });
    // Load transfer is fast on initiation, slower on release. It must remain
    // continuous through a sign reversal even if a race replay seeks.
    a.load = smooth(a.load, loadTransfer.outsideLoad,
      11.5, sDt);
    const peak = smoothstep(0.38, 0.95, engagement);
    const sign = sideSign;
    const airborne = flight > 0.70;
    const rate = Math.sign(a.edgeRate);
    let phase: EdgePhase = "flat";
    if (airborne) phase = "airborne";
    else if (edgeAbs < 0.09) phase = "flat";
    else if (edgeAbs < 0.19 && Math.abs(a.edgeRate) > 0.28) phase = "transition";
    else if (a.edgeRate * sign > 0.25) phase = "engage";
    else if (a.edgeRate * sign < -0.20) phase = "release";
    else if (peak > 0.15) phase = "loaded";
    else phase = rate === -sign ? "release" : "engage";

    const startPhase = Number.isFinite(frame.startPhase) ?
      frame.startPhase! : -4;
    const brace = this.preStartBrace(startPhase);
    // The first seconds in the start house should not be a frozen mannequin.
    // Two short glove/pole grip checks precede the compact, stable start brace.
    // The countdown is replay-safe, so no animation clock is added to physics.
    const startPreparation = startPhase >= 0 ? 0 :
      smoothstep(-3.70, -3.15, startPhase) *
      (1 - smoothstep(-1.75, -1.20, startPhase));
    const drive = this.propulsion(startPhase);
    const extension = this.launchExtension(startPhase);
    a.start = smooth(a.start, brace, 20, sDt);
    a.pole = smooth(a.pole, startPhase < 0 ? brace : drive, 24, sDt);
    const finishReach = smoothstep(0.03, 0.93,
      sat(safe(frame.finishReach, safe(frame.finishGesture))));

    // These two layers are physically distinct: the skis roll onto their
    // metal edge; the racer banks his COM with less tilt, and counter-angles
    // at the pelvis/rib cage. Rotating the whole body 66 degrees would look
    // like a rigid board instead of an athlete controlling edge pressure.
    const desiredBank = -sign * contact * Math.min(T.maxBankDeg,
      7 * smoothstep(0.06, 0.32, edgeAbs) +
      25 * engagement + 0.30 * loadTransfer.equilibriumLeanDeg *
      loadTransfer.gripCommitment);
    a.bank = smooth(a.bank, desiredBank * (1 - 0.92 * finishReach),
      T.bankResponseHz, sDt);
    const edgeRoll = -sign * Math.min(T.maxSkiEdgeDeg,
      8 * smoothstep(0.08, 0.34, edgeAbs) + 64 * engagement);

    const tuckTarget = Math.max(sat(safe(frame.tuck)) *
      (1 - 0.22 * engagement), finishReach * 0.92);
    a.tuck = smooth(a.tuck, tuckTarget, 9.5, sDt);
    const targetY = clamp(1.01 - (
      0.045 + 0.20 * a.tuck + 0.240 * engagement +
      0.048 * flex + 0.060 * a.start + 0.064 * a.pole -
      0.095 * extension + 0.060 * landing + 0.065 * finishReach
    ), T.minPelvisHeightM, T.maxPelvisHeightM);
    a.pelvisY = smooth(a.pelvisY, targetY,
      T.heightResponseHz, sDt);
    const targetX = sign * engagement * T.maxPelvisShiftM +
      loadTransfer.pelvisShiftM;
    a.pelvisX = smooth(a.pelvisX, targetX, T.heightResponseHz, sDt);

    const outsideSide: SkiSide | null = edgeAbs < 0.07 ? null :
      edge > 0 ? "L" : "R";
    const showOutside = outsideSide !== null;
    const loadBalance = clamp(a.load, 0.5, 0.93);
    const release = phase === "release" || phase === "transition";
    const cornerPitch = clamp(slipAngleDeg * skid * 0.16,
      -T.maxSnowSkidYawDeg, T.maxSnowSkidYawDeg);

    const foot = (side: SkiSide): SGFootPose => {
      const outside = showOutside && side === outsideSide;
      const inside = showOutside && side !== outsideSide;
      // Outer ski steers the COM through its longer arc; the unloaded inner
      // ski is allowed at most ~2 degrees of divergence for realism.
      const toe = inside ? -sign * engagement * T.maxInsideDivergenceDeg : 0;
      // A pressured outside ski tracks the curved running direction; the
      // inside tip opens by just a couple of degrees as its leg unweights.
      // During strong side-slip both skis turn slightly toward travel heading
      // instead of pointing unrealistically straight down the course.
      const steerTowardVelocity = -slipAngleDeg * skid * 0.28;
      const skiHeadingDelta = Number.isFinite(frame.skiHeading)
        ? clamp(angleDiff(frame.skiHeading!, heading) * RAD, -5, 5)
        : 0;
      const carveLead = -sign * engagement * (outside ? 0.85 : 0.35);
      const skidYaw = cornerPitch + steerTowardVelocity +
        carveLead + (inside ? toe : 0) + skiHeadingDelta;
      const foreAftM = inside ? -T.innerSkiStaggerM * engagement : 0;
      const footEdge = edgeRoll * (outside ? 1 : (0.87 - 0.06 * skid)) +
        (inside ? sign * 0.9 : 0);
      const metalClearance = T.skiHalfWidthM *
        Math.abs(Math.sin(footEdge / RAD));
      return {
        side, outside,
        yawOffsetDeg: clamp(skidYaw, -11, 11),
        edgeRollDeg: footEdge,
        foreAftM,
        snowClearanceM: T.slopeContactClearanceM + metalClearance,
        releaseLiftM: inside
          ? (release ? 0.018 : 0.004) * engagement : 0,
        visualLoad: outside ? loadBalance : showOutside ? 1 - loadBalance : 0.5,
        bootPitchDeg: -5 - 8 * a.tuck + 4 * extension + 3 * landing,
      };
    };

    const makeArm = (side: SkiSide): SGArmPose => {
      const outside = side === outsideSide;
      const lowFinishArm = side === "R" ? finishReach : 0;
      const speedStroke = a.pole * (startPhase >= 0 ?
        (0.70 - 0.25 * extension) : 1);
      const counterSide = side === "L" ? -1 : 1;
      const compact = a.tuck * (1 - 0.36 * engagement);
      const prepBeat = Math.sin((startPhase + 4) * 12 +
        (side === "L" ? 0 : Math.PI * 0.68));
      const gloveCheck = startPreparation *
        (0.62 + 0.38 * prepBeat);
      return {
        shoulderPitchDeg: -13 * compact - 37 * speedStroke +
          9 * extension + 10 * engagement * (outside ? 0 : 1) -
          46 * lowFinishArm - 14 * gloveCheck,
        // Reference: arm silhouette is open in the loaded carve, but both hands
        // remain mobile for recovery and do not inherit the ski edge roll.
        shoulderRollDeg: counterSide *
          (8 + 16 * engagement - 5 * compact) + 6 * sign * engagement,
        upperArmPitchDeg: -17 * compact +
          12 * a.pole + 11 * lowFinishArm - 7 * gloveCheck,
        upperArmYawDeg: counterSide *
          (5 + 9 * engagement + 3 * compact + 7 * gloveCheck),
        elbowPitchDeg: -46 * compact * (outside ? 0.25 : 1) +
          30 * speedStroke - 36 * lowFinishArm - 18 * gloveCheck,
        wristPitchDeg: -8 * speedStroke + 9 * lowFinishArm + 12 * gloveCheck,
        poleContact: a.pole * (1 - 0.95 * finishReach),
        trailing: sat(0.20 + 0.74 * compact +
          0.37 * engagement + 0.32 * flight),
      };
    };

    // Sideways pelvis angle + upper-body *counter*-angulation are required
    // to resemble a real GS/SG skier; their signs oppose the global bank.
    const counter = sign * engagement;
    const pelvisRoll = -sign * engagement *
      (12.5 + 3 * sat(loadTransfer.lateralG / 2));
    const spineRoll = counter * 16.5;
    const chestRoll = counter * T.chestCounterRollDeg;
    const forwardPitch = 13 + 29 * a.tuck +
      12 * a.start + 12 * a.pole + 22 * finishReach +
      3 * startPreparation;

    return {
      bankDeg: a.bank,
      headingDeg: heading * RAD,
      pelvisHeightM: a.pelvisY,
      pelvisShiftM: a.pelvisX,
      pelvisForeAftM: -0.040 - 0.045 * a.tuck -
        0.04 * a.start - 0.07 * finishReach,
      pelvisRollDeg: pelvisRoll,
      pelvisYawDeg: counter * 1.8,
      spinePitchDeg: forwardPitch,
      spineRollDeg: spineRoll,
      chestPitchDeg: 5 + 13 * a.tuck + 8 * finishReach,
      chestRollDeg: chestRoll,
      chestYawDeg: -counter * 9.5 -
        Math.sign(safe(frame.poleImpactSide)) * sat(safe(frame.poleImpact)) * 9,
      headPitchDeg: -12 - 19 * a.tuck - 10 * a.start +
        4 * finishReach - 7 * startPreparation,
      headRollDeg: -sign * 6.8 * engagement,
      headYawDeg: counter * 5.5,
      tuck: a.tuck,
      engagement,
      outsideSide,
      phase,
      startPhase,
      startBrace: a.start,
      startPreparation,
      startExtension: extension,
      startPoleImpulse: a.pole,
      finishReach,
      landing,
      airborne: flight,
      leftFoot: foot("L"),
      rightFoot: foot("R"),
      leftArm: makeArm("L"),
      rightArm: makeArm("R"),
      skid,
      edge,
      edgeRate: a.edgeRate,
      pressure,
      speed,
      slipAngleDeg,
      lateralG: loadTransfer.lateralG,
      equivalentRadiusM: loadTransfer.equivalentRadiusM,
      outsideLoadFraction: loadBalance,
    };
  }
}