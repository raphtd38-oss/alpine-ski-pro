import {
  clamp,
  smooth,
  angleDiff,
  type SkierState,
  type Controls,
  type Course,
  type Equipment,
} from "./types";
import { gradient } from "./course";
export const FIXED_DT = 1 / 120;
export const initialState = (): SkierState => ({
  x: 0,
  z: 3,
  vx: 0,
  vz: 0,
  heading: 0,
  edge: 0,
  load: 0.5,
  flex: 0,
  slip: 0,
  balance: 1,
  height: 0,
  verticalSpeed: 0,
  fallen: 0,
  jumpHeld: false,
  distance: 0,
});
/** SI units. A constrained surface particle plus independent ski heading/edge state.
 * Carve force changes momentum; heading never directly overwrites the velocity.
 * Not a rigid-body/race-certified biomechanical solver. */
export function stepPhysics(
  s: SkierState,
  input: Controls,
  e: Equipment,
  c: Course,
  dt: number,
  snowGrip = 1,
): void {
  const speed = Math.hypot(s.vx, s.vz);
  const lengthFactor = Math.sqrt(e.length / 1.65);
  const target = input.steer * (input.brake ? 0.35 : 0.92);
  s.edge = smooth(
    s.edge,
    target,
    (e.response * (0.7 + e.stiffness * 0.3)) / lengthFactor,
    dt,
  );
  s.load = smooth(s.load, 0.5 + s.edge * 0.42, 7, dt);
  const outsideLoad = 0.5 + Math.abs(s.load - 0.5);
  s.flex = smooth(
    s.flex,
    clamp(
      (Math.abs(s.edge) * outsideLoad * ((speed * speed) / 180)) / e.stiffness,
      0,
      1.4,
    ),
    9,
    dt,
  );
  const [gx, gz] = gradient(s.x, s.z, c);
  const gravityScale = 9.81 / (1 + gx * gx + gz * gz);
  let ax = -gx * gravityScale,
    az = -gz * gravityScale;
  if (s.fallen > 0) {
    s.fallen = Math.max(0, s.fallen - dt);
    s.edge = smooth(s.edge, 0, 5, dt);
    ax -= s.vx * 1.8;
    az -= s.vz * 1.8;
    s.balance = smooth(s.balance, 1, 1, dt);
  } else {
    const desiredCurvature =
      (Math.sin(s.edge) *
        (0.5 + e.stiffness * 0.5) *
        (0.82 + outsideLoad * 0.22)) /
      Math.max(4, (e.radius * Math.cos(s.edge)) / (1 + s.flex * 0.12));
    const gripLimit =
      (9.81 * 1.3 * e.grip * snowGrip * lengthFactor) /
      Math.sqrt(1 + gx * gx + gz * gz);
    const lateralDemand = speed * speed * desiredCurvature;
    const lateral = clamp(lateralDemand, -gripLimit, gripLimit);
    const contact = s.height < 0.005 ? 1 : 0.03;
    s.heading = clamp(
      s.heading + ((contact * lateral) / Math.max(3, speed)) * dt,
      -1.28,
      1.28,
    );
    s.heading +=
      angleDiff(Math.atan2(s.vx, Math.max(0.01, s.vz)), s.heading) * 0.22 * dt;
    const nx = Math.cos(s.heading),
      nz = -Math.sin(s.heading);
    const sideVelocity = s.vx * nx + s.vz * nz;
    const edgeGrip = (input.brake ? 0.5 : 1) * e.grip * snowGrip;
    const alignment = clamp(
      -sideVelocity * (2.4 * edgeGrip),
      -gripLimit,
      gripLimit,
    );
    const totalLateral = clamp(lateral + alignment, -gripLimit, gripLimit);
    ax += nx * totalLateral * contact;
    az += nz * totalLateral * contact;
    // When edge demand exceeds grip, part of the intended carve becomes a
    // controlled lateral skid. It costs speed and is audible/visible to players.
    // The grip budget caps lateral force rather than rotating the velocity.
    const gripOverflow = Math.max(0, Math.abs(lateralDemand) - gripLimit) /
      Math.max(1, gripLimit);
    const skidSpeed = Math.abs(sideVelocity) +
      Math.min(12, gripOverflow * speed * 0.13) +
      (input.brake ? speed * 0.25 : 0);
    s.slip = smooth(s.slip, skidSpeed, 8, dt);
    const drag = (input.tuck ? 0.0024 : 0.0047) * speed;
    // A clean carve preserves speed; excessive sideways scraping loses it.
    const edgeScrub = clamp(
      Math.abs(sideVelocity) * 0.0018 + gripOverflow * 0.0035,
      0,
      0.035,
    );
    const friction = (input.brake ? 0.48 : 0.012) +
      (1 - edgeGrip) * 0.015 + edgeScrub;
    ax -= s.vx * (drag + friction);
    az -= s.vz * (drag + friction);
    const stress =
      Math.max(0, Math.abs(lateralDemand) - gripLimit * 1.3) / gripLimit;
    s.balance = clamp(
      s.balance + (0.22 - stress * (1 - e.stability * 0.6) * 0.55) * dt,
      0,
      1,
    );
    if (s.balance <= 0) s.fallen = 2.5;
    if (input.jump && !s.jumpHeld && s.height === 0 && speed > 3)
      s.verticalSpeed = 2.5;
  }
  s.jumpHeld = input.jump;
  s.vx += ax * dt;
  s.vz = Math.max(0, s.vz + az * dt);
  const oldZ = s.z;
  s.x += s.vx * dt;
  s.z += s.vz * dt;
  s.distance += Math.hypot(s.vx, s.vz) * dt;
  if (s.height > 0 || s.verticalSpeed > 0) {
    s.verticalSpeed -= 9.81 * dt;
    s.height += s.verticalSpeed * dt;
    if (s.height < 0) {
      s.height = 0;
      s.verticalSpeed = 0;
    }
  }
  const bound = c.width / 2 - 0.7;
  if (Math.abs(s.x) > bound) {
    s.x = clamp(s.x, -bound, bound);
    s.vx *= -0.15;
    s.vz *= 0.65;
    s.fallen = 1.5;
    s.balance = 0.5;
  }
  if (!Number.isFinite(s.z) || s.z < oldZ)
    throw new Error("État physique invalide");
}
/** Accumulate real time, interpolate rendering, bound stalls without a spiral of death. */
export class FixedClock {
  accumulator = 0;
  advance(realDt: number, step: (dt: number) => void): number {
    this.accumulator += clamp(realDt, 0, 0.25);
    while (this.accumulator + 1e-10 >= FIXED_DT) {
      step(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }
    return this.accumulator / FIXED_DT;
  }
  reset() {
    this.accumulator = 0;
  }
}
