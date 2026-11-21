/**
 * PlayCanvas 2.24.1 adapter for Alpine Ski Pro's REAL 25-bone seamless GLB.
 *
 * Use *only* for the new connected racer. The 18-bone ghost keeps its legacy
 * logic. Geometry isn't rebuilt and no proprietary animations are imported.
 *
 * Key correctness rule:
 *   THE SKIS FACE THE CARVE LINE, NOT THE AVATAR'S TORSO.
 * Both skis, boots and bindings already live below LeftFoot/RightFoot in the
 * supplied GLB. This class constrains the ankle/foot to the course and solves
 * both legs in three dimensions. It DOES NOT translate hips and skis together
 * as the previous purely sagittal update did.
 *
 * It may be tuned without changing the 120Hz game physics/records/replays.
 */

import * as pc from "playcanvas";
import type { Course, Equipment, Frame } from "../game/types";
import { gradient, terrainHeight } from "../game/course";
import { skiSurfaceRotation, minimumSoleClearance } from "./ski-contact-frame";
import { PRO_POLE } from "./equipment-specs";
import { gateCrashPose } from "./gate-crash-pose";
import { sampleTake2, sampleTake2KneePoles, TAKE2_JOINTS } from "./motionsmith-take2";
import {
  SuperGCompetitionPose,
  type SGSourceFrame,
  type SGPose,
  type SGFootPose,
  type SGArmPose,
  type SkiSide,
} from "./superg-carve-kinematics";

export interface SGActor {
  // The director only transforms nodes; it never creates engine components.
  root: pc.GraphNode;
  rig: pc.GraphNode;
  joints: Record<string, pc.GraphNode>;
  poles: pc.GraphNode[];
  isSeamless: boolean;
  visualBank: number;
  visualCrouch: number;
  visualEdge: number;
  visualTuck: number;
}

interface LegBones {
  hip: pc.GraphNode;
  knee: pc.GraphNode;
  ankle: pc.GraphNode;
  foot: pc.GraphNode;
}

interface KneeSolution {
  kneePelvis: pc.Vec3;
  anklePelvis: pc.Vec3;
  requestedAnklePelvis: pc.Vec3;
  targetErrorM: number;
}

export interface SGDirectorDiagnostics {
  phase: SGPose["phase"];
  pelvisHeightM: number;
  pelvisOffsetM: number;
  bodyBankDeg: number;
  edgeDegLeft: number;
  edgeDegRight: number;
  leftSkiDirectionErrorDeg: number;
  rightSkiDirectionErrorDeg: number;
  leftSkiBaseClearanceM: number;
  rightSkiBaseClearanceM: number;
  leftAnkleTargetErrorM: number;
  rightAnkleTargetErrorM: number;
  leftHandGripErrorM: number;
  rightHandGripErrorM: number;
  outsideSide: SkiSide | null;
  visualCarvePressure: number;
  lateralG: number;
  equivalentTurnRadiusM: number;
  outsideSkiLoad: number;
  insideSkiLoad: number;
  leftKneeFlexionDeg: number;
  rightKneeFlexionDeg: number;
  leftLegLengthM: number;
  rightLegLengthM: number;
  /** Studio-only human animation overlay; absent during ordinary play. */
  motionSource?: string;
  sourceMotionWeight?: number;
  sourceMotionSeconds?: number;
  pelvisWorld: number[];
  leftFootWorld: number[];
  rightFootWorld: number[];
}

const clone = (v: pc.Vec3) => v.clone();
const RAD = 180 / Math.PI;
const bounded = (n: number, a: number, b: number) =>
  Math.max(a, Math.min(b, Number.isFinite(n) ? n : a));
const axisUp = new pc.Vec3(0, 1, 0);
const localSkiForward = new pc.Vec3(0, 0, -1);

function normalized(v: pc.Vec3, fallback: pc.Vec3): pc.Vec3 {
  const len = v.length();
  return Number.isFinite(len) && len > 1e-9 ?
    v.mulScalar(1 / len) : fallback.clone();
}

