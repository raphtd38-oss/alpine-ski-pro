/**
 * Real bone-bound winter accessories for the user's Microsoft Rocketbox human.
 * DO NOT cover the skinned torso/arms with a nondeforming cylinder: doing so
 * concealed the authentic clothes and turned the coach into a plastic tube.
 *
 * Existing genuine skinned coat, sleeves, trousers, hands and face remain
 * visible. Their suit textures are re-tinted to matte technical outerwear by
 * worldcup-start-compound.ts. Only small neckwear/headwear are added here.
 */
import * as pc from "playcanvas";
import {material,meshEntity} from "./geometry";

export interface WinterUniform {
  materials:pc.StandardMaterial[];
  parts:number;
}
const TAU=Math.PI*2;
export function addRealSkiWinterUniform(
  app:pc.Application,rig:pc.Entity,
  role:"coach"|"referee"|"camera",phase:number,
):WinterUniform {
  const materials:pc.StandardMaterial[]=[];
  const make=(label:string,hex:string)=>{
    const m=material("Fabric winter "+label+" "+role+" "+phase,hex,0,.045);
    m.cull=pc.CULLFACE_NONE;
    m.update();
    materials.push(m);
    return m;
  };
  const knit=make("fitted ribbed knit cap",
    role==="referee"?"#26343f":phase===1?"#273641":"#304650");
  const hem=make("small knit cap rolled cuff","#1c2932");
  const fleece=make("real close fitting neck-warmer","#222c37");
  let parts=0;
  // Mesh vertices authored in character-model coordinates then transformed
  // into the CURRENT real joint's local space, exactly like a skin attachment.
  rig.syncHierarchy();
  const modelToWorld=rig.getWorldTransform().clone();
  const addRings=(joint:pc.Entity,label:string,
    levels:readonly [number,number,number][],mat:pc.Material)=>{
    const toBone=joint.getWorldTransform().clone().invert();
    const vertices:number[]=[],faces:number[]=[],n=24;
    for(const [y,rx,rz] of levels)
      for(let k=0;k<n;k++){
        const a=k*TAU/n;
        const p=toBone.transformPoint(modelToWorld.transformPoint(
          new pc.Vec3(Math.cos(a)*rx,y,Math.sin(a)*rz)));
        vertices.push(p.x,p.y,p.z);
      }
    for(let i=0;i<levels.length-1;i++)
      for(let k=0;k<n;k++){
        const a=i*n+k,b=i*n+(k+1)%n;
        const c=(i+1)*n+k,d=(i+1)*n+(k+1)%n;
        faces.push(a,c,b,b,c,d);
      }
    meshEntity(app.graphicsDevice,joint,label,vertices,faces,mat);
    parts++;
  };
  const head=rig.findByName("mixamorig:Head") as pc.Entity|null;
  if(head){
    // A beanie hugs the top of the real head, not a huge fake helmet
    // floating 15cm above the hairstyle. Keep the face visible.
    addRings(head,"Head-joint fitted alpine wool beanie",[
      [1.668,.112,.122],[1.704,.118,.126],
      [1.755,.115,.125],[1.811,.095,.100],
      [1.842,.035,.041],[1.847,.001,.001],
    ],knit);
    addRings(head,"Ribbed cuff actually touching the hair",[
      [1.665,.114,.123],[1.690,.120,.128],
      [1.716,.120,.128],
    ],hem);
  }
  const neck=rig.findByName("mixamorig:Spine2") as pc.Entity|null;
  if(neck){
    addRings(neck,"Soft alpine fleece neck warmer covering suit neck",[
      [1.465,.148,.151],[1.494,.157,.159],
      [1.552,.141,.145],[1.582,.128,.133],
    ],fleece);
  }
  return {materials,parts};
}
