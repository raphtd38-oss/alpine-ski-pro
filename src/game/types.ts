export type Discipline = "SL" | "GS" | "SG" | "DH";
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
  balance: number;
  height: number;
  verticalSpeed: number;
  fallen: number;
  jumpHeld: boolean;
  distance: number;
}
export interface Frame {
  flex?: number;
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