function angleDegrees(a: pc.Vec3, b: pc.Vec3): number {
  const dot = bounded(a.clone().normalize().dot(b.clone().normalize()), -1, 1);
  return Math.acos(dot) * RAD;
}

/** Solve a 3D femur/tibia articulated chain using the ACTUAL GLB joint
 * vectors, not guessed anatomically symmetric cylinders.
 *
 * Knee pole points toward the ski tip (-Z local to the original GLB), with
 * a small left/right lateral stabilizer. Ankle positions are clamped only if
 * physically unreachable; the numerical target error is exposed to tests.
 *
 * Returned knee/ankle coordinates use the *pelvis's local* coordinate frame.
 */
export function solve25BoneLegKnee(
  hipPelvis: pc.Vec3,
  kneeRestInHip: pc.Vec3,
  ankleRestInKnee: pc.Vec3,
  targetAnklePelvis: pc.Vec3,
  side: SkiSide,
  sourceKneePole?: pc.Vec3,
  sourcePoleWeight=0,
): KneeSolution {
  const upper = kneeRestInHip.length();
  const lower = ankleRestInKnee.length();
  if (!(upper > 0.1 && lower > 0.1))
    throw new Error("25-bone Super-G GLB has invalid knee/ankle rest vectors");

  const targetDirection = targetAnklePelvis.clone().sub(hipPelvis);
  const originalDistance = targetDirection.length();
  // Knee flexion stays between 8° and 145°, constant bone lengths.
  const minReach = Math.sqrt(upper * upper + lower * lower +
    2 * upper * lower * Math.cos(145 / RAD));
  const maxReach = Math.sqrt(upper * upper + lower * lower +
    2 * upper * lower * Math.cos(8 / RAD));
  const reach = bounded(originalDistance, minReach, maxReach);
  const line = normalized(targetDirection, new pc.Vec3(0, -1, 0));
  const anklePelvis = hipPelvis.clone().add(line.clone().mulScalar(reach));
  const projected = (upper * upper - lower * lower + reach * reach) /
    (2 * reach);
  const bend = Math.sqrt(Math.max(0, upper * upper - projected * projected));

  // Orthogonal pole vector, favour knee forward (toward the tip). We don't
  // let the knee collapse toward the snow's inside while the shin twists.
  const sideX = side === "L" ? -0.08 : 0.08;
  const pole = new pc.Vec3(sideX, -0.22, -1.0);
  pole.sub(line.clone().mulScalar(pole.dot(line)));
  if (pole.length() < 0.003) pole.set(0, 0, -1);
  // Studio preview: source motion suggests the knee bend-plane direction.
  // Preserve anatomical forward bending, solve BOTH fixed segment lengths
  // and exactly the original ski/ankle target. Source footsteps are ignored.
  if(sourceKneePole && sourcePoleWeight>0){
    const candidate=sourceKneePole.clone().sub(
      line.clone().mulScalar(sourceKneePole.dot(line)));
    if(candidate.length()>0.02){
      const reference=normalized(pole.clone(),new pc.Vec3(0,0,-1));
      candidate.normalize();
      if(candidate.dot(reference)>0.35){
        const w=bounded(sourcePoleWeight,0,0.30);
        pole.lerp(pole.clone(),candidate,w);
      }
    }
  }
  const bendDirection = normalized(pole, new pc.Vec3(0, 0, -1));
  const kneePelvis = hipPelvis.clone().add(
    line.clone().mulScalar(projected)).add(
    bendDirection.mulScalar(bend));

  return {
    kneePelvis,
    anklePelvis,
    requestedAnklePelvis: targetAnklePelvis,
    targetErrorM: anklePelvis.distance(targetAnklePelvis),
  };
}

function rotateTo(a: pc.Vec3, b: pc.Vec3): pc.Quat {
  return new pc.Quat().setFromDirections(
    normalized(a, axisUp), normalized(b, axisUp));
}

/** Convert target ankle into the transformed pelvis local space, then solve
 * two rotations: thigh aims at the desired knee, shin aims at ankle target.
 * Finally cancel bone twist at the ankle so the SKI has its own physically
 * sensible heading and edge angle, unlike the old coupled torso/boot roll.
 */
