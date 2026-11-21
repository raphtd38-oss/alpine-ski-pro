// @ts-nocheck — diagnostic reading binary GLB in Node/Vitest.
import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";

describe("retarget target rig bind frame",()=>{
 it("prints exact 25-bone local rest axes and parent names from GLB",()=>{
  const data=readFileSync("public/assets/racer/seamless-mobile.glb");
  expect(data.toString("ascii",0,4)).toBe("glTF");
  const g=JSON.parse(data.toString("utf8",20,20+data.readUInt32LE(12)));
  const parents=new Map<number,number>();
  g.nodes.forEach((n:any,i:number)=>n.children?.forEach((j:number)=>parents.set(j,i)));
  const names=["Hips","Spine","Chest","Neck","Head","LeftShoulder",
    "RightShoulder","LeftUpperArm","RightUpperArm","LeftForeArm",
    "RightForeArm","LeftHand","RightHand","LeftUpLeg","RightUpLeg",
    "LeftLeg","RightLeg","LeftAnkle","RightAnkle","LeftFoot","RightFoot"];
  const result=names.map(name=>{
   const i=g.nodes.findIndex((n:any)=>n.name===name), n=g.nodes[i];
   return {name,parent:g.nodes[parents.get(i)]?.name??null,
     translation:n.translation??[0,0,0],
     rotation:n.rotation??[0,0,0,1],
     scale:n.scale??[1,1,1]};
  });
  expect(result).toHaveLength(names.length);
  console.info("[RETARGET_TARGET_REST] "+JSON.stringify(result));
 });
});
