/**
 * Original six-camera World Cup-inspired start director (seven TV stages
 * including the existing race camera). No proprietary graphics or footage.
 * Pure cinematic planner. NEVER modifies the 120 Hz ski simulation.
 */
export type StartShotName =
  "establishing" | "athlete-queue" | "coaches" |
  "technical-timing" | "starter-closeup" | "launch";
export interface StartBroadcastShot {
  id: number; name: StartShotName;
  cameraX: number; cameraZ: number;
  heightAboveSnowM: number; focusX: number; focusZ: number;
  focusAboveSnowM: number; fovDeg: number;
}
const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));

const shots: ReadonlyArray<StartBroadcastShot> = [
  // 1. Wide 3/4 view across roof, finishward facade and personnel.
  {id:0,name:"establishing",cameraX:9.3,cameraZ:12.5,
    heightAboveSnowM:5.0,focusX:0,focusZ:-1.7,
    focusAboveSnowM:1.7,fovDeg:58},
  // 2. The NEXT competitor and independent 25-bone warm-up behind the racer.
  {id:1,name:"athlete-queue",cameraX:.1,cameraZ:-5.4,
    heightAboveSnowM:2.45,focusX:-1.4,focusZ:-10.0,
    focusAboveSnowM:1.40,fovDeg:49},
  // 3. Coach encourages and follows starter signal from the right of lane.
  {id:2,name:"coaches",cameraX:1.15,cameraZ:-5.4,
    heightAboveSnowM:2.16,focusX:3.65,focusZ:-7.0,
    focusAboveSnowM:1.32,fovDeg:34},
  // 4. Official control table, live A+B display and true start wand.
  {id:3,name:"technical-timing",cameraX:1.25,cameraZ:8.1,
    heightAboveSnowM:2.55,focusX:-1.8,focusZ:3.15,
    focusAboveSnowM:1.5,fovDeg:54},
  // 5. Real player concentration behind the contact wand.
  {id:4,name:"starter-closeup",cameraX:2.60,cameraZ:2.90,
    heightAboveSnowM:1.98,focusX:0,focusZ:.15,
    focusAboveSnowM:1.42,fovDeg:34},
  // 6. Crossing the real wand and the first two push cycles.
  {id:5,name:"launch",cameraX:-7.9,cameraZ:10.4,
    heightAboveSnowM:3.25,focusX:0,focusZ:4.05,
    focusAboveSnowM:.9,fovDeg:44},
] as const;

/** Broadcast stages fit the actual three-second countdown; on exit, the
 * user's pre-existing chase/TV camera is stage seven of the sequence. */
export function planStartBroadcast(
  startPhase: number | undefined, z: number,
): StartBroadcastShot | null {
  if(startPhase===undefined || !Number.isFinite(startPhase) ||
    !Number.isFinite(z) || z>=16 || startPhase<-3.02 || startPhase>=2.1)
    return null;
  const phase=clamp(startPhase,-3,2.1);
  const shot=phase< -2.45 ? shots[0] :
    phase< -1.78 ? shots[1] :
    phase< -1.53 ? shots[2] :
    phase< -.90 ? shots[3] :
    phase<0 ? shots[4] : shots[5];
  if(shot.name==="launch"){
    const follow=clamp(z,0,12);
    return {...shot,focusZ:shot.focusZ+follow*.76,
      cameraZ:shot.cameraZ+follow*.48};
  }
  return {...shot};
}