function positionLeg(
  pelvis: pc.GraphNode,
  bones: LegBones,
  ankleWorld: pc.Vec3,
  desiredSkiWorldRotation: pc.Quat,
  side: SkiSide,
  sourceKneePole?: pc.Vec3,
  sourcePoleWeight=0,
): KneeSolution {
  const pelvisInverse = pelvis.getWorldTransform().clone().invert();
  const requestedAnklePelvis = pelvisInverse.transformPoint(ankleWorld);
  const hipPelvis = bones.hip.getLocalPosition().clone();
  const femurRest = bones.knee.getLocalPosition().clone();
  const shinRest = bones.ankle.getLocalPosition().clone();
  const solution = solve25BoneLegKnee(
    hipPelvis, femurRest, shinRest, requestedAnklePelvis, side,
    sourceKneePole, sourcePoleWeight);

  const desiredFemur = solution.kneePelvis.clone().sub(hipPelvis);
  const hipQuaternion = rotateTo(femurRest, desiredFemur);
  bones.hip.setLocalRotation(hipQuaternion);
  // Convert the desired shin direction from pelvis space to hip space, since
  // knee.setLocalRotation acts *after* hip.setLocalRotation in the hierarchy.
  const targetShinInPelvis = solution.anklePelvis.clone().sub(solution.kneePelvis);
  const hipInverse = hipQuaternion.clone().invert();
  const targetShinInHip = hipInverse.transformVector(targetShinInPelvis);
  bones.knee.setLocalRotation(rotateTo(shinRest, targetShinInHip));

  // The boot and all the ski meshes are already parented to LeftFoot or
  // RightFoot. A real race binding stays rigid: setting foot rotation from
  // the WORLD ski target guarantees that the tip points in the intended
  // direction, regardless of hip/knee/torso pose.
  const kneeWorldRotation = bones.knee.getRotation();
  bones.ankle.setLocalRotation(
    kneeWorldRotation.clone().invert().mul(desiredSkiWorldRotation));
  // Foot bone has no deliberate animation in this rig. Reinitialize it so
  // no imported clip/legacy animation rotates skis on top of the IK output.
  bones.foot.setLocalEulerAngles(0, 0, 0);

  return solution;
}

export class SuperGRacePoseDirector {
  readonly model = new SuperGCompetitionPose();
  /** Explicit opt-in preview: no change to the public mode or race physics. */
  private readonly take2Enabled = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("motion") === "take2";
  private take2Weight = 0;
  private take2Time = 0;
  private take2KneePoles: Record<SkiSide,pc.Vec3>|null=null;
  private readonly bones: Record<SkiSide, LegBones>;
  private readonly pelvis: pc.GraphNode;
  private readonly spine: pc.GraphNode;
  private readonly chest: pc.GraphNode;
  private readonly head: pc.GraphNode;
  private readonly poleWeights: [number, number] = [0, 0];
  private visualFall = 0;
  private lastPose: SGPose | null = null;
  private lastLegError: [number, number] = [0, 0];
  private lastGripError: [number, number] = [0, 0];
  private lastBaseClearance: [number, number] = [0, 0];
  private lastDirectionError: [number, number] = [0, 0];
  private readonly targets = {
    L: { ankle: new pc.Vec3(), rotation: new pc.Quat() },
    R: { ankle: new pc.Vec3(), rotation: new pc.Quat() },
  };
  private readonly feetBySide: Record<SkiSide, pc.GraphNode>;

  constructor(private readonly actor: SGActor, readonly equipment: Equipment) {
    if (!actor.isSeamless || equipment.id !== "SG")
      throw new Error("The Super-G race director requires the seamless SG racer");
    const required = (name: string) => {
      const node = actor.joints[name] ?? actor.rig.findByName(name);
      if (!node) throw new Error("Missing GLB racer joint: " + name);
      return node;
    };
    this.pelvis = required("Pelvis");
    this.spine = required("Spine");
    this.chest = required("Chest");
    this.head = required("Head");
    this.feetBySide = {
      L: required("LeftFoot"),
      R: required("RightFoot"),
    };
    this.bones = {
      L: {
        hip: required("LHip"), knee: required("LKnee"),
        ankle: required("LAnkle"), foot: this.feetBySide.L,
      },
      R: {
        hip: required("RHip"), knee: required("RKnee"),
        ankle: required("RAnkle"), foot: this.feetBySide.R,
      },
    };
    if (actor.poles.length !== 2)
      throw new Error("Super-G player must have two real curved race poles");
  }

