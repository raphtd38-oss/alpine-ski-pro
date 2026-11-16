/** Lightweight deterministic cloth flutter. Pure visual response,
 * never fed into race timing or skiing collision forces.
 */
export function textureFlagWidth(gateWidth: number): number {
  return Math.max(0.55, Math.min(1.15, gateWidth * 0.26));
}
export function gateFlagFlutter(elapsed: number, poleAngle: number, poleVelocity: number): number {
  const breeze = Math.sin(elapsed * 3.8 + poleAngle * 1.1) * 2.4;
  const impact = Math.max(-12, Math.min(12, poleVelocity * 1.8));
  return breeze + impact;
}
