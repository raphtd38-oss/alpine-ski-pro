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
  leftHipOffset: number;
  rightHipOffset: number;
  leftKneeOffset: number;
  rightKneeOffset: number;
  /** Named active action for debug overlays and automated tests. */
  beat: "scan" | "shoulders" | "knee-flex" | "weight-shift" | "adjust-gear" | "wait";
}
export interface StartStaffPose {
  headYaw: number;
  headPitch: number;
  torsoPitch: number;
  leftShoulder: number;
  rightShoulder: number;
  rightArmRaise: number;
  leftElbow: number;
  rightElbow: number;
  leftHip: number;
  rightHip: number;
  leftKnee: number;
  rightKnee: number;
  torsoYaw: number;
  torsoRoll: number;
  leftShoulderRoll: number;
  rightShoulderRoll: number;
  leftWrist: number;
  rightWrist: number;
  neckRoll: number;
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

/** Independently drives a real 25-joint athlete: distinct head, shoulder
 * rotation, crossed weight shift and knee/ankle flex. With countdownPhase
 * specified the SIX background actions are timed to the 3-second LIVE TV
 * start; otherwise the autonomous 10.7-second loop runs at natural speed. */
export function waitingAthletePose(
  seconds: number, performer: number, countdownPhase?: number,
): WaitingAthletePose {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const t = cycle(safeSeconds, performer * 2.17, 10.7);
  const scan = envelope(t, .15, 2.24);
  const shoulders = envelope(t, 2.03, 4.12);
  const flex = envelope(t, 3.75, 5.87);
  const transfer = envelope(t, 5.51, 7.30);
  const adjust = envelope(t, 7.06, 9.07);
  const breathing = Math.sin(safeSeconds * 2.10 + performer * 1.11);
  const scanYaw = scan * Math.sin((t - .3) * 2.1) * 26;
  const shoulderRoll = shoulders * Math.sin((t - 2.1) * 2.2);
  const bend = flex * (.5 - .5 * Math.cos((t - 3.75) * TAU * .43));
  const weight = transfer * Math.sin((t - 5.55) * 2.9);
  const handUp = adjust * (.5 - .5 * Math.cos((t - 7.06) * 3.2));
  const hipPitch = 8 + bend * 17;
  const kneePitch = -12 - bend * 23;
  const ambient:WaitingAthletePose = {
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
    leftHipOffset: weight * 5, rightHipOffset: -weight * 5,
    leftKneeOffset: -weight * 3, rightKneeOffset: weight * 3,
    beat: t < 2.24 ? "scan" : t < 3.86 ? "shoulders" :
      t < 5.72 ? "knee-flex" : t < 7.13 ? "weight-shift" :
      t < 9.07 ? "adjust-gear" : "wait",
  };
  if(countdownPhase === undefined || !Number.isFinite(countdownPhase))
    return ambient;
  // Avoid accelerating the 10-second idle cycle by 3x (an inhuman look).
  // A separate choreographed 3-second sequence matches the start broadcast.
  const u = clamp(3 + countdownPhase, 0, 3);
  const look = envelope(u,.05,.82,.14);
  const loosen = envelope(u,.40,1.32,.18);
  const squat = envelope(u,1.13,2.36,.20);
  const settle = envelope(u,2.18,2.80,.16);
  const cross = Math.sin(u * 3.1 + performer *.35);
  const bounce = squat*(.5 - .5*Math.cos((u-1.13)*TAU*.62));
  const hip = 9 + bounce*15;
  const knee = -13 - bounce*23;
  const counter = loosen*Math.sin((u-.42)*TAU*.78);
  const tilt = look*Math.sin(u*2.65)*18;
  const asymmetric = settle*Math.sin(u*4+performer)*4.2;
  return {
    ...ambient,
    pelvisY:-.017*bounce,
    pelvisRoll:asymmetric,
    hipPitch:hip,kneePitch:knee,anklePitch:-(hip+knee)*.64,
    spinePitch:-6-bounce*7+Math.sin(u*4)*.6,
    spineRoll:counter*3.1 + asymmetric,
    chestYaw:tilt*.22,
    neckYaw:tilt*.34,
    headYaw:tilt*.67,
    headPitch:-3+look*Math.sin(u*4)*5-settle*3,
    leftShoulderPitch:-17+counter*29-settle*30,
    rightShoulderPitch:-17-counter*23+settle*8,
    leftShoulderRoll:-8-counter*7,
    rightShoulderRoll:8+counter*7,
    leftElbow:-25-counter*14-settle*35,
    rightElbow:-25+counter*10,
    leftWrist:10+settle*24,
    rightWrist:-7-counter*7,
    leftHipOffset:asymmetric*1.35,
    rightHipOffset:-asymmetric*1.35,
    leftKneeOffset:bounce*cross*7,
    rightKneeOffset:-bounce*cross*7,
    beat: u<.52?"scan":u<1.22?"shoulders":
      u<2.27?"knee-flex":u<2.72?"adjust-gear":"wait",
  };
}
/** Coach, marshal and TV operator have separate, role-correct performances.
 * The encouragement and starter's raised hand follow the race's real
 * countdown, not wall-clock time; these actors never control gameplay. */
export function startStaffPose(
  seconds: number, performer: number,
  role: "coach" | "referee" | "camera",
  startPhase: number | undefined,
): StartStaffPose {
  const t = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const idle = Math.sin(t*(1.05+.14*performer)+performer*1.9);
  const glance = Math.sin(t*(.73+performer*.11)+performer);
  const isLead = role==="coach"&&performer<1.5;
  const secondCoach = role==="coach"&&!isLead;
  const official = role==="referee";
  const broadcast = role==="camera";
  const s=startPhase!==undefined&&Number.isFinite(startPhase)?
    clamp(startPhase,-3.5,3): -3.5;
  // During the broadcast's COACHES cut (-1.78…-1.53), the front
  // coach points towards the door and calls encouragement. The later
  // signal is separate, during the actual final departure countdown.
  const cheer=isLead?envelope(s,-2.30,-1.04,.28):0;
  const signal=isLead?envelope(s,-.82,.35,.23):0;
  const tablet=official||secondCoach;
  const leaning=tablet?7:cheer*6;
  const gesture=cheer*Math.sin((s+2.3)*Math.PI*1.3);
  const glanceRacer=cheer*10;
  return {
    headYaw: (broadcast?-14:secondCoach?4:glance*6)+glanceRacer,
    headPitch:tablet?15+idle*2:-4+cheer*5+idle*1.6,
    torsoPitch:leaning+(official?-1:0)+idle*.55,
    torsoYaw:cheer*11 + (secondCoach?6:0),
    torsoRoll:cheer*3.5 + idle*.65,
    leftShoulder:tablet?-36+idle*3:-20+idle*4-cheer*7,
    rightShoulder:tablet?-34+idle*4:-22-cheer*29-signal*38,
    // Positive roll brings one raised hand beside the coach's head,
    // instead of spinning the entire body like a rigid mannequin.
    rightArmRaise:cheer*33+signal*83,
    leftElbow:tablet?-65:-21-cheer*15,
    rightElbow:tablet?-70:-29-cheer*22-signal*15,
    leftHip:-1+idle*1.9-cheer*2,
    rightHip:2-idle*1.9+cheer*2,
    leftKnee:3+Math.max(0,idle)*3.6,
    rightKnee:3+Math.max(0,-idle)*3.6,
    leftShoulderRoll:-7+cheer*7,
    rightShoulderRoll:9+cheer*12,
    leftWrist:tablet?25:9+cheer*7,
    rightWrist:tablet?-18:5+gesture*10,
    neckRoll:cheer*2+idle*.7,
    cue: official||secondCoach?"work":isLead?
      signal>.35?"signal":cheer>.22?"encourage":"observe":"observe",
  };
}
