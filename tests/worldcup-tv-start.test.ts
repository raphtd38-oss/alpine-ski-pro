import {describe,it,expect} from "vitest";
import {START_HOUSE_DIMENSIONS} from "../src/render/worldcup-start-compound";
import {planStartBroadcast} from "../src/render/worldcup-start-broadcast";

describe("World Cup television start area — shots and dimensions",()=>{
  it("holds each pre-race television shot for its own duration", () => {
    const phases = [-10, -7.801, -7.8, -5.2, -3.4, -.001, 0];
    expect(phases.map(t => planStartBroadcast(t, 3, true)?.name)).toEqual([
      "establishing", "establishing", "athlete-queue", "technical-timing",
      "starter-closeup", "starter-closeup", "launch",
    ]);
    expect(planStartBroadcast(-7, 3)).toBeNull();
    expect(planStartBroadcast(2.1, 14, true)).toBeNull();
  });
  it("stages five broadcast shots in deterministic countdown/launch order",()=>{
    const timeline=[-3,-2,-1.20,-.46,.4].map(x=>
      planStartBroadcast(x,0)?.name);
    expect(timeline).toEqual([
      "establishing","athlete-queue","technical-timing",
      "starter-closeup","launch",
    ]);
  });
  it("has a broad, deep competition start house with physical launch bay",()=>{
    expect(START_HOUSE_DIMENSIONS.halfWidth*2).toBeGreaterThan(10);
    expect(START_HOUSE_DIMENSIONS.frontZ-
      START_HOUSE_DIMENSIONS.backZ).toBeGreaterThan(20);
    expect(START_HOUSE_DIMENSIONS.eaveHeight).toBeGreaterThan(3.4);
    expect(START_HOUSE_DIMENSIONS.ridgeHeight).toBeGreaterThan(
      START_HOUSE_DIMENSIONS.eaveHeight+.8);
  });
  it("returns null after 16m and allows standard broadcast/chase to resume",()=>{
    for(const t of [-4,2.1,7])
      expect(planStartBroadcast(t,0)).toBeNull();
    expect(planStartBroadcast(-.5,17)).toBeNull();
    expect(planStartBroadcast(undefined,0)).toBeNull();
    expect(planStartBroadcast(Number.NaN,0)).toBeNull();
  });
  it("tracks the physically simulated exit only during launch, not prestart",()=>{
    const p=planStartBroadcast(-.5,0)!;
    expect(planStartBroadcast(-.5,10)).not.toBeNull();
    const launch0=planStartBroadcast(.5,0)!;
    const launch12=planStartBroadcast(.5,12)!;
    expect(p.cameraZ).toBeCloseTo(9.4,2);
    expect(launch12.focusZ).toBeGreaterThan(launch0.focusZ);
    expect(launch12.cameraZ).toBeGreaterThan(launch0.cameraZ);
    expect(launch0.fovDeg).toBeGreaterThan(36);
  });
  it("only outputs valid finite camera coordinates, never drives race input",()=>{
    for(let phase=-3;phase<2;phase+=.023){
      const x=planStartBroadcast(phase,0)!;
      for(const key of ["cameraX","cameraZ","heightAboveSnowM",
        "focusX","focusZ","focusAboveSnowM","fovDeg"] as const)
        expect(Number.isFinite(x[key])).toBe(true);
      expect(x).not.toHaveProperty("startGateAngle");
      expect(x).not.toHaveProperty("skiYaw");
      expect(x).not.toHaveProperty("acceleration");
    }
  });
});
