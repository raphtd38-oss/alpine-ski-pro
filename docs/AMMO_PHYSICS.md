# Ammo.js / Bullet Physics — Super-G (V1.12)

## What is integrated

- The PlayCanvas `WasmModule` loader initializes **Ammo.js WebAssembly** *before* the `pc.Application` is created.
- The loader uses PlayCanvas' publicly hosted Ammo assets:
  `https://developer.playcanvas.com/assets/modules/ammo/`.
  This requires connectivity to the asset host and is not an offline bundle.
- A **kinematic capsule** follows the skier and 68 **box trigger volumes**
  represent the left/right poles of the 34 Super-G gates.
- The backend emits actual Ammo overlap events. The bridge records
  `contacts` and `lastGate` for diagnostics.
- The on-screen renderer label displays `AMMO.JS` when initialization succeeds.

## Gameplay and safety

The verified 120 Hz physics in `src/game/physics.ts` remains authoritative
for carving, grip, jumps, falls, gate validity and the clock. Ammo collision
events are currently **non-authoritative sensors**: they do not yet slow down
the skier or physically bend poles. This deliberately avoids two competing
simulations and protects current gameplay/replay consistency.

If Ammo cannot be loaded, the game uses its existing physics. To explicitly
disable the new collision backend, launch with `?physics=off` (or append
`&physics=off` to other query parameters).

## Further development

1. Verify startup with Ammo in both WebGL2 and WebGPU and ensure the status
   shows `AMMO.JS` on the deployed Pages build.
2. Compare Ammo contact events with `PoleSimulation` at 30/60/120 FPS.
3. Profile gate sensors on lower-end devices; only after validation consider
   moving specific collision responses to Ammo.
4. Self-host the three WASM assets for reliable offline packaging when
   binary asset deployment is added.

Reference: https://developer.playcanvas.com/user-manual/physics/physics-basics/
