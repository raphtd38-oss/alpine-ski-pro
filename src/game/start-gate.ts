/** Gameplay model of an alpine racing start wand, in metres and degrees.
 * FIS Timing Booklet v2.65 (31 Oct 2025), sections 15.2 and 15.2.1:
 * a SINGLE 0.50–0.80 m wand, 0.35–0.50 m above snow, electrical impulse
 * between 10° and 30°, remaining OPEN after activation. NOT homologated.
 * https://assets.fis-ski.com/f/252177/x/09a7c495f1/alpine-timing-booklet-v2_65_e.pdf
 */
export const ALPINE_START_GATE = Object.freeze({
  z: 4.05,
  postX: 0.77,
  height: 0.43,
  wandLength: 0.70,
  triggerAngle: 20,
  maximumAngle: 68,
  // The bar touches the left shin; the athlete's centre must be inside the bay.
  lateralClearance: 0.58,
  contactBeginZ: 3.88,
  degreesPerMetre: 100,
});

export function startGateAngle(course: string, z: number, x = 0): number {
  if (course !== "SG" || !Number.isFinite(z) || !Number.isFinite(x) ||
      Math.abs(x) > ALPINE_START_GATE.lateralClearance) return 0;
  return Math.max(0, Math.min(ALPINE_START_GATE.maximumAngle,
    (z - ALPINE_START_GATE.contactBeginZ) * ALPINE_START_GATE.degreesPerMetre));
}

/** Exact fractional tick when the mechanical arm reaches its trigger angle.
 * Allows race time to begin from contact, not the countdown's GO signal.
 * When the racer strays far outside the start bay, the wand cannot fire.
 */
export function startGateImpulseFraction(
  course: string,
  fromZ: number, toZ: number,
  fromX = 0, toX = 0,
): number | null {
  if (course !== "SG" || !(toZ > fromZ)) return null;
  const threshold = ALPINE_START_GATE.contactBeginZ +
    ALPINE_START_GATE.triggerAngle / ALPINE_START_GATE.degreesPerMetre;
  if (fromZ >= threshold || toZ < threshold) return null;
  const fraction = (threshold - fromZ) / (toZ - fromZ);
  const lateralX = fromX + (toX - fromX) * fraction;
  return Math.abs(lateralX) <= ALPINE_START_GATE.lateralClearance
    ? Math.max(0, Math.min(1, fraction)) : null;
}

/** Three planted double-pole drives. Pulses are the SAME source for physical
 * acceleration and the athlete's planting animation, rather than free-moving
 * arms on a ski body with an unrelated boost.
 */
export const SUPER_G_START_STROKES = Object.freeze([
  { centre: 0.10, duration: 0.18, acceleration: 5.5 },
  { centre: 0.53, duration: 0.17, acceleration: 4.2 },
  { centre: 0.98, duration: 0.18, acceleration: 3.2 },
]);

export function startPoleContact(course: string, elapsed: number): number {
  if (course !== "SG" || elapsed < 0 || elapsed >= 1.45) return 0;
  return Math.max(...SUPER_G_START_STROKES.map(stroke =>
    Math.exp(-Math.pow((elapsed - stroke.centre) / stroke.duration, 2))));
}

export function startPushAcceleration(course: string, elapsed: number): number {
  if (course !== "SG" || elapsed < 0 || elapsed >= 1.45) return 0;
  return SUPER_G_START_STROKES.reduce((force, stroke) =>
    force + stroke.acceleration *
      Math.exp(-Math.pow((elapsed - stroke.centre) / stroke.duration, 2)), 0);
}

/** Cyclic arm drive, 0 = poles to rear/ready, 1 = follow through.
 * Disengage gradually as the racer takes an aerodynamic tuck.
 */
export function startDrivePhase(course: string, elapsed: number): number {
  if (course !== "SG" || elapsed < 0) return 0;
  return (elapsed / 0.44) % 1;
}

export function startDriveBlend(course: string, elapsed: number): number {
  if (course !== "SG") return 0;
  if (elapsed < 0) return 0.78; // deliberate loaded waiting stance
  return Math.max(0, Math.min(1, (1.55 - elapsed) / 0.35));
}
