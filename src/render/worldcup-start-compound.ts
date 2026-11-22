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
  halfWidth:4.05,backZ:-1.12,frontZ:3.33,eaveHeight:3.18,ridgeHeight:3.26,
});
interface Staff {
  head:pc.GraphNode|null; leftArm:pc.GraphNode|null;
  rightArm:pc.GraphNode|null; phase:number; role:"racer"|"coach"|"referee"|"camera";
  joints?:Record<string,pc.GraphNode|null>;
  pelvisRest?:pc.Vec3;
}
interface Board {canvas:HTMLCanvasElement;texture:pc.Texture}
export class WorldCupStartCompound {
  readonly root=new pc.Entity("Cortina-style compact start-box · 8.10m × 4.45m");
  readonly materials:pc.StandardMaterial[]=[];
  readonly textures:pc.Texture[]=[];
  readonly wand:pc.Entity;
  readonly extras:Staff[]=[];
  readonly boards:Board[]=[];
  private anim=0;
  private lastClock="";
  readonly stats={widthM:8.1,depthM:4.45,waitingRacers:0,
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
    // The owner's reference at ~42 seconds is a SHORT, wide-faced flat-
    // roofed broadcast start box with a dark blue/green vinyl facade and a
    // black central doorway; NOT a 22m-deep alpine wooden chalet.
    const w=START_HOUSE_DIMENSIONS.halfWidth;
    const a=START_HOUSE_DIMENSIONS.backZ;
    const b=START_HOUSE_DIMENSIONS.frontZ;
    const navy=this.mat("Opaque blue competition windproof vinyl","#151b44",0,.12);
    const interior=this.mat("Matte navy start-tent inner wall","#27305b",0,.12);
    interior.emissive.set(.075,.082,.14);
    const olive=this.mat("Taut accent green vinyl","#7da845",0,.18);
    const edge=this.mat("Rubber framed competition entrance","#0c1526",.18,.22);
    const seams=this.mat("Start tent aluminium structural piping","#465061",.52,.28);
    navy.cull=pc.CULLFACE_NONE;navy.update();
    interior.cull=pc.CULLFACE_NONE;interior.update();
    const h=(x:number,z:number)=>this.h(x,z);
    const wall=(name:string,x0:number,x1:number,z0:number,z1:number,
      baseM:pc.Material)=>{
      const p=[
        x0,h(x0,z0)+.02,z0, x1,h(x1,z1)+.02,z1,
        x0,h(x0,z0)+3.16,z0, x1,h(x1,z1)+3.16,z1,
      ];
      const e=meshEntity(this.app.graphicsDevice,this.root,name,p,
        [0,2,1,1,2,3],baseM,undefined,[0,0,1,0,0,1,1,1]);
      e.render!.castShadows=this.quality!=="low";
      return e;
    };
    // Two fabric sidewalls: no windows, benches or open metal rafters.
    for(const side of [-1,1]){
      wall("Opaque navy enclosed competition-sidewall "+side,
        side*w,side*w,a,b,interior);
      for(const z of [a,b]){
        this.rod("Narrow start tent outer corner pipe",
          new pc.Vec3(side*w,h(side*w,z)+.03,z),
          new pc.Vec3(side*w,h(side*w,z)+3.19,z),.036,seams);
      }
      this.rod("Flat roof green perimeter side rim",
        new pc.Vec3(side*w,h(0,a)+3.20,a),
        new pc.Vec3(side*w,h(0,b)+3.20,b),.056,olive);
    }
    wall("Solid compact start cabin rear wind curtain",-w,w,a,a,interior);
    // Front facade is a large original navy+lime graphic with just one
    // narrow opening at x +/- 1.13m. Athlete starts at z=3, contact z=4.05.
    const openingHalf=1.13;
    for(const side of [-1,1]){
      const left=side<0?-w:openingHalf;
      const right=side<0?-openingHalf:w;
      const xc=(left+right)*.5,wd=right-left;
      const art=document.createElement("canvas");
      art.width=512;art.height=512;
      const ctx=art.getContext("2d")!;
      const grad=ctx.createLinearGradient(0,0,512,500);
      grad.addColorStop(0,"#11163a");grad.addColorStop(.7,"#273463");
      grad.addColorStop(1,"#101637");
      ctx.fillStyle=grad;ctx.fillRect(0,0,512,512);
      // Non-Olympic abstract curved wind-ribbon art, original to the game.
      ctx.strokeStyle="#7ba646";ctx.lineWidth=80;
      ctx.beginPath();
      ctx.moveTo(side<0?470:-100,-70);
      ctx.bezierCurveTo(170,160,365,285,side<0?40:545,590);
      ctx.stroke();
      ctx.strokeStyle="#4c709a";ctx.lineWidth=18;ctx.beginPath();
      ctx.moveTo(side<0?490:-80,-25);
      ctx.bezierCurveTo(100,100,340,340,side<0?40:545,560);
      ctx.stroke();
      ctx.strokeStyle="rgba(228,240,245,.55)";
      ctx.lineWidth=6;ctx.beginPath();
      ctx.moveTo(side<0?430:80,0);
      ctx.bezierCurveTo(160,125,410,155,side<0?10:500,515);
      ctx.stroke();
      const tex=new pc.Texture(this.app.graphicsDevice,{
        name:"Original dark navy start facade fabric "+side,mipmaps:true});
      tex.setSource(art);this.textures.push(tex);
      const decal=this.mat("Original vinyl entrance curved motif "+side,
        "#ffffff",0,.15);
      decal.diffuseMap=tex;
      decal.cull=pc.CULLFACE_NONE;decal.update();
      this.box("Single front vinyl competition facade panel "+side,
        xc,h(xc,b)+1.59,b,wd,3.18,.13,decal);
    }
    // Deep-black open doorway, not a huge overhead gantry. Crossbar stays
    // high enough for the 25-bone athlete and the camera.
    for(const side of [-1,1]){
      this.box("Black vinyl doorway vertical jamb",
        side*openingHalf,h(side*openingHalf,b)+1.55,b+.08,
        .12,3.10,.24,edge);
    }
    this.box("Black entrance lintel, narrow and flush",
      0,h(0,b)+3.01,b+.08,2.26,.28,.24,edge);
    this.box("Matte dark interior lip of competition doorway",
      0,h(0,b)+3.17,b+.02,2.32,.065,.17,interior);
    // Roof is a shallow virtually FLAT technical cap; no snow-laden gable,
    // steep roof pitch, skylights or entire mountain lodge.
    const verts=[
      -w,h(0,a)+3.22,a, w,h(0,a)+3.22,a,
      -w,h(0,b)+3.22,b, w,h(0,b)+3.22,b,
    ];
    const roof=meshEntity(this.app.graphicsDevice,this.root,
      "Single low flat navy roof of start booth",verts,
      [0,1,2,2,1,3],navy,undefined,[0,0,1,0,0,1,1,1]);
    roof.render!.castShadows=this.quality!=="low";
    this.box("Visible lime-green flat roof fascia",
      0,h(0,b)+3.25,b+.05,w*2+.12,.14,.16,olive);
    // Lightweight compact stage sign; no oversized cross-course START beam.
    const plaque=this.panel("Small original Alpine Ski Pro logo",
      "ALPINE SKI PRO","#14254e");
    this.box("Small understated start tent event plaque",
      2.37,h(2.37,b)+2.71,b+.091,1.92,.35,.022,plaque.m);
    // The indoor tent needs a gentle cool fill: the previous capture had
    // athletes against entirely black walls despite the open doorway.
    const fill=new pc.Entity("Subtle cool interior athlete fill");
    fill.addComponent("light",{
      type:"omni",color:new pc.Color(.78,.85,1),intensity:.58,
      range:5.2,castShadows:false,
    });
    fill.setPosition(0,h(0,1.1)+2.58,1.1);
    this.root.addChild(fill);
    // The snow remains the real existing track geometry: NO duplicate floor.
  }

