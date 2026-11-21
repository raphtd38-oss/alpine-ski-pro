# Alpine Ski Pro — Human skier motion, evidence and legal assets (21 Nov 2026)

**Status: research + unmerged A/B experiments. NOT a claim of professional mocap.**

## Evidence checked and transferable technique

1. *Quantitative Analysis of Elite Giant Slalom Turn Technique Using Broadcast Video Images and 3D CAD Model Matching* (2026), https://doi.org/10.3390/app16147041. The researchers compared world-class and elite GS skiers using turn phases (neutral, edge start, load start, maximum turn, edge finish). They found the world-class group raised and displaced the centre of mass inward near edge initiation, whereas a competitor with simultaneous flexion of both knees/hips showed a lower COM and different timing. This is a **research comparison in giant slalom**, not exact Super-G joint angles to paste into a game. Our visual hypothesis: no universal squat during low-speed launch, include extension at release, and monitor outside-leg support. Don't infer measured values from screenshots.

2. *On-Field Ski Kinematic According to Leg and Discipline in Elite Alpine Skiers* (2020), https://doi.org/10.3389/fspor.2020.00056. This study included 29 SG runs among 253 runs and shows inside/outside leg behaviour varies across alpine disciplines. Both knees should not be driven by one symmetric bend variable. Avoid generalising GS motion timing exactly to SG.

3. Cosindra MotionSmith's **Slalom skiing** animation (https://cosindra.ai/motionsmith/motions/slalom-skiing): 6 seconds at 30 fps on UE5 Manny skeleton; vendor offers one free commercial-use take as FBX/GLB/BVH with a free account, no attribution required per its own listing. **NOT downloaded**: the link redirects to sign-up. It is not an external mocap proof, and the UE5 rig must be retargeted to the existing 25-bone GLB and contact-corrected. Do not hotlink this in production or imply ownership of the seller's asset.

4. Rokoko Vision (https://www.rokoko.com/products/vision) offers video-to-motion and a free tier. This can be used only with footage that we have permission to process, and would require retargeting and cleanup. This task did not purchase/use Rokoko or upload FIS footage to it.

## Assets actually present in the repo

- `public/assets/racer/seamless-full.glb` and `seamless-mobile.glb`: an existing 25-bone skinned athlete, skis attached, nine authored clips (start push, aero, left/right carve, compression, flight, landing, finish, gate impact).
- The nine built-in clips are **procedurally authored, not verified optical/inertial motion capture**. PR #49 visualises them separately via `?motion=glb-preview&clip=SG_CARVE_LEFT`. The first test captured only a start stance and did not prove the motion is natural.
- `src/render/superg-race-pose-director.ts` drives the playable procedural skeleton and locks skis to ground in current V1.18. Previous attempts to enforce the knee in a different coordinate frame moved skis off snow, even when the software tests passed.

## New isolated biomechanical transition prototype

`?pose=human-v2` enables a render-only motion hypothesis: a low-speed racer does not immediately adopt a full aerodynamic tuck, and there is a slightly stronger release/edge-transition extension. It is **not** enabled by default, and does not touch simulated speed, aerodynamics, steering, collisions or timer. `tests/browser/human-transition-preview.spec.ts` records the same simulated early drive with and without the toggle, checks the ski contacts, and archives two screenshots plus numerical diagnostics.

**Promote only after visual inspection** of start, both long-radius turns, edge reversal, jump and landing on the actual racer model, at low and high speeds. Require comparable before/after frames with matching camera and camera distance, and continuous animation without snap. Units (metres, degrees, m/s) are animation tuning estimates, not FIS measured data.

## Remaining high-priority realism work

- Rebuild the human deformation weights and anatomically correct hip/thigh/calf attachment in a proper model editor. Existing one-piece body is stylised and no pure angle change can make it photorealistic.
- Retarget a lawfully acquired specialist ski animation, then *layer* ground-locked IK on top without double-rotating the boots or forcing full-body bank; confirm licensing for commercial distribution.
- Record 120 fps / multiple-angle ski reference where permitted; validate outside-leg extension, inside-leg shortening, pelvis/chest separation and real edge transition sequence.
- Test FPS on desktop and mobile GPUs. Headless Chromium passing is a stability test, not an assessment of natural human animation.
