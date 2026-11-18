import * as pc from "playcanvas";
import { loadAmmoPhysics, AmmoGateSensors } from "./ammo-physics";
import { Athlete } from "./athlete";
import { World, configureWeather } from "./world";
import { AlpineAssets } from "./alpine-assets";
import { SnowEffects } from "./effects";
import { terrainHeight } from "../game/course";
import type {
  Course,
  Equipment,
  Frame,
  Quality,
  SkierState,
  Weather,
} from "../game/types";
import { color } from "./geometry";
import { cortinaLightingMode, cortinaHorizonHex } from "./cortina-sky-profile";
import { AdaptiveQuality } from "../game/performance";
import { cameraShake, speedFov } from "../game/camera-rig";
export const CAMERAS = ["Poursuite", "Rapprochée", "Subjective", "Télévision"];
export class Renderer {
  app: pc.Application;
  ammoEnabled = false;
  physics: AmmoGateSensors | null = null;
  camera: pc.Entity;
  sun: pc.Entity;
  world!: World;
  alpineAssets!: AlpineAssets;
  athlete!: Athlete;
  ghost!: Athlete;
  effects!: SnowEffects;
  asset!: pc.Asset;
  seamlessAsset: pc.Asset | null = null;
  racerVariant: "classic" | "mobile" | "full" = "classic";
  course!: Course;
  cameraMode = 0;
  cameraReady = false;
  smoothedLook: pc.Vec3 | null = null;
  /** Camera world position before local chatter offset, to avoid shake drift. */
  cleanCameraPos: pc.Vec3 | null = null;
  quality: Quality = "high";
  weather: Weather = "clear";
  menu = true;
  orbit = 0;
  fps = 60;
  adaptiveQuality: AdaptiveQuality | null = null;
  adaptiveEnabled = true;
  maxRenderRatio = 1;
  renderScale = 1;
  baseShadowResolution = 2048;
  constructor(
    public canvas: HTMLCanvasElement,
    device: pc.GraphicsDevice,
  ) {
    this.app = new pc.Application(canvas, { graphicsDevice: device });
    this.app.maxDeltaTime = 0.25;
    this.camera = new pc.Entity("Camera");
    this.sun = new pc.Entity("Sun");
    this.app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    this.app.setCanvasResolution(pc.RESOLUTION_AUTO);
    device.maxPixelRatio = Math.min(window.devicePixelRatio, 1.5);
    const lightingMode = cortinaLightingMode(window.location.search);
    this.app.scene.ambientLight = color(
      lightingMode === "daylight" ? "#afc0d2" : "#898da6"
    );
    this.app.scene.exposure = 1.10;
    // Atmospheric perspective softens the distant procedural cliffs and
    // creates photographic depth without blurring nearby race gates.
    // The sky dome itself is un-fogged; track and meshes share one horizon.
    this.app.scene.fog = pc.FOG_LINEAR;
    this.app.scene.fogColor = color(cortinaHorizonHex(lightingMode));
    this.app.scene.fogStart = 880;
    this.app.scene.fogEnd = 2250;
    this.camera.addComponent("camera", {
      clearColor: color(cortinaHorizonHex(lightingMode)),
      farClip: 2400,
      nearClip: 0.08,
      fov: 58,
    });
    this.camera.camera!.toneMapping = pc.TONEMAP_ACES;
    this.app.root.addChild(this.camera);
    this.sun.addComponent("light", {
      type: "directional",
      color: color(lightingMode === "daylight" ? "#fff2d8" : "#ffd5ad"),
      intensity: 1.7,
      castShadows: true,
      shadowDistance: 155,
      shadowResolution: 2048,
      shadowBias: 0.08,
      normalOffsetBias: 0.045,
      numCascades: 3,
    });
    // Real Olympic photographs show a blue daytime sky; keep original dusk
    // as an optional visual preset through ?lighting=sunset.
    this.sun.setEulerAngles(lightingMode === "daylight" ? 57 : 74, -54, 0);
    this.app.root.addChild(this.sun);
    window.addEventListener("resize", () => this.app.resizeCanvas());
    this.app.resizeCanvas();
  }
  async load(quality: Quality = "high") {
    this.asset = new pc.Asset("Original competition athlete", "container", {
      url: import.meta.env.BASE_URL + "assets/skier.glb",
    });
    await new Promise<void>((resolve, reject) => {
      this.asset.ready(() => resolve());
      this.asset.once("error", reject);
      this.app.assets.add(this.asset);
      this.app.assets.load(this.asset);
    });
    this.alpineAssets = new AlpineAssets(this.app);
    await this.alpineAssets.load();
    const requested = new URLSearchParams(location.search).get("racer");
    const mobile = requested === "mobile" ||
      (requested !== "full" && (quality === "low" || quality === "medium" ||
        window.matchMedia("(pointer: coarse)").matches ||
        window.innerWidth < 840));
    if (requested !== "classic") {
      const variant = mobile ? "mobile" : "full";
      const racer = new pc.Asset("Original seamless Super-G racer " + variant, "container", {
        url: import.meta.env.BASE_URL + "assets/racer/seamless-" + variant + ".glb",
      });
      try {
        await new Promise<void>((resolve, reject) => {
          racer.ready(() => resolve());
          racer.once("error", (error: unknown) => reject(error));
          this.app.assets.add(racer);
          this.app.assets.load(racer);
        });
        const instance = (racer.resource as pc.ContainerResource).instantiateRenderEntity();
        const needed = ["Hips", "LeftUpLeg", "RightUpLeg", "LeftHand", "RightHand",
          "LeftFoot", "RightFoot", "ONE seamless fused skinned athlete body"];
        const missing = needed.filter(name => !instance.findByName(name));
        instance.destroy();
        if (missing.length)
          throw new Error("New skier missing rig joints: " + missing.join(", "));
        this.seamlessAsset = racer;
        this.racerVariant = variant;
      } catch (error) {
        console.warn("Alpine Ski Pro: seamless racer unavailable; original fallback active", error);
        this.seamlessAsset = null;
        this.racerVariant = "classic";
      }
    }
  }
  build(c: Course, e: Equipment, quality: Quality, weather: Weather, adaptive = true) {
    this.physics?.destroy();
    this.physics = null;
    this.world?.destroy();
    this.athlete?.destroy();
    this.ghost?.destroy();
    this.effects?.destroy();
    this.quality = quality;
    this.weather = weather;
    this.course = c;
    const baseRatio = {
      low: 0.65,
      medium: 1,
      high: Math.min(1.5, window.devicePixelRatio),
      ultra: Math.min(2, window.devicePixelRatio),
    }[quality];
    const minRatio = Math.min(
      baseRatio,
      { low: 0.55, medium: 0.7, high: 0.8, ultra: 0.9 }[quality],
    );
    this.adaptiveEnabled = adaptive;
    this.maxRenderRatio = baseRatio;
    this.renderScale = 1;
    this.adaptiveQuality = new AdaptiveQuality(baseRatio, minRatio);
    this.app.graphicsDevice.maxPixelRatio = baseRatio;
    this.app.resizeCanvas();
    this.sun.light!.castShadows = quality !== "low";
    this.baseShadowResolution =
      quality === "ultra" ? 4096 : quality === "high" ? 2048 : 1024;
    this.sun.light!.shadowResolution = this.baseShadowResolution;
    const day = cortinaLightingMode(window.location.search) === "daylight";
    this.sun.light!.intensity = weather === "clear"
      ? (day ? 1.54 : 1.33) : 0.8;
    this.sun.light!.color = color(weather === "clear"
      ? (day ? "#fff3db" : "#ffd5ad") : "#dce4f5");
    this.world = new World(this.app, c, quality, this.alpineAssets);
    if (this.ammoEnabled) this.physics = new AmmoGateSensors(this.app, c);
    this.athlete = new Athlete(this.app, this.seamlessAsset ?? this.asset, e);
    this.ghost = new Athlete(this.app, this.asset, e, true);
    this.ghost.root.enabled = false;
    this.effects = new SnowEffects(this.app, c, quality);
    configureWeather(this.app, this.camera, weather);
    this.cameraReady = false;
    this.smoothedLook = null;
    this.cleanCameraPos = null;
  }
  update(
    s: SkierState,
    f: Frame,
    dt: number,
    active: boolean,
    ghostFrame: Frame | null,
  ) {
    this.fps += (1 / Math.max(0.001, dt) - this.fps) * Math.min(1, dt * 2);
    const update = this.adaptiveQuality?.sample(
      dt,
      this.adaptiveEnabled && !document.hidden && (active || this.menu),
    );
    if (update) {
      this.app.graphicsDevice.maxPixelRatio = update.ratio;
      this.renderScale = update.ratio / this.maxRenderRatio;
      this.sun.light!.shadowResolution = Math.max(
        512,
        Math.round(this.baseShadowResolution * update.shadowScale),
      );
      this.app.resizeCanvas();
    }
    dt = Math.min(0.1, dt);
    this.athlete.update(f, this.course, dt);
    this.world.updateCortinaLights(f.z);
    this.physics?.sync(f, this.course);
    if (this.course.id === "SG")
      this.world.updateStartWands(f.startGateAngle ?? 0, dt);
    // Keep the banner visible on the start line, hide it once accelerating
    // so it cannot obstruct the chase view; restore it for the next start.
    if (this.world.startArch)
      this.world.startArch.enabled = this.menu || f.z < 7;
    this.ghost.root.enabled = ghostFrame !== null;
    if (ghostFrame) this.ghost.update(ghostFrame, this.course, dt);
    this.effects.update(s, dt, active, this.camera.getPosition());
    const y = terrainHeight(f.x, f.z, this.course) + f.height;
    const speed = Math.hypot(s.vx, s.vz);
    const forward = new pc.Vec3(
      // Keep chase view behind the actual running direction through sweeping
      // Cortina turns; the previous 0.6X skew made skis look misaligned.
      Math.sin(f.heading),
      0,
      Math.cos(f.heading),
    );
    const target = new pc.Vec3(f.x, y + 1, f.z);
    let eye: pc.Vec3, look: pc.Vec3;
    if (this.menu) {
      this.orbit += dt * 0.025;
      eye = new pc.Vec3(
        18 + Math.sin(this.orbit) * 4,
        terrainHeight(0, 0, this.course) + 10,
        -19,
      );
      look = new pc.Vec3(-5, -9, 44);
    } else if (this.cameraMode === 2) {
      eye = target.clone().add(new pc.Vec3(0, 0.45, 0.2));
      look = eye
        .clone()
        .add(forward.mulScalar(15))
        .add(new pc.Vec3(0, -4, 0));
    } else if (this.cameraMode === 3) {
      const zone = Math.floor(f.z / 75) * 75;
      eye = new pc.Vec3(
        -this.course.width * 0.7,
        terrainHeight(0, zone + 35, this.course) + 7,
        zone + 35,
      );
      look = target;
    } else {
      const inStartHouse = this.course.id === "SG" && f.z < 12;
      // The published browser captures showed the athlete filling only ~10%
      // of screen height; subtle knee and glove motion was invisible.
      // Camera points primarily at the rider, not 4 metres past him.
      // Speed-sensitive look-ahead remains for the next Super-G gate.
      const speedChase = this.course.id === "SG" && this.cameraMode === 0;
      const distance = inStartHouse ? 3.95 :
        this.cameraMode === 1 ? 3.65 :
        speedChase ? 4.65 + speed * 0.026 : 8.6 + speed * 0.065;
      eye = target.clone().sub(forward.clone().mulScalar(distance));
      if (speedChase && !inStartHouse) {
        // Slight outward tracking shot exposes both steel edges and the spray
        // fan instead of hiding the downhill ski behind the racer.
        const bank = Math.max(-1, Math.min(1, f.edge));
        eye.x += Math.cos(f.heading) * bank * 0.43;
        eye.z -= Math.sin(f.heading) * bank * 0.43;
      }
      eye.y = y + (inStartHouse ? 2.35 :
        speedChase ? 2.45 : this.cameraMode === 1 ? 2.2 : 5);
      const lookAhead = inStartHouse ? 1.05 :
        speedChase ? 2.05 : this.cameraMode === 1 ? 1.35 : 6.5;
      look = target.clone().add(new pc.Vec3(
        s.vx * (speedChase ? 0.07 : 0.12),
        speedChase ? -0.12 : -0.3,
        lookAhead,
      ));
    }
    // Dedicated side-on crash cinematography, automatically restored after
    // the racer gets back to their skis. Works even if first-person was active.
    const crashElapsed = f.gateCrashElapsed ?? -1;
    const crashCam = crashElapsed >= 0 && crashElapsed < 2.75 && !this.menu;
    if (crashCam) {
      const side = (f.gateCrashSide ?? 1) < 0 ? -1 : 1;
      const approach = Math.min(1, crashElapsed / 0.55);
      const lateral = side * (3.35 + 0.9 * approach);
      const sideVecX = Math.cos(f.heading);
      const sideVecZ = -Math.sin(f.heading);
      eye = new pc.Vec3(
        f.x + sideVecX * lateral - Math.sin(f.heading) * 3.1,
        terrainHeight(f.x, f.z, this.course) + 2.0,
        f.z + sideVecZ * lateral - Math.cos(f.heading) * 3.1,
      );
      look = new pc.Vec3(f.x, y + 0.75, f.z + 0.4);
    }
    eye.y = Math.max(eye.y, terrainHeight(eye.x, eye.z, this.course) + 0.7);
    // Smooth both camera position and focal target. A moving target without
    // focus damping looks jittery even when the skier's position is interpolated.
    // If a replay seeks or the training runner advances thousands of
    // deterministic physics ticks at once, the camera must cut to the racer
    // rather than smoothing across hundreds of metres for several seconds.
    // In normal 60Hz gameplay the position delta is only a few centimetres.
    const current = this.cleanCameraPos ?? this.camera.getPosition();
    const snap = !this.cameraReady ||
      (crashCam && crashElapsed < 0.05) ||
      (this.cameraMode === 2 && !crashCam) ||
      (!this.menu && current.distance(eye) > 38);
    if (snap) {
      this.camera.setPosition(eye);
      this.smoothedLook = look.clone();
      this.cameraReady = true;
    } else {
      const chaseBlend = 1 - Math.exp(-dt * (this.menu ? 2 : 7));
      const focusBlend = 1 - Math.exp(-dt * (this.menu ? 2 : 9));
      const from = this.cleanCameraPos ?? this.camera.getPosition();
      this.camera.setPosition(from.clone().lerp(from, eye, chaseBlend));
      if (!this.smoothedLook) this.smoothedLook = look.clone();
      else this.smoothedLook.lerp(this.smoothedLook, look, focusBlend);
    }
    // The pre-interpolation eye clamp above is not enough on SG crests:
    // smoothing can carry the camera THROUGH a fast rising relief, exposing
    // the blue clear background below the piste (visible in V1.8 screenshots).
    // Reapply contact clearance after smoothing, before camera shake.
    if (this.course.id === "SG" && (this.cameraMode !== 2 || crashCam) && !this.menu) {
      const pos = this.camera.getPosition().clone();
      const floor = terrainHeight(pos.x, pos.z, this.course) + 1.9;
      if (pos.y < floor) {
        pos.y = floor;
        this.camera.setPosition(pos);
      }
    }
    // Preserve the corrected, unshaken position for the next chase frame.
    this.cleanCameraPos = this.camera.getPosition().clone();
    this.camera.lookAt(this.smoothedLook!);
    if (!this.menu && active) {
      const jitter = cameraShake(s.chatter, s.pressure, speed, f.t);
      this.camera.translateLocal(jitter.x, jitter.y, jitter.z);
    }
    const targetFov = this.menu ? 62 : this.cameraMode === 2
      ? (crashCam ? 56 : 76) :
      crashCam ? 54 : speedFov(this.cameraMode === 0 ? 51 : 55, speed);
    this.camera.camera!.fov += (targetFov - this.camera.camera!.fov) *
      (1 - Math.exp(-dt * 5));
    this.athlete.root.enabled = this.menu || this.cameraMode !== 2 || crashCam;
    // Optional CC0 scenery has camera-range LOD with hysteresis; the
    // original cheap batched alpine background remains continuously visible.
    this.alpineAssets.updateVisuals(dt, this.camera.getPosition(), this.quality);
  }
  changeCamera() {
    this.cameraMode = (this.cameraMode + 1) % CAMERAS.length;
    this.cameraReady = false;
    return CAMERAS[this.cameraMode];
  }
}
/** A browser may expose WebGPU without a usable adapter. Probe before binding the
 * canvas, and leave software adapters on the verified WebGL path. */
