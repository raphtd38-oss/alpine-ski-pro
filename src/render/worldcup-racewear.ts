/**
 * Stage-specific Super-G racewear on the existing skinned 25-bone GLB.
 *
 * Never replace the racer with a rigid statue, billboard or separate mesh:
 * all changes are owned material instances on the ORIGINAL moving body.
 * The fabric's normal/roughness maps, ski attachments and skeleton survive.
 * Graphics are original Alpine Ski Pro marks, not Olympic/FIS trademarks.
 */
import * as pc from "playcanvas";

export interface RaceWardrobeOptions {
  bibNumber: number;
  suitColor?: string;
  helmetColor?: string;
}

export function applyWorldCupRacewear(
  app: pc.Application,
  rig: pc.Entity,
  options: RaceWardrobeOptions,
  materials: pc.StandardMaterial[],
  textures: pc.Texture[],
): {bib:boolean;suit:boolean;helmet:boolean} {
  const result={bib:false,suit:false,helmet:false};
  const fabric=document.createElement("canvas");
  fabric.width=512;fabric.height=512;
  const ctx=fabric.getContext("2d")!;
  // Use an actual textile bib texture on the skinned GLB overlay, never an
  // enormous flat plank at the character's shoulders.
  ctx.fillStyle="#edf1f4";
  ctx.fillRect(0,0,512,512);
  const mesh=ctx.createLinearGradient(0,0,512,512);
  mesh.addColorStop(0,"rgba(255,255,255,.25)");
  mesh.addColorStop(1,"rgba(62,81,104,.18)");
  ctx.fillStyle=mesh;ctx.fillRect(0,0,512,512);
  for(let y=2;y<512;y+=8){
    ctx.strokeStyle="rgba(55,76,100,.07)";
    ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y+2);
    ctx.stroke();
  }
  ctx.fillStyle="#172f48";ctx.fillRect(0,0,512,113);
  ctx.fillStyle="#7cab54";ctx.fillRect(0,111,512,17);
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillStyle="#f7fafc";ctx.font="bold 37px Arial";
  ctx.fillText("ALPINE SKI PRO",256,56);
  ctx.fillStyle="#c92c42";ctx.font="bold 240px Arial";
  ctx.fillText(String(options.bibNumber),256,306);
  ctx.fillStyle="#17334c";ctx.font="bold 40px Arial";
  ctx.fillText("SUPER-G",256,446);
  ctx.fillStyle="#8395a3";ctx.fillRect(35,481,442,5);
  const bibTexture=new pc.Texture(app.graphicsDevice,{
    name:"Original ALPINE SKI PRO cloth race bib "+options.bibNumber,
    mipmaps:true,
  });
  bibTexture.setSource(fabric);
  bibTexture.addressU=bibTexture.addressV=pc.ADDRESS_CLAMP_TO_EDGE;
  bibTexture.anisotropy=8;
  textures.push(bibTexture);
  for(const component of rig.findComponents("render")){
    const renderer=component as pc.RenderComponent;
    for(const mi of renderer.meshInstances){
      const source=mi.material;
      if(!(source instanceof pc.StandardMaterial))continue;
      const name=source.name??"";
      if(name.includes("Original ALPINE SKI PRO race bib")){
        const mat=source.clone();
        mat.name="Official-sized skinned ASP race-bib "+options.bibNumber;
        mat.diffuseMap=bibTexture;
        mat.diffuse.set(1,1,1);
        mat.emissiveMap=null;
        mat.gloss=.12;
        mat.update();
        mi.material=mat;materials.push(mat);result.bib=true;
      }else if(options.suitColor &&
        name.includes("One-piece anatomically joined PBR speed suit")){
        const mat=source.clone();
        mat.name="Original racing Lycra | "+options.suitColor;
        // Multiplying the EXISTING white weave texture gives authentic
        // textile variations rather than a flat plastic shader.
        mat.diffuse.fromString(options.suitColor);
        mat.gloss=.18;
        mat.useMetalness=false;
        mat.update();
        mi.material=mat;materials.push(mat);result.suit=true;
      }else if(options.helmetColor &&
        name.includes("Carbon racing helmet original")){
        const mat=source.clone();
        mat.name="Original competition red race helmet";
        mat.diffuse.fromString(options.helmetColor);
        mat.gloss=.52;mat.update();
        mi.material=mat;materials.push(mat);result.helmet=true;
      }
    }
  }
  return result;
}
