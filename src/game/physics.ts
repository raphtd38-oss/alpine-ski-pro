import {
  clamp,
  smooth,
  angleDiff,
  type SkierState,
  type Controls,
  type Course,
  type Equipment,
} from "./types";
import { gradient, terrainHeight, courseCenterX } from "./course";
import { shouldLaunchAtCrest } from "./superg";
import {
  nextSkid,
  pressureGripFactor,
  skidGripFactor,
  softSnowDrag,
  softSnowGripFactor,
  tiltGripFactor,
} from "./carving";
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
  chatter: 0,
  poleImpact: 0,
  poleImpactSide: 0,
  skid: 0,
  pressure: 1,
  lateralAcceleration: 0,
  balance: 1,
  height: 0,
  verticalSpeed: 0,
  lastTakeoffZ: -1000,
  landingShock: 0,
  fallen: 0,
  gateCrashElapsed: -1,
  gateCrashSide: 0,
  gateCrashSeverity: 0,
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
  ice = 0,
  depth = 0,
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
  // Load transfers progressively to the downhill/outside ski. Faster turns
  // increase pressure without teleporting the centre of mass.
  const pressureFactor = clamp(0.65 + speed / 35, 0.65, 1.17);
  s.load = smooth(s.load, 0.5 + s.edge * 0.42 * pressureFactor, 7, dt);
  const outsideLoad = 0.5 + Math.abs(s.load - 0.5);
  // Fine hard-snow chatter is a filtered contact signal, not random physics:
  // render FPS and playback cannot change the path taken through a gate.
  const hardSnow = clamp((1.055 - snowGrip) / 0.27, 0, 1);
  const edgePressure = clamp(Math.abs(s.edge) / 0.9, 0, 1);
  const hardSurface = clamp(Math.max(hardSnow, ice * (1 - depth)), 0, 1);
  s.chatter = smooth(s.chatter,
    s.height < 0.005
      ? hardSurface * edgePressure * clamp((speed - 8) / 26, 0, 1)
      : 0, 13, dt);
  // Timeline for the visual fall is driven by fixed-step physics, not the
  // rendering framerate; replay/screenshot timing remains deterministic.
  if (s.gateCrashElapsed >= 0) {
    s.gateCrashElapsed += dt;
    if (s.gateCrashElapsed >= 3.15) s.gateCrashElapsed = -1;
  }
  s.poleImpact = Math.max(0, s.poleImpact - dt * 4.5);
  s.landingShock = Math.max(0, s.landingShock - dt * 3.4);
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
  // Deterministic relief-induced loading: compressions press the skis in,
  // while convex crests lighten the edges. Capped for forgiving gameplay.
  const h = terrainHeight(s.x, s.z, c);
  const curvature =
    (terrainHeight(s.x, s.z + 1.5, c) - 2 * h +
      terrainHeight(s.x, s.z - 1.5, c)) / 2.25;
  s.pressure = smooth(s.pressure,
    clamp(1 + speed * speed * curvature / 9.81, 0.6, 1.5),
    12, dt);
  let ax = -gx * gravityScale,
    az = -gz * gravityScale;
  if (s.fallen > 0) {
    s.fallen = Math.max(0, s.fallen - dt);
    s.edge = smooth(s.edge, 0, 5, dt);
    ax -= s.vx * 1.8;
    az -= s.vz * 1.8;
    s.balance = smooth(s.balance, 1, 1, dt);
    s.skid = smooth(s.skid, 0, 4, dt);
    s.lateralAcceleration = smooth(s.lateralAcceleration, 0, 12, dt);
  } else {
    const desiredCurvature =
      (Math.sin(s.edge) *
        (0.5 + e.stiffness * 0.5) *
        (0.82 + outsideLoad * 0.22)) /
      Math.max(4, (e.radius * Math.cos(s.edge)) / (1 + s.flex * 0.12));
    const baseGrip =
      (9.81 * 1.62 * e.grip * snowGrip * lengthFactor *
        (0.94 + outsideLoad * 0.095)) /
      Math.sqrt(1 + gx * gx + gz * gz);
    const rawSidecutDemand = speed * speed * desiredCurvature;
    const gripLimit = baseGrip *
      tiltGripFactor(s.edge) *
      skidGripFactor(s.skid) *
      pressureGripFactor(s.pressure) *
      softSnowGripFactor(depth);
    // At race speed the effective radius grows with available snow grip.
    // A full edge must not automatically create impossible 3-4g forces.
    // Keep reserve grip for correcting the actual ski-heading slip angle.
    const carveBudget = gripLimit * (0.82 + 0.13 *
      Math.min(1, Math.abs(s.edge)));
    const lateral = clamp(rawSidecutDemand, -carveBudget, carveBudget);
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
    const excessiveDemand = Math.max(0,
      Math.abs(rawSidecutDemand) / Math.max(1, gripLimit) - 1.65);
    // A clean pressured edge tracks. Skid follows actual lateral slip,
    // overload on ice and braking, not the unachievable sidecut estimate.
    s.skid = nextSkid(s.skid,
      Math.abs(sideVelocity) * 2.1 + excessiveDemand * gripLimit * 0.26 +
      (input.brake ? gripLimit * 1.35 : 0),
      gripLimit, dt);
    const edgeGrip = (input.brake ? 0.5 : 1) * e.grip * snowGrip;
    const alignment = clamp(
      -sideVelocity * (2.4 * edgeGrip),
      -gripLimit,
      gripLimit,
    );
    const totalLateral = clamp(lateral + alignment, -gripLimit, gripLimit);
    ax += nx * totalLateral * contact;
    az += nz * totalLateral * contact;
    s.lateralAcceleration = smooth(
      s.lateralAcceleration, totalLateral * contact, 17, dt);
    // When edge demand exceeds grip, part of the intended carve becomes a
    // controlled lateral skid. It costs speed and is audible/visible to players.
    // The grip budget caps lateral force rather than rotating the velocity.
    const gripOverflow = Math.max(0,
      Math.abs(rawSidecutDemand) - gripLimit * 1.65) /
      Math.max(1, gripLimit);
    const skidSpeed = Math.abs(sideVelocity) +
      Math.min(12, gripOverflow * speed * 0.13) +
      s.skid * speed * 0.035 +
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
      (1 - edgeGrip) * 0.015 + edgeScrub +
      softSnowDrag(depth, speed);
    ax -= s.vx * (drag + friction);
    az -= s.vz * (drag + friction);
    // Balance responds to actual lateral control loss, not raw geometry.
    const stress = Math.max(0,
      Math.abs(sideVelocity) * 2.4 * edgeGrip / Math.max(1, gripLimit) - 0.72) +
      s.skid * 0.42;
    s.balance = clamp(
      s.balance + (0.22 - stress * (1 - e.stability * 0.6) * 0.55) * dt,
      0,
      1,
    );
    if (s.balance <= 0) s.fallen = 2.5;
  }
  // Flight uses WORLD vertical velocity. A convex crest can outrun the
  // normal force at SG speed: the terrain falls away under the skis.
  const manualTakeoff = input.jump && !s.jumpHeld &&
    s.height === 0 && speed > 3 && s.fallen <= 0;
  const automaticTakeoff = s.z - s.lastTakeoffZ > 30 &&
    s.fallen <= 0 &&
    shouldLaunchAtCrest(c.id, speed, curvature, s.height === 0);
  const takeoff = manualTakeoff || automaticTakeoff;
  if (takeoff) {
    const surfaceVy = gx * s.vx + gz * s.vz;
    // Manual jump retains its previous 2.5 m/s pop. Natural rollers add only
    // a little clearance; most airtime comes from the real shape of the slope.
    // The skier actively extends at the crest: enough clearance to leave
    // the snow at race speed, but only a fraction of a manual jump impulse.
    const terrainExtension = clamp(
      0.65 + Math.max(0, -curvature * speed * speed / 9.81) * 0.46,
      0.65, 1.17,
    );
    s.verticalSpeed = surfaceVy +
      (manualTakeoff ? 2.5 : terrainExtension);
    s.lastTakeoffZ = s.z;
  }
  s.jumpHeld = input.jump;
  if (s.height > 0) {
    s.lateralAcceleration = smooth(s.lateralAcceleration, 0, 16, dt);
    // No invisible snow-particle acceleration while airborne.
    ax = -s.vx * 0.01;
    az = -s.vz * 0.01;
  }
  s.vx += ax * dt;
  s.vz = Math.max(0, s.vz + az * dt);
  const oldZ = s.z;
  s.x += s.vx * dt;
  s.z += s.vz * dt;
  s.distance += Math.hypot(s.vx, s.vz) * dt;
  if (s.height > 0 || takeoff) {
    const groundAfter = terrainHeight(s.x, s.z, c);
    const newWorldY = h + s.height +
      s.verticalSpeed * dt - 4.905 * dt * dt;
    s.verticalSpeed -= 9.81 * dt;
    s.height = newWorldY - groundAfter;
    if (s.height <= 0) {
      s.height = 0;
      const newSlope = gradient(s.x, s.z, c);
      const surfaceVy = newSlope[0] * s.vx + newSlope[1] * s.vz;
      s.landingShock = clamp(
        Math.abs(s.verticalSpeed - surfaceVy) / 11, 0, 1,
      );
      s.verticalSpeed = 0;
    }
  }
  const bound = c.width / 2 - 0.7;
  const centre = courseCenterX(s.z, c);
  if (Math.abs(s.x - centre) > bound) {
    if (c.id === "SG") {
      // A safety net dissipates momentum and returns the racer INSIDE the
      // turning piste. Snapping exactly onto a moving border used to apply
      // the 35% penalty every 120-Hz tick, trapping athletes indefinitely.
      const side = Math.sign(s.x - centre) || 1;
      s.x = centre + side * (bound - 1.5);
      s.vx = -side * Math.max(5, Math.abs(s.vx) * 0.4);
      s.vz = Math.max(6, s.vz * 0.86);
      s.fallen = Math.max(s.fallen, 0.3);
      s.balance = Math.max(s.balance, 0.65);
    } else {
      s.x = centre + clamp(s.x - centre, -bound, bound);
      s.vx *= -0.15;
      s.vz *= 0.65;
      s.fallen = 1.5;
      s.balance = 0.5;
    }
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
