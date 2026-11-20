import * as pc from "playcanvas";
import { cortinaSkyRGB, type CortinaLightMode } from "./cortina-sky-profile";

/** Original sky/ground radiance, prefiltered once for PBR reflections and fill.
 * The atlas lights materials; the existing visible sky remains the background.
 * This is an artistic environment, not a captured Cortina HDR panorama. */
export function createCortinaEnvironment(app: pc.Application, mode: CortinaLightMode): pc.Texture {
  const width = 128, height = 64, data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const elevation = Math.cos(Math.PI * (y + .5) / height);
    for (let x = 0; x < width; x++) {
      const sky = cortinaSkyRGB(Math.max(0, elevation), mode);
      const sun = mode === "sunset" ? Math.pow(Math.max(0,
        Math.cos((x / width - .18) * Math.PI * 2)), 24) *
        Math.exp(-Math.pow((elevation - .23) / .11, 2)) : 0;
      const rgb = elevation < 0 ? [.48,.56,.64] :
        [sky[0] * .78 + sun * .16, sky[1] * .90 + .04 + sun * .10,
          sky[2] * .95 + .10 + sun * .04];
      const i = (y * width + x) * 4;
      // RGBA8 is decoded from sRGB by EnvLighting. Encoding linear values
      // here would apply gamma twice and crush the ambient illumination.
      for (let c = 0; c < 3; c++) data[i+c] = Math.round(Math.min(1,rgb[c])*255);
      data[i+3] = 255;
    }
  }
  const sky = new pc.Texture(app.graphicsDevice, {name:"Original Cortina sky radiance",
    width,height,format:pc.PIXELFORMAT_RGBA8,levels:[data],mipmaps:true,
    projection:pc.TEXTUREPROJECTION_EQUIRECT});
  const source = pc.EnvLighting.generateLightingSource(sky,{size:64});
  const atlas = pc.EnvLighting.generateAtlas(source,{size:256,
    numReflectionSamples:64,numAmbientSamples:32});
  atlas.name = "Cortina prefiltered sky and snow PBR lighting";
  source.destroy();sky.destroy();
  app.scene.envAtlas = atlas;
  app.scene.skyboxIntensity = 1;
  // envAtlas creates a skybox automatically. Keep only its material lighting:
  // the later skybox pass would otherwise overpaint the non-depth-writing dome.
  const skyboxLayer = app.scene.layers.getLayerById(pc.LAYERID_SKYBOX);
  if (skyboxLayer) skyboxLayer.enabled = false;
  return atlas;
}
