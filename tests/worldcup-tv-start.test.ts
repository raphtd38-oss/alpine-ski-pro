import {describe,it,expect} from "vitest";
import {START_HOUSE_DIMENSIONS} from "../src/render/worldcup-start-compound";
import {planStartBroadcast} from "../src/render/worldcup-start-broadcast";

describe("World Cup television start area — shots and dimensions",()=>{
  it("stages waiting racer, coach, technical, close-up and launch shots",()=>{
    const timeline=[-3,-2,-1.65,-1.20,-.46,.4].map(x=>
      planStartBroadcast(x,0)?.name);
    expect(timeline).toEqual([
      "establishing","athlete-queue","coaches",
      "technical-timing","starter-closeup","launch",
    ]);
  });
  it("matches the reference's COMPACT flat-topped start booth, not a 22m chalet",()=>{
    const w=START_HOUSE_DIMENSIONS.halfWidth*2;
    const d=START_HOUSE_DIMENSIONS.frontZ-START_HOUSE_DIMENSIONS.backZ;
    expect(w).toBeGreaterThan(7);
    expect(w).toBeLessThan(9);
    expect(d).toBeGreaterThan(5);
    expect(d).toBeLessThan(8);
    expect(START_HOUSE_DIMENSIONS.eaveHeight).toBeLessThan(3.7);
    expect(START_HOUSE_DIMENSIONS.ridgeHeight-
      START_HOUSE_DIMENSIONS.eaveHeight).toBeLessThan(.2);
    expect(START_HOUSE_DIMENSIONS.frontZ).toBeLessThan(4.05);
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
    expect(p.cameraZ).toBeCloseTo(6.9,2);
    expect(p.focusZ).toBeCloseTo(3,2);
    // Player spawn position comes from initialState().z = 3.0, not z = 0.
    expect(p.cameraZ-p.focusZ).toBeLessThan(4);\n    expect(planStartBroadcast(-2,0)!.focusZ).toBeGreaterThan(-2);
    expect(p.fovDeg).toBeLessThanOrEqual(35);
    expect(planStartBroadcast(-1.65,0)!.name).toBe("coaches");
    expect(planStartBroadcast(-1.65,0)!.fovDeg).toBeLessThan(36);
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
