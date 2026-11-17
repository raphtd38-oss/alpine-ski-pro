import * as pc from "playcanvas";
import pack from "../../scripts/alpine-pack.json";
import type { Course, Quality } from "../game/types";
import { terrainHeight, courseCenterX } from "../game/course";
import { superGSector } from "../game/superg";
import { rng } from "./geometry";
import { chooseDetailVisibility, detailRange } from "./scenery-lod";

/**
 * Optional licensed visual upgrade. The original course, collision logic and
 * 120 Hz skier physics are untouched. Missing files never block a race.
 *
 * Near piste: detailed CC0 GLBs. Farther back: the existing inexpensive
 * single-mesh procedural forest and mountain terrain, a spatial LOD strategy.
 */
export class AlpineAssets {
  private models = new Map<string, pc.ContainerResource>();
  private textures = new Map<string, pc.Texture>();
  private details: { entity: pc.Entity; position: pc.Vec3; key: string }[] = [];
  private visualUpdateTimer = 0;
  visibleDetails = 0;

  constructor(private readonly app: pc.Application) {}

  private async request(
    name: string,
    type: "container" | "texture",
    url: string,
  ): Promise<pc.Asset | null> {
    const asset = new pc.Asset(name, type, { url });
    return await new Promise((resolve) => {
      let finished = false;
      const done = (result: pc.Asset | null) => {
        if (finished) return;
        finished = true;
        if (!result) this.app.assets.remove(asset);
        resolve(result);
      };
      asset.ready(() => done(asset));
      asset.once("error", () => done(null));
      this.app.assets.add(asset);
      try { this.app.assets.load(asset); }
      catch { done(null); }
    });
  }

  async load() {
    // Build-time downloader puts assets here; there are no CDN requests from
    // the production game, so offline / cached play remains predictable.
    await Promise.all([
      ...pack.models.map(async (model) => {
        const asset = await this.request(
          "CC0 alpine " + model.key,
          "container",
          import.meta.env.BASE_URL + "assets/alpine/" + model.key + ".glb",
        );
        if (asset?.resource) {
          this.models.set(model.key, asset.resource as pc.ContainerResource);
        }
      }),
      ...pack.textures.map(async (texture) => {
        const asset = await this.request(
          "CC0 " + texture.key,
          "texture",
          import.meta.env.BASE_URL + "assets/alpine/" + texture.key + ".jpg",
        );
        if (!asset?.resource) return;
        const map = asset.resource as pc.Texture;
        map.addressU = map.addressV = pc.ADDRESS_REPEAT;
        map.anisotropy = 8;
        this.textures.set(texture.key, map);
      }),
    ]);
  }

  has(key: string): boolean {
    return this.models.has(key);
  }

  applySnowMaterial(material: pc.StandardMaterial): boolean {
    const albedo = this.textures.get("snow-diffuse");
    const normal = this.textures.get("snow-normal");
    const roughness = this.textures.get("snow-roughness");
    if (!albedo || !normal || !roughness) return false;
    material.diffuseMap = albedo;
    material.normalMap = normal;
    material.glossMap = roughness;
    material.glossMapChannel = "r";
    material.glossInvert = true; // Poly Haven image stores roughness, not gloss
    material.gloss = 1;
    material.bumpiness = 0.22;
    material.update();
    return true;
  }

  private place(
    parent: pc.Entity,
    course: Course,
    quality: Quality,
    key: string,
    x: number,
    z: number,
    scale: number,
    heading: number,
  ): void {
    const resource = this.models.get(key);
    if (!resource) return;
    const entity = resource.instantiateRenderEntity();
    entity.name = "CC0 Alpine detail / " + key;
    entity.setLocalPosition(x, terrainHeight(x, z, course) - 0.04, z);
    entity.setLocalScale(scale, scale, scale);
    entity.setLocalEulerAngles(0, heading, 0);
    parent.addChild(entity);
    this.details.push({
      entity,
      position: new pc.Vec3(x, terrainHeight(x, z, course), z),
      key,
    });
    // Large numbers of shadow-casting tree instances are costly. Retain
    // close-contact shadowing for buildings, not for all vegetation.
    const casts = (key === "chalet" || key === "guesthouse") &&
      (quality === "high" || quality === "ultra");
    for (const c of entity.findComponents("render"))
      (c as pc.RenderComponent).castShadows = casts;
  }

  /** Imported GLBs switch off outside camera range. The permanent batched
   * forest & rock silhouettes stay rendered, so there are no empty hills.
   * Visual-only: no change to physics, gate validation, or replay state. */
  updateVisuals(dt: number, eye: pc.Vec3, quality: Quality): void {
    this.visualUpdateTimer += Math.max(0, dt);
    if (this.visualUpdateTimer < 0.22) return;
    this.visualUpdateTimer = 0;
    let visible = 0;
    for (const detail of this.details) {
      const distance = detail.position.distance(eye);
      const next = chooseDetailVisibility(
        detail.entity.enabled, distance, detailRange(detail.key, quality),
      );
      detail.entity.enabled = next;
      if (next) visible++;
    }
    this.visibleDetails = visible;
  }

  populate(parent: pc.Entity, course: Course, quality: Quality): void {
    this.details.length = 0;
    this.visualUpdateTimer = 0;
    this.visibleDetails = 0;
    const edge = course.width / 2;
    const random = rng(20261116);
    if (this.has("chalet")) {
      this.place(parent, course, quality, "chalet", -edge - 18, -3, 1.35, 20);
      this.place(parent, course, quality, "chalet", -edge - 18,
        course.length + 26, 1.35, 145);
    }
    if (this.has("guesthouse"))
      this.place(parent, course, quality, "guesthouse", edge + 29,
        course.length + 28, 1.1, -45);
    const trees = { low: 10, medium: 26, high: 56, ultra: 90 }[quality];
    const rocks = { low: 3, medium: 10, high: 18, ultra: 28 }[quality];
    for (let i = 0; i < trees; i++) {
      const side = i % 2 ? 1 : -1;
      const z = 16 + random() * Math.max(50, course.length - 32);
      const sector = course.id === "SG" ? superGSector(z) : "spruce";
      if (sector === "glacier" && random() > 0.22) continue;
      const x = courseCenterX(z, course) +
        side * (edge + 10 + random() * 28);
      const key = i % 5 === 0 ? "sapling" : i % 4 === 0 ? "pine" : "fir";
      this.place(parent, course, quality, key, x, z,
        key === "sapling" ? 1.2 + random() * 0.65 : 1.15 + random() * 0.9,
        random() * 360);
    }
    for (let i = 0; i < rocks; i++) {
      const side = i % 2 ? -1 : 1;
      const z = 14 + random() * Math.max(50, course.length - 28);
      const x = courseCenterX(z, course) +
        side * (edge + 7 + random() * 24);
      const key = i % 5 === 0 ? "glacial-rock" : i % 2 ? "outcrop" : "boulder";
      this.place(parent, course, quality, key, x, z,
        0.9 + random() * 1.4, random() * 360);
    }
    if (this.has("wayfinding")) {
      for (let z = 85; z < course.length - 35; z += 165) {
        this.place(parent, course, quality, "wayfinding",
          courseCenterX(z, course) - edge - 4.7, z, 1, 90);
      }
    }
  }
}
