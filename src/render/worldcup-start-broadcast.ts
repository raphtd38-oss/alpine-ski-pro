/**
 * Original multi-camera TV director for World Cup-inspired pre-start.
 * Short race countdown and optional ten-second television presentation.
 */
export type StartShotName =
  "establishing"|"athlete-queue"|"technical-timing"|"starter-closeup"|"launch";
export const TV_START_SECONDS = 10;
const shortCuts = {start: -3, queue: -2.30, official: -1.56, skier: -.86};
const televisionCuts = {start: -TV_START_SECONDS, queue: -7.8, official: -5.2, skier: -3.4};
export interface StartBroadcastShot {
  id:number; name:StartShotName; cameraX:number; cameraZ:number;
  heightAboveSnowM:number; focusX:number; focusZ:number;
  focusAboveSnowM:number; fovDeg:number;
}
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,
  Number.isFinite(v)?v:a));
const shots:ReadonlyArray<StartBroadcastShot>=[
  // Side of house, crowd and roof: wide establishing camera.
  {id:0,name:"establishing",cameraX:9.3,cameraZ:12.5,
    heightAboveSnowM:5.0,focusX:0,focusZ:-1.7,
    focusAboveSnowM:1.7,fovDeg:58},
  // Look across the waiting racers and coat rack from the start lane.
  {id:1,name:"athlete-queue",cameraX:.1,cameraZ:-5.4,
    heightAboveSnowM:2.45,focusX:-1.1,focusZ:-11.8,
    focusAboveSnowM:1.2,fovDeg:53},
  // Start official with main timer wall and athlete visible at the gate.
  {id:2,name:"technical-timing",cameraX:1.25,cameraZ:8.1,
    heightAboveSnowM:2.55,focusX:-1.8,focusZ:3.15,
    focusAboveSnowM:1.5,fovDeg:54},
  // Telephoto close-up down the ski track, athlete visibly warming up.
  {id:3,name:"starter-closeup",cameraX:.52,cameraZ:9.4,
    heightAboveSnowM:2.75,focusX:0,focusZ:.15,
    focusAboveSnowM:1.35,fovDeg:40},
  // Angle on actual wand release and first pole strokes.
  {id:4,name:"launch",cameraX:-7.9,cameraZ:10.4,
    heightAboveSnowM:3.25,focusX:0,focusZ:4.05,
    focusAboveSnowM:.9,fovDeg:44},
] as const;

const televisionOfficial: StartBroadcastShot = {
  ...shots[2], cameraX: .65, cameraZ: 7.65, heightAboveSnowM: 2.15,
  focusX: -2.75, focusZ: 3.65, focusAboveSnowM: 1.6, fovDeg: 42,
};
const televisionSkier: StartBroadcastShot = {
  ...shots[3], cameraX: -.85, cameraZ: 6.4, heightAboveSnowM: 1.42,
  focusX: .12, focusZ: 3.30, focusAboveSnowM: .90, fovDeg: 43,
};

/** Switch scenes only on planned boundaries, never on frame rate. */
export function planStartBroadcast(startPhase:number | undefined,z:number,television = false):
  StartBroadcastShot | null {
  const cuts = television ? televisionCuts : shortCuts;
  if(startPhase===undefined||!Number.isFinite(startPhase)||
    !Number.isFinite(z)||z>=16||startPhase<cuts.start-.02||startPhase>=2.1)
    return null;
  const phase=clamp(startPhase,cuts.start,2.1);
  const shot=phase<cuts.queue ? shots[0]:
    phase<cuts.official ? shots[1]:
    phase<cuts.skier ? (television ? televisionOfficial : shots[2]):
    phase<0 ? (television ? televisionSkier : shots[3]) : shots[4];
  // Only last launch shot slowly tracks the actual physical player;
  // no teleports before this and no camera changes to the 120Hz solver.
  if(shot.id===4){
    const follow=clamp(z,0,12);
    return {...shot,focusZ:shot.focusZ+follow*.76,
      cameraZ:shot.cameraZ+follow*.48};
  }
  return {...shot};
}