  private furniture(){
    const graphite=this.mat("Competition-start service graphite","#232c39",.22,.31);
    const rubber=this.mat("Weather-resistant grip mat","#222838");
    const blue=this.mat("Compact digital timing laptop","#285f88",.18,.52);
    // One *small* timing station off the left side of the athlete's passage.
    const x=-2.85,z=1.32,y=this.h(x,z);
    this.box("Small timing official standing console",
      x,y+1.00,z,1.04,.075,.61,graphite);
    for(const dx of [-.42,.42]){
      this.box("Slim timing worktop support",x+dx,y+.48,z,.042,.93,.045,graphite);
    }
    this.box("Official live splits monitor",x,y+1.28,z-.14,
      .53,.37,.048,blue);
    const matX=1.85,matZ=.38;
    this.box("One folded weatherproof athlete waiting mat",
      matX,this.h(matX,matZ)+.026,matZ,1.10,.043,.8,rubber);
    // Small accessory rack against the back wall, not rows of ten benches.
    const shelf=this.mat("Competition spare pole storage","#495469",.35,.28);
    const rx=-3.30,rz=-.52,ry=this.h(rx,rz);
    for(const z0 of [rz-.30,rz+.30])
      this.rod("Wall-mounted spare pole rack",
        new pc.Vec3(rx-.28,ry+.79,z0),
        new pc.Vec3(rx+.28,ry+.79,z0),.025,shelf);
  }

