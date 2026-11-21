/**
 * Original race kit for the connected 25-bone racer. It is built as
 * joint-following geometry, not a replacement for physics-contact skis.
 *
 * IMPORTANT: "FIS-inspired" is visual art direction only. A game mesh
 * cannot be FIS-certified; no conformity sticker or protected sponsor art.
 */
import * as pc from "playcanvas";
import type { Frame } from "../game/types";
import { material, shape, meshEntity } from "./geometry";
import { prestartWarmup } from "./prestart-warmup";

const bounded=(n:number,a:number,b:number)=>
  Math.max(a,Math.min(b,Number.isFinite(n)?n:a));

function raceBibCanvas(number:number,back:boolean):HTMLCanvasElement {
  const canvas=document.createElement("canvas");
  canvas.width=512;canvas.height=640;
  const ctx=canvas.getContext("2d")!;
  const field=ctx.createLinearGradient(0,0,0,640);
  field.addColorStop(0,"#f8fbfa");field.addColorStop(.56,"#f0f6f7");
  field.addColorStop(1,"#d1e2e8");
  ctx.fillStyle=field;ctx.fillRect(0,0,512,640);
  // Race bib details are original fiction, not the protected official
  // Milano Cortina/FIS event emblem or actual equipment certifications.
  ctx.fillStyle="#113956";ctx.fillRect(0,0,512,115);
  ctx.fillStyle="#43d6de";ctx.fillRect(0,108,512,9);
  ctx.textAlign="center";ctx.fillStyle="white";
  ctx.font="bold 37px Arial,sans-serif";
  ctx.fillText("ALPINE SKI PRO",256,59);
  ctx.font="bold 21px Arial,sans-serif";
  ctx.fillText(back?"SUPER-G":"CORTINA · 2026",256,94);
  ctx.fillStyle="#0e3150";ctx.font="900 300px Arial,sans-serif";
  ctx.fillText(String(number),256,411);
  ctx.fillStyle="#df4d45";ctx.fillRect(0,476,512,64);
  ctx.font="bold 33px Arial,sans-serif";ctx.fillStyle="white";
  ctx.fillText("WORLD CUP STYLE",256,520);
  ctx.font="bold 24px Arial,sans-serif";ctx.fillStyle="#35647c";
  ctx.fillText(back?"ALPINE RACING":"SUPER-G · SPEED",256,597);
  // Soft seams and small textile lines.
  ctx.strokeStyle="rgba(21,55,76,.33)";ctx.lineWidth=8;
  ctx.strokeRect(9,9,494,622);
  return canvas;
}

function curvedBib(
  device:pc.GraphicsDevice, parent:pc.Entity,
  name:string, mat:pc.StandardMaterial, front:boolean,
):pc.Entity {
  const vertices:number[]=[],uv:number[]=[],triangles:number[]=[];
  const cols=12,rows=12;
  for(let j=0;j<=rows;j++){
    const v=j/rows,y=.15-.48*v;
    for(let i=0;i<=cols;i++){
      const u=i/cols,x=(u-.5)*(.50-.045*Math.abs(2*v-1));
      const edge=Math.abs(2*u-1);
      // Curved full-width cloth; wraps around torso on either face.
      const z=(front?-1:1)*(.19-.055*edge*edge-.014*Math.sin(Math.PI*v));
      vertices.push(x,y,z);
      // Imported rig faces -Z and rotates 180 degrees into game space.
      // Both glTF UV axes must flip to keep bib print upright and readable.
      uv.push(1-u,v);
    }
  }
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const a=j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;
    if(front)triangles.push(a,c,b,b,c,d);
    else triangles.push(a,b,c,b,d,c);
  }
  return meshEntity(device,parent,name,vertices,triangles,mat,undefined,uv);
}

