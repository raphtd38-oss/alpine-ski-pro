/**
 * Original 3D broadcast start house, inspired by FIS alpine start area guidance.
 * Only visual scenery: does NOT touch the real 120Hz timing wand or ski physics.
 * No official sponsor artwork or real FIS-homologation claims.
 */
import * as pc from "playcanvas";
import type {Course,Quality} from "../game/types";
import {terrainHeight} from "../game/course";
import {material,shape,meshEntity,beam} from "./geometry";
import {ALPINE_START_GATE} from "../game/start-gate";
import {waitingAthletePose,startStaffPose} from "./worldcup-start-motion";

export const START_HOUSE_DIMENSIONS=Object.freeze({
  halfWidth:5.65,backZ:-16.4,frontZ:5.2,eaveHeight:3.74,ridgeHeight:5.32,
});
interface Staff {
  head:pc.GraphNode|null; leftArm:pc.GraphNode|null;
  rightArm:pc.GraphNode|null; phase:number; role:"racer"|"coach"|"referee"|"camera";
  joints?:Record<string,pc.GraphNode|null>;
  pelvisRest?:pc.Vec3;
}
interface Board {canvas:HTMLCanvasElement;texture:pc.Texture}
export class WorldCupStartCompound {
  readonly root=new pc.Entity("WORLD CUP TV start arena, 11.3m x 21.6m");
  readonly materials:pc.StandardMaterial[]=[];
  readonly textures:pc.Texture[]=[];
  readonly wand:pc.Entity;
  readonly extras:Staff[]=[];
  readonly boards:Board[]=[];
  private anim=0;
  private lastClock="";
  readonly stats={widthM:11.3,depthM:21.6,waitingRacers:0,
    coaches:0,officials:0,liveClocks:0,animatedRacers:0,
    animatedCoaches:0,waitingBeat:"wait",coachCue:"observe"};
  constructor(
    readonly app:pc.Application,parent:pc.Entity,
    readonly course:Course,readonly quality:Quality,
    readonly racerAsset:pc.Asset|null,
  ){
    parent.addChild(this.root);
    this.structure();
    this.furniture();
    this.production();
    this.people();
    this.wand=this.makeWand();
  }
  private h(x:number,z:number){return terrainHeight(x,z,this.course);}
  private mat(name:string,hex:string,metal=0,gloss=.3){
    const m=material(name,hex,metal,gloss);this.materials.push(m);return m;
  }
  private box(name:string,x:number,y:number,z:number,
    w:number,h:number,d:number,mat:pc.Material,parent=this.root){
    return shape(parent,"box",name,[x,y,z],[w,h,d],mat);
  }
  private rod(name:string,a:pc.Vec3,b:pc.Vec3,r:number,mat:pc.Material){
    return beam(this.root,a,b,r,mat,name);
  }
  private panel(name:string,text:string,bg:string){
    const canvas=document.createElement("canvas");
    canvas.width=1024;canvas.height=256;
    const ctx=canvas.getContext("2d")!;
    ctx.fillStyle=bg;ctx.fillRect(0,0,1024,256);
    ctx.textAlign="center";ctx.textBaseline="middle";
    const lightBackground=bg==="#ecf3f6";
    ctx.fillStyle=lightBackground?"#226180":"#86cbe4";
    ctx.font="bold 33px Arial";
    ctx.fillText("ALPINE SKI PRO  •  CORTINA SUPER-G",512,55);
    ctx.fillStyle="#ef674c";ctx.fillRect(80,91,864,7);
    ctx.fillStyle=lightBackground?"#11334d":"#f8fbfd";
    ctx.font="bold 80px Arial";
    ctx.fillText(text,512,171);
    const texture=new pc.Texture(this.app.graphicsDevice,{name,mipmaps:true});
    texture.setSource(canvas);this.textures.push(texture);
    const m=this.mat(name,"#ffffff",0,.34);
    m.diffuseMap=texture;m.emissiveMap=texture;
    m.emissive.set(.08,.10,.13);m.cull=pc.CULLFACE_NONE;m.update();
    return {m,canvas,texture};
  }
  private structure(){
    const w=START_HOUSE_DIMENSIONS.halfWidth;
    const a=START_HOUSE_DIMENSIONS.backZ,b=START_HOUSE_DIMENSIONS.frontZ;
    const larch=this.mat("World Cup real larch cladding","#98775b");
    // Authored timber albedo: grain and warm rough-hewn wood.
    const woodCanvas=document.createElement("canvas");
    woodCanvas.width=woodCanvas.height=256;
    const wc=woodCanvas.getContext("2d")!;
    wc.fillStyle="#927657";wc.fillRect(0,0,256,256);
    for(let x=0;x<256;x+=32){
      wc.fillStyle=x%64===0?"#957657":"#a88b69";
      wc.fillRect(x+2,0,29,256);
      wc.fillStyle="#40372d";wc.fillRect(x,0,2,256);
      for(let j=0;j<22;j++){
        const xx=x+4+(j*17)%25, yy=(j*43+x*3)%256;
        wc.fillStyle=j%4===0?"rgba(24,20,14,.22)":"rgba(234,219,191,.22)";
        wc.fillRect(xx,yy,1,10+j%6*4);
      }
    }
    const woodMap=new pc.Texture(this.app.graphicsDevice,{
      name:"Authored World Cup solid larch boardgrain",mipmaps:true,
    });
    woodMap.setSource(woodCanvas);
    woodMap.addressU=woodMap.addressV=pc.ADDRESS_REPEAT;
    this.textures.push(woodMap);
    larch.diffuseMap=woodMap;larch.cull=pc.CULLFACE_NONE;larch.update();
    const trim=this.mat("Warm oak joinery","#b18e6c");
    const frame=this.mat("Steel start-house gantry","#495b69",.65,.53);
    const roof=this.mat("Standing seam cold metal roof","#8a9ba8",.5,.35);
    roof.cull=pc.CULLFACE_NONE;roof.update();
    const glazing=this.mat("Translucent glass wind shelter","#a2c7ce",.25,.66);
    glazing.opacity=.29;glazing.blendType=pc.BLEND_NORMAL;
    glazing.depthWrite=false;glazing.cull=pc.CULLFACE_NONE;glazing.update();
    const snow=this.mat("Roof snow accumulation","#ecf3f7");
    // Open, two-sided covered athlete staging zone, no obstacle inside
    // the player's -1.3..+1.3 m race corridor.
    for(const side of [-1,1]){
      const x=side*w;
      for(let z=a;z<b;z+=2.7){
        const end=Math.min(z+2.7,b),center=(z+end)*.5;
        this.box("Heavy real start house steel structural posts",
          x,this.h(x,z)+1.85,z,.22,3.7,.28,frame);
        this.box("Lower wide timber windproof wall",
          x,this.h(x,center)+.60,center,.16,1.2,end-z,larch);
        this.box("Alpine cabin horizontal window sill",
          x,this.h(x,center)+1.21,center,.22,.11,end-z,trim);
        this.box("Transparent cabin viewing windows",
          x,this.h(x,center)+2.20,center,.08,1.91,end-z-.07,glazing);
        this.box("Upper steel window line",
          x,this.h(x,center)+3.19,center,.16,.075,end-z,frame);
        for(const height of [1.55,2.45])
          this.box("Glazing framing bars",x+side*.085,
            this.h(x,center)+height,center,.046,.044,end-z,trim);
      }
      // External slab and glass-side infrastructure excludes center track.
      for(let z=a+1.5;z<0;z+=3.2){
        const rubber=this.mat("Non-slip staff preparation mat","#2c3439");
        this.box("Personnel preparation platform",
          side*3.65,this.h(side*3.65,z)+.02,z,3.6,.044,3,rubber);
      }
      this.box("Left/right start facade service pillar",
        side*4.25,this.h(side*4.25,b)+1.74,b,
        .35,3.48,.32,frame);
      this.box("Protected start corridor foam protection",
        side*1.42,this.h(side*1.42,b)+.65,b,
        .22,1.3,.3,larch);
    }
    // Rear service wall with open athlete entrance in the middle.
    for(const side of [-1,1])
      this.box("Rear start house solid shelter wall",
        side*3.6,this.h(side*3.6,a)+1.7,a,
        3.95,3.4,.18,larch);
    this.box("Back staging door lintel",0,this.h(0,a)+3.25,a,
      3,.34,.25,frame);

    // Real pitched broad roof as one continuous triangulated surface.
    const p:number[]=[],uv:number[]=[],indices:number[]=[];
    for(let j=0;j<=16;j++){
      const z=a-.7+(b-a+1.5)*j/16;
      for(const x of [-w-.56,0,w+.56]){
        const y=this.h(0,z)+
          (x===0?START_HOUSE_DIMENSIONS.ridgeHeight:
            START_HOUSE_DIMENSIONS.eaveHeight);
        p.push(x,y,z);uv.push((x+w+.56)/2,j*.52);
      }
      if(j)for(let k=0;k<2;k++){
        const prev=(j-1)*3+k,next=j*3+k;
        // Z cross X = positive Y, so roof faces sunlight.
        indices.push(prev,next,prev+1,prev+1,next,next+1);
      }
    }
    meshEntity(this.app.graphicsDevice,this.root,
      "Wide timber / standing seam double pitched roof",p,indices,roof,
      undefined,uv).render!.castShadows=this.quality!=="low";
    for(let z=a-.6;z<=b+.7;z+=1.18)for(const side of [-1,1]){
      const xx=side*(w+.54);
      this.rod("Milled metallic roof seam",
        new pc.Vec3(0,this.h(0,z)+5.35,z),
        new pc.Vec3(xx,this.h(0,z)+3.77,z),.014,frame);
    }
    for(const side of [-1,1]){
      const xx=side*(w+.55);
      this.rod("Snow-filled roof eaves",
        new pc.Vec3(xx,this.h(0,a)+3.74,a),
        new pc.Vec3(xx,this.h(0,b)+3.74,b),.072,snow);
    }
    const badge=this.panel("Start TV facade original banner",
      "WORLD CUP  /  START","#173448");
    this.box("Large broadcast visible 3D front house sign",
      0,this.h(0,b)+3.33,b+.18,
      8.5,.62,.15,badge.m);
    // Continuous sloped ridge tie, not a level beam sticking through roof.
    for(let z=a;z<b-2.5;z+=2.5){
      const zz=z+2.5;
      this.rod("Slope-conforming interior roof ridge tie",
        new pc.Vec3(0,this.h(0,z)+5.03,z),
        new pc.Vec3(0,this.h(0,zz)+5.03,zz),.09,trim);
    }
    const holding=this.panel("Athlete holding-area wall banner",
      "ATHLETES  /  HOLDING AREA","#183d58");
    this.box("Waiting lineup large wall display",
      -3.55,this.h(-3.55,a)+2.18,a+.17,3.8,.76,.05,holding.m);
    const next=this.panel("Skier order display",
      "BIBS  41  ·  52  ·  63","#12394f");
    this.box("Rear service wall timed athlete roster",
      3.5,this.h(3.5,a)+2.18,a+.17,3.8,.76,.05,next.m);
    // The provided television reference uses a DARK-BLUE windproof staging
    // interior. The structural wood/metal cabin survives outside: these
    // fabric liners form the competition-specific indoor camera background.
    const fabric=this.mat("Original navy technical canvas tent lining","#122655",0,.14);
    const stitch=this.mat("Weather-sealed fabric blue piping","#3f628d",0,.22);
    for(const side of [-1,1]){
      const x=side*(w-.19);
      for(const [z,d] of [[-12.9,6.0],[-6.4,5.6]] as const){
        this.box("Blue windbreak fabric backdrop, television holding bay",
          x,this.h(x,z)+2.03,z,.045,2.90,d,fabric);
        this.box("Vertical stitched canvas tensioning strip",
          x-side*.04,this.h(x,z)+1.98,z-d*.5,.07,3.0,.055,stitch);
      }
      this.box("Insulated navy fabric back wall near athlete entry",
        side*3.7,this.h(side*3.7,a)+1.85,a+.12,
        3.5,2.8,.044,fabric);
    }
    const logo=this.panel("Original graphic panel for TV holding lane",
      "CORTINA   /   START","#112552");
    this.box("Navy blue wall competition graphic no licensed branding",
      -3.20,this.h(-3.20,-10.2)+2.38,-10.2,
      3.4,.60,.09,logo.m);
  }
  private furniture(){
    const wood=this.mat("Alpine maintenance benches","#b6a082");
    const black=this.mat("Technical desk dark steel","#24303b",.47);
    const rubber=this.mat("Rubber weatherproof surfaces","#273239");
    const white=this.mat("Timing paperwork white","#e3edf1");
    const blue=this.mat("LCD timing service monitors","#3993b6",.2,.78);
    const warm=this.mat("Ceiling strip preparation LED","#e9f7ee");
    warm.emissive.set(.3,.6,.7);warm.update();
    for(const side of [-1,1]){
      for(const z of [-13.4,-8.7,-3.7]){
        const x=side*3.6,y=this.h(x,z);
        this.box("Athletes in queue ski boot bench",
          x,y+.47,z,2.8,.22,.75,wood);
        for(const dx of [-1.20,1.20])
          this.box("Metal bench foot",x+dx,y+.24,z,
            .08,.45,.08,black);
      }
      const sx=side*5.0,sz=-11.3,sy=this.h(sx,sz);
      for(let k=0;k<4;k++){
        const z=sz-1.10+k*.68;
        const ski=this.box("Waiting Super-G spare race ski / rack",
          sx,sy+1.14,z,.07,2.18,.12,
          k%2?blue:black);
        ski.setEulerAngles(0,0,side*(5+k*2));
      }
      for(const z of [-14,-9,-4])
        this.box("Overhead preparation area ceiling LED",
          side*1.85,this.h(0,z)+4.72,z,2.0,.09,.13,warm);
    }
    const x=-3.43,z=1.18,y=this.h(x,z);
    this.box("Officials start control steel timing desk",
      x,y+.81,z,2.55,.12,1.42,black);
    for(const dx of [-1.11,1.11])
      this.box("Timing desk metal leg",x+dx,y+.4,z,.1,.8,.1,black);
    for(const xx of [-3.92,-2.99]){
      this.box("Electronic timing console monitor frame",
        xx,y+1.34,z-.30,.77,.53,.07,black);
      this.box("Electronic timing console monitor active display",
        xx,y+1.35,z-.245,.68,.42,.018,blue);
    }
    this.box("Starter checklist clipboard",
      x-.55,y+.905,z+.42,.44,.027,.50,white);
    this.box("Radio / timing redundancy unit",
      x+.62,y+.98,z+.4,.35,.25,.27,rubber);
    this.box("Start official radio antenna",
      x+.62,y+1.25,z+.42,.02,.32,.02,black);
    const sign=this.panel("Indoor athlete queue signage",
      "NEXT  /  BIB 27","#163b55");
    this.box("Waiting corridor NEXT label",
      3.6,this.h(3.6,-5.4)+2.7,-5.4,
      2.85,.65,.07,sign.m);
  }
  private production(){
    const dark=this.mat("Start clock professional LED monitor black",
      "#131c25",.23,.18);
    const steel=this.mat("Broadcast tripod anodized alloy",
      "#697c85",.65,.52);
    const lens=this.mat("Cinema camera glass optics","#0f242f",.52,.92);
    for(const [name,x,w,h,z] of [
      ["Main FIS-inspired A+B start clock",-3.45,2.8,1.14,4.85],
      ["Backup live timing clock",3.45,2.14,.83,4.85],
    ] as const){
      const y=this.h(x,z)+2.04;
      this.box(name+" structural case",x,y,z,w+.14,h+.12,.13,dark);
      const board=this.panel(name+" canvas","T - 3","#071e2c");
      this.box(name+" live LCD surface",x,y,z+.086,
        w,h,.016,board.m).render!.castShadows=false;
      this.boards.push({canvas:board.canvas,texture:board.texture});
    }
    this.stats.liveClocks=this.boards.length;
    // Two broadcast cameras outside the launch corridor, for staging.
    for(const [x,z] of [[-8.1,8.4],[8.1,11.1]]){
      const y=this.h(x,z);
      this.box("World Cup TV broadcast tripod",
        x,y+1.02,z,.11,1.87,.11,steel);
      for(let i=0;i<3;i++){
        const ang=i*Math.PI*2/3;
        this.rod("Stable aluminium tripod leg",
          new pc.Vec3(x,y+1.48,z),
          new pc.Vec3(x+.65*Math.cos(ang),y+.05,
            z+.65*Math.sin(ang)),.03,steel);
      }
      this.box("Live 4K ENG camera with viewfinder",
        x,y+1.98,z,.51,.30,.57,dark);
      this.box("Dark professional TV zoom lens",
        x,y+1.97,z+.4,.20,.18,.37,lens);
      this.box("Red live camera tally",
        x,y+2.20,z,.09,.075,.08,this.mat(
          "Broadcast recording tally red","#ed4d34"));
    }
    for(const side of [-1,1]){
      const x=side*7.1,z=7.0,gy=this.h(x,z);
      for(const zz of [z-1.9,z,z+1.9])
        this.box("Competition safe boundary posts",x,
          this.h(x,zz)+.62,zz,.10,1.24,.10,steel);
      for(const height of [.49,1.07])
        this.rod("Official crowd / camera separation rail",
          new pc.Vec3(x,gy+height,z-1.9),
          new pc.Vec3(x,this.h(x,z+1.9)+height,z+1.9),.035,steel);
    }
  }
  private people(){
    const racers=[
      {x:-1.65,z:-9.9,num:41,yaw:18},
      {x:1.55,z:-12.0,num:52,yaw:-17},
      {x:-1.4,z:-14.4,num:63,yaw:12},
    ];
    const count=this.quality==="low"?2:this.quality==="medium"?2:3;
    for(let i=0;i<count;i++){
      const r=racers[i];this.racer(r.x,r.z,r.num,r.yaw,i);
    }
    const jobs=[
      {x:-3.8,z:1.1,role:"referee" as const,p:0},
      {x:3.72,z:-7.0,role:"coach" as const,p:1},
      {x:-3.5,z:-13.0,role:"coach" as const,p:2},
      {x:6.30,z:8.8,role:"camera" as const,p:3},
    ];
    for(const s of jobs.slice(0,this.quality==="low"?2:this.quality==="medium"?3:4))
      this.crew(s.x,s.z,s.role,s.p);
  }
  private racer(x:number,z:number,num:number,yaw:number,phase:number){
    if(!this.racerAsset){
      this.crew(x,z,"coach",phase);
      this.stats.waitingRacers++;return;
    }
    const parent=new pc.Entity("Waiting athlete number "+num+
      " original 25-joint skinned human");
    parent.setPosition(x,this.h(x,z),z);
    parent.setEulerAngles(0,yaw,0);this.root.addChild(parent);
    const rig=(this.racerAsset.resource as pc.ContainerResource)
      .instantiateRenderEntity();
    parent.addChild(rig);
    if(rig.findByName("LeftUpLeg"))rig.setLocalEulerAngles(0,180,0);
    for(const renderer of rig.findComponents("render"))
      (renderer as pc.RenderComponent).castShadows=false;
    const chest=rig.findByName("Chest") as pc.Entity|null;
    if(chest){
      const sign=this.panel("White bib of waiting racer "+num,
        "BIB "+num,"#ecf3f6");
      // Actual cloth follows the same chest bone as the athlete.
      const cloth=this.box("Reserve competitor numbered bib "+num,
        0,-.07,-.214,.43,.48,.016,sign.m,chest);
      cloth.render!.castShadows=false;
    }
    const joints:Record<string,pc.GraphNode|null>={};
    // These names are the actual bone names in seamless-mobile/full GLB.
    // The classic fallback is still tolerated for older devices.
    for(const name of ["Hips","Pelvis","Spine","Chest","Neck","Head",
      "LeftUpLeg","RightUpLeg","LeftLeg","RightLeg",
      "LeftAnkle","RightAnkle","LeftShoulder","RightShoulder",
      "LeftUpperArm","RightUpperArm","LeftForeArm","RightForeArm",
      "LeftHand","RightHand"]){
      joints[name]=rig.findByName(name);
    }
    const pelvis=joints.Hips??joints.Pelvis;
    this.extras.push({head:joints.Head??null,
      leftArm:joints.LeftUpperArm??joints.LeftShoulder??null,
      rightArm:joints.RightUpperArm??joints.RightShoulder??null,
      pelvisRest:pelvis?.getLocalPosition().clone(),joints,phase,role:"racer"});
    this.stats.waitingRacers++;
  }
  private crew(x:number,z:number,role:"coach"|"referee"|"camera",phase:number){
    const root=new pc.Entity("Live paddock "+role+" staff member");
    root.setPosition(x,this.h(x,z),z);root.setLocalEulerAngles(0,20,0);
    this.root.addChild(root);
    const coat=this.mat(role+" snow technical puffer coat",
      role==="coach"?"#c5404c":
        role==="referee"?"#37617d":"#d68536");
    const pants=this.mat("Snow-insulated dark crew trousers","#22303a");
    const face=this.mat("Crew lifelike warm facial skin","#ad866e");
    const cap=this.mat("Thermal staff headwear","#293f4e");
    const glove=this.mat("Insulated official glove","#1e2b32");
    const boot=this.mat("Alpine insulated staff boot","#343d42",.10);
    const hips:pc.Entity[]=[],knees:pc.Entity[]=[];
    // Real pivot hierarchy rather than rotating static trouser cylinders:
    // Hips -> knee -> shin + boot, with two independent weight-bearing legs.
    for(const side of [-1,1]){
      const hip=new pc.Entity(side<0?"Crew left hip":"Crew right hip");
      hip.setLocalPosition(side*.14,.83,0);root.addChild(hip);
      shape(hip,"capsule","Upper trouser articulated thigh",
        [0,-.20,0],[.20,.46,.21],pants);
      const knee=new pc.Entity(side<0?"Crew left knee":"Crew right knee");
      knee.setLocalPosition(0,-.41,0);hip.addChild(knee);
      shape(knee,"capsule","Lower trouser articulated shin",
        [0,-.17,0],[.18,.36,.19],pants);
      shape(knee,"box","Crew planted winter boot",
        [0,-.30,-.07],[.27,.22,.4],boot);
      hips.push(hip);knees.push(knee);
    }
    const torso=new pc.Entity("Staff articulated thorax");
    torso.setLocalPosition(0,.84,0);root.addChild(torso);
    // Tapered technical parka made from 14-sided rings.
    const p:number[]=[],idx:number[]=[],segments=14;
    const rings=[[.82,.24,.16],[1.1,.33,.21],[1.42,.35,.22],
      [1.58,.26,.17]];
    for(const [height,rx,rz] of rings)
      for(let i=0;i<segments;i++){
        const t=i*Math.PI*2/segments;
        p.push(Math.cos(t)*rx,height-.84,Math.sin(t)*rz);
      }
    for(let i=0;i<rings.length-1;i++)
      for(let j=0;j<segments;j++){
        const a=i*segments+j,b=i*segments+(j+1)%segments;
        const c=(i+1)*segments+j,d=(i+1)*segments+(j+1)%segments;
        idx.push(a,c,b,b,c,d);
      }
    meshEntity(this.app.graphicsDevice,torso,
      "Tailored ergonomic winter coat jacket",p,idx,coat);
    // Distinct seams / reflective jacket detailing authored as geometry.
    this.box("Insulated jacket center zipper",0,.34,-.225,
      .018,.54,.014,this.mat("Winter jacket zipper strip","#a6bac6"),torso);
    for(const side of [-1,1])
      this.box("Reflective winter parka arm patch",side*.29,.57,-.18,
        .09,.10,.018,this.mat("Hi vis crew shoulder patch","#dbe5d6"),torso);
    const head=new pc.Entity("Crew human head joint");
    head.setLocalPosition(0,1.63-.84,0);torso.addChild(head);
    shape(head,"sphere","Human face",
      [0,.09,-.025],[.25,.30,.23],face);
    shape(head,"sphere","Thermal wool beanie",
      [0,.255,0],[.29,.15,.26],cap);
    const left=new pc.Entity("Left staff shoulder joint"),
      right=new pc.Entity("Right staff shoulder joint");
    const elbows:pc.Entity[]=[];
    for(const [side,arm]of [[-1,left],[1,right]] as const){
      arm.setLocalPosition(side*.32,1.40-.84,0);torso.addChild(arm);
      shape(arm,"capsule","Upper articulated jacket sleeve",
        [side*.012,-.20,0],[.18,.41,.19],coat);
      const elbow=new pc.Entity(side<0?"Left elbow joint":"Right elbow joint");
      elbow.setLocalPosition(side*.012,-.37,0);arm.addChild(elbow);
      shape(elbow,"capsule","Forearm articulated jacket sleeve",
        [0,-.15,0],[.165,.32,.18],coat);
      shape(elbow,"sphere","Warm fabric mitten glove",
        [0,-.33,0],[.17,.18,.18],glove);
      elbows.push(elbow);
    }
    if(role==="coach"||role==="referee"){
      this.box(role==="coach"?"Coach's race split tablet":
        "Start marshal checks clipboard",-.19,.97-.84,-.29,
        .34,.32,.035,cap,torso);
    }
    this.extras.push({head,leftArm:left,rightArm:right,phase,role,
      joints:{torso,leftElbow:elbows[0],rightElbow:elbows[1],
        leftHip:hips[0],rightHip:hips[1],leftKnee:knees[0],
        rightKnee:knees[1]}});
    if(role==="coach")this.stats.coaches++;
    else this.stats.officials++;
  }
  private makeWand(){
    const g=ALPINE_START_GATE,x=g.postX,z=g.z;
    const y=this.h(x,z)+g.height;
    const metal=this.mat("Single electronic timing wand steel",
      "#8da5b1",.75,.62);
    const rubber=this.mat("Single start gate rubber hinge","#1c292f");
    shape(this.root,"cylinder","Single true start post",
      [x,this.h(x,z)+g.height*.5,z],[.068,g.height,.068],metal);
    const hinge=new pc.Entity("FIS single start wand hinge");
    hinge.setLocalPosition(x,y,z);this.root.addChild(hinge);
    shape(hinge,"cylinder","Weatherproof launch hinge",
      [0,0,0],[.125,.135,.125],rubber);
    shape(hinge,"cylinder","One low athlete-contact timing bar",
      [-g.wandLength*.5,0,0],[.035,g.wandLength,.035],metal)
      .setLocalEulerAngles(0,0,90);
    shape(hinge,"sphere","End rubber ski wand contact stopper",
      [-g.wandLength,0,0],[.065,.045,.045],rubber);
    this.box("Protected electrical contact housing",
      x+.14,y+.08,z,.24,.17,.24,rubber);
    this.rod("Timing cable beneath start gate",
      new pc.Vec3(x+.15,y+.04,z-.1),
      new pc.Vec3(x+.27,this.h(x,z)+.06,z-.5),.015,rubber);
    return hinge;
  }
  update(startPhase:number|undefined,elapsed:number,dt:number){
    const phase=startPhase??-4;
    const clock=phase<0?"T - "+Math.max(0,Math.ceil(-phase)):
      "+ "+Math.max(0,elapsed).toFixed(2);
    const state=phase<0?"START READY":phase<1.5?"GO  /  COURSE":"RACING";
    const id=clock+"|"+state;
    if(id!==this.lastClock){
      this.lastClock=id;
      for(const board of this.boards){
        const ctx=board.canvas.getContext("2d")!;
        ctx.fillStyle="#051b2d";ctx.fillRect(0,0,1024,256);
        ctx.textAlign="center";
        ctx.fillStyle="#86dff3";ctx.font="bold 28px Arial";
        ctx.fillText("ALPINE SKI PRO  /  TIMING SYSTEM A+B",512,37);
        ctx.fillStyle="#ed6745";ctx.fillRect(80,53,864,6);
        ctx.fillStyle=phase<0?"#ffda82":"#f1fcff";
        ctx.font="bold 119px monospace";
        ctx.fillText(clock,512,177);
        ctx.fillStyle="#c3d8e0";ctx.font="bold 25px Arial";
        ctx.fillText(state+"      NEXT BIB: 41",512,225);
        board.texture.upload();
      }
    }
    this.anim+=Math.max(0,Math.min(.07,dt));
    let animatedRacers=0,animatedCoaches=0;
    for(const extra of this.extras){
      const j=extra.joints;
      if(extra.role==="racer" && j){
        const p=waitingAthletePose(this.anim,extra.phase);
        const set=(bone:string,x:number,y=0,z=0)=>
          j[bone]?.setLocalEulerAngles(x,y,z);
        const pelvis=j.Hips??j.Pelvis;
        if(pelvis && extra.pelvisRest)
          pelvis.setLocalPosition(extra.pelvisRest.x,
            extra.pelvisRest.y+p.pelvisY,extra.pelvisRest.z);
        set("Hips",0,0,p.pelvisRoll);set("Pelvis",0,0,p.pelvisRoll);
        set("Spine",p.spinePitch,0,p.spineRoll);
        set("Chest",0,p.chestYaw,0);
        set("Neck",0,p.neckYaw,0);
        set("Head",p.headPitch,p.headYaw,0);
        for(const side of ["Left","Right"] as const){
          const left=side==="Left";
          set(side+"UpLeg",p.hipPitch,0,
            (left?1:-1)*p.pelvisRoll*.23);
          set(side+"Leg",p.kneePitch);
          set(side+"Ankle",p.anklePitch);
          set(side+"Shoulder",
            left?p.leftShoulderPitch*.34:p.rightShoulderPitch*.34);
          set(side+"UpperArm",
            left?p.leftShoulderPitch:p.rightShoulderPitch,
            0,left?p.leftShoulderRoll:p.rightShoulderRoll);
          set(side+"ForeArm",left?p.leftElbow:p.rightElbow);
          set(side+"Hand",left?p.leftWrist:p.rightWrist);
        }
        this.stats.waitingBeat=p.beat;
        animatedRacers++;
      }else{
        const p=startStaffPose(this.anim,extra.phase,
          extra.role==="racer"?"coach":extra.role,phase);
        extra.head?.setLocalEulerAngles(p.headPitch,p.headYaw,0);
        extra.leftArm?.setLocalEulerAngles(p.leftShoulder,0,-9);
        extra.rightArm?.setLocalEulerAngles(p.rightShoulder,0,9);
        j?.torso?.setLocalEulerAngles(p.torsoPitch,0,0);
        j?.leftElbow?.setLocalEulerAngles(p.leftElbow,0,0);
        j?.rightElbow?.setLocalEulerAngles(p.rightElbow,0,0);
        j?.leftHip?.setLocalEulerAngles(p.leftHip,0,0);
        j?.rightHip?.setLocalEulerAngles(p.rightHip,0,0);
        j?.leftKnee?.setLocalEulerAngles(p.leftKnee,0,0);
        j?.rightKnee?.setLocalEulerAngles(p.rightKnee,0,0);
        if(extra.role==="coach"){
          animatedCoaches++;
          this.stats.coachCue=p.cue;
        }
      }
    }
    this.stats.animatedRacers=animatedRacers;
    this.stats.animatedCoaches=animatedCoaches;
  }
}