async function usableWebGpu(): Promise<boolean> {
  type ProbeDevice = {
    createBuffer: (options: {
      size: number;
      usage: number;
      mappedAtCreation: boolean;
    }) => {
      getMappedRange: () => ArrayBuffer;
      unmap: () => void;
      destroy: () => void;
    };
    destroy: () => void;
  };
  type Adapter = {
    isFallbackAdapter?: boolean;
    info?: { isFallbackAdapter?: boolean; description?: string };
    requestDevice: () => Promise<ProbeDevice>;
  };
  const gpu = (
    navigator as Navigator & {
      gpu?: {
        requestAdapter: (options: {
          powerPreference: string;
        }) => Promise<Adapter | null>;
      };
    }
  ).gpu;
  if (!gpu) return false;
  let probe: ProbeDevice | undefined;
  try {
    const adapter = await gpu.requestAdapter({
      powerPreference: "high-performance",
    });
    if (
      !adapter ||
      adapter.isFallbackAdapter ||
      adapter.info?.isFallbackAdapter ||
      /swiftshader|llvmpipe|software/i.test(adapter.info?.description ?? "")
    )
      return false;
    probe = await adapter.requestDevice();
    const buffer = probe.createBuffer({
      size: 1048576,
      usage: 8,
      mappedAtCreation: true,
    });
    new Uint8Array(buffer.getMappedRange())[0] = 1;
    buffer.unmap();
    buffer.destroy();
    return true;
  } catch {
    return false;
  } finally {
    probe?.destroy();
  }
}
export async function createRenderer(canvas: HTMLCanvasElement, quality: Quality = "high") {
  const params = new URLSearchParams(location.search),
    antialias = params.get("quality") !== "low";
  const useWebGpu =
    params.get("renderer") !== "webgl2" && (await usableWebGpu());
  let device: pc.GraphicsDevice;
  try {
    device = await pc.createGraphicsDevice(canvas, {
      deviceTypes: useWebGpu
        ? [pc.DEVICETYPE_WEBGPU, pc.DEVICETYPE_WEBGL2]
        : [pc.DEVICETYPE_WEBGL2],
      antialias,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    const replacement = canvas.cloneNode(false) as HTMLCanvasElement;
    canvas.replaceWith(replacement);
    canvas = replacement;
    device = await pc.createGraphicsDevice(canvas, {
      deviceTypes: [pc.DEVICETYPE_WEBGL2],
      antialias,
      alpha: false,
    });
  }
  // Ammo must initialize before the PlayCanvas Application is constructed.
  const ammoEnabled = await loadAmmoPhysics();
  const r = new Renderer(canvas, device);
  r.ammoEnabled = ammoEnabled;
  await r.load(quality);
  if (device.isWebGPU) {
    let recovering = false;
    const recover = () => {
      if (recovering) return;
      recovering = true;
      const url = new URL(location.href);
      url.searchParams.set("renderer", "webgl2");
      url.searchParams.set("graphics-recovery", "1");
      location.replace(url.toString());
    };
    window.addEventListener("error", (event) => {
      if (
        /GPUDevice|GPUQueue|GPUCommandEncoder|createBuffer failed|copyExternalImageToTexture/.test(
          event.message,
        )
      )
        recover();
    });
    device.on("devicelost", recover);
  }
  return r;
}
