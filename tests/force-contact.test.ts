import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as pc from 'playcanvas';
import { COURSES, EQUIPMENT } from '../src/game/course';
import { initialState, stepPhysics, FIXED_DT, FixedClock, SKIER_MASS_KG } from '../src/game/physics';
import { SuperGRacePoseDirector, type SGActor } from '../src/render/superg-race-pose-director';
import { SuperGCompetitionPose } from '../src/render/superg-carve-kinematics';
import { replayAt } from '../src/game/race';
import type { Frame } from '../src/game/types';

function actorFromActualGLB(): SGActor {
  const bytes = readFileSync('public/assets/racer/seamless-mobile.glb');
  const gltf = JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
  const nodes = gltf.nodes.map((n: any) => {
    const node = new pc.GraphNode(n.name);
    if (n.translation) node.setLocalPosition(...n.translation as [number,number,number]);
    if (n.rotation) node.setLocalRotation(...n.rotation as [number,number,number,number]);
    if (n.scale) node.setLocalScale(...n.scale as [number,number,number]);
    return node;
  });
  gltf.nodes.forEach((n: any,i: number)=>n.children?.forEach((j:number)=>nodes[i].addChild(nodes[j])));
  const root = new pc.GraphNode(), rig = new pc.GraphNode(); root.addChild(rig);
  gltf.scenes[gltf.scene ?? 0].nodes.forEach((i:number)=>rig.addChild(nodes[i]));
  // Transform-only nodes reproduce the GLB hierarchy without an Application.
  // Entity's default constructor asserts when no GPU application is current.
  const scene = new pc.GraphNode(); scene.addChild(root);
  const aliases: Record<string,string> = {Pelvis:'Hips',LHip:'LeftUpLeg',LKnee:'LeftLeg',LAnkle:'LeftAnkle',RHip:'RightUpLeg',RKnee:'RightLeg',RAnkle:'RightAnkle',LShoulder:'LeftShoulder',RShoulder:'RightShoulder',LUpperArm:'LeftUpperArm',RUpperArm:'RightUpperArm',LElbow:'LeftForeArm',RElbow:'RightForeArm',LWrist:'LeftHand',RWrist:'RightHand'};
  const joints:Record<string,pc.GraphNode>={};
  for (const [alias,name] of Object.entries(aliases)) joints[alias]=rig.findByName(name)!;
  const poles = [new pc.GraphNode(),new pc.GraphNode()]; poles.forEach(p=>root.addChild(p));
  return {root,rig,joints,poles,isSeamless:true,visualBank:0,visualCrouch:0,visualEdge:0,visualTuck:0};
}
const fixture = (edge=0,height=0): Frame => ({t:10,x:0,z:100,heading:.3,
  edge,height,tuck:.4,fallen:0,vx:8,vz:27,pressure:height?0:1.15,
  lateralAcceleration:height?0:Math.sign(edge)*17,load:edge>0?.86:.14,
  edgeLeft:edge*(edge<0?.89:1),edgeRight:edge*(edge>0?.89:1),
  skiYawLeft:.3,skiYawRight:.3,startPhase:12});

describe('actual 25-bone hierarchy contact regression',()=>{
  for(const edge of [-1,0,1]) it(`keeps soles grounded and bones constant at edge ${edge}`,()=>{
    const actor=actorFromActualGLB(), d=new SuperGRacePoseDirector(actor,EQUIPMENT.SG);
    for(let i=0;i<120;i++) d.update(fixture(edge),COURSES.SG,1/60);
    const p=d.getDiagnostics()!;
    // The athlete's knee must only hinge, not twist the shin around the
    // forward/lateral axes as happened in the screenshot before this fix.
    for (const side of ['L','R'] as const) {
      const knee = actor.joints[side+'Knee'];
      const shin = actor.joints[side+'Ankle'];
      const hinge = new pc.Vec3()
        .cross(knee.getLocalPosition(), shin.getLocalPosition()).normalize();
      const q = knee.getLocalRotation();
      const axis = new pc.Vec3(q.x,q.y,q.z);
      if (axis.length() > 0.00001)
        expect(new pc.Vec3().cross(axis, hinge).length()).toBeLessThan(0.002);
    }
    expect(Number.isFinite(p.leftShinBootAngleDeg)).toBe(true);
    expect(Number.isFinite(p.rightShinBootAngleDeg)).toBe(true);
    expect(p.leftShinBootAngleDeg).toBeLessThan(57);
    expect(p.rightShinBootAngleDeg).toBeLessThan(57);
    console.info('[SG hinge contact]',edge,
      'shinBoot',p.leftShinBootAngleDeg.toFixed(1),p.rightShinBootAngleDeg.toFixed(1),
      'flex',p.leftKneeFlexionDeg.toFixed(1),p.rightKneeFlexionDeg.toFixed(1));
    expect(p.leftSkiBaseClearanceM).toBeCloseTo(.008,3);
    expect(p.rightSkiBaseClearanceM).toBeCloseTo(.008,3);
    expect(p.leftAnkleTargetErrorM).toBeLessThan(.001);
    expect(p.rightAnkleTargetErrorM).toBeLessThan(.001);
    expect(p.leftSkiDirectionErrorDeg).toBeLessThan(.01);
    expect(p.rightSkiDirectionErrorDeg).toBeLessThan(.01);
    expect(p.leftLegLengthM).toBeCloseTo(p.rightLegLengthM,4);
    for(const flex of [p.leftKneeFlexionDeg,p.rightKneeFlexionDeg]) {
      expect(flex).toBeGreaterThan(7.9);expect(flex).toBeLessThan(145.1);
    }
    if(edge>0) expect(p.leftKneeFlexionDeg).toBeGreaterThan(p.rightKneeFlexionDeg+5);
    if(edge<0) expect(p.rightKneeFlexionDeg).toBeGreaterThan(p.leftKneeFlexionDeg+5);
  });
  it('takes BOTH feet into the air without reaching for snow',()=>{
    const d=new SuperGRacePoseDirector(actorFromActualGLB(),EQUIPMENT.SG);
    for(let i=0;i<120;i++) d.update(fixture(0,1.3),COURSES.SG,1/60);
    const p=d.getDiagnostics()!;
    expect(p.leftSkiBaseClearanceM).toBeGreaterThan(1.15);
    expect(p.rightSkiBaseClearanceM).toBeGreaterThan(1.15);
    expect(p.leftAnkleTargetErrorM).toBeLessThan(.001);
    expect(p.rightAnkleTargetErrorM).toBeLessThan(.001);
  });
  it('stays balanced at walking speed despite full steering input',()=>{
    const k=new SuperGCompetitionPose();let pose;
    for(let i=0;i<120;i++) pose=k.sample({...fixture(1),vx:0,vz:1,lateralAcceleration:.02},1/60);
    expect(Math.abs(pose!.bankDeg)).toBeLessThan(2);
    expect(Math.abs(pose!.pelvisShiftM)).toBeLessThan(.01);
    expect(pose!.pelvisHeightM).toBeGreaterThan(.8);
  });
});

