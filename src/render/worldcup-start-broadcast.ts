/**
 * Original multi-camera TV director for World Cup-inspired pre-start.
 * 3 seconds prestart + 1.8 seconds of the launch. Render-only decisions:
 * entirely independent of physical 120Hz game time and wand impulse.
 */
export type StartShotName =
  "establishing"|"athlete-queue"|"technical-timing"|"starter-closeup"|"launch";
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
    heightAboveSnowM:7.8,focusX:0,focusZ:-6,
    focusAboveSnowM:3.25,fovDeg:55},
  // Look across the waiting racers and coat rack from the start lane.
  {id:1,name:"athlete-queue",cameraX:.1,cameraZ:-5.4,
    heightAboveSnowM:2.45,focusX:-1.1,focusZ:-11.8,
    focusAboveSnowM:1.2,fovDeg:53},
  // Start official with main timer wall and athlete visible at the gate.
  {id:2,name:"technical-timing",cameraX:1.2,cameraZ:3.25,
    heightAboveSnowM:2.0,focusX:-1.15,focusZ:1.0,
    focusAboveSnowM:1.55,fovDeg:54},
  // Telephoto close-up down the ski track, athlete visibly warming up.
  {id:3,name:"starter-closeup",cameraX:.45,cameraZ:6.8,
    heightAboveSnowM:2.55,focusX:0,focusZ:.15,
    focusAboveSnowM:1.20,fovDeg:36},
  // Angle on actual wand release and first pole strokes.
  {id:4,name:"launch",cameraX:-7.9,cameraZ:10.4,
    heightAboveSnowM:3.25,focusX:0,focusZ:4.05,
    focusAboveSnowM:.9,fovDeg:44},
] as const;

/** Switch scenes only on planned boundaries, never on frame rate. */
export function planStartBroadcast(startPhase:number | undefined,z:number):
  StartBroadcastShot | null {
  if(startPhase===undefined||!Number.isFinite(startPhase)||
    !Number.isFinite(z)||z>=16||startPhase<-3.02||startPhase>=2.1)
    return null;
  const phase=clamp(startPhase,-3,2.1);
  const shot=phase< -2.30?shots[0]:
    phase< -1.56?shots[1]:
    phase< -.86?shots[2]:
    phase<0?shots[3]:shots[4];
  // Only last launch shot slowly tracks the actual physical player;
  // no teleports before this and no camera changes to the 120Hz solver.
  if(shot.id===4){
    const follow=clamp(z,0,12);
    return {...shot,focusZ:shot.focusZ+follow*.76,
      cameraZ:shot.cameraZ+follow*.48};
  }
  return {...shot};
}