  reset(): void {
    this.model.reset();
    this.poleWeights[0] = this.poleWeights[1] = 0;
    this.visualFall = 0;
    this.lastPose = null;
    this.take2Weight = 0;
    this.take2Time = 0;
    this.take2KneePoles = null;
  }

  private applyMotionSmithTake2(pose: SGPose, frame: SGSourceFrame,
    flight: number, crashed: boolean): void {
    if (!this.take2Enabled) return;
    const speed = Number.isFinite(frame.vx) && Number.isFinite(frame.vz)
      ? Math.hypot(frame.vx!, frame.vz!) : pose.speed;
    // Activate only after the launch, and avoid overriding crash/landing IK.
    const speedGain = bounded((speed-4)/16,0,1);
    const startGain = bounded((pose.startPhase-0.25)/1.4,0,1);
    const flightGain = 1-bounded(flight*2,0,0.9);
    const weight = crashed ? 0 : 0.55*speedGain*startGain*flightGain;
    const src = sampleTake2(Math.max(0,frame.t));
    this.take2Weight=weight;
    this.take2Time=src.seconds;
    if (weight<0.001){
      this.take2KneePoles=null;
      return;
    }
    const heading = new pc.Quat().setFromEulerAngles(0,pose.headingDeg,0);
    const kneeSource=sampleTake2KneePoles(Math.max(0,frame.t));
    const pelvisInverse=this.pelvis.getRotation().clone().invert();
    const asPole=(v:readonly [number,number,number]) =>
      pelvisInverse.transformVector(heading.transformVector(
        new pc.Vec3(v[0],v[1],v[2]))).normalize();
    this.take2KneePoles={
      L:asPole(kneeSource[0]),R:asPole(kneeSource[1]),
    };
    // The source's actual 89-bone UE5 local rotations have been converted
    // OFFLINE into independent world-space rest-pose angular deltas. Apply
    // those deltas to the corresponding 25-bone skier. Do not replace the
    // body mesh or rotate the feet: original two-ski terrain IK is authoritative.
    const target = (name:string):pc.GraphNode|undefined => {
      const aliases:Record<string,string> = {
        LeftShoulder:"LShoulder", RightShoulder:"RShoulder",
        LeftUpperArm:"LUpperArm",RightUpperArm:"RUpperArm",
        LeftForeArm:"LElbow",RightForeArm:"RElbow",
      };
      return this.actor.joints[aliases[name]??name] ??
        this.actor.rig.findByName(name) ?? undefined;
    };
    for(let i=0;i<TAKE2_JOINTS.length;i++){
      const boneName=TAKE2_JOINTS[i],bone=target(boneName);
      if(!bone?.parent) continue;
      // Partial motion transfer: arms follow race-ready hand positions while
      // the spine/shoulders are animated from the actual 180-frame take.
      const boneGain=boneName==="Head"?0.38:
        boneName==="Neck"?0.25:
        boneName.includes("ForeArm")?0.25:
        boneName.includes("UpperArm")?0.36:0.67;
      const v=src.rotationsDeg[i];
      const angular=new pc.Vec3(v[0],v[1],v[2]);
      const magnitude=angular.length()*weight*boneGain;
      if(magnitude<0.002)continue;
      const axis=heading.transformVector(angular).normalize();
      const delta=new pc.Quat().setFromAxisAngle(axis,magnitude);
      const world=delta.mul(bone.getRotation().clone());
      const local=bone.parent.getRotation().clone().invert().mul(world);
      bone.setLocalRotation(local);
    }
  }

