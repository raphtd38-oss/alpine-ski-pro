import * as pc from "playcanvas";
import { terrainHeight } from "../game/course";
import type { Course, Frame } from "../game/types";

/**
 * Load Bullet/Ammo before creating the PlayCanvas Application. The engine
 * provides the rigidbody and collision component systems; we do not start a
 * second independent physics engine. The official PlayCanvas WASM assets are
 * used so the Vite/GitHub Pages build does not need binary files in Git.
 *
 * The 120 Hz racing/carving simulation remains authoritative. A network or
 * WebAssembly failure must never make the Super-G unplayable.
 */
export async function loadAmmoPhysics(): Promise<boolean> {
  if (new URLSearchParams(window.location.search).get("physics") === "off")
    return false;

  const base = "https://developer.playcanvas.com/assets/modules/ammo/";
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const timeout = window.setTimeout(() => finish(false), 8000);
    function finish(loaded: boolean) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      if (!loaded) console.warn("Ammo.js unavailable: retaining Alpine Ski Pro's existing physics.");
      resolve(loaded);
    }
    try {
      pc.WasmModule.setConfig("Ammo", {
        glueUrl: base + "ammo.wasm.js",
        wasmUrl: base + "ammo.wasm.wasm",
        fallbackUrl: base + "ammo.js",
        errorHandler: (message) => {
          console.warn("Ammo.js load error:", message);
          finish(false);
        },
      });
      pc.WasmModule.getInstance("Ammo", (instance) => finish(Boolean(instance)));
    } catch (error) {
      console.warn("Could not initialize Ammo.js", error);
      finish(false);
    }
  });
}

/**
 * Real Ammo.js collision/trigger objects for the skier and Super-G poles.
 * The skier is kinematic: never allow the Bullet solver to overwrite the
 * tested 120 Hz skiing path, timing, jumping or replay.
 *
 * Trigger events give a second, independent collision measurement while
 * the deterministic PoleSimulation remains responsible for gate impacts.
 * This bridge can later be expanded to physical obstacles after validation.
 */
export class AmmoGateSensors {
  readonly root = new pc.Entity("Ammo physics - Super-G");
  readonly skier = new pc.Entity("Ammo kinematic skier collider");
  contacts = 0;
  lastGate: number | null = null;

  constructor(app: pc.Application, course: Course) {
    app.root.addChild(this.root);
    this.skier.setPosition(0, terrainHeight(0, 3, course) + 0.85, 3);
    this.skier.addComponent("collision", {
      type: "capsule",
      radius: 0.29,
      height: 1.7,
    });
    this.skier.addComponent("rigidbody", {
      type: pc.BODYTYPE_KINEMATIC,
      mass: 82,
    });
    this.root.addChild(this.skier);

    for (const gate of course.gates) {
      for (const side of [-1, 1]) {
        const x = gate.x + (side * gate.width) / 2;
        const sensor = new pc.Entity(`Ammo gate ${gate.id} / ${side}`);
        sensor.setPosition(x, terrainHeight(x, gate.z, course) + 0.92, gate.z);
        // A collision shape with no rigidbody is an Ammo trigger volume.
        sensor.addComponent("collision", {
          type: "box",
          halfExtents: new pc.Vec3(0.16, 0.92, 0.18),
        });
        sensor.collision!.on("triggerenter", (entity: pc.Entity) => {
          if (entity !== this.skier) return;
          this.contacts += 1;
          this.lastGate = gate.id;
        });
        this.root.addChild(sensor);
      }
    }
  }

  sync(frame: Frame, course: Course): void {
    // Follow the same interpolated athlete position used for rendering.
    this.skier.setPosition(
      frame.x,
      terrainHeight(frame.x, frame.z, course) + frame.height + 0.85,
      frame.z,
    );
    this.skier.setEulerAngles(0, (frame.heading * 180) / Math.PI, 0);
  }

  destroy(): void {
    this.root.destroy();
  }
}
