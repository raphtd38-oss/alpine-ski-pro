import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import * as pc from "playcanvas";
import {COURSES,EQUIPMENT} from "../src/game/course";
import {SuperGRacePoseDirector, type SGActor}
  from "../src/render/superg-race-pose-director";
import type {Frame} from "../src/game/types";

function original25BoneActor(): SGActor {
 const bytes=readFileSync("public/assets/racer/seamless-mobile.glb");
 const gltf=JSON.parse(bytes.toString("utf8",20,20+bytes.readUInt32LE(12)));
 const nodes=gltf.nodes.map((n:any)=>{
  const e=new pc.GraphNode(n.name);
  if(n.translation)e.setLocalPosition(...n.translation as [number,number,number]);
  if(n.rotation)e.setLocalRotation(...n.rotation as [number,number,number,number]);
  if(n.scale)e.setLocalScale(...n.scale as [number,number,number]);
  return e;
 });
 gltf.nodes.forEach((n:any,i:number)=>n.children?.forEach((j:number)=>nodes[i].addChild(nodes[j])));
 const scene=new pc.GraphNode(),root=new pc.GraphNode(),rig=new pc.GraphNode();
 scene.addChild(root);root.addChild(rig);
 gltf.scenes[gltf.scene??0].nodes.forEach((i:number)=>rig.addChild(nodes[i]));
 const aliases:Record<string,string>={
  Pelvis:"Hips",LHip:"LeftUpLeg",LKnee:"LeftLeg",LAnkle:"LeftAnkle",
  RHip:"RightUpLeg",RKnee:"RightLeg",RAnkle:"RightAnkle",
  LShoulder:"LeftShoulder",RShoulder:"RightShoulder",
  LUpperArm:"LeftUpperArm",RUpperArm:"RightUpperArm",
  LElbow:"LeftForeArm",RElbow:"RightForeArm",
  LWrist:"LeftHand",RWrist:"RightHand"
 };
 const joints: Record<string,pc.GraphNode>={};
 for(const [key,value] of Object.entries(aliases))joints[key]=rig.findByName(value)!;
 const poles=[new pc.GraphNode(),new pc.GraphNode()];
 poles.forEach(p=>root.addChild(p));
 return {root,rig,joints,poles,isSeamless:true,visualBank:0,visualEdge:0,visualTuck:0,visualCrouch:0};
}
const fixture=(edge:number):Frame=>({
 t:14,x:0,z:160,heading:.21,edge,vx:7,vz:29,
 height:0,tuck:1,fallen:0,pressure:1.3,
 lateralAcceleration:edge*17,load:edge>0?.88:.12,
 skid:.02,flex:.6,startPhase:14,
 edgeLeft:edge,edgeRight:edge,
 skiYawLeft:.21,skiYawRight:.21,
});
describe("real connected human 25-bone skeleton",()=>{
 for(const edge of [-.95,0,.95]){
  it("keeps both real skis planted and the head ABOVE the pelvis at edge "+edge,()=>{
   const director=new SuperGRacePoseDirector(original25BoneActor(),EQUIPMENT.SG,true);
   for(let i=0;i<140;i++) director.update(fixture(edge),COURSES.SG,1/60);
   const a=director.getDiagnostics()!;
   expect(a.humanMode).toBe(true);
   expect(a.leftSkiBaseClearanceM).toBeCloseTo(.008,2);
   expect(a.rightSkiBaseClearanceM).toBeCloseTo(.008,2);
   // IMPORTANT: these are ACTUAL rendered joint positions, not only math targets.
   expect(a.leftAnkleTargetErrorM).toBeLessThan(.01);
   expect(a.rightAnkleTargetErrorM).toBeLessThan(.01);
   expect(a.leftSkiDirectionErrorDeg).toBeLessThan(.05);
   expect(a.rightSkiDirectionErrorDeg).toBeLessThan(.05);
   console.info("[HUMAN_RIG_SPINE]",edge,JSON.stringify({
    pelvis:a.pelvisWorld,chest:a.chestWorld,head:a.headWorld,
    knees:[a.leftKneeWorld,a.rightKneeWorld],
    wrists:[a.leftWristWorld,a.rightWristWorld],
    feet:[a.leftFootWorld,a.rightFootWorld],
    kneeAngles:[a.leftKneeFlexionDeg,a.rightKneeFlexionDeg],
    errors:[a.leftAnkleTargetErrorM,a.rightAnkleTargetErrorM],
   }));
   expect(a.headWorld![1]-a.pelvisWorld[1]).toBeGreaterThan(.37);
   expect(a.chestWorld![1]-a.pelvisWorld[1]).toBeGreaterThan(.16);
   for(const v of [a.leftKneeFlexionDeg,a.rightKneeFlexionDeg]){
    expect(v).toBeGreaterThan(9);
    expect(v).toBeLessThan(115);
   }
   expect(a.leftHandGripErrorM).toBeLessThan(.08);
   expect(a.rightHandGripErrorM).toBeLessThan(.08);
   for(const wrist of [a.leftWristWorld!,a.rightWristWorld!]){
     // Hand in the waist/pole-grip zone, not raised to the shoulder.
     expect(wrist[1]-a.pelvisWorld[1]).toBeGreaterThan(-.15);
     expect(wrist[1]-a.pelvisWorld[1]).toBeLessThan(.22);
   }
   expect(a.leftHumanHandTargetErrorM!).toBeLessThan(.12);
   expect(a.rightHumanHandTargetErrorM!).toBeLessThan(.12);
   console.info("[HUMAN_25BONE]",edge,
    JSON.stringify({
     knee:[a.leftKneeFlexionDeg,a.rightKneeFlexionDeg],
     errors:[a.leftAnkleTargetErrorM,a.rightAnkleTargetErrorM],
     hipHead:a.headWorld![1]-a.pelvisWorld[1],
     pelvis:a.pelvisHeightM,bodyBank:a.bodyBankDeg
    }));
  });
 }
});
describe("anatomical integrity during motion and replay", () => {
  it("preserves each imported femur and tibia through edge changes, tuck, flight and landing", () => {
    const actor = original25BoneActor();
    const director = new SuperGRacePoseDirector(actor, EQUIPMENT.SG, true);
    for (let i = 0; i < 720; i++) {
      const t = i / 120;
      const edge = Math.sin(t * 2.7) * .98;
      const height = i >= 300 && i < 360 ? .8 * Math.sin((i - 300) / 60 * Math.PI) : 0;
      const f: Frame = { ...fixture(edge), t, z: 160 + t * 25,
        vx: 4, vz: 5.5 + 32 * (i / 720), height,
        landingShock: i >= 360 && i < 380 ? (380 - i) / 20 : 0,
        tuck: i % 180 < 90 ? 1 : 0, startPhase: t + 3 };
      director.update(f, COURSES.SG, 1 / 120);
      const p = director.getDiagnostics()!;
      for (const error of [p.leftFemurLengthErrorM, p.rightFemurLengthErrorM,
        p.leftTibiaLengthErrorM, p.rightTibiaLengthErrorM]) {
        expect(error).toBeLessThan(.001);
      }
      for (const angle of [p.leftShinBootAngleDeg, p.rightShinBootAngleDeg]) {
        expect(Number.isFinite(angle)).toBe(true);
        expect(angle).toBeGreaterThanOrEqual(0);
        expect(angle).toBeLessThanOrEqual(180);
      }
    }
  });
  it("does not carry the previous turn or pole contact into a replay restart", () => {
    const used = new SuperGRacePoseDirector(original25BoneActor(), EQUIPMENT.SG, true);
    const fresh = new SuperGRacePoseDirector(original25BoneActor(), EQUIPMENT.SG, true);
    for (let i = 0; i < 120; i++) used.update({ ...fixture(.95), t: 10 + i / 60 }, COURSES.SG, 1 / 60);
    const restart: Frame = { ...fixture(0), t: 0, x: 0, z: 0, vx: 0, vz: 0,
      pressure: 1, lateralAcceleration: 0, load: .5, startPhase: -3 };
    used.update(restart, COURSES.SG, 1 / 60);
    fresh.update(restart, COURSES.SG, 1 / 60);
    const a = used.getDiagnostics()!, b = fresh.getDiagnostics()!;
    for (const key of ["bodyBankDeg", "pelvisHeightM", "leftKneeFlexionDeg", "rightKneeFlexionDeg"] as const)
      expect(a[key]).toBeCloseTo(b[key], 5);
  });
});
