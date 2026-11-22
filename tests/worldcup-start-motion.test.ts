import {describe,expect,it} from "vitest";
import {waitingAthletePose,startStaffPose} from "../src/render/worldcup-start-motion";

describe("articulated World Cup start-area actors",()=>{
  it("produces genuinely different 25-bone actor performances, not a rigid head sway",()=>{
    const a=waitingAthletePose(1.1,0);
    const b=waitingAthletePose(1.1,1);
    expect(a.headYaw).not.toBeCloseTo(b.headYaw,2);
    expect(a.chestYaw).not.toBeCloseTo(b.chestYaw,2);
    expect(a.leftShoulderPitch).not.toBeCloseTo(b.leftShoulderPitch,2);
    expect(a.hipPitch).toBeGreaterThan(0);
    expect(a.kneePitch).toBeLessThan(-5);
    expect(a.anklePitch).toBeGreaterThan(-45);
  });
  it("runs an autonomous neck/shoulder/knee/weight/helmet-warmup cycle",()=>{
    const phases=[.7,2.9,4.9,6.3,8,9.8].map(t=>waitingAthletePose(t,0));
    expect(phases.map(p=>p.beat)).toEqual([
      "scan","shoulders","knee-flex","weight-shift","adjust-gear","wait",
    ]);
    expect(Math.abs(phases[0].headYaw)).toBeGreaterThan(3);
    expect(Math.abs(phases[1].leftShoulderPitch-phases[0].leftShoulderPitch))
      .toBeGreaterThan(3);
    expect(phases[2].kneePitch).toBeLessThan(phases[0].kneePitch);
    expect(Math.abs(phases[3].pelvisRoll)).toBeGreaterThan(1);
    expect(phases[4].leftElbow).toBeLessThan(phases[5].leftElbow-10);
  });
  it("choreographs the waiting competitor within the real 3-second countdown",()=>{
    const scan=waitingAthletePose(.4,0,-2.6);
    const arms=waitingAthletePose(.9,0,-2.0);
    const flex=waitingAthletePose(1.6,0,-1.40);
    const finish=waitingAthletePose(2.8,0,-.20);
    expect(scan.beat).toBe("scan");
    expect(arms.beat).toBe("shoulders");
    expect(flex.beat).toBe("knee-flex");
    expect(finish.beat).toBe("wait");
    expect(Math.abs(arms.leftShoulderPitch-scan.leftShoulderPitch))
      .toBeGreaterThan(5);
    expect(flex.kneePitch).toBeLessThan(scan.kneePitch-3);
    expect(flex.leftKneeOffset).not.toBeCloseTo(flex.rightKneeOffset,2);
    for(const p of [scan,arms,flex,finish]){
      for(const [key,value] of Object.entries(p)){
        if(key==="beat")continue;
        expect(Number.isFinite(value)).toBe(true);
        expect(Math.abs(value)).toBeLessThanOrEqual(100);
      }
    }
  });
  it("lead coach encourages on the coach camera cut then signals close to GO",()=>{
    const cheer=startStaffPose(1,1,"coach",-1.65);
    const signal=startStaffPose(2.8,1,"coach",-.24);
    const after=startStaffPose(4,1,"coach",1);
    const marshal=startStaffPose(2.8,0,"referee",-.24);
    expect(cheer.cue).toBe("encourage");
    expect(cheer.rightArmRaise).toBeGreaterThan(10);
    expect(signal.cue).toBe("signal");
    expect(signal.rightArmRaise).toBeGreaterThan(cheer.rightArmRaise+20);
    expect(after.cue).toBe("observe");
    expect(marshal.cue).toBe("work");
    expect(marshal.rightArmRaise).toBe(0);
    expect(Math.abs(cheer.torsoYaw)).toBeGreaterThan(5);
  });
  it("holds safe bounded motion through long sessions and bad inputs",()=>{
    for(const t of [-12,0,4,90,90000,NaN,Infinity]){
      const pose=waitingAthletePose(t,2);
      for(const [k,v] of Object.entries(pose)){
        if(k==="beat")continue;
        expect(Number.isFinite(v)).toBe(true);
        expect(Math.abs(v)).toBeLessThanOrEqual(100);
      }
    }
  });
  it("coaches signal launch while official continues checking instruments",()=>{
    const before=startStaffPose(1,1,"coach",-3);
    const cue=startStaffPose(1,1,"coach",-.2);
    const official=startStaffPose(1,0,"referee",-.2);
    expect(cue.cue).toBe("signal");
    expect(cue.rightShoulder).toBeLessThan(before.rightShoulder-20);
    expect(cue.rightElbow).toBeLessThan(before.rightElbow-10);
    expect(cue.rightArmRaise).toBeGreaterThan(65);
    expect(startStaffPose(1,2,"coach",-.2).cue).toBe("work");
    expect(official.cue).toBe("work");
    expect(official.headPitch).toBeGreaterThan(10);
    expect(official.leftElbow).not.toBe(cue.leftElbow);
  });
});