export class PremiumRacerKit {
  private textures:pc.Texture[]=[];
  private materials:pc.StandardMaterial[]=[];
  private mouth:pc.Entity;
  private jaw:pc.Entity;
  private eyeBrowLeft:pc.Entity;
  private eyeBrowRight:pc.Entity;
  readonly number:number;
  constructor(
    app:pc.Application,
    rig:pc.Entity,
    readonly isMobile:boolean,
  ){
    const head=rig.findByName("Head") as pc.Entity | null;
    const chest=rig.findByName("Chest") as pc.Entity | null;
    if(!head||!chest)throw new Error("Premium kit needs Head/Chest in racer GLB");
    const numberParam=typeof window==="undefined"?null:
      new URLSearchParams(window.location.search).get("bib");
    const n=numberParam===null?27:Number(numberParam);
    this.number=Number.isInteger(n)&&n>=1&&n<=999?n:27;
    const mat=(name:string,hex:string,metal=0,gloss=.4)=>{
      const m=material(name,hex,metal,gloss);
      this.materials.push(m);return m;
    };
    const shell=mat("Original FIS-style speed helmet shell","#122b41",.23,.82);
    const crown=mat("Race helmet crown powdercoat","#ebf1f4",.12,.67);
    const padding=mat("Helmet dark compressible side padding","#101820",.02,.22);
    const poly=mat("Aerodynamic goggle shell","#15212c",.16,.78);
    const visor=mat("Reflective glacier goggles blue","#2bb5cc",.78,.92);
    const highlight=mat("Goggle optical highlight","#c5f7fe",.25,.95);
    const face=mat("Human face - warm skin","#bf8971",0,.34);
    const lip=mat("Mouth / dynamic breathing","#4c2d30",0,.15);
    const stripe=mat("Race helmet diagonal stripe","#f45440",.14,.7);
    const thread=mat("Technical bib binding thread","#acdae0",0,.25);

    // Anatomically believable soft-shell contour: no fins/protrusions,
    // no fake RH 2013 compliance label on a cosmetic digital asset.
    shape(head,"sphere","SG aerodynamic helmet solid shell",
      [0,.092,.015],[.27,.31,.295],shell);
    shape(head,"sphere","SG helmet top inset",
      [0,.178,.016],[.202,.105,.188],crown);
    for(const sign of [-1,1]){
      shape(head,"sphere","Helmet ear cover "+sign,
        [sign*.133,-.006,.015],[.056,.105,.12],shell);
      shape(head,"sphere","Helmet removable ear pad "+sign,
        [sign*.161,-.038,.042],[.019,.084,.095],padding);
      shape(head,"box","Helmet side accent "+sign,
        [sign*.144,.132,-.07],[.012,.021,.096],stripe);
    }
    // Skin only below the lenses: face must remain visible for a mouth
    // expression even with competition goggles secured.
    shape(head,"sphere","Visible lower human face",
      [0,-.112,-.084],[.190,.123,.150],face);
    this.jaw=shape(head,"sphere","Moving racing jaw",
      [0,-.189,-.132],[.101,.053,.075],face);
    shape(head,"sphere","Nose under ski goggles",
      [0,-.112,-.220],[.039,.060,.044],face);
    this.mouth=shape(head,"sphere","Expressive breathing mouth",
      [0,-.197,-.224],[.050,.009,.010],lip);
    // Subtle eyebrow shapes inside the transparent-looking upper lens.
    // They can compress to show focused effort at the start.
    this.eyeBrowLeft=shape(head,"box","Left racing eyebrow",
      [-.073,-.014,-.219],[.074,.010,.010],padding);
    this.eyeBrowRight=shape(head,"box","Right racing eyebrow",
      [.073,-.014,-.219],[.074,.010,.010],padding);

    shape(head,"sphere","SG curved goggle rubber frame",
      [0,.015,-.203],[.230,.108,.040],poly);
    const lens=shape(head,"sphere","SG photochromic curved lens",
      [0,.025,-.227],[.221,.094,.026],visor);
    lens.render!.castShadows=false;
    shape(head,"box","Angular goggle reflection strip",
      [-.063,.067,-.241],[.112,.009,.006],highlight)
      .setLocalEulerAngles(0,0,-14);
    shape(head,"box","Second goggle lens reflection",
      [.091,.060,-.242],[.055,.005,.006],highlight)
      .setLocalEulerAngles(0,0,12);
    shape(head,"box","Goggle strap along side",
      [0,.025,.140],[.298,.035,.025],padding);
    // Soft chinstrap below the cheek, not a rigid pole guard.
    shape(head,"box","Chin retention strap",
      [0,-.209,.044],[.079,.019,.145],padding);

    for(const back of [false,true]){
      const texture=new pc.Texture(app.graphicsDevice,{
        name:back?"Original bib graphic back":"Original bib graphic front",
        mipmaps:true,
      });
      texture.setSource(raceBibCanvas(this.number,back));
      texture.anisotropy=8;
      this.textures.push(texture);
      const bib=mat("Original numbered race bib "+(back?"back":"front"),
        "#ffffff",0,.2);
      bib.diffuseMap=texture;
      bib.cull=pc.CULLFACE_NONE;
      bib.update();
      curvedBib(app.graphicsDevice,chest,back?"Race bib back - numbered":
        "Race bib front - numbered",bib,!back);
    }
    // Narrow original elastic race-bib shoulder straps; they follow
    // the chest bone instead of remaining static in world space.
    for(const sign of [-1,1]){
      const strap=shape(chest,"box","Race bib shoulder strap "+sign,
        [sign*.19,.175,0],[.055,.055,.365],thread);
      strap.setLocalEulerAngles(0,0,sign*6);
    }
  }
  update(frame:Frame){
    const pre=prestartWarmup(frame.startPhase);
    const speed=Math.hypot(frame.vx??0,frame.vz??0);
    const pressure=bounded((frame.pressure??1)-1,0,1.5);
    const excitement=bounded((frame.poleImpact??0)*.45+
      Math.abs(frame.edge)*.15+pressure*.25+frame.fallen*.7,0,1);
    const open=pre.active ?
      .23+.55*pre.breath : bounded(.15+.2*(speed/35)+.42*excitement,0,.85);
    this.mouth.setLocalScale(.048,.007+open*.020,.009+open*.006);
    this.jaw.setLocalPosition(0,-.189-open*.014,-.132);
    const eyebrow=bounded(excitement*.016+pre.intensity*.012,0,.025);
    this.eyeBrowLeft.setLocalPosition(-.073,-.014-eyebrow,-.219);
    this.eyeBrowRight.setLocalPosition(.073,-.014-eyebrow,-.219);
  }
  destroy(){
    for(const m of this.materials)m.destroy();
    for(const t of this.textures)t.destroy();
  }
}
