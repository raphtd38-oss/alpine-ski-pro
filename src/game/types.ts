export type Discipline = "SG";
export type Quality = "low" | "medium" | "high" | "ultra";
export type Weather = "clear" | "overcast" | "snow";
export interface Gate {
  id: number;
  x: number;
  z: number;
  width: number;
}
export interface Course {
  id: Discipline;
  name: string;
  subtitle: string;
  length: number;
  grade: number;
  width: number;
  gates: Gate[];
}
export interface Equipment {
  id: Discipline;
  name: string;
  length: number;
  radius: number;
  stiffness: number;
  grip: number;
  response: number;
  stability: number;
}
export interface Controls {
  steer: number;
  tuck: boolean;
  brake: boolean;
  jump: boolean;
}
export interface SkierState {
  x: number;
  z: number;
  vx: number;
  vz: number;
  heading: number;
  edge: number;
  load: number;
  flex: number;
  slip: number;
  /** Normalized micro-vibration of ski edges on hardpack and ice. */
  chatter: number;
  /** Recent breakaway-gate collision, eased down at the physics tick. */
  poleImpact: number;
  poleImpactSide: number;
  /** Persistent loss of edge grip (0 gripping, 1 skidding). */
  skid: number;
  /** Normal force relative to level ground (crests/compressions). */
  pressure: number;
  balance: number;
  height: number;
  verticalSpeed: number;
  /** Takeoff separation for realistic roller-triggered flight. */
  lastTakeoffZ: number;
  /** Damped landing compression after touchdown. */
  landingShock: number;
  fallen: number;
  /** Fixed-step seconds since the severe (>45%) banner collision; -1 inactive. */
  gateCrashElapsed: number;
  gateCrashSide: number;
  gateCrashSeverity: number;
  jumpHeld: boolean;
  distance: number;
}
export interface Frame {
  /** Optional render/replay kinematics; ignored by fixed-step physics. */
  vx?: number;
  vz?: number;
  speed?: number;
  skiHeading?: number;
  flex?: number;
  /** Optional for backwards-compatible saved replays. */
  load?: number;
  slip?: number;
  chatter?: number;
  poleImpact?: number;
  poleImpactSide?: number;
  gateCrashElapsed?: number;
  gateCrashSide?: number;
  gateCrashSeverity?: number;
  landingShock?: number;
  startPush?: number;
  /** Start launch elapsed seconds; -1 while waiting in the cabin. */
  startPhase?: number;
  /** One-wand mechanical start angle, preserved in replays. */
  startGateAngle?: number;
  finishGesture?: number; // V1.7 legacy replay field
  /** Low, forward-reaching hand crossing the timing beam, 0..1. */
  finishReach?: number;
  skid?: number;
  pressure?: number;
  t: number;
  x: number;
  z: number;
  heading: number;
  edge: number;
  height: number;
  tuck: number;
  fallen: number;
}
export type RacePhase = "ready" | "countdown" | "racing" | "finished";
export interface Result {
  time: number;
  valid: boolean;
  missed: number;
  splits: number[];
  course: Discipline;
  equipment: Discipline;
  date: string;
}
export const clamp = (x: number, a: number, b: number) =>
  Math.max(a, Math.min(b, x));
export const smooth = (a: number, b: number, k: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-k * dt));
export const angleDiff = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
