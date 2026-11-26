/**
 * Ten-SECOND, real-time prestart acting on the connected 25-bone racer.
 * Not a 3-second loop slowed to 1/3 speed and not an animated billboard.
 *
 * The sequence has five deliberately different, ~2 second actions, each
 * eased independently. It modifies only render-side body/hand targets,
 * NEVER physical ski impulses, race timing, joints' bind matrices or skis.
 */
export type WarmupBeat =
  | "breath" | "shake-arms" | "flex-legs" | "shoulder-roll" | "ready";
export interface PrestartWarmup {
  active: boolean;
  beat: WarmupBeat;
  intensity: number;
  breath: number;
  pelvisBounceM: number;
  lateralWeightM: number;
  trunkPitchDeg: number;
  trunkRollDeg: number;
  headNodDeg: number;
  armOffsetY: readonly [number, number];
  armForwardM: readonly [number, number];
  fistEnergy: number;
}
const clamp=(v:number,a:number,b:number)=>
  Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
const sat=(v:number)=>clamp(v,0,1);
const ease=(v:number)=>{const x=sat(v);return x*x*(3-2*x);};
const pulse=(x:number,start:number,end:number,fade=.32)=>
  ease((x-start)/fade)*ease((end-x)/fade);

/** Elapsed scene time, not a video playback rate. During the whole real
 * 10-second Super-G start we articulate the main athlete naturally:
 * 0-2s breathe/scan; 2-4.3s arms; 4.3-6.7s knee flex; 6.7-8.8s shoulders;
 * 8.8-10s bracing. Only after these 10 seconds does the physical GO occur.
 */
export function prestartWarmup(startPhase:number | undefined):PrestartWarmup {
  const active=startPhase!==undefined&&Number.isFinite(startPhase)&&
    startPhase>=-10&&startPhase<0;
  const elapsed=active?clamp(10+(startPhase as number),0,10):0;
  const breathing=pulse(elapsed,.08,2.30,.32);
  const arms=pulse(elapsed,1.95,4.28,.35);
  const legs=pulse(elapsed,4.06,6.82,.40);
  const shoulders=pulse(elapsed,6.53,8.92,.35);
  const ready=ease((elapsed-8.66)/.95);
  // Deliberate breaths, two slow flexions and one shoulder turn. The former
  // 3.4 Hz "arm shaking" looked like glitching on a live TV closeup.
  const breath=.5+.5*Math.sin(elapsed*1.8);
  const shake=Math.sin((elapsed-2.1)*2*Math.PI*.82);
  const bend=Math.pow(.5+.5*Math.sin(
    (elapsed-4.18)*2*Math.PI*.68),2);
  const rotate=Math.sin((elapsed-6.62)*2*Math.PI*.54);
  const intensity=active?
    Math.max(breathing,arms,legs,shoulders,ready*.35):0;
  const beat:WarmupBeat=!active||elapsed>=8.84?"ready":
    elapsed<2.05?"breath":elapsed<4.30?"shake-arms":
    elapsed<6.70?"flex-legs":"shoulder-roll";
  return {
    active,beat,intensity,
    breath:active?(.23+.77*breath)*breathing:0,
    pelvisBounceM:active?-legs*.075*bend:0,
    lateralWeightM:active?.033*shoulders*rotate:0,
    trunkPitchDeg:active?
      2.8*breathing*Math.sin(elapsed*1.35)+
      8.0*legs*bend+2.8*shoulders*rotate +3.5*ready:0,
    trunkRollDeg:active?6.0*shoulders*rotate:0,
    headNodDeg:active?
      -3.0*breathing*breath+2.2*shoulders*rotate-1.8*ready:0,
    armOffsetY:active?[
      .15*arms*(.5+.5*shake)+.042*shoulders*rotate,
      .15*arms*(.5-.5*shake)-.042*shoulders*rotate,
    ] as const:[0,0],
    armForwardM:active?[
      .048*breathing+.095*arms*(.5+.5*shake),
      .048*breathing+.095*arms*(.5-.5*shake),
    ] as const:[0,0],
    fistEnergy:active?arms*(.28+.72*Math.abs(shake)):0,
  };
}
