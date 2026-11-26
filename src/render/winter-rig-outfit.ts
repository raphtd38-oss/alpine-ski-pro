/**
 * Fitted technical alpine jacket for the real Rocketbox 80-bone human.
 * Keep the ORIGINAL skinned sleeves, real human limb proportions and fabric
 * folds. Overlay ONLY a thin zip-up winter shell over suit lapels/tie.
 *
 * Earlier tubular replacement limbs looked like inflated action figures.
 * They are deliberately NOT built here. Everything follows actual mocap.
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
  const make=(label:string,color:string,metal=0,gloss=.12)=>{
    const m=material("Fitted alpine "+label+" "+role+" "+phase,
      color,metal,gloss);
    m.cull=pc.CULLFACE_NONE;
    m.update();
    materials.push(m);
    return m;
  };
  const cloth=make("woven coat shell",
    role==="referee"?"#934752":phase===1?"#405767":"#506475");
  const collar=make("soft charcoal neck gaiter","#273541");
  const zipper=make("sealed waterproof jacket zipper","#8b9ba2",.09,.15);
  const stitching=make("subtle winter jacket baffles","#41525c");
  const spine=rig.findByName("mixamorig:Spine1") as pc.Entity|null;
  if(!spine)return {materials,parts:0};
  // Preserve the real Rocketbox silhouette below; just cover the sewn tie.
  // Loft uses body-space coordinates mapped into *this* tracked spine joint.
  rig.syncHierarchy();
  const toWorld=rig.getWorldTransform().clone();
  const toBone=spine.getWorldTransform().clone().invert();
  const pos=(x:number,y:number,z:number)=>{
    const p=toBone.transformPoint(
      toWorld.transformPoint(new pc.Vec3(x,y,z)));
    return [p.x,p.y,p.z] as const;
  };
  const rings:readonly [number,number,number,number][]=[
    [.803,.232,.178,.022],
    [.871,.263,.192,.025],
    [1.045,.264,.205,.025],
    [1.245,.276,.214,.028],
    [1.415,.289,.217,.026],
    [1.505,.263,.192,.024],
    [1.568,.139,.145,.014],
  ];
  const vertices:number[]=[],uvs:number[]=[],indices:number[]=[];
  const sides=24;
  for(let r=0;r<rings.length;r++){
    const [y,rx,rz,zShift]=rings[r];
    for(let k=0;k<sides;k++){
      const angle=k*TAU/sides;
      vertices.push(...pos(Math.cos(angle)*rx,y,
        Math.sin(angle)*rz+zShift));
      uvs.push(k/sides,r/(rings.length-1));
    }
  }
  for(let r=0;r<rings.length-1;r++)
    for(let k=0;k<sides;k++){
      const a=r*sides+k,b=r*sides+(k+1)%sides;
      const c=(r+1)*sides+k,d=(r+1)*sides+(k+1)%sides;
      indices.push(a,c,b,b,c,d);
    }
  meshEntity(app.graphicsDevice,spine,
    "Seamless fitted ski-jacket shell hiding lapels and tie",
    vertices,indices,cloth,undefined,uvs);

  // Small weatherproof zipper, slightly in front of curved shell.
  const strip:number[]=[],stripeUV:number[]=[];
  for(const [y,z] of [[.867,.226],[1.04,.239],[1.245,.250],
    [1.413,.254],[1.505,.241]] as const){
    strip.push(...pos(-.010,y,z+.005),...pos(.010,y,z+.005));
    stripeUV.push(0,y,1,y);
  }
  const faces:number[]=[];
  for(let i=0;i<4;i++){
    const a=i*2;
    faces.push(a,a+2,a+1,a+1,a+2,a+3);
  }
  meshEntity(app.graphicsDevice,spine,
    "Fine waterproof zipper on zip-up ski jacket",strip,faces,zipper,
    undefined,stripeUV);

  // Discreet matte baffle lines — no chunky cylinder bands.
  for(const y of [1.07,1.29]){
    const verts:number[]=[],inds:number[]=[];
    const count=13;
    for(let k=0;k<count;k++){
      const angle=Math.PI*.10+k*Math.PI*.80/(count-1);
      const x=Math.cos(angle)*.270;
      const z=Math.sin(angle)*.213+.028+.005;
      verts.push(...pos(x,y-.004,z),...pos(x,y+.004,z));
    }
    for(let k=0;k<count-1;k++){
      const a=k*2;
      inds.push(a,a+2,a+1,a+1,a+2,a+3);
    }
    meshEntity(app.graphicsDevice,spine,
      "Fitted technical parka subtle horizontal seams",verts,inds,stitching);
  }

  const neck=rig.findByName("mixamorig:Spine2") as pc.Entity|null;
  if(neck){
    const p:number[]=[],ids:number[]=[],N=18;
    const layers:[[number,number,number],[number,number,number]]=[
      [.072,.147,.146],[.154,.131,.135]];
    for(const [x,ry,rz] of layers)
      for(let k=0;k<N;k++){
        const a=TAU*k/N;
        p.push(x,ry*Math.cos(a),rz*Math.sin(a));
      }
    for(let k=0;k<N;k++){
      const a=k,b=(k+1)%N,c=k+N,d=(k+1)%N+N;
      ids.push(a,b,c,b,d,c);
    }
    meshEntity(app.graphicsDevice,neck,
      "Close-fitting technical fleece neck collar",
      p,ids,collar);
  }
  // Winter headgear is attached to the REAL mocap head joint, not a
  // second unanimated mannequin. This also removes the city-suit look.
  const head=rig.findByName("mixamorig:Head") as pc.Entity|null;
  if(head){
    rig.syncHierarchy();
    const headInv=head.getWorldTransform().clone().invert();
    const modelToWorld=rig.getWorldTransform().clone();
    const worldToHead=(x:number,y:number,z:number)=>{
      const p=headInv.transformPoint(modelToWorld.transformPoint(
        new pc.Vec3(x,y,z)));
      return [p.x,p.y,p.z] as const;
    };
    const knit=make("technical knitted alpine beanie",
      role==="referee"?"#50242f":phase===1?"#1c3542":"#2e3944");
    const brim=make("dark ribbed thermal beanie hem","#1a2732");
    const makeCap=(label:string,levels:readonly [number,number,number][],
      mat:pc.Material)=>{
      const verts:number[]=[],faces:number[]=[],n=24;
      for(const [y,rx,rz] of levels)
        for(let k=0;k<n;k++){
          const a=k*TAU/n;
          verts.push(...worldToHead(Math.cos(a)*rx,y,Math.sin(a)*rz));
        }
      for(let r=0;r<levels.length-1;r++)
        for(let k=0;k<n;k++){
          const a=r*n+k,b=r*n+(k+1)%n;
          const c=(r+1)*n+k,d=(r+1)*n+(k+1)%n;
          faces.push(a,c,b,b,c,d);
        }
      meshEntity(app.graphicsDevice,head,label,verts,faces,mat);
    };
    // Modest 3D fit. The REAL person's face stays exposed and expressive.
    makeCap("Winter hat knitted crown attached to human 80-bone head",
      [[1.77,.128,.138],[1.82,.146,.154],
       [1.885,.141,.147],[1.94,.112,.113],
       [1.982,.043,.052],[1.992,.001,.001]],knit);
    makeCap("Close fitted dark wool cuff",
      [[1.765,.133,.145],[1.79,.146,.154],
       [1.816,.145,.153]],brim);
  }
  return {materials,parts:head?7:5};
}
