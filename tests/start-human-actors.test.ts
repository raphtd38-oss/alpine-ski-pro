import {describe,expect,it} from "vitest";
import {HUMAN_START_ASSETS,staffTVClip} from "../src/render/start-human-actors";

describe("real Rocketbox staff performance and owner AssetSmith provenance",()=>{
  it("choreographs real mocap to the TV coach cut and actual GO countdown",()=>{
    expect(staffTVClip("coach",1,-10)).toBe("Idle");
    expect(staffTVClip("coach",1,-4.1)).toBe("Cheer");
    expect(staffTVClip("coach",1,-.43)).toBe("Wave");
    expect(staffTVClip("coach",1,.8)).toBe("Idle");
  });
  it("keeps the second coach and race official independent of the lead",()=>{
    expect(staffTVClip("coach",2,-4.1)).toBe("Think");
    expect(staffTVClip("referee",0,-.2)).toBe("Phone");
    expect(staffTVClip("camera",3,-.2)).toBe("Idle");
  });
  it("does not emit erratic states with undefined or non-finite timer",()=>{
    for(const phase of [NaN,Infinity,-Infinity,undefined,1e10,-1e10]){
      expect(["Idle","Cheer","Wave","Think","Phone"])
        .toContain(staffTVClip("coach",1,phase));
    }
  });
  it("serves named, locally mirrored, SHA-pinned GLBs, not remote runtime assets",()=>{
    expect(HUMAN_START_ASSETS.coach).toBe("assets/start/coach-ethan.glb");
    expect(HUMAN_START_ASSETS.skier).toBe("assets/start/waiting-skier-assetsmith.glb");
    expect(HUMAN_START_ASSETS.coachSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(HUMAN_START_ASSETS.skierSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
