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
  // 1. Inside the actual World-Cup start tent: frame the real athlete
  // and staff rather than a distant toy-sized cabin in a landscape.
  {id:0,name:"establishing",cameraX:1.48,cameraZ:.53,
    heightAboveSnowM:2.03,focusX:.05,focusZ:2.85,
    focusAboveSnowM:1.53,fovDeg:58},
  // 2. The NEXT competitor and independent 25-bone warm-up behind the racer.
  {id:1,name:"athlete-queue",cameraX:-1.22,cameraZ:1.35,
    heightAboveSnowM:1.83,focusX:.48,focusZ:-.17,
    focusAboveSnowM:1.50,fovDeg:42},
  // 3. A genuine DISTINCT close-up on the lead coach's face and
  // ski jacket. Previous version repeated the queue angle identically.
  {id:2,name:"coaches",cameraX:-1.11,cameraZ:1.05,
    heightAboveSnowM:1.86,focusX:-2.82,focusZ:2.20,
    focusAboveSnowM:1.58,fovDeg:39},
  // 4. Official control table, live A+B display and true start wand.
  {id:3,name:"technical-timing",cameraX:-1.16,cameraZ:1.92,
    heightAboveSnowM:2.00,focusX:-2.85,focusZ:1.32,
    focusAboveSnowM:1.28,fovDeg:45},
  // 5. Real player concentration behind the contact wand.
  {id:4,name:"starter-closeup",cameraX:.46,cameraZ:4.64,
    heightAboveSnowM:1.97,focusX:0,focusZ:3.0,
    focusAboveSnowM:1.53,fovDeg:43},
  // 6. Crossing the real wand and the first two push cycles.
  {id:5,name:"launch",cameraX:-5.3,cameraZ:8.75,
    heightAboveSnowM:3.20,focusX:0,focusZ:4.32,
    focusAboveSnowM:1.10,fovDeg:42},
] as const;

/** Ten real seconds of continuous prestart coverage, with five unhurried
 * camera shots and a sixth LAUNCH shot after GO. Last three seconds form the
 * genuine 3–2–1 countdown; timing wand/race physics remain untouched. */
export function planStartBroadcast(
  startPhase: number | undefined, z: number,
): StartBroadcastShot | null {
  if(startPhase===undefined || !Number.isFinite(startPhase) ||
    !Number.isFinite(z) || z>=16 || startPhase<-10.02 || startPhase>=2.1)
    return null;
  const phase=clamp(startPhase,-10,2.1);
  // Real elapsed 0..10 seconds:
  // 0.0–2.0  establishing / full compact start facade
  // 2.0–4.6  waiting athlete / independent body warmup
  // 4.6–7.0  coaches / encouragement (full-time, not sped-up)
  // 7.0–8.2  official timing / final beep prelude
  // 8.2–10   starter / final concentration and 3–2–1 GO
  const shot=phase< -8.0 ? shots[0] :
    phase< -5.4 ? shots[1] :
    phase< -3.0 ? shots[2] :
    phase< -1.8 ? shots[3] :
    phase<0 ? shots[4] : shots[5];
  if(shot.name==="launch"){
    const follow=clamp(z,0,12);
    return {...shot,focusZ:shot.focusZ+follow*.76,
      cameraZ:shot.cameraZ+follow*.48};
  }
  return {...shot};
}
