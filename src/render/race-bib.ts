import * as pc from "playcanvas";

/** Print on the original skinned garment, keeping its fabric and normal map. */
export function numberRaceBib(device: pc.GraphicsDevice, rig: pc.Entity, number: number) {
  const bib = rig.findByName("Race bib overlay front") as pc.Entity | null;
  const cloth = bib?.render?.meshInstances[0];
  const source = cloth?.material as pc.StandardMaterial | undefined;
  const fabric = source?.diffuseMap;
  const image = fabric?.getSource();
  if (!cloth || !source || !fabric || !image) return;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ink = canvas.getContext("2d")!;
  ink.drawImage(image, 0, 0, 512, 512);
  // This garment's V coordinate increases from waist to collar.
  ink.translate(0, 512);
  ink.scale(1, -1);
  ink.fillStyle = "#238080";
  ink.fillRect(0, 62, 512, 18);
  ink.fillStyle = "#102a43";
  ink.font = "bold 250px Arial, sans-serif";
  ink.textAlign = "center";
  ink.textBaseline = "middle";
  // The garment wraps around the chest with the front seam at U=0/1.
  for (const x of [0, 256, 512]) ink.fillText(String(number), x, 252, 128);
  const print = new pc.Texture(device, {
    name: "Cortina bib " + number, mipmaps: true, flipY: fabric.flipY,
  });
  print.setSource(canvas);
  const material = source.clone();
  material.diffuseMap = print;
  material.cull = pc.CULLFACE_NONE;
  material.update();
  cloth.material = material;
  return { material, texture: print };
}
