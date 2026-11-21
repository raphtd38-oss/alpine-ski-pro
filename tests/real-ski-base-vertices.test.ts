// @ts-nocheck — GLB binary audit runs in Node/Vitest, no GPU.
import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import * as pc from "playcanvas";
import {COURSES,EQUIPMENT} from "../src/game/course";
import {terrainHeight} from "../src/game/course";
import {SuperGRacePoseDirector} from "../src/render/superg-race-pose-director";

/**
 * Unlike the previous diagnostic's synthetic 8mm point, this measures
 * the ACTUAL geometry of the rigid ski base across 600 vertices. It must
 * detect real ski/snow penetration and side-edge floating.
 */
function loadRig(file:string) {
 const bytes=readFileSync("public/assets/racer/"+file);
 const jsonLength=bytes.readUInt32LE(12);
 const gltf=JSON.parse(bytes.toString("utf8",20,20+jsonLength));
 const bin=20+jsonLength+8;
 const nodes=gltf.nodes.map(n=>{
  const node=new pc.GraphNode(n.name);
  if(n.translation)node.setLocalPosition(...n.translation);
  if(n.rotation)node.setLocalRotation(...n.rotation);
  if(n.scale)node.setLocalScale(...n.scale);
  return node;
 });
 gltf.nodes.forEach((n,i)=>n.children?.forEach(j=>nodes[i].addChild(nodes[j])));
 const scene=new pc.GraphNode(),root=new pc.GraphNode(),rig=new pc.GraphNode();
 scene.addChild(root);root.addChild(rig);
 gltf.scenes[gltf.scene??0].nodes.forEach(i=>rig.addChild(nodes[i]));
 const aliases={Pelvis:"Hips",LHip:"LeftUpLeg",LKnee:"LeftLeg",
  LAnkle:"LeftAnkle",RHip:"RightUpLeg",RKnee:"RightLeg",RAnkle:"RightAnkle",
  LShoulder:"LeftShoulder",RShoulder:"RightShoulder",
  LUpperArm:"LeftUpperArm",RUpperArm:"RightUpperArm",
  LElbow:"LeftForeArm",RElbow:"RightForeArm",
  LWrist:"LeftHand",RWrist:"RightHand"};
 const joints={};
 for(const [name,value] of Object.entries(aliases))joints[name]=rig.findByName(value);
 const actor={root,rig,joints,poles:[new pc.GraphNode(),new pc.GraphNode()],
  isSeamless:true,visualBank:0,visualCrouch:0,visualEdge:0,visualTuck:0};
 actor.poles.forEach(p=>root.addChild(p));
 const mesh=(name)=>{
  const node=gltf.nodes.find(n=>n.name===name);
  if(!node)throw Error("Missing actual ski mesh "+name);
  const primitive=gltf.meshes[node.mesh].primitives[0];
  const acc=gltf.accessors[primitive.attributes.POSITION];
  const bufferView=gltf.bufferViews[acc.bufferView];
  const stride=bufferView.byteStride??12;
  const address=bin+bufferView.byteOffset+(acc.byteOffset??0);
  const view=bytes;
  const pts=Array.from({length:acc.count},(_,i)=>new pc.Vec3(
    view.readFloatLE(address+stride*i),
    view.readFloatLE(address+stride*i+4),
    view.readFloatLE(address+stride*i+8)));
  return {node:rig.findByName(name),points:pts};
 };
 const bases={
  L:mesh("LEFTFOOT/Waxed sintered race base"),
  R:mesh("RIGHTFOOT/Waxed sintered race base")
 };
 const actualClearance=(side)=>{
  const b=bases[side],mt=b.node.getWorldTransform();
  const world=new pc.Vec3();
  const heights=b.points.map(v=>{
    mt.transformPoint(v,world);
    return world.y-terrainHeight(world.x,world.z,COURSES.SG);
  }).sort((a,b)=>a-b);
  return {min:heights[0],p01:heights[Math.floor(.01*heights.length)],
    median:heights[Math.floor(heights.length/2)],count:heights.length};
 };
 return {actor,actualClearance};
}
const frame=(edge:number,height=0)=>({
 t:10,x:0,z:100,heading:.3,edge,vx:8,vz:27,height,
 fallen:0,tuck:1,pressure:height?0:1.15,
 lateralAcceleration:height?0:Math.sign(edge)*17,
 load:edge>0?.86:.14,
 edgeLeft:edge,edgeRight:edge,
 skiYawLeft:.3,skiYawRight:.3,startPhase:12
});
describe("visual skis: inspect actual 600-vertex PBR bases in runtime pose",()=>{
 for(const variant of ["seamless-mobile.glb","seamless-human-mobile.glb"])
  for(const edge of [-.9,0,.9]){
   it(variant+" @ edge "+edge+" real geometry clearance",()=>{
    const a=loadRig(variant);
    const director=new SuperGRacePoseDirector(a.actor,EQUIPMENT.SG);
    for(let i=0;i<120;i++)director.update(frame(edge),COURSES.SG,1/60);
    const left=a.actualClearance("L"),right=a.actualClearance("R");
    console.info("[REAL_SKI_MESH_BASE]",JSON.stringify({variant,edge,left,right,
      synthetic:director.getDiagnostics()?.leftSkiBaseClearanceM}));
    expect(left.count).toBeGreaterThan(300);
    expect(right.count).toBeGreaterThan(300);
    expect(Number.isFinite(left.min)).toBe(true);
    expect(Number.isFinite(right.min)).toBe(true);
   });
  }
});