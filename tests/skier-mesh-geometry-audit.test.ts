// @ts-nocheck — read actual committed GLB bytes in Node, not a screenshot.
import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
function inspect(file:string) {
  const b=readFileSync(file);
  if(b.toString("ascii",0,4)!=="glTF")throw new Error("Invalid GLB");
  const jsonLength=b.readUInt32LE(12);
  const doc=JSON.parse(b.toString("utf8",20,20+jsonLength));
  const bin=20+jsonLength+8;
  const size={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
  const dims={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
  const number=(offset:number,type:number)=>{
    switch(type) {
      case 5126:return b.readFloatLE(offset);
      case 5125:return b.readUInt32LE(offset);
      case 5123:return b.readUInt16LE(offset);
      case 5122:return b.readInt16LE(offset);
      case 5121:return b.readUInt8(offset);
      case 5120:return b.readInt8(offset);
      default:throw Error("component "+type);
    }
  };
  const read=(index:number)=>{
    const a=doc.accessors[index],v=doc.bufferViews[a.bufferView];
    if(a.sparse)throw Error("Sparse accessor not supported");
    const stride=v.byteStride??dims[a.type]*size[a.componentType];
    const offset=bin+(v.byteOffset??0)+(a.byteOffset??0);
    return Array.from({length:a.count},(_,i)=>Array.from({length:dims[a.type]},
      (_,k)=>number(offset+i*stride+k*size[a.componentType],a.componentType)));
  };
  const parts=[] as any[];
  for(let mi=0;mi<(doc.meshes??[]).length;mi++){
    const mesh=doc.meshes[mi];
    for(let pi=0;pi<mesh.primitives.length;pi++){
      const p=mesh.primitives[pi];
      const vertices=read(p.attributes.POSITION);
      const lo=[0,1,2].map(d=>Math.min(...vertices.map(x=>x[d])));
      const hi=[0,1,2].map(d=>Math.max(...vertices.map(x=>x[d])));
      const blend=p.attributes.WEIGHTS_0!==undefined?
        read(p.attributes.WEIGHTS_0).filter(v=>v.filter(w=>w>.08).length>1).length:0;
      parts.push({mesh:mi,primitive:pi,name:mesh.name,material:doc.materials[p.material??0]?.name,
        verts:vertices.length,triangles:p.indices!==undefined?read(p.indices).length/3:0,
        pos:lo.map((n,d)=>[Math.round(n*1000)/1000,Math.round(hi[d]*1000)/1000]),
        blend,skinned:p.attributes.JOINTS_0!==undefined});
    }
  }
  const rigNames=["Hips","Spine","Chest","Neck","Head","LeftUpLeg","RightUpLeg",
    "LeftLeg","RightLeg","LeftFoot","RightFoot","LeftAnkle","RightAnkle",
    "LeftUpperArm","RightUpperArm","LeftForeArm","RightForeArm","LeftHand","RightHand"];
  const parents=new Map<number,number>();
  doc.nodes.forEach((n:any,i:number)=>n.children?.forEach((j:number)=>parents.set(j,i)));
  const nodes=rigNames.map(name=>{
    const i=doc.nodes.findIndex((n:any)=>n.name===name);
    const n=doc.nodes[i];
    return {name,index:i,parent:doc.nodes[parents.get(i)]?.name??null,
      translation:n?.translation??[0,0,0],rotation:n?.rotation??[0,0,0,1]};
  });
  const meshes=doc.nodes.filter((n:any)=>n.mesh!==undefined)
    .map((n:any)=>({name:n.name,mesh:n.mesh,skin:n.skin}));
  return {file,bytes:b.length,parts:parts.slice(0,35),meshes,nodes,
    skins:doc.skins.map((s:any)=>({joints:s.joints.length,first:s.joints.slice(0,8).map((i:number)=>doc.nodes[i].name),
      ibm:s.inverseBindMatrices})),
    materials:doc.materials.map((x:any)=>x.name),
    animations:(doc.animations??[]).map((a:any)=>a.name)};
}
describe("Rebuild 25-bone mesh: inspect true source asset geometry",()=>{
  it.each(["seamless-mobile.glb","seamless-full.glb"])("%s source topology and bind pose",(file)=>{
    const info=inspect("public/assets/racer/"+file);
    console.info("[REBUILD_SOURCE_25BONE] "+JSON.stringify(info));
    expect(info.parts.length).toBeGreaterThan(1);
    expect(info.skins[0].joints).toBeGreaterThanOrEqual(25);
    expect(info.nodes.find(x=>x.name==="LeftFoot")?.index).toBeGreaterThan(0);
  });
});
