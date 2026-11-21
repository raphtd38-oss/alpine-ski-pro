import {describe,it,expect} from "vitest";
import {racerSteeringEdgeTarget,supportedSkiEdgeRadians}
  from "../src/game/ski-edge-dynamics";
import {initialState,stepPhysics,FIXED_DT} from "../src/game/physics";
import {EQUIPMENT,COURSES} from "../src/game/course";

describe("speed-limited physically plausible SG ski edge",()=>{
  it("cannot roll to 50° at 23km/h and reaches racing edge at 100km/h",()=>{
    const slow=supportedSkiEdgeRadians(23/3.6,36)*180/Math.PI;
    const racing=supportedSkiEdgeRadians(100/3.6,36)*180/Math.PI;
    expect(slow).toBeLessThan(18);
    expect(slow).toBeGreaterThan(11);
    expect(racing).toBeGreaterThan(58);
    expect(racing).toBeLessThanOrEqual(63.1);
  });
  it("retains signed turning, brake and airborne softening",()=>{
    for(const v of [0,6,12,20,30]){
      const left=racerSteeringEdgeTarget(-1,v,36,false,false);
      const right=racerSteeringEdgeTarget(1,v,36,false,false);
      expect(left).toBeCloseTo(-right,10);
      expect(right).toBeGreaterThan(0);
      expect(Math.abs(racerSteeringEdgeTarget(1,v,36,true,false)))
        .toBeLessThanOrEqual(Math.abs(right));
      expect(racerSteeringEdgeTarget(1,v,36,false,true))
        .toBeCloseTo(right*.55,10);
    }
  });
  it("integrates at physics 120 Hz without low-speed vertical ski bases",()=>{
    const slow={...initialState(),vz:23/3.6};
    const fast={...initialState(),vz:29};
    const steer={steer:1,tuck:true,brake:false,jump:false};
    for(let i=0;i<25;i++){
      stepPhysics(slow,steer,EQUIPMENT.SG,COURSES.SG,FIXED_DT);
      stepPhysics(fast,steer,EQUIPMENT.SG,COURSES.SG,FIXED_DT);
    }
    expect(Math.abs(slow.edge)).toBeLessThan(.4);
    expect(Math.abs(fast.edge)).toBeGreaterThan(Math.abs(slow.edge)*1.8);
  });
});
