/**
 * Cinematic pre-start warm-up authored for Alpine Ski Pro.
 * Pure function: reproducible in 120-Hz replays, without moving the skis.
 * Timeline is the three seconds of the race's actual start countdown.
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
const pulse=(x:number,start:number,end:number,fade=.16)=>
  ease((x-start)/fade)*ease((end-x)/fade);

export function prestartWarmup(startPhase:number | undefined):PrestartWarmup {
  const elapsed=clamp(3+(startPhase??-3),0,3);
  const active=startPhase!==undefined&&startPhase<0;
  const early=pulse(elapsed,.05,.87);
  const arms=pulse(elapsed,.36,1.36);
  const legs=pulse(elapsed,1.04,2.16);
  const shoulders=pulse(elapsed,1.79,2.68);
  const ready=ease((elapsed-2.42)/.52);
  const breath=Math.sin(elapsed*5.1)*.5+.5;
  // No noisy random motion; 4 Hz arm-shake cadence and two deliberate
  // knee flexions are human-readable even at modest frame rates.
  const shake=Math.sin(elapsed*2*Math.PI*3.4);
  const bend=Math.pow(.5+.5*Math.sin((elapsed-1.1)*2*Math.PI*1.25),2);
  const rotate=Math.sin((elapsed-2)*Math.PI*2.2);
  const intensity=active?Math.max(early,arms,legs,shoulders):0;
  const beat:WarmupBeat=!active||elapsed>=2.58?"ready":
    elapsed<.46?"breath":elapsed<1.30?"shake-arms":
    elapsed<2.08?"flex-legs":"shoulder-roll";
  return {
    active,beat,intensity,
    breath:active?(0.08+breath*.92)*early:0,
    pelvisBounceM:active ? -legs*.084*bend : 0,
    lateralWeightM:active ? .038*shoulders*rotate : 0,
    trunkPitchDeg:active ? 2.7*early*Math.sin(elapsed*4)
      +8*legs*bend+2.6*shoulders*rotate : 0,
    trunkRollDeg:active ? 7.2*shoulders*rotate : 0,
    headNodDeg:active ? -2.5*early*breath
      +3.2*shoulders*rotate-1.5*ready : 0,
    armOffsetY:active ? [
      .205*arms*(.5+.5*shake) + .055*shoulders*rotate,
      .205*arms*(.5-.5*shake) - .055*shoulders*rotate,
    ] as const:[0,0],
    armForwardM:active ? [
      .063*early + .145*arms*(1+shake)/2,
      .063*early + .145*arms*(1-shake)/2,
    ] as const:[0,0],
    fistEnergy:active?arms*(.35+.65*Math.abs(shake)):0,
  };
}