  private setTorso(pose: SGPose): void {
    // GLB forward is local -Z, so positive real-world front flexion is
    // negative local X after the imported 180-degree Y rotation.
    this.spine.setLocalEulerAngles(
      -pose.spinePitchDeg,
      -pose.chestYawDeg * 0.15,
      pose.spineRollDeg,
    );
    this.chest.setLocalEulerAngles(
      -pose.chestPitchDeg, pose.chestYawDeg, pose.chestRollDeg);
    this.head.setLocalEulerAngles(
      -pose.headPitchDeg, pose.headYawDeg, pose.headRollDeg);
    // Neck exists in the original file, though older code didn't animate it.
    const neck = this.actor.rig.findByName("Neck");
    neck?.setLocalEulerAngles(
      -pose.headPitchDeg * 0.20,
      -pose.headYawDeg * 0.15,
      -pose.headRollDeg * 0.18,
    );
  }

  private setArms(pose: SGPose): void {
    const pairs: [SkiSide, SGArmPose][] = [
      ["L", pose.leftArm], ["R", pose.rightArm],
    ];
    for (const [side, arm] of pairs) {
      const j = this.actor.joints;
      j[side + "Shoulder"]?.setLocalEulerAngles(
        -arm.shoulderPitchDeg, 0, arm.shoulderRollDeg);
      j[side + "UpperArm"]?.setLocalEulerAngles(
        -arm.upperArmPitchDeg, arm.upperArmYawDeg, 0);
      j[side + "Elbow"]?.setLocalEulerAngles(
        -arm.elbowPitchDeg, 0, 0);
      j[side + "Wrist"]?.setLocalEulerAngles(
        -arm.wristPitchDeg, 0, 0);
    }
  }

  private prepareFoot(side: SkiSide, foot: SGFootPose, pose: SGPose,
    course: Course, ground: number, flight: number): void {
    const root = this.actor.root.getPosition();
    const h = pose.headingDeg / RAD;
    // Bone L is on +X in the simulator; use the exact same lateral spacing
    // as snow tracks. Neither pelvis roll nor torso yaw moves the ski targets.
    const lateral = (side === "L" ? 1 : -1) * this.model.tuning.stanceHalfWidthM;
    const x = root.x + Math.cos(h) * lateral - Math.sin(h) * foot.foreAftM;
    const z = root.z - Math.sin(h) * lateral - Math.cos(h) * foot.foreAftM;
    const yaw = h + foot.yawOffsetDeg / RAD;
    const target = this.targets[side];
    target.rotation.copy(skiSurfaceRotation(yaw, x, z, course, foot.edgeRollDeg / RAD));
    const p = new pc.Vec3(x, terrainHeight(x, z, course) + 0.125, z);
    // Place the lowest steel edge, not the foot pivot, on the surface.
    p.y += 0.008 - minimumSoleClearance(p, target.rotation, course);
    if (flight > 0.005) {
      // Airborne targets travel WITH the body. Surface-following height is
      // only a reference; IK never reaches down to snow during flight.
      const [gx, gz] = gradient(root.x, root.z, course);
      p.y = ground + flight + gx * (x - root.x) + gz * (z - root.z) + 0.14;
    }
    target.ankle.copy(p).sub(target.rotation.transformVector(
      this.bones[side].foot.getLocalPosition()));
  }

  private constrainPelvis(): void {
    // Project pelvis into both reach spheres before rotating bones. This
    // prevents a strong bank from pulling the outside ski off its target.
    for (let pass = 0; pass < 6; pass++) {
      for (const side of ["L", "R"] as const) {
        const b = this.bones[side];
        const reach = b.knee.getLocalPosition().length() +
          b.ankle.getLocalPosition().length() - 0.014;
        const delta = this.targets[side].ankle.clone().sub(b.hip.getPosition());
        const distance = delta.length();
        if (distance > reach) this.pelvis.setPosition(
          this.pelvis.getPosition().clone().add(delta.mulScalar((distance - reach) / distance)));
      }
    }
  }

