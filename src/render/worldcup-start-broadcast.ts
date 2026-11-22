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
  {id:0,name:"establishing",cameraX:9.2,cameraZ:11.2,
    heightAboveSnowM:4.4,focusX:0,focusZ:2.18,
    focusAboveSnowM:1.9,fovDeg:51},
  // 2. The NEXT competitor and independent 25-bone warm-up behind the racer.
  {id:1,name:"athlete-queue",cameraX:-1.26,cameraZ:1.15,
    heightAboveSnowM:1.94,focusX:.48,focusZ:-.02,
    focusAboveSnowM:1.50,fovDeg:48},
  // 3. Coach encourages and follows starter signal from the right of lane.
  {id:2,name:"coaches",cameraX:.62,cameraZ:1.94,
    heightAboveSnowM:2.20,focusX:2.25,focusZ:1.42,
    focusAboveSnowM:1.55,fovDeg:34},
  // 4. Official control table, live A+B display and true start wand.
  {id:3,name:"technical-timing",cameraX:-.75,cameraZ:4.91,
    heightAboveSnowM:2.30,focusX:-3.12,focusZ:3.45,
    focusAboveSnowM:1.84,fovDeg:46},
  // 5. Real player concentration behind the contact wand.
  {id:4,name:"starter-closeup",cameraX:1.0,cameraZ:6.9,
    heightAboveSnowM:2.35,focusX:0,focusZ:3.0,
    focusAboveSnowM:1.48,fovDeg:35},
  // 6. Crossing the real wand and the first two push cycles.
  {id:5,name:"launch",cameraX:-5.3,cameraZ:8.75,
    heightAboveSnowM:3.20,focusX:0,focusZ:4.32,
    focusAboveSnowM:1.10,fovDeg:42},
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
  const shot=phase< -2.58 ? shots[0] :
    phase< -1.78 ? shots[1] :
    phase< -1.37 ? shots[2] :
    phase< -.84 ? shots[3] :
    phase<0 ? shots[4] : shots[5];
  if(shot.name==="launch"){
    const follow=clamp(z,0,12);
    return {...shot,focusZ:shot.focusZ+follow*.76,
      cameraZ:shot.cameraZ+follow*.48};
  }
  return {...shot};
}
