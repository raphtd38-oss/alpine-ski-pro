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
  // A clean high-G turn must visibly incline the athlete. The previous v3
  // multiplied the race bank by .38, keeping him virtually upright even
  // at 50° of edge on the user's November 21 recording.
  const carve=sat(loaded*smoothstep(.13,.67,Math.abs(original.edge)));
  const edgeChange=smoothstep(.35,1.8,Math.abs(original.edgeRate))
    * (1-.42*carve);
  const preBrace=starting&&original.startPhase<0?
    sat(original.startBrace):0;
  // Root roll and pelvis roll previously stacked and drove the butt toward
  // the snow. Retain modest skier inclination, while ski edges stay at the
  // high angles requested by the actual 120 Hz physics.
  const sign=Math.sign(original.edge);
  // Ski edge, body bank and shoulders are DISTINCT. The centre of mass
  // inclines substantially, while the thorax counter-angulates to keep the
  // shoulders and gaze closer to level. Never tip the entire 25-bone rig
  // by the physical ski edge angle.
  const bank=clamp(original.bankDeg*(.71+.08*carve),-41,41);
  const pelvisRoll=clamp(-sign*(3+10*carve),-15,15);
  const pelvisHeight=clamp(
    .972
     -.079*tuck
     -.043*carve
     -.046*preBrace
     -.046*drive
     -.065*landing
     -.032*finish
     +.061*extension
     +.052*release
     +.023*edgeChange
     + (airborne ? 0.020 : 0),
    .79,1.01);
  // More COM travel to the inside of a loaded turn lets the outside leg
  // EXTEND while the inner leg shortens. The ankle/boot targets remain
  // ground locked by the independent two-leg solver.
  const pelvisShift=clamp(original.pelvisShiftM*(.63+.17*carve),-.215,.215);
  // Race tuck comes mainly from hip flexion; two small vertebral rotations
  // are preferable to a 60° folded back on a one-piece skinned racer.
  const spinePitch=clamp(8+21*tuck+9*preBrace+4*loaded+7*finish,5,42);
  const chestPitch=clamp(2+6*tuck+2*loaded+3*finish,0,13);
  const lateralTorso=sign*carve;
  const spineRoll=clamp(lateralTorso*8,-11,11);
  const chestRoll=clamp(lateralTorso*8,-11,11);
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
    chestYawDeg:clamp(original.chestYawDeg*.7,-12,12),
    headPitchDeg:headPitch,
    headRollDeg:clamp(-sign*4*loaded,-5,5),
    headYawDeg:clamp(original.headYawDeg*.5,-3,3),
    tuck,
    leftArm:arm(original.leftArm,"L"),
    rightArm:arm(original.rightArm,"R"),
  };
}
