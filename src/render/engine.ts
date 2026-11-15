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
  quality: Quality = "high";
  weather: Weather = "clear";
  menu = true;
  orbit = 0;
  fps = 60;
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
  build(c: Course, e: Equipment, quality: Quality, weather: Weather) {
    this.world?.destroy();
    this.athlete?.destroy();
    this.ghost?.destroy();
    this.effects?.destroy();
    this.quality = quality;
    this.weather = weather;
    this.course = c;
    this.app.graphicsDevice.maxPixelRatio = {
      low: 0.65,
      medium: 1,
      high: Math.min(1.5, devicePixelRatio),
      ultra: Math.min(2, devicePixelRatio),
    }[quality];
    this.app.resizeCanvas();
    this.sun.light!.castShadows = quality !== "low";
    this.sun.light!.shadowResolution =
      quality === "ultra" ? 4096 : quality === "high" ? 2048 : 1024;
    this.sun.light!.intensity = weather === "clear" ? 1.7 : 0.8;
    this.world = new World(this.app, c, quality);
    this.athlete = new Athlete(this.app, this.asset, e);
    this.ghost = new Athlete(this.app, this.asset, e, true);
    this.ghost.root.enabled = false;
    this.effects = new SnowEffects(this.app, c, quality);
    configureWeather(this.app, this.camera, weather);
    this.cameraReady = false;
  }
  update(
    s: SkierState,
    f: Frame,
    dt: number,
    active: boolean,
    ghostFrame: Frame | null,
  ) {
    this.fps += (1 / Math.max(0.001, dt) - this.fps) * Math.min(1, dt * 2);
    dt = Math.min(0.1, dt);
    this.athlete.update(f, this.course, dt);
    this.ghost.root.enabled = ghostFrame !== null;
    if (ghostFrame) this.ghost.update(ghostFrame, this.course, dt);
    this.effects.update(s, dt, active);
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
    if (!this.cameraReady || this.cameraMode === 2) {
      this.camera.setPosition(eye);
      this.cameraReady = true;
    } else
      this.camera.setPosition(
        this.camera
          .getPosition()
          .clone()
          .lerp(
            this.camera.getPosition(),
            eye,
            1 - Math.exp(-dt * (this.menu ? 2 : 7)),
          ),
      );
    this.camera.lookAt(look);
    this.camera.camera!.fov = this.menu
      ? 62
      : this.cameraMode === 2
        ? 76
        : 58 + Math.min(8, speed * 0.18);
    this.athlete.root.enabled = this.menu || this.cameraMode !== 2;
  }
  changeCamera() {
    this.cameraMode = (this.cameraMode + 1) % CAMERAS.length;
    this.cameraReady = false;
    return CAMERAS[this.cameraMode];
  }
}
export async function createRenderer(canvas: HTMLCanvasElement) {
  let device: pc.GraphicsDevice;
  try {
    device = await pc.createGraphicsDevice(canvas, {
      deviceTypes: [pc.DEVICETYPE_WEBGPU, pc.DEVICETYPE_WEBGL2],
      antialias: new URLSearchParams(location.search).get("quality") !== "low",
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    device = await pc.createGraphicsDevice(canvas, {
      deviceTypes: [pc.DEVICETYPE_WEBGL2],
      antialias: new URLSearchParams(location.search).get("quality") !== "low",
      alpha: false,
    });
  }
  const r = new Renderer(canvas, device);
  await r.load();
  return r;
}