  private setFoot(side: SkiSide, pose: SGPose, course: Course): void {
    const bones = this.bones[side], target = this.targets[side];
    const hint=this.take2Enabled?this.take2KneePoles?.[side]:undefined;
    const hintWeight=this.take2Enabled?Math.min(.30,this.take2Weight*.8):0;
    const solution = positionLeg(this.pelvis, bones, target.ankle,
      target.rotation,side,hint,hintWeight);
    const ix = side === "L" ? 0 : 1;
    this.lastLegError[ix] = solution.targetErrorM;
    this.lastBaseClearance[ix] = minimumSoleClearance(
      bones.foot.getPosition(), bones.foot.getRotation(), course);
    const actual = bones.foot.getRotation().transformVector(localSkiForward);
    const intended = target.rotation.transformVector(localSkiForward);
    this.lastDirectionError[ix] = angleDegrees(actual, intended);
  }

  private setPoles(pose: SGPose, dt: number, c: Course): void {
    const inverseRoot = this.actor.root.getWorldTransform().clone().invert();
    const headingRad = pose.headingDeg / RAD;
    const backward = new pc.Vec3(
      -Math.sin(headingRad), 0, -Math.cos(headingRad));
    for (const [index, side] of (["L", "R"] as const).entries()) {
      const arm = side === "L" ? pose.leftArm : pose.rightArm;
      const wrist = this.actor.joints[side + "Wrist"];
      const pole = this.actor.poles[index];
      if (!wrist || !pole) continue;
      const wristWorld = wrist.getPosition();
      const wristInRoot = inverseRoot.transformPoint(wristWorld);
      // Grip centre is not the centre of the long carbon shaft.
      const gripFromCentre =
        (PRO_POLE.shaftLength - PRO_POLE.gripLength) * 0.5;
      const trailingPitch = 47 + 42 * arm.trailing;
      const trailRotation = new pc.Quat().setFromEulerAngles(
        trailingPitch, 0, (side === "L" ? -1 : 1) * 6);
      const trailWorldToGrip = trailRotation.transformVector(
        new pc.Vec3(0, gripFromCentre, 0));
      const trailPosition = wristInRoot.clone().sub(trailWorldToGrip);

      const poleGoal = bounded(arm.poleContact, 0, 1);
      const rate = poleGoal > this.poleWeights[index] ? 26 : 20;
      this.poleWeights[index] +=
        (poleGoal - this.poleWeights[index]) *
        (1 - Math.exp(-rate * Math.max(0, Math.min(dt, 0.1))));
      const plantWeight = this.poleWeights[index];
      if (plantWeight < 0.002) {
        pole.setLocalRotation(trailRotation);
        pole.setLocalPosition(trailPosition);
      } else {
        // Desired pole tip is behind the wrists on the race line, with the
        // correct real snow height. No fixed Z axis assumption on curves.
        const desiredTip = wristWorld.clone().add(backward.clone().mulScalar(
          Math.max(0.27, PRO_POLE.shaftLength * 0.48)));
        desiredTip.x += (side === "L" ? -0.045 : 0.045);
        desiredTip.y = terrainHeight(
          desiredTip.x, desiredTip.z, c) + 0.018;
        const tipInRoot = inverseRoot.transformPoint(desiredTip);
        const tipToWrist = normalized(
          wristInRoot.clone().sub(tipInRoot), axisUp);
        const plantRotation = rotateTo(axisUp, tipToWrist);
        const blendRotation = new pc.Quat().slerp(
          trailRotation, plantRotation, plantWeight);
        // Recompute the pole midpoint from the FINAL blended orientation:
        // this is essential to avoid detached hands during start impulses.
        const gripShift = blendRotation.transformVector(new pc.Vec3(
          0, gripFromCentre, 0));
        pole.setLocalRotation(blendRotation);
        pole.setLocalPosition(wristInRoot.clone().sub(gripShift));
      }
      const actualGripWorld = pole.getWorldTransform().transformPoint(
        new pc.Vec3(0, gripFromCentre, 0));
      this.lastGripError[index] = actualGripWorld.distance(wristWorld);
    }
  }

