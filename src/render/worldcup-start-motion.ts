/**
 * Procedural, original skeletal acting for the *background* start-area cast.
 * Unlike the player's race rig this has no physics authority: no ski impulses,
 * timekeeping, start-gate motion, collisions or changes to replays.
 *
 * Every channel is eased and retimed per performer, avoiding synchronous
 * mannequin sways. The 25-bone GLB is animated per joint in the compound.
 */
export interface WaitingAthletePose {
  pelvisY: number;
  pelvisRoll: number;
  hipPitch: number;
  kneePitch: number;
  anklePitch: number;
  spinePitch: number;
  spineRoll: number;
  chestYaw: number;
  neckYaw: number;
  headYaw: number;
  headPitch: number;
  leftShoulderPitch: number;
  rightShoulderPitch: number;
  leftShoulderRoll: number;
  rightShoulderRoll: number;
  leftElbow: number;
  rightElbow: number;
  leftWrist: number;
  rightWrist: number;
  /** Named active action for debug overlays and automated tests. */
  beat: "scan" | "shoulders" | "knee-flex" | "weight-shift" | "adjust-gear" | "wait";
}
export interface StartStaffPose {
  headYaw: number;
  headPitch: number;
  torsoPitch: number;
  leftShoulder: number;
  rightShoulder: number;
  leftElbow: number;
  rightElbow: number;
  leftHip: number;
  rightHip: number;
  leftKnee: number;
  rightKnee: number;
  cue: "observe" | "encourage" | "signal" | "work";
}
const TAU = Math.PI * 2;
const clamp = (x: number, a: number, b: number) =>
  Math.max(a, Math.min(b, Number.isFinite(x) ? x : a));
const smooth = (x: number) => {
  const q = clamp(x, 0, 1);
  return q * q * (3 - 2 * q);
};
const envelope = (t: number, a: number, b: number, fade = .36) =>
  smooth((t - a) / fade) * smooth((b - t) / fade);
const cycle = (seconds: number, shift: number, length: number) =>
  ((Math.max(0, Number.isFinite(seconds) ? seconds : 0) + shift) % length + length) % length;

/** Independently animates neck, spine, 2 x clavicle/arm/elbow/wrist and
 *  2 x hip/knee/ankle chains, not a rigid whole-body rotation. */
export function waitingAthletePose(seconds: number, performer: number): WaitingAthletePose {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const t = cycle(safeSeconds, performer * 2.17, 10.7);
  const scan = envelope(t, .15, 2.24);
  const shoulders = envelope(t, 2.03, 4.12);
  const flex = envelope(t, 3.75, 5.87);
  const transfer = envelope(t, 5.51, 7.30);
  const adjust = envelope(t, 7.06, 9.07);
  const breathing = Math.sin(safeSeconds * 2.10 + performer * 1.11);
  const scanYaw = scan * Math.sin((t - .3) * 2.1) * 26;
  const shoulderRoll = shoulders * Math.sin((t - 2.1) * 5.1);
  // Two unhurried distinct squats and a heel-weight exchange.
  const bend = flex * (.5 - .5 * Math.cos((t - 3.75) * TAU * .97));
  const weight = transfer * Math.sin((t - 5.55) * 2.9);
  const handUp = adjust * (.5 - .5 * Math.cos((t - 7.06) * 3.2));
  const hipPitch = 8 + bend * 17;
  const kneePitch = -12 - bend * 23;
  return {
    pelvisY: -.013 * bend,
    pelvisRoll: weight * 4.0,
    hipPitch, kneePitch, anklePitch: -(hipPitch + kneePitch) * .6,
    spinePitch: -6 - bend * 7 + breathing * .7,
    spineRoll: weight * 5 + shoulderRoll * 3.4,
    chestYaw: scanYaw * .28 - weight * 2,
    neckYaw: scanYaw * .38,
    headYaw: scanYaw * .58,
    headPitch: -4 + scan * Math.sin(t * 3.0) * 5 + handUp * 4,
    leftShoulderPitch: -18 + shoulderRoll * 20 - handUp * 55,
    rightShoulderPitch: -18 - shoulderRoll * 17 + handUp * 9,
    leftShoulderRoll: -8 - shoulderRoll * 5,
    rightShoulderRoll: 8 + shoulderRoll * 5,
    leftElbow: -22 - handUp * 48 + shoulderRoll * 8,
    rightElbow: -25 - handUp * 5 - shoulderRoll * 7,
    leftWrist: 8 + handUp * 25,
    rightWrist: -7 - shoulderRoll * 8,
    beat: t < 2.24 ? "scan" : t < 3.86 ? "shoulders" :
      t < 5.72 ? "knee-flex" : t < 7.13 ? "weight-shift" :
      t < 9.07 ? "adjust-gear" : "wait",
  };
}
/** Distinct coaching, marshal and camera-operator performances. The launch
 * signal is driven by the existing race countdown, not the animation clock. */
export function startStaffPose(
  seconds: number, performer: number,
  role: "coach" | "referee" | "camera",
  startPhase: number | undefined,
): StartStaffPose {
  const t = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const idle = Math.sin(t * (1.05 + .14 * performer) + performer * 1.9);
  const glance = Math.sin(t * (.73 + performer * .11) + performer);
  const watch = role === "referee";
  const coach = role === "coach";
  // The starter's raised hand is the short pre-launch signal.
  const beforeLaunch = startPhase !== undefined &&
    startPhase > -.72 && startPhase < .65;
  const signal = beforeLaunch ? smooth((startPhase! + .72) / .3) *
    (1 - smooth((startPhase! - .23) / .42)) : 0;
  const encourage = coach ? Math.pow(.5 + .5 * Math.sin(t * 2.3 + performer), 2) : 0;
  return {
    headYaw: glance * (watch ? 8 : 15),
    headPitch: watch ? 16 + idle * 3 : -4 + idle * 4,
    torsoPitch: watch ? 9 : coach ? 5 + encourage * 4 : -3,
    leftShoulder: watch ? -32 + idle * 4 : -17 + idle * 7,
    rightShoulder: coach ? -22 - encourage * 14 - signal * 72 :
      watch ? -42 + idle * 4 : -24 + idle * 5,
    leftElbow: watch ? -63 : -18 - encourage * 14,
    rightElbow: coach ? -42 - signal * 38 : watch ? -68 : -28,
    leftHip: -2 + idle * 2,
    rightHip: 2 - idle * 2,
    leftKnee: 3 + Math.max(0, idle) * 4,
    rightKnee: 3 + Math.max(0, -idle) * 4,
    cue: watch ? "work" : coach ? (signal > .3 ? "signal" : "encourage") : "observe",
  };
}
