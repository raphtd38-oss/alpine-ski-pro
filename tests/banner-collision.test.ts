import { describe, expect, it } from "vitest";
import {
  BANNER_CRASH_THRESHOLD, BANNER_PANEL_WIDTH_M,
  detectBannerContact,
} from "../src/game/banner-contact";
import { gateCrashPose } from "../src/render/gate-crash-pose";
import { PoleSimulation } from "../src/game/poles";
import { initialState, FIXED_DT, stepPhysics } from "../src/game/physics";
import { COURSES, EQUIPMENT } from "../src/game/course";
import { Race } from "../src/game/race";

const gate = { id: 0, x: 0, z: 10, width: 7.6 };
const course = { ...COURSES.SG, length: 100, gates: [gate] };
const poleX = gate.width / 2;
const crossing = (x: number, height = 0) => ({
  before: { ...initialState(), x, z: 9, height, vx: 0, vz: 24 },
  after: { ...initialState(), x, z: 11, height, vx: 0, vz: 24 },
});

describe("Banner contact / passability at 45% depth", () => {
  it("retains a fully OPEN racing corridor", () => {
    const {before,after} = crossing(0);
    expect(detectBannerContact(before,after,gate)).toBeNull();
  });

  it("bends a near-pole brush and a 44% fabric intrusion, but no fall", () => {
    for(const x of [poleX - 0.25, poleX + BANNER_PANEL_WIDTH_M * 0.44]) {
      const {before,after}=crossing(x);
      const hit=detectBannerContact(before,after,gate);
      expect(hit).not.toBeNull();
      expect(hit?.crash).toBe(false);
    }
  });

  it("requires a crash above 45% intrusion on EITHER side", () => {
    expect(BANNER_CRASH_THRESHOLD).toBe(0.45);
    for (const side of [-1,1]) {
      const shallow = crossing(side * (poleX + BANNER_PANEL_WIDTH_M * 0.45));
      const deep = crossing(side * (poleX + BANNER_PANEL_WIDTH_M * 0.51));
      expect(detectBannerContact(shallow.before,shallow.after,gate)?.crash).toBe(false);
      expect(detectBannerContact(deep.before,deep.after,gate)?.crash).toBe(true);
    }
  });

  it("does not trigger if the racer jumps completely above the textile", () => {
    const {before,after}=crossing(poleX+0.7, 2.8);
    expect(detectBannerContact(before,after,gate)).toBeNull();
  });

  it("a light hit sends both shafts down and then they return upright", () => {
    const sim = new PoleSimulation(course);
    const {before,after}=crossing(poleX + 0.25);
    sim.update(before,after,FIXED_DT);
    expect(sim.lastBannerHit).toBe(true);
    expect(sim.lastBannerCrash).toBe(false);
    expect(after.gateCrashElapsed).toBe(-1);
    const pole = sim.poles[1];
    expect(pole.flattenHold).toBeGreaterThan(0.4);
    const far={...after,z:35,vx:0,vz:0};
    let innerMax=0,partnerMax=0;
    for(let i=0;i<150;i++){
      sim.update(far,far,FIXED_DT);
      innerMax=Math.max(innerMax,pole.flatten);
      partnerMax=Math.max(partnerMax,pole.partnerFlatten);
    }
    expect(innerMax).toBeGreaterThan(0.9);
    expect(partnerMax).toBeGreaterThan(0.75);
    for(let i=0;i<600;i++)sim.update(far,far,FIXED_DT);
    expect(pole.flatten).toBeLessThan(0.01);
    expect(pole.partnerFlatten).toBeLessThan(0.01);
  });

  it("blocks a deep hit before the banner and marks a race miss", () => {
    const sim = new PoleSimulation(course);
    const race=new Race(course,"SG");
    race.phase="racing";
    const {before,after}=crossing(poleX+0.65);
    sim.update(before,after,FIXED_DT);
    expect(sim.lastBannerCrash).toBe(true);
    expect(after.z).toBeLessThan(gate.z);
    expect(after.fallen).toBeGreaterThan(2.8);
    expect(after.gateCrashElapsed).toBeGreaterThanOrEqual(0);
    race.registerBannerCrash(sim.lastBannerGate);
    race.update(before,after,FIXED_DT,false);
    expect(race.gateStatus).toEqual(["missed"]);
    expect(race.missed).toBe(1);
    race.registerBannerCrash(gate.id);
    expect(race.missed).toBe(1);
  });

  it("the severe impact timeline is run by 120Hz physics not render FPS", () => {
    const s={...initialState(), gateCrashElapsed:.10, gateCrashSide:1, fallen:2.0};
    stepPhysics(s,{steer:0,tuck:false,brake:false,jump:false},EQUIPMENT.SG,COURSES.SG,FIXED_DT);
    expect(s.gateCrashElapsed).toBeCloseTo(.10+FIXED_DT,6);
  });
});

describe("Original 25-bone racer gate-crash cinematic", () => {
  it("stays inactive during normal skiing", () => {
    const pose=gateCrashPose(-1,1);
    expect(pose.active).toBe(false);
    expect(pose.bodyRollDeg).toBe(0);
  });

  it("braces, tumbles sideways, slides and smoothly recovers", () => {
    const brace=gateCrashPose(.16,1,.8);
    const tumble=gateCrashPose(.77,1,.8);
    const slide=gateCrashPose(1.4,1,.8);
    const recovery=gateCrashPose(2.96,1,.8);
    expect(brace.armBrace).toBeGreaterThan(0);
    expect(tumble.bodyRollDeg).toBeGreaterThan(50);
    expect(slide.skiSplayDeg).toBeGreaterThan(2);
    expect(Math.abs(recovery.bodyRollDeg)).toBeLessThan(25);
    expect(gateCrashPose(3.15,1).active).toBe(false);
  });

  it("mirrors left and right falls without changing collision simulation", () => {
    const right=gateCrashPose(.9,1,.7),left=gateCrashPose(.9,-1,.7);
    expect(right.bodyRollDeg).toBeCloseTo(-left.bodyRollDeg,7);
    expect(right.pelvisDropM).toBeCloseTo(left.pelvisDropM,7);
  });
});
