import {describe,it,expect} from "vitest";
import {SuperGCompetitionPose} from "../src/render/superg-carve-kinematics";
import {SuperGHumanReconstruction} from "../src/render/superg-human-reconstruction";
import type {Frame} from "../src/game/types";

function run(edge:number,speed:number,phase=12,height=0) {
  const physics=new SuperGCompetitionPose();
  const human=new SuperGHumanReconstruction();
  let raw=physics.sample({t:0,x:0,z:0,heading:0,edge:0,
    vx:0,vz:0,height:0,fallen:0,pressure:1,load:.5},0);
  let pose=human.sample(raw,{t:0,x:0,z:0,heading:0,
    vx:0,vz:0,edge:0,height:0,fallen:0},0);
  for(let i=0;i<100;i++){
    const frame:Frame={t:i/60,x:0,z:i*speed/60,heading:edge*.23,
      vx:0,vz:speed,edge,height,fallen:0,pressure:1.35,
      lateralAcceleration:edge*16,skid:.05,load:edge>0?.9:.1,
      flex:.7,tuck:1,startPhase:phase,
      edgeLeft:edge,edgeRight:edge, skiYawLeft:edge*.23,
      skiYawRight:edge*.23};
    raw=physics.sample(frame,1/60);
    pose=human.sample(raw,frame,1/60);
  }
  return {raw,pose,diagnostics:human.getDiagnostics()};
}

describe("reconstructed Super-G human movement",()=>{
 it("preserves actual independent ski/boot targets and physics heading",()=>{
   for(const edge of [-.95,.95]){
     const {raw,pose}=run(edge,29);
     expect(pose.leftFoot).toBe(raw.leftFoot);
     expect(pose.rightFoot).toBe(raw.rightFoot);
     expect(pose.headingDeg).toBe(raw.headingDeg);
     expect(pose.edge).toBe(raw.edge);
     expect(pose.outsideSide).toBe(raw.outsideSide);
     expect(Math.abs(pose.bankDeg)).toBeLessThanOrEqual(27);
     expect(pose.pelvisHeightM).toBeGreaterThan(.8);
     expect(pose.pelvisHeightM).toBeLessThan(1.05);
     expect(pose.spinePitchDeg+pose.chestPitchDeg).toBeLessThan(45);
   }
 });
 it("changes the human stance with pressure and edge direction",()=>{
   const flat=run(0,28);
   const left=run(-.91,28);
   const right=run(.91,28);
   expect(left.diagnostics.commitment).toBeGreaterThan(flat.diagnostics.commitment);
   expect(Math.sign(left.pose.pelvisShiftM))
     .toBe(-Math.sign(right.pose.pelvisShiftM));
   expect(left.pose.pelvisRollDeg * right.pose.pelvisRollDeg).toBeLessThan(0);
 });
 it("uses launch extension instead of an immediate full speed tuck",()=>{
   const start=run(0,6,1.1).pose;
   const speed=run(0,31,12).pose;
   expect(start.tuck).toBe(0);
   expect(speed.tuck).toBeGreaterThan(.8);
   expect(start.pelvisHeightM).toBeGreaterThan(.84);
 });
 it("keeps both legs retractable in flight without modifying ski yaws",()=>{
   const ground=run(.7,27,12,0);
   const flight=run(.7,27,12,.35);
   expect(flight.pose.leftFoot).toBe(flight.raw.leftFoot);
   expect(flight.pose.rightFoot).toBe(flight.raw.rightFoot);
   expect(flight.pose.pelvisHeightM).toBeGreaterThanOrEqual(.8);
   for(const k of [flight.pose.pelvisHeightM,flight.pose.spineRollDeg,
     flight.pose.bankDeg,flight.pose.headPitchDeg]){
     expect(Number.isFinite(k)).toBe(true);
   }
   expect(ground.pose.headingDeg).toBe(flight.pose.headingDeg);
 });
 it("resets visual filters for replay restart",()=>{
   const model=new SuperGCompetitionPose();
   const human=new SuperGHumanReconstruction();
   const f:Frame={t:2,x:0,z:60,vx:0,vz:30,heading:.2,
     edge:.8,height:0,fallen:0,startPhase:12};
   const raw=model.sample(f,1/60);
   const first=human.sample(raw,f,1/60);
   human.sample({...raw,bankDeg:-20},f,1/60);
   human.reset();
   const restarted=human.sample(raw,f,1/60);
   expect(restarted.bankDeg).toBeCloseTo(first.bankDeg,10);
 });
});
