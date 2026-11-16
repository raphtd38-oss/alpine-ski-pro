import * as pc from "playcanvas";
import { Athlete } from "./athlete";
import { World, configureWeather } from "./world";
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
import { AdaptiveQuality } from "../game/performance";
export const CAMERAS = ["Poursuite", "Rapprochée", "Subjective", "Télévision"];
export class Renderer {
  app: pc.Application;
  camera: pc.Entity;
  sun: pc.Entity;
  world!: World;
  athlete!: Athlete;
  ghost!: Athlete;
  effects!: SnowEffects;
  asset!: pc.Asset;
  course!: Course;
  cameraMode = 0;
  cameraReady = false;
  smoothedLook: pc.Vec3 | null = null;
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
    this.app.scene.ambientLight = color("#a7bccb");
    this.app.scene.exposure = 1.1;
    this.camera.addComponent("camera", {
      clearColor: color("#91b5cb"),
      farClip: 2400,
      nearClip: 0.08,
      fov: 58,
    });
    this.camera.camera!.toneMapping = pc.TONEMAP_ACES;
    this.app.root.addChild(this.camera);
    this.sun.addComponent("light", {
      type: "directional",
      color: color("#fff0db"),
      intensity: 1.7,
      castShadows: true,
      shadowDistance: 100,
      shadowResolution: 2048,
      shadowBias: 0.2,
      normalOffsetBias: 0.12,
      numCascades: 3,
    });
    this.sun.setEulerAngles(48, -32, 0);
    this.app.root.addChild(this.sun);
    window.addEventListener("resize", () => this.app.resizeCanvas());
    this.app.resizeCanvas();
  }
  async load() {
    this.asset = new pc.Asset("Original competition athlete", "container", {
      url: import.meta.env.BASE_URL + "assets/skier.glb",
    });
    await new Promise<void>((resolve, reject) => {
      this.asset.ready(() => resolve());
      this.asset.once("error", reject);
      this.app.assets.add(this.asset);
      this.app.assets.load(this.asset);
    });
  }
  build(c: Course, e: Equipment, quality: Quality, weather: Weather, adaptive = true) {
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
    this.sun.light!.intensity = weather === "clear" ? 1.7 : 0.8;
    this.world = new World(this.app, c, quality);
    this.athlete = new Athlete(this.app, this.asset, e);
    this.ghost = new Athlete(this.app, this.asset, e, true);
    this.ghost.root.enabled = false;
    this.effects = new SnowEffects(this.app, c, quality);
    configureWeather(this.app, this.camera, weather);
    this.cameraReady = false;
    this.smoothedLook = null;
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
    this.ghost.root.enabled = ghostFrame !== null;
    if (ghostFrame) this.ghost.update(ghostFrame, this.course, dt);
    this.effects.update(s, dt, active, this.camera.getPosition());
    const y = terrainHeight(f.x, f.z, this.course) + f.height;
    const speed = Math.hypot(s.vx, s.vz);
    const forward = new pc.Vec3(
      Math.sin(f.heading) * 0.6,
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
      const distance = this.cameraMode === 1 ? 4.8 : 8.6 + speed * 0.065;
      eye = target.clone().sub(forward.clone().mulScalar(distance));
      eye.y = y + (this.cameraMode === 1 ? 3 : 5);
      look = target.clone().add(new pc.Vec3(s.vx * 0.12, -0.45, 6.5));
    }
    eye.y = Math.max(eye.y, terrainHeight(eye.x, eye.z, this.course) + 0.7);
    // Smooth both camera position and focal target. A moving target without
    // focus damping looks jittery even when the skier's position is interpolated.
    const snap = !this.cameraReady || this.cameraMode === 2;
    if (snap) {
      this.camera.setPosition(eye);
      this.smoothedLook = look.clone();
      this.cameraReady = true;
    } else {
      const chaseBlend = 1 - Math.exp(-dt * (this.menu ? 2 : 7));
      const focusBlend = 1 - Math.exp(-dt * (this.menu ? 2 : 9));
      this.camera.setPosition(
        this.camera.getPosition().clone().lerp(this.camera.getPosition(), eye, chaseBlend),
      );
      if (!this.smoothedLook) this.smoothedLook = look.clone();
      else this.smoothedLook.lerp(this.smoothedLook, look, focusBlend);
    }
    this.camera.lookAt(this.smoothedLook!);
    const targetFov = this.menu ? 62 : this.cameraMode === 2
      ? 76 : 58 + Math.min(8, speed * 0.18);
    this.camera.camera!.fov += (targetFov - this.camera.camera!.fov) *
      (1 - Math.exp(-dt * 5));
    this.athlete.root.enabled = this.menu || this.cameraMode !== 2;
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
export async function createRenderer(canvas: HTMLCanvasElement) {
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
  const r = new Renderer(canvas, device);
  await r.load();
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
