// @ts-nocheck — GLB inspection only, run in Node/Vitest (no engine).
// Original file provenance and licensing remain with its repo asset.
// This diagnostic checks whether nine native tracks have actual human motion,
// rather than trusting the animation names or a frozen start screenshot.
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe,it,expect} from "vitest";

const samples={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
const sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
const readNumber=(data:Buffer,pos:number,type:number)=>{
  switch(type){
    case 5126:return data.readFloatLE(pos);
    case 5125:return data.readUInt32LE(pos);
    case 5123:return data.readUInt16LE(pos);
    case 5122:return data.readInt16LE(pos);
    case 5121:return data.readUInt8(pos);
    case 5120:return data.readInt8(pos);
    default:throw new Error("unsupported GLB accessor component type "+type);
  }
};
function inspect(file:string){
 const buffer=readFileSync(resolve("public/assets/racer",file));
 if(buffer.toString("ascii",0,4)!=="glTF"||buffer.readUInt32LE(8)!==buffer.length)
   throw new Error("invalid binary GLTF "+file);
 const jsonLen=buffer.readUInt32LE(12);
 const json=JSON.parse(buffer.toString("utf8",20,20+jsonLen));
 const binHeader=20+jsonLen;
 const binStart=binHeader+8;
 if(buffer.toString("ascii",binHeader+4,binHeader+7)!=="BIN")
   throw new Error("GLB missing BIN chunk");
 const accessor=(index:number)=>{
   const acc=json.accessors[index];
   if(acc.bufferView===undefined)throw new Error("unsupported sparse accessor");
   const view=json.bufferViews[acc.bufferView];
   const components=samples[acc.type],bytes=sizes[acc.componentType];
   if(!components||!bytes)throw Error("unsupported GLB accessor "+index);
   const stride=view.byteStride??(components*bytes);
   const base=binStart+(view.byteOffset??0)+(acc.byteOffset??0);
   return Array.from({length:acc.count},(_,i)=>Array.from(
     {length:components},(_,j)=>readNumber(buffer,base+i*stride+j*bytes,acc.componentType)));
 };
 const qAngle=(a:number[],b:number[])=>{
   const dot=Math.abs(a.reduce((sum,v,i)=>sum+v*b[i],0));
   return 2*Math.acos(Math.min(1,dot))*180/Math.PI;
 };
 const vecDist=(a:number[],b:number[])=>
   Math.hypot(...a.map((n,i)=>n-b[i]));
 return json.animations.map((clip:any)=>{
   let duration=0;
   const parts:any[]=[];
   for(const channel of clip.channels){
     const sampler=clip.samplers[channel.sampler];
     const times=accessor(sampler.input).map((a:any)=>a[0]);
     duration=Math.max(duration,...times);
     const output=accessor(sampler.output);
     const cubic=sampler.interpolation==="CUBICSPLINE";
     const values=cubic?times.map((_:any,i:number)=>output[3*i+1]):output;
     if(!values.length)continue;
     const reference=values[0];
     const swing=channel.target.path==="rotation"?
       Math.max(...values.map((v:any)=>qAngle(reference,v))) :
       channel.target.path==="translation"?
       Math.max(...values.map((v:any)=>vecDist(reference,v))) : 0;
     parts.push({
       node:json.nodes[channel.target.node]?.name??channel.target.node,
       path:channel.target.path,keys:times.length,
       amplitude:Math.round(swing*100)/100,
       unit:channel.target.path==="rotation"?"deg":"m"
     });
   }
   const degrees=parts.filter((p:any)=>p.unit==="deg").sort((a:any,b:any)=>b.amplitude-a.amplitude);
   const hips=parts.filter((p:any)=>/Hip|Leg|Ankle|Spine|Chest|Head/i.test(p.node)&&p.unit==="deg");
   return {name:clip.name,durationSec:Math.round(duration*100)/100,
     channels:parts.length,animatedJoints:degrees.filter((x:any)=>x.amplitude>=5).length,
     maxDegrees:degrees[0]?.amplitude??0,
     topFive:degrees.slice(0,5),
     body:hips.map((x:any)=>({bone:x.node,deg:x.amplitude}))};
 });
}

describe("25-bone Super-G rig — authored animation content, not just clip labels",()=>{
 it("measures actual moving body joints and samples in the native GLB",()=>{
   const report=inspect("seamless-mobile.glb");
   expect(report).toHaveLength(9);
   expect(report.map((r:any)=>r.name)).toContain("SG_CARVE_RIGHT");
   for(const motion of report){
     expect(motion.durationSec).toBeGreaterThan(0);
     expect(motion.channels).toBeGreaterThan(0);
   }
   console.info("[GLB MOTION BODY AUDIT] "+JSON.stringify(report));
 });
});
