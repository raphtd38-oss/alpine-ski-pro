/**
 * Alpine Ski Pro — joint human-body pose for a World Cup style skier.
 *
 * This replaces the independent stacked bank/squat/hunch instructions with
 * one bounded full-body stance for the EXISTING 25-bone rig. It deliberately
 * does not alter the two ski contacts, race line, physics or records.
 *
 * These are artistic joint constraints, not measured FIS joint telemetry.
 * See the corresponding actual-GLB tests and identical-camera screenshots.
 */
import type { SGSourceFrame, SGPose, SGArmPose } from "./superg-carve-kinematics";

const clamp=(v:number,lo:number,hi:number)=>
  Math.max(lo,Math.min(hi,Number.isFinite(v)?v:lo));
const sat=(n:number)=>clamp(n,0,1);
const smoothstep=(a:number,b:number,x:number)=>{
  const t=sat((x-a)/(b-a));
  return t*t*(3-2*t);
};

/**
 * Make posture look like a human athlete BEFORE solving the actual skis.
 *
 * - The torso does not fold 70° at the waist and head doesn't disappear
 *   between the shoulders.
 * - An unloaded body does not stay in a deep two-leg squat.
 * - The pelvis shifts inside while the two rigid skis remain on the course.
 * - The outside leg has more reach than the inside leg by construction:
 *   the 3D two-bone IK is downstream from this common pelvis placement.
 * - Release / edge change extends the legs, then pressure compresses.
 */
export function humanRacerPose(original:SGPose,f:SGSourceFrame):SGPose {
  const speed=Math.max(0,original.speed);
  const load=sat(original.engagement);
  const tuckIntent=sat(original.tuck);
  const release=original.phase==="release"||original.phase==="transition"?
    smoothstep(.14,.85,Math.abs(original.edgeRate)):0;
  const starting=original.startPhase<0||original.startPhase<2.0;
  const pushing=original.startPhase>=0&&original.startPhase<1.8;
  const airborne=original.airborne>0.5||f.height>0.1;
  const landing=sat(original.landing);
  const finish=sat(original.finishReach);
  const drive=sat(original.startPoleImpulse);
  const extension=sat(original.startExtension);
  const speedTuck=starting?0:smoothstep(13,30,speed);
  const tuck=sat(tuckIntent*speedTuck*(1-.28*load)+
    finish*.5);
  const loaded=load*(1-.6*release);
  const preBrace=starting&&original.startPhase<0?
    sat(original.startBrace):0;
  // Root roll and pelvis roll previously stacked and drove the butt toward
  // the snow. Retain modest skier inclination, while ski edges stay at the
  // high angles requested by the actual 120 Hz physics.
  const sign=Math.sign(original.edge);
  const bank=clamp(original.bankDeg*.38,-25,25);
  const pelvisRoll=clamp(-sign*(3+8*loaded)*smoothstep(.12,.5,load),-12,12);
  const pelvisHeight=clamp(
    .968
     -.072*tuck
     -.027*loaded
     -.044*preBrace
     -.05*drive
     -.055*landing
     -.035*finish
     +.065*extension
     +.035*release
     + (airborne ? 0.025 : 0),
    .81,1.01);
  const pelvisShift=clamp(original.pelvisShiftM*.35,-.128,.128);
  // Race tuck comes mainly from hip flexion; two small vertebral rotations
  // are preferable to a 60° folded back on a one-piece skinned racer.
  const spinePitch=clamp(8+21*tuck+9*preBrace+4*loaded+7*finish,5,42);
  const chestPitch=clamp(2+6*tuck+2*loaded+3*finish,0,13);
  const lateralTorso=sign*loaded;
  const spineRoll=clamp(lateralTorso*6.5,-8,8);
  const chestRoll=clamp(lateralTorso*6,-8,8);
  const headPitch=-clamp(5+10*tuck+5*preBrace,5,21);
  // Preserve the REAL wrist/shaft grip behaviour from the existing 25-bone
  // skier: our first from-scratch arm angles raised both hands to the
  // shoulders (confirmed in image A/B) even though the spine is now correct.
  // Reuse that contact-aware arm solution, but soften its excessive flare
  // and elbow snap. Pole positions are still derived from actual wrists.
  const arm=(input:SGArmPose,_side:"L"|"R"):SGArmPose=>({
    ...input,
    shoulderPitchDeg:input.shoulderPitchDeg*.81,
    shoulderRollDeg:input.shoulderRollDeg*.83,
    upperArmPitchDeg:input.upperArmPitchDeg*.86,
    upperArmYawDeg:input.upperArmYawDeg*.82,
    elbowPitchDeg:clamp(input.elbowPitchDeg*.86,-44,39),
    wristPitchDeg:input.wristPitchDeg*.9,
  });
  return {
    ...original,
    bankDeg:bank,
    pelvisHeightM:pelvisHeight,
    pelvisShiftM:pelvisShift,
    pelvisForeAftM:clamp(-.025-.045*tuck-.015*loaded-.03*finish,-.12,0),
    pelvisRollDeg:pelvisRoll,
    pelvisYawDeg:clamp(original.pelvisYawDeg*.5,-3,3),
    spinePitchDeg:spinePitch,
    chestPitchDeg:chestPitch,
    spineRollDeg:spineRoll,
    chestRollDeg:chestRoll,
    chestYawDeg:clamp(original.chestYawDeg*.65,-10,10),
    headPitchDeg:headPitch,
    headRollDeg:clamp(-sign*4*loaded,-5,5),
    headYawDeg:clamp(original.headYawDeg*.5,-3,3),
    tuck,
    leftArm:arm(original.leftArm,"L"),
    rightArm:arm(original.rightArm,"R"),
  };
}
