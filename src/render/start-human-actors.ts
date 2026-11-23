/**
 * World Cup start: source-validated clip planner for the owner's Ethan GLB.
 * Actual human body/motion comes from Microsoft Rocketbox/Avatar Studio (MIT);
 * this pure planner gives human mocap time to play during an actual 10s scene.
 * The AssetSmith ski mesh has NO skeleton, and is never falsely animated here.
 */
export type StaffTVRole = "coach" | "referee" | "camera";
export type HumanTVClip = "Idle" | "Cheer" | "Wave" | "Think" | "Phone";

export function staffTVClip(
  role: StaffTVRole,
  performer: number,
  startPhase: number | undefined,
): HumanTVClip {
  const phase = startPhase !== undefined && Number.isFinite(startPhase)
    ? startPhase : -11;
  if (role === "camera") return "Idle";
  if (role === "referee") return "Phone";
  if (performer >= 1.5) return "Think";
  // Give the full COACHES television segment (~2.4s) to real gestures.
  // This extends actor screen time, NOT animation speed or frame rate.
  if (phase > -5.75 && phase < -2.92) return "Cheer";
  // A separate restrained wave before the real portillon impulse.
  if (phase > -.84 && phase < .37) return "Wave";
  return "Idle";
}

export const HUMAN_START_ASSETS = Object.freeze({
  coach: "assets/start/coach-ethan.glb",
  skier: "assets/start/waiting-skier-assetsmith.glb",
  coachSha256: "88b282a080bc1d35d17f9b428afdd14404abda84e0f651424db4fa7e1dbb6ce5",
  skierSha256: "4bede6e0266f5343fd375868c1c8a0e5a4840ddff19290e136a620951300dd66",
});