  /** This method replaces the old monobloc athlete.update() entirely.
   * Do NOT call the previous hand-written knee and ski loops after it.
   * The 18-joint fallback keeps its original motion unchanged.
   */
  update(f: Frame, c: Course, dt: number): void {
    const frame = f as SGSourceFrame;
    const pose = this.model.sample(frame, dt);
    if (this.take2Enabled) {
      const src = sampleTake2(Math.max(0,frame.t));
      // Use real source hip motion with strict 4 cm range; the contact IK
      // still resolves the pelvis against BOTH real race ski bases.
      const speed = Number.isFinite(frame.vx) && Number.isFinite(frame.vz)
        ? Math.hypot(frame.vx!,frame.vz!) : pose.speed;
      // The source hip oscillates between 0.74m and 0.96m above the piste.
      // Use the actual change of pose, not its raw forward travel. This
      // creates the missing compression/extension through the 25-bone IK.
      // Explicitly bound shifts so the two attached racing skis stay on snow.
      const blend=0.55*bounded((speed-4)/13,0,1);
      const sourceHipHeight=0.952 + src.pelvisDeltaM[1];
      const sourceDesired=bounded(sourceHipHeight+0.02,0.74,0.98);
      pose.pelvisHeightM += bounded((sourceDesired-pose.pelvisHeightM)*blend,
        -0.065,0.105);
      pose.pelvisShiftM -= bounded(src.pelvisDeltaM[0]*blend,-0.045,0.045);
    }
    this.lastPose = pose;
    const root = this.actor.root;
    const ground = terrainHeight(f.x, f.z, c);
    const [, grade] = gradient(f.x, f.z, c);
    const gradePitchDeg = -Math.atan(grade) * RAD;
    const flight = Math.max(0, f.height);
    // Player ground position remains *exactly* controlled by the simulator.
    root.setPosition(f.x, ground + flight + 0.015, f.z);
    root.setEulerAngles(gradePitchDeg, pose.headingDeg, pose.bankDeg);

    const crash = gateCrashPose(
      f.gateCrashElapsed ?? -1, f.gateCrashSide ?? 1,
      f.gateCrashSeverity ?? 1,
    );
    // Separate dedicated banner crash from the existing generic tumble.
    const fallGoal = f.fallen > 0 && !crash.active ? 1 : 0;
    this.visualFall += (fallGoal - this.visualFall) *
      (1 - Math.exp(-Math.max(0, Math.min(0.1, dt)) * 10));
    // The imported GLB faces local -Z. Keep bones, boots and skis in one
    // continuous rig, with a simple fall lean *in addition* to carving bank.
    this.actor.rig.setLocalEulerAngles(
      0, 180, this.visualFall * 70);

    // Pelvis translation lives in the unbanked slope frame. Applying bank to
    // its height as well used to double-collapse the hips into a seated pose.
    const pelvisOffset = new pc.Quat().setFromEulerAngles(gradePitchDeg, pose.headingDeg, 0)
      .transformVector(new pc.Vec3(-pose.pelvisShiftM, pose.pelvisHeightM, -pose.pelvisForeAftM));
    this.pelvis.setPosition(root.getPosition().clone().add(pelvisOffset));
    this.pelvis.setLocalEulerAngles(
      0, pose.pelvisYawDeg, pose.pelvisRollDeg);
    this.setTorso(pose);
    this.setArms(pose);
    this.applyMotionSmithTake2(pose, frame, flight, crash.active);
    this.prepareFoot("L", pose.leftFoot, pose, c, ground, flight);
    this.prepareFoot("R", pose.rightFoot, pose, c, ground, flight);
    this.constrainPelvis();
    this.setFoot("L", pose, c);
    this.setFoot("R", pose, c);
    this.setPoles(pose, dt, c);
    if (crash.active) {
      // 3-stage World-Cup-style fall with the EXISTING 25-bone racer, not a
      // stand-in model: hands brace, hips drop, skis skid away, then recover.
      // Resolve the normal IK first, then add only visual tumble transforms.
      root.setPosition(
        f.x, ground + flight + 0.015 + crash.cameraLiftM, f.z,
      );
      root.setEulerAngles(
        gradePitchDeg + crash.bodyPitchDeg * 0.10,
        pose.headingDeg + crash.bodyYawDeg * 0.24,
        pose.bankDeg + crash.bodyRollDeg * 0.12,
      );
      this.actor.rig.setLocalEulerAngles(
        crash.bodyPitchDeg * 0.34, 180 + crash.bodyYawDeg,
        crash.bodyRollDeg,
      );
      this.pelvis.setLocalPosition(
        pose.pelvisShiftM,
        pose.pelvisHeightM - crash.pelvisDropM,
        pose.pelvisForeAftM,
      );
      this.spine.setLocalEulerAngles(
        -pose.spinePitchDeg - crash.torsoPitchDeg,
        -pose.chestYawDeg * 0.15,
        pose.spineRollDeg,
      );
      const brace = crash.armBrace;
      const left = this.actor.joints.LShoulder;
      const right = this.actor.joints.RShoulder;
      if (left) left.setLocalEulerAngles(
        -pose.leftArm.shoulderPitchDeg - 24 * brace,
        0, pose.leftArm.shoulderRollDeg - 26 * brace,
      );
      if (right) right.setLocalEulerAngles(
        -pose.rightArm.shoulderPitchDeg - 24 * brace,
        0, pose.rightArm.shoulderRollDeg + 26 * brace,
      );
    }
    this.actor.visualBank = pose.bankDeg + crash.bodyRollDeg;
    this.actor.visualEdge = pose.edge;
    this.actor.visualCrouch = 1.01 - pose.pelvisHeightM;
    this.actor.visualTuck = pose.tuck;
  }

