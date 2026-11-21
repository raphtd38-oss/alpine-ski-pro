/**
 * MotionSmith Slalom Skiing Take 2 — user-supplied 89-bone UE5 mannequin.
 * Source GLB SHA-256: c2fbb97e27b192ec6f39062f5fb000e857217d5bd8c2af80a00e155247c0a08f
 *
 * The extracted 10 WORLD-space joint-group rotation vectors preserve the
 * authentic source motion for torso/arms. The source foot-steps are NOT
 * used: race skis continue to be controlled by the original contact IK.
 *
 * Extract: 180 source frames/30Hz (5.967s). Stored 10fps + final frame,
 * with max interpolation error 4.3°/axis, p99 <2.7° in the source motion.
 * Each sample has 10 × (x,y,z) signed int8 in 0.8 degree units plus 3
 * source pelvis x/y/z offsets in centimetres. No external service.
 * Opt-in studio preview: ?motion=take2
 */
export const TAKE2_SOURCE_SHA256 =
  "c2fbb97e27b192ec6f39062f5fb000e857217d5bd8c2af80a00e155247c0a08f";
export const TAKE2_DURATION_SEC = 179 / 30;
export const TAKE2_FRAME_COUNT=61;
export const TAKE2_BYTES_PER_FRAME=33;
export const TAKE2_JOINTS = [
  "Spine","Chest","Neck","Head",
  "LeftShoulder","RightShoulder",
  "LeftUpperArm","RightUpperArm",
  "LeftForeArm","RightForeArm",
] as const;
const PACKED=`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`.replace(/\s+/g, "");
let samples: Int8Array | undefined;
function readSamples(): Int8Array {
  if (!samples) {
    const decoded=atob(PACKED);
    const array=new Int8Array(decoded.length);
    for (let i=0;i<decoded.length;i++) array[i]=decoded.charCodeAt(i);
    if (array.length !== TAKE2_FRAME_COUNT*TAKE2_BYTES_PER_FRAME)
      throw new Error("MotionSmith Take2 motion data incomplete");
    samples=array;
  }
  return samples;
}
/** Expose exact user-source-derived bytes for regression tests and provenance audit. */
export function take2PackedBytes(): Uint8Array {
  return new Uint8Array(readSamples().buffer);
}
export interface Take2Frame {
  /** Rotvec world-axis components, in degrees, for each mapped bone. */
  rotationsDeg: ReadonlyArray<readonly [number,number,number]>;
  pelvisDeltaM: readonly [number,number,number];
  seconds: number;
}
/** Deterministic continuous preview, ping-pong to avoid looping jumps. */
export function sampleTake2(sec: number): Take2Frame {
  const time=Number.isFinite(sec)?Math.max(0,sec):0;
  const cycle=time%(2*TAKE2_DURATION_SEC);
  const t=cycle>TAKE2_DURATION_SEC?2*TAKE2_DURATION_SEC-cycle:cycle;
  const i=Math.min(59, Math.floor(t*10));
  const t1=i/10, t2=i===59?TAKE2_DURATION_SEC:(i+1)/10;
  const alpha=Math.min(1,Math.max(0,(t-t1)/Math.max(1e-6,t2-t1)));
  const data=readSamples(),a=i*33,b=(i+1)*33;
  const lerp=(offset:number,scale:number)=>
    (data[a+offset]+(data[b+offset]-data[a+offset])*alpha)*scale;
  const rotationsDeg: [number,number,number][]=[];
  for(let joint=0;joint<10;joint++) {
    const o=joint*3;
    rotationsDeg.push([lerp(o,0.8),lerp(o+1,0.8),lerp(o+2,0.8)]);
  }
  return {
    rotationsDeg,
    pelvisDeltaM:[lerp(30,0.01),lerp(31,0.01),lerp(32,0.01)],
    seconds:t,
  };
}
