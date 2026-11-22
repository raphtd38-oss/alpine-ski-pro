/**
 * Real joint-following ski clothing for the owner's native Rocketbox character.
 * Prevents displaying the formal suit, tie, lapels, and business shoes.
 * Each original geometry tube is anchored to the matching 80-bone skeleton
 * node and moves with its authored mocap, without altering the motion clips.
 * No third-party textures, brand marks or external runtime downloads.
 */
import * as pc from "playcanvas";
import {meshEntity,shape,material} from "./geometry";

export interface WinterUniform {
  materials:pc.StandardMaterial[];
  parts:number;
}
const TAU=Math.PI*2;

function tube(
  app:pc.Application,parent:pc.Entity,name:string,
  rings:readonly [number,number,number][],
  mat:pc.Material,segments=16,
):pc.Entity {
  const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  for(let r=0;r<rings.length;r++){
    const [offset,width,depth]=rings[r];
    for(let k=0;k<segments;k++){
      const t=k*TAU/segments;
      positions.push(offset,Math.cos(t)*width,Math.sin(t)*depth);
      uvs.push(k/segments,r/(rings.length-1));
    }
  }
  for(let r=0;r<rings.length-1;r++)
    for(let k=0;k<segments;k++){
      const a=r*segments+k,b=r*segments+(k+1)%segments;
      const c=(r+1)*segments+k,d=(r+1)*segments+(k+1)%segments;
      // Tube runs along the bone local +X; outward-facing normals.
      indices.push(a,b,c,b,d,c);
    }
  return meshEntity(app.graphicsDevice,parent,name,positions,indices,mat,
    undefined,uvs);
}

/** Loft in human body (model) coordinates, but owned by the real spine joint:
 * turning, leaning and breathing therefore move this jacket naturally. */
function jacket(
  app:pc.Application,rig:pc.Entity,spine:pc.Entity,
  mat:pc.Material,
):pc.Entity {
  rig.syncHierarchy();
  const modelToWorld=rig.getWorldTransform().clone();
  const worldToSpine=spine.getWorldTransform().clone().invert();
  const rings:[number,number,number,number][]=[
    [.795,.246,.179,.006],
    [.853,.274,.202,.010],
    [1.01,.279,.213,.010],
    [1.20,.291,.221,.009],
    [1.39,.314,.231,.010],
    [1.485,.285,.208,.007],
    [1.563,.174,.166,.006],
  ];
  const positions:number[]=[],indices:number[]=[],uvs:number[]=[];
  const sides=24;
  for(let r=0;r<rings.length;r++){
    const [height,rx,rz,forward]=rings[r];
    for(let k=0;k<sides;k++){
      const a=k*TAU/sides;
      const local=new pc.Vec3(Math.cos(a)*rx,height,
        Math.sin(a)*rz+forward);
      const point=worldToSpine.transformPoint(
        modelToWorld.transformPoint(local));
      positions.push(point.x,point.y,point.z);
      uvs.push(k/sides,r/(rings.length-1));
    }
  }
  for(let r=0;r<rings.length-1;r++)
    for(let k=0;k<sides;k++){
      const a=r*sides+k,b=r*sides+(k+1)%sides;
      const c=(r+1)*sides+k,d=(r+1)*sides+(k+1)%sides;
      indices.push(a,c,b,b,c,d);
    }
  return meshEntity(app.graphicsDevice,spine,
    "Insulated ski parka covering formal suit silhouette",
    positions,indices,mat,undefined,uvs);
}

export function addRealSkiWinterUniform(
  app:pc.Application,rig:pc.Entity,
  role:"coach"|"referee"|"camera",phase:number,
):WinterUniform {
  const materials:pc.StandardMaterial[]=[];
  const make=(name:string,hex:string,metal=0,gloss=.17)=>{
    const m=material("Winter "+name+" "+role+" "+phase,hex,metal,gloss);
    m.cull=pc.CULLFACE_NONE;m.update();
    materials.push(m);return m;
  };
  const coat=make("matte stretch weatherproof jacket",
    role==="referee"?"#853b42":phase===1?"#293d49":"#425560");
  const undercoat=make("deep charcoal hood liner","#1b2734");
  const stitching=make("subtle insulated seam","#627984");
  const pants=make("reinforced alpine staff snow trousers","#202936");
  const gaiter=make("snowproof gloves","#202933");
  const boots=make("insulated snow boots","#19232a",.04,.21);
  const highlight=make("tiny reflective parka piping","#9bafb4",.16,.32);
  let parts=0;

  const spine=rig.findByName("mixamorig:Spine1") as pc.Entity|null;
  if(spine){
    jacket(app,rig,spine,coat);parts++;
    // The raised collar closes the neckline and entirely hides the tie.
    // It follows the upper spine rather than hovering at a fixed world y.
    const chest=rig.findByName("mixamorig:Spine2") as pc.Entity|null;
    if(chest){
      const collar=tube(app,chest,
        "Parka high collar fixed to upper thorax",
        [[.055,.169,.161],[.102,.174,.161],[.155,.151,.155]],undercoat,20);
      collar.render!.castShadows=false;parts++;
    }
  }
  for(const side of ["Left","Right"] as const){
    const upper=rig.findByName("mixamorig:"+side+"Arm") as pc.Entity|null;
    const lower=rig.findByName("mixamorig:"+side+"ForeArm") as pc.Entity|null;
    const wrist=rig.findByName("mixamorig:"+side+"Hand") as pc.Entity|null;
    const hip=rig.findByName("mixamorig:"+side+"UpLeg") as pc.Entity|null;
    const shin=rig.findByName("mixamorig:"+side+"Leg") as pc.Entity|null;
    const foot=rig.findByName("mixamorig:"+side+"Foot") as pc.Entity|null;
    if(upper){
      tube(app,upper,"Fitted 3D ski-parka articulated upper sleeve "+side,
        [[-.029,.132,.143],[.027,.171,.165],[.148,.166,.159],
         [.272,.145,.147],[.310,.145,.145]],coat);parts++;
    }
    if(lower){
      tube(app,lower,"Fitted articulated snow-jacket forearm "+side,
        [[-.014,.144,.145],[.041,.146,.147],[.20,.129,.132],
         [.281,.116,.116]],coat);parts++;
      tube(app,lower,"Matte jacket sleeve cuff "+side,
        [[.259,.12,.123],[.294,.112,.116]],undercoat,16);parts++;
    }
    if(wrist){
      tube(app,wrist,"Thermal insulated alpine staff glove "+side,
        [[-.017,.088,.086],[.034,.103,.103],[.136,.093,.095],
         [.186,.061,.074]],gaiter);parts++;
    }
    if(hip){
      tube(app,hip,"Full-length articulated winter ski trousers "+side,
        [[-.031,.166,.176],[.035,.171,.186],[.20,.167,.18],
         [.366,.148,.163],[.420,.148,.164]],pants);parts++;
    }
    if(shin){
      tube(app,shin,"Waterproof ski trousers below knee "+side,
        [[-.018,.144,.155],[.02,.149,.160],[.24,.141,.149],
         [.395,.129,.145],[.431,.135,.15]],pants);parts++;
    }
    if(foot){
      tube(app,foot,"High ankle staff winter boots "+side,
        [[-.03,.145,.165],[.045,.155,.167],[.16,.149,.174],
        [.24,.118,.147]],boots);parts++;
    }
  }
  // We deliberately DO NOT recreate any of Ethan's original formal suit,
  // tie, polo shorts or leather shoes. Only real face/hair and the motion
  // skeleton are reused from the actor's licensed 3D asset.
  return {materials,parts};
}