  /** For the existing DEV-only window.__ski diagnostics and screenshot QA. */
  getDiagnostics(): SGDirectorDiagnostics | null {
    if (!this.lastPose) return null;
    const p = this.lastPose;
    const leg = (side: SkiSide) => {
      const b = this.bones[side];
      const upper = b.knee.getPosition().clone().sub(b.hip.getPosition());
      const lower = b.ankle.getPosition().clone().sub(b.knee.getPosition());
      return { flex: angleDegrees(upper, lower), length: upper.length() + lower.length() };
    };
    const left = leg("L"), right = leg("R");
    const xyz = (node: pc.GraphNode) => { const v = node.getPosition(); return [v.x, v.y, v.z]; };
    return {
      leftKneeFlexionDeg: left.flex, rightKneeFlexionDeg: right.flex,
      leftLegLengthM: left.length, rightLegLengthM: right.length,
      motionSource: this.take2Enabled?"MotionSmith Take2":"procedural",
      sourceMotionWeight:this.take2Weight,
      sourceMotionSeconds:this.take2Time,
      pelvisWorld: xyz(this.pelvis), leftFootWorld: xyz(this.bones.L.foot),
      rightFootWorld: xyz(this.bones.R.foot),
      phase: p.phase,
      pelvisHeightM: p.pelvisHeightM,
      pelvisOffsetM: p.pelvisShiftM,
      bodyBankDeg: p.bankDeg,
      edgeDegLeft: p.leftFoot.edgeRollDeg,
      edgeDegRight: p.rightFoot.edgeRollDeg,
      leftSkiDirectionErrorDeg: this.lastDirectionError[0],
      rightSkiDirectionErrorDeg: this.lastDirectionError[1],
      leftSkiBaseClearanceM: this.lastBaseClearance[0],
      rightSkiBaseClearanceM: this.lastBaseClearance[1],
      leftAnkleTargetErrorM: this.lastLegError[0],
      rightAnkleTargetErrorM: this.lastLegError[1],
      leftHandGripErrorM: this.lastGripError[0],
      rightHandGripErrorM: this.lastGripError[1],
      outsideSide: p.outsideSide,
      visualCarvePressure: p.engagement,
      lateralG: p.lateralG,
      equivalentTurnRadiusM: p.equivalentRadiusM,
      outsideSkiLoad: p.outsideLoadFraction,
      insideSkiLoad: 1 - p.outsideLoadFraction,
    };
  }
}
