import {describe,it,expect} from "vitest";
import {SuperGCompetitionPose} from "../src/render/superg-carve-kinematics";
import {humanRacerPose} from "../src/render/human-racer-pose";
import type {Frame} from "../src/game/types";

const sample=(edge:number,speed:number,startPhase=12)=>{
 const k=new SuperGCompetitionPose();
 let frame:Frame={t:0,x:0,z:0,heading:0,edge:0,height:0,tuck:1,fallen:0,startPhase};
 let raw=k.sample(frame,0);
 for(let i=0;i<100;i++){
  frame={t:i/60,x:0,z:speed*i/60,heading:edge*.28,
   vx:0,vz:speed,edge,pressure:1.25,
   lateralAcceleration:edge*17,load:edge>0?.89:.11,
   skid:.04,flex:.7,height:0,tuck:1,fallen:0,startPhase};
  raw=k.sample(frame,1/60);
 }
 return {raw,human:humanRacerPose(raw,frame)};
};
describe("25-bone coordinated HUMAN pose (visual only)",()=>{
 it("removes the double-crouch plus hunch without altering ski contact plans",()=>{
  for(const edge of [-.94,.94]){
   const {raw,human}=sample(edge,29);
   expect(raw.pelvisHeightM).toBeLessThan(.79);
   expect(human.pelvisHeightM).toBeGreaterThan(raw.pelvisHeightM+.11);
   // The first human v3 version was too upright in a 45° ski-edge turn.
   // Bank must have a meaningful amplitude but never follow the whole
   // ski edge, because the chest counter-angulates independently.
   expect(Math.abs(human.bankDeg)).toBeGreaterThan(Math.abs(raw.bankDeg)*.62);
   expect(Math.abs(human.bankDeg)).toBeLessThan(Math.abs(raw.bankDeg));
   expect(Math.abs(human.bankDeg)).toBeLessThan(42);
   expect(Math.abs(human.pelvisShiftM)).toBeLessThan(.216);
   expect(human.spinePitchDeg+human.chestPitchDeg).toBeLessThan(45);
   expect(human.headPitchDeg).toBeGreaterThan(-22);
   expect(human.leftFoot).toBe(raw.leftFoot);
   expect(human.rightFoot).toBe(raw.rightFoot);
   expect(human.outsideSide).toBe(raw.outsideSide);
  }
 });
 it("has a racing-speed tuck but does not hunch immediately off the starting line",()=>{
  const low=sample(0,5,1).human, high=sample(0,31,12).human;
  expect(low.tuck).toBe(0);
  expect(high.tuck).toBeGreaterThan(.8);
  expect(low.pelvisHeightM).toBeGreaterThan(.83);
  expect(low.spinePitchDeg+low.chestPitchDeg).toBeLessThan(28);
 });
 it("moves the skier inside a carved turn and balances the two arms",()=>{
  const left=sample(-.9,29).human,right=sample(.9,29).human;
  expect(Math.sign(left.pelvisShiftM)).toBe(-Math.sign(right.pelvisShiftM));
  for(const p of [left,right]){
   expect(p.leftArm.shoulderRollDeg*p.rightArm.shoulderRollDeg).toBeLessThan(0);
   expect(Math.abs(p.leftArm.elbowPitchDeg)).toBeLessThan(70);
   expect(Math.abs(p.rightArm.elbowPitchDeg)).toBeLessThan(70);
  }
 });
});