describe('120Hz force telemetry',()=>{
  const control={steer:.8,tuck:true,brake:false,jump:false};
  it('conserves the normal-force split and reports a = v²/R',()=>{
    const s={...initialState(),vz:27};
    for(let i=0;i<72;i++) stepPhysics(s,control,EQUIPMENT.SG,COURSES.SG,FIXED_DT);
    expect(s.normalForceLeft+s.normalForceRight).toBeCloseTo(SKIER_MASS_KG*s.normalAcceleration,6);
    expect(s.normalForceLeft).toBeGreaterThan(s.normalForceRight);
    expect(s.turnRadius).toBeCloseTo((s.vx*s.vx+s.vz*s.vz)/Math.abs(s.lateralAcceleration),0);
    expect(s.edgeLeft).toBeGreaterThan(s.edgeRight);
  });
  it('has no snow force or steering torque in flight; lands with damped absorption',()=>{
    const a={...initialState(),vz:25,height:1,verticalSpeed:0};const b={...a};
    stepPhysics(a,control,EQUIPMENT.SG,COURSES.SG,FIXED_DT);
    stepPhysics(b,{...control,steer:-.8},EQUIPMENT.SG,COURSES.SG,FIXED_DT);
    expect(a.normalForceLeft+a.normalForceRight).toBe(0);
    expect(a.lateralAcceleration).toBe(0);expect(a.heading).toBe(b.heading);
    expect(a.vx).toBe(b.vx);expect(a.vz).toBe(b.vz);
    for(let i=0;i<400 && a.height>0;i++) stepPhysics(a,{...control,steer:0},EQUIPMENT.SG,COURSES.SG,FIXED_DT);
    expect(a.height).toBe(0);expect(a.landingShock).toBeGreaterThan(0);
    for(let i=0;i<12;i++) stepPhysics(a,{...control,steer:0},EQUIPMENT.SG,COURSES.SG,FIXED_DT);
    expect(a.suspension).toBeGreaterThan(0);
  });
  it('repeats steering, edge changes and a jump at 30/60/144 render Hz',()=>{
    const runs=[30,60,144].map(fps=>{
      const s={...initialState(),vz:24}, clock=new FixedClock();let tick=0;
      for(let frame=0;frame<fps*8;frame++) clock.advance(1/fps,dt=>{
        stepPhysics(s,{steer:Math.sin(tick/55)*.8,tuck:true,brake:false,
          jump:tick===250},EQUIPMENT.SG,COURSES.SG,dt);tick++;
      });
      return s;
    });
    for(const s of runs) for(const key of ['x','z','edgeLeft','edgeRight','suspension','height','load'] as const)
      expect(s[key]).toBeCloseTo(runs[0][key],8);
  });
  it('preserves optional two-ski channels in old and new replays',()=>{
    const a=fixture(.5), b={...fixture(-.5),t:11};
    const mid=replayAt([a,b],10.5)!;
    expect(mid.edgeLeft).toBeCloseTo((a.edgeLeft!+b.edgeLeft!)/2);
    expect(replayAt([{...a,edgeLeft:undefined},{...b,edgeLeft:undefined}],10.5)!.edgeLeft).toBeUndefined();
  });
});