  private production(){
    const b=START_HOUSE_DIMENSIONS.frontZ;
    const black=this.mat("Official dark timing box frame","#131b29",.24,.36);
    const silver=this.mat("ENG camera technical aluminium","#606e73",.63,.43);
    const glass=this.mat("Professional dark camera lens","#121f29",.38,.79);
    // Screens are SIDE-MOUNTED and genuinely live; not over the door.
    for(const [name,x,z,width] of [
      ["Live display left side of the start", -3.12,3.45,1.00],
      ["Back-up official countdown panel", 2.62,3.45,.96],
    ] as const){
      const y=this.h(x,z)+1.85;
      this.box(name+" protective case",x,y,z,width+.08,.57,.075,black);
      const board=this.panel(name+" texture","T - 3","#071e2c");
      this.box(name+" compact LED",x,y,z+.05,width,.50,.012,board.m);
      this.boards.push({canvas:board.canvas,texture:board.texture});
    }
    this.stats.liveClocks=this.boards.length;
    // Original broadcast reference has one prominent camera perched above
    // the roof, a few people and barriers -- not several metal towers.
    const x=.52,z=0.25,top=this.h(0,z)+3.23;
    this.box("Roof-mounted television camera support",
      x,top+.13,z,.28,.26,.26,silver);
    for(const side of [-1,1])
      this.rod("Roof camera tripod brace",
        new pc.Vec3(x,top+.29,z),
        new pc.Vec3(x+side*.40,top+.035,z+.24),.026,silver);
    this.box("Compact remote television camera housing",
      x,top+.48,z,.43,.28,.48,black);
    this.box("Roof camera front glass optics",
      x,top+.48,z+.34,.20,.17,.23,glass);
    // Short red protective panels flank but do not cross the skier's lane.
    const red=this.mat("Safety barrier red technical webbing","#ae3340",0,.19);
    for(const side of [-1,1]){
      const bx=side*4.55;
      this.box("Compact red start barrier screen",
        bx,this.h(bx,b+1.1)+.50,b+1.1,.038,.95,2.2,red);
      for(const dz of [0,2.2]){
        this.box("Low outside barrier pole",
          bx,this.h(bx,b+dz)+.62,b+dz,.07,1.24,.07,silver);
      }
    }
  }

