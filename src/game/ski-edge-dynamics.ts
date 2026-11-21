/**
 * Dynamic physical edge-angle limits for the Super-G ski.
 *
 * A full 60° ski edge at 6 m/s on a 36 m radius asks for vastly more
 * centripetal support than the available turn can create. It produces the
 * nearly-vertical, flapping skis seen in the player's November 21 video.
 *
 * For a level turn tan(phi) = v² / (gR). The boot can angulate the ski
 * slightly beyond COM tilt, so allow an additional 8° of independent leg
 * angulation, with an 11.5° floor for playful low-speed manoeuvring.
 * This is an approximation, not a complete snow–ski force simulation.
 */
const G = 9.81;
const RAD = Math.PI / 180;
const max = (n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function supportedSkiEdgeRadians(speedMps:number,sidecutRadiusM:number):number {
  const speed=Number.isFinite(speedMps)?Math.max(0,speedMps):0;
  const radius=Number.isFinite(sidecutRadiusM)?Math.max(10,sidecutRadiusM):36;
  const bank=Math.atan(speed*speed/(radius*G));
  return max(bank+8*RAD,0.20,1.10);
}
export function racerSteeringEdgeTarget(
  steer:number, speedMps:number, sidecutRadiusM:number,
  brake:boolean, airborne:boolean
):number {
  const maxEdge=supportedSkiEdgeRadians(speedMps,sidecutRadiusM);
  const control=Math.max(-1,Math.min(1,Number.isFinite(steer)?steer:0));
  // Keep analogue control responsiveness for ordinary medium edge inputs:
  // clamp only PHYSICALLY impossible requests, not the whole steer scale.
  const requested=control*(brake?0.35:1.10);
  const feasible=Math.max(-maxEdge,Math.min(maxEdge,requested));
  return feasible*(airborne?0.55:1);
}
