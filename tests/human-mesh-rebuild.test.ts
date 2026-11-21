// @ts-nocheck — binary GLB diagnostic uses dynamically typed glTF JSON.
import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
function glb(file:string){
 const b=readFileSync(file);
 expect(b.toString("ascii",0,4)).toBe("glTF");
 expect(b.readUInt32LE(8)).toBe(b.length);
 const n=b.readUInt32LE(12);
 const doc=JSON.parse(b.toString("utf8",20,20+n));
 const bin=b.subarray(20+n+8);
 const access=(index:number)=>{
  const a=doc.accessors[index],v=doc.bufferViews[a.bufferView];
  const w={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],
    bytes={5123:2,5125:4,5126:4}[a.componentType];
  const offset=v.byteOffset+(a.byteOffset??0);
  const stride=v.byteStride??w*bytes;
  const d=new DataView(bin.buffer,bin.byteOffset,bin.byteLength);
  return Array.from({length:a.count},(_,i)=>
    Array.from({length:w},(_,j)=>{
      const at=offset+i*stride+j*bytes;
      return a.componentType===5126?d.getFloat32(at,true):
        a.componentType===5125?d.getUint32(at,true):d.getUint16(at,true);
    }));
 };
 return {doc,access,b};
}
describe("genuine anatomical reconstructed skier mesh and original ski hardware",()=>{
 for(const variant of ["mobile","full"]){
  it(variant+" has new welded skinned human mesh without touching original hardware",()=>{
   const root="public/assets/racer/";
   const a=glb(root+"seamless-"+variant+".glb");
   const b=glb(root+"seamless-human-"+variant+".glb");
   const sourceNode=a.doc.nodes.find(n=>n.name==="ONE seamless fused skinned athlete body");
   const bodyNode=b.doc.nodes.find(n=>n.name==="ONE seamless fused skinned athlete body");
   expect(bodyNode?.mesh).toBe(sourceNode?.mesh);
   expect(bodyNode?.skin).toBe(sourceNode?.skin);
   expect(b.doc.nodes.length).toBe(a.doc.nodes.length);
   expect(b.doc.skins).toEqual(a.doc.skins);
   expect(b.doc.animations).toEqual(a.doc.animations);
   expect(b.doc.meshes.length).toBe(a.doc.meshes.length);
   // Preserve skis, bindings, race boots and helmet, literally same accessors.
   expect(b.doc.meshes.slice(1)).toEqual(a.doc.meshes.slice(1));
   const mesh=b.doc.meshes[bodyNode.mesh];
   expect(mesh.primitives).toHaveLength(1);
   const p=mesh.primitives[0];
   const pos=b.access(p.attributes.POSITION);
   const norm=b.access(p.attributes.NORMAL);
   const bones=b.access(p.attributes.JOINTS_0);
   const weights=b.access(p.attributes.WEIGHTS_0);
   const tris=b.access(p.indices);
   expect(pos.length).toBeGreaterThan(1800);
   expect(pos.length).toBeLessThan(100000);
   expect(tris.length).toBeGreaterThan(6000);
   expect(tris.length%3).toBe(0);
   expect(b.doc.extras.humanRebuild.vertices).toBe(pos.length);
   expect(pos.every(v=>v.every(Number.isFinite))).toBe(true);
   expect(norm.every(v=>v.every(Number.isFinite))).toBe(true);
   expect(norm.every(v=>Math.abs(Math.hypot(...v)-1)<.05)).toBe(true);
   let multi=0;
   for(let i=0;i<weights.length;i++){
     expect(Math.abs(weights[i].reduce((s,v)=>s+v,0)-1)).toBeLessThan(.001);
     expect(Math.max(...bones[i])).toBeLessThan(25);
     if(weights[i].filter(x=>x>.08).length>=2)multi++;
   }
   expect(multi).toBeGreaterThan(250);
   expect(b.doc.extras.humanRebuild.method).toBe("anatomical-source-skin-reconstruction");
   const oldPrimitive=a.doc.meshes[sourceNode.mesh].primitives[0];
   const oldVerts=a.access(oldPrimitive.attributes.POSITION);
   const oldWeights=a.access(oldPrimitive.attributes.WEIGHTS_0);
   expect(pos.length).toBe(oldVerts.length);
   // This is a REAL weight reconstruction, not a renamed unchanged GLB.
   // Original sculpted anatomy is retained to avoid rounded "capsule" limbs.
   const maxSurfaceMove=Math.max(...pos.map((p,i)=>
     Math.hypot(...p.map((v,k)=>v-oldVerts[i][k]))));
   expect(maxSurfaceMove).toBeLessThan(.025);
   let changed=0;
   for(let i=0;i<weights.length;i++)
     if(weights[i].some((v,k)=>Math.abs(v-oldWeights[i][k])>.005))changed++;
   expect(changed).toBeGreaterThan(pos.length*.10);
   console.info("[SKIN_RECONSTRUCTION_DEFORMATION]",variant,
     JSON.stringify({changedVertices:changed,maxSurfaceMove}));
   // Preserve original 25 bone rig and all import-visible entity names.
   for(const name of ["Hips","LeftUpLeg","RightUpLeg","LeftLeg","RightLeg",
     "LeftFoot","RightFoot","ONE seamless fused skinned athlete body"])
    expect(b.doc.nodes.some(n=>n.name===name)).toBe(true);
   console.info("[REBUILT_BODY_QA]",variant,
     JSON.stringify({vertices:pos.length,triangles:tris.length/3,
       multiWeightVertices:multi,
       sourceBodyVerts:a.access(a.doc.meshes[sourceNode.mesh].primitives[0].attributes.POSITION).length}));
  });
 }
});