  private people(){
    // TV reference: principal racer fills the doorway; another competitor
    // warms up BEHIND, surrounded by close staff. There is NO 14m queue.
    this.racer(.48,-.02,41,12,0);
    const jobs=[
      {x:2.25,z:1.42,role:"coach" as const,p:1},
      {x:-2.22,z:.54,role:"coach" as const,p:2},
      {x:-2.82,z:2.20,role:"referee" as const,p:0},
      {x:4.65,z:4.36,role:"camera" as const,p:3},
    ];
    const count=this.quality==="low"?3:4;
    for(const s of jobs.slice(0,count))this.crew(s.x,s.z,s.role,s.p);
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
    root.setPosition(x,this.h(x,z),z);
    // Crew faces the racer and the TV camera, not the tent back wall.
    const facing=role==="coach"?(x>0?105:-105):
      role==="referee"?-105:28;
    root.setLocalEulerAngles(0,facing,0);
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
    // Volume and material breakup on visible close-up: insulated collar,
    // stitched baffling, tapered side pockets and weatherproof zipper.
    const darker=this.mat("Tonal panel seam on winter jacket",
      role==="coach"?"#a73540":"#263d4e",0,.18);
    const reflective=this.mat("Silver jacket reflective tape","#aec6ce",.12,.27);
    for(const y of [.13,.30,.47]){
      this.box("Padded winter parka stitched baffle",0,y,-.209,
        .43,.023,.018,darker,torso);
    }
    for(const side of [-1,1]){
      this.box("Coat side zipper pocket",side*.21,.16,-.15,
        .075,.17,.024,darker,torso);
      this.box("Reflective curved jacket chest emblem stripe",
        side*.19,.50,-.169,.17,.023,.02,reflective,torso);
    }
    shape(torso,"cylinder","Insulated neck gaiter collar",
      [0,.75,0],[.23,.16,.23],cap);
    const head=new pc.Entity("Crew human head joint");
    head.setLocalPosition(0,1.63-.84,0);torso.addChild(head);
    shape(head,"sphere","Human face",
      [0,.09,-.025],[.25,.30,.23],face);
    shape(head,"sphere","Thermal wool beanie",
      [0,.255,0],[.29,.15,.26],cap);
    const glasses=this.mat("Dark UV race-side snow sunglasses","#14262e",.24,.64);
    const glassesFrame=this.mat("Protective eyewear bridge","#354e58",.3,.52);
    const nose=this.mat("Natural nose skin shading","#936d55");
    for(const side of [-1,1]){
      shape(head,"sphere","Winter crew protective sunglass lens",
        [side*.085,.12,-.139],[.125,.087,.028],glasses);
      shape(head,"sphere","Small insulated ear covering",
        [side*.125,.13,.0],[.073,.11,.12],cap);
    }
    this.box("Small sunglasses bridge",0,.12,-.15,.048,.022,.036,glassesFrame,head);
    shape(head,"sphere","Crew face nose profile",
      [0,.055,-.153],[.075,.085,.070],nose);
    shape(head,"capsule","Fitted wool beanie rim",
      [0,.231,-.034],[.27,.056,.23],cap);
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
      // Equipment moves with the hand/elbow, never floats in torso space.
      const prop=this.mat("Protective radio tablet graphite","#1c2733",.42,.40);
      this.box(role==="coach"?"Coach's handheld radio / splits":
        "Timing official's handheld tablet",-.012,-.27,-.17,
        .16,.23,.048,prop,elbows[0]);
      this.box("Official equipment display strip",-.012,-.27,-.198,
        .12,.12,.008,reflective,elbows[0]);
      if(role==="coach")
        this.box("Short handheld UHF antenna",.04,-.11,-.17,
          .016,.17,.016,prop,elbows[0]);
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
        extra.rightArm?.setLocalEulerAngles(p.rightShoulder,0,9+p.rightArmRaise);
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
