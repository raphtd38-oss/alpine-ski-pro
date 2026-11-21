// @ts-nocheck — source provenance check runs in Node/Vitest.
import {createHash} from "node:crypto";
import {describe, expect,it} from "vitest";
import {
  TAKE2_SOURCE_SHA256,TAKE2_DURATION_SEC,TAKE2_FRAME_COUNT,
  take2PackedBytes,sampleTake2
} from "../src/render/motionsmith-take2";

describe("user-supplied MotionSmith skiing Take 2",()=>{
  it("preserves the exact 10 fps sample pack extracted from the user's 180-frame GLB",()=>{
    const bytes=take2PackedBytes();
    expect(bytes.length).toBe(61*33);
    expect(createHash("sha256").update(bytes).digest("hex"))
      .toBe("0556ec3b58de5c60e337a535ddd161460b5f9af67458eaf17598c1e91266f7ad");
    expect(TAKE2_SOURCE_SHA256).toHaveLength(64);
    expect(TAKE2_FRAME_COUNT).toBe(61);
    expect(TAKE2_DURATION_SEC).toBeCloseTo(5.966666,4);
  });
  it("interpolates actual joints without NaN, and traverses full clip",()=>{
    const a=sampleTake2(0), b=sampleTake2(2.4),c=sampleTake2(5.966);
    expect(a.rotationsDeg.length).toBe(10);
    const asFlat=(pose)=>pose.rotationsDeg.flat().concat(pose.pelvisDeltaM);
    expect(asFlat(a).every(Number.isFinite)).toBe(true);
    expect(asFlat(b).every(Number.isFinite)).toBe(true);
    expect(asFlat(c).every(Number.isFinite)).toBe(true);
    expect(asFlat(b).some((v,i)=>Math.abs(v-asFlat(a)[i])>2)).toBe(true);
    expect(sampleTake2(NaN).seconds).toBe(0);
    expect(sampleTake2(2*TAKE2_DURATION_SEC).seconds).toBeCloseTo(0,4);
    const maxJump=Math.max(...Array.from({length:180},(_,i)=>{
      const q0=sampleTake2(i/30),q1=sampleTake2((i+1)/30);
      return Math.max(...q0.rotationsDeg.flat().map((v,j)=>Math.abs(v-q1.rotationsDeg.flat()[j])));
    }));
    expect(maxJump).toBeLessThan(8);
  });
});
