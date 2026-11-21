import {describe,it,expect} from "vitest";
import {prestartWarmup} from "../src/render/prestart-warmup";

describe("World Cup racer pre-start warm-up choreography",()=>{
  it("contains distinct breathing, arm shake, leg flexion and shoulder roll",()=>{
    const phases=[-2.9,-2.15,-1.4,-.75,-.15];
    const names=phases.map(p=>prestartWarmup(p).beat);
    expect(names).toEqual([
      "breath","shake-arms","flex-legs","shoulder-roll","ready"
    ]);
  });
  it("does not animate the warm-up during racing or old replays",()=>{
    for(const p of [undefined,0,1.3,20]){
      const r=prestartWarmup(p);
      expect(r.active).toBe(false);
      expect(r.intensity).toBe(0);
      expect(r.pelvisBounceM).toBe(0);
      expect(r.armOffsetY).toEqual([0,0]);
    }
  });
  it("is deterministic and bounded so neither ski nor the real race state changes",()=>{
    for(let i=0;i<100;i++){
      const p=-3+i*.03,a=prestartWarmup(p),b=prestartWarmup(p);
      expect(a).toEqual(b);
      expect(a.pelvisBounceM).toBeGreaterThanOrEqual(-.09);
      expect(Math.abs(a.trunkRollDeg)).toBeLessThan(8);
      expect(Math.abs(a.headNodDeg)).toBeLessThan(7);
      expect(Math.abs(a.armOffsetY[0])).toBeLessThan(.28);
      expect(a).not.toHaveProperty("skiYaw");
      expect(a).not.toHaveProperty("contact");
    }
  });
  it("moves actual body channels rather than only UI/camera",()=>{
    const frames=Array.from({length:200},(_,i)=>prestartWarmup(-4+i*.02));
    expect(Math.min(...frames.map(x=>x.pelvisBounceM))).toBeLessThan(-.014);
    expect(Math.max(...frames.map(x=>x.armOffsetY[0]))).toBeGreaterThan(.10);
    expect(Math.max(...frames.map(x=>x.armOffsetY[1]))).toBeGreaterThan(.10);
    expect(Math.max(...frames.map(x=>x.trunkRollDeg))).toBeGreaterThan(1);
  });
});
