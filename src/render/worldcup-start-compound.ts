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
import {staffTVClip,type HumanTVClip,type StaffTVRole} from "./start-human-actors";

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
interface RiggedTVStaff {
  rig:pc.Entity; role:StaffTVRole; phase:number;
  active:HumanTVClip; available:Set<string>;
}
export class WorldCupStartCompound {
  readonly root=new pc.Entity("Cortina-style compact start-box · 8.10m × 4.45m");
  readonly materials:pc.StandardMaterial[]=[];
  readonly textures:pc.Texture[]=[];
  readonly wand:pc.Entity;
  readonly extras:Staff[]=[];
  readonly boards:Board[]=[];
  readonly realStaff:RiggedTVStaff[]=[];
  readonly staticSkierModels:pc.Entity[]=[];
  private anim=0;
  private lastClock="";
  readonly stats={widthM:8.1,depthM:4.45,waitingRacers:0,
    coaches:0,officials:0,liveClocks:0,animatedRacers:0,
    animatedCoaches:0,waitingBeat:"wait",coachCue:"observe",
    realCoaches:0,realOfficials:0,staticSkierModels:0,
    staffMocapClips:0,coachClip:"Idle"};
  constructor(
    readonly app:pc.Application,parent:pc.Entity,
    readonly course:Course,readonly quality:Quality,
    readonly racerAsset:pc.Asset|null,
    readonly coachHumanAsset:pc.Asset|null=null,
    readonly userSkierAsset:pc.Asset|null=null,
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
    // Athlete with true skinning continues to warm up in the compact booth.
    // AssetSmith owner's STATIC skiing pose adds authentic ski equipment,
    // but cannot be bent or retargeted (no nodes, skin or animation in source).
    this.racer(.48,-.17,41,12,0);
    this.userSuppliedSkier(-1.25,-.56);
    const jobs=[
      {x:2.25,z:1.42,role:"coach" as const,p:1},
      {x:-2.22,z:.54,role:"coach" as const,p:2},
      {x:-2.82,z:2.20,role:"referee" as const,p:0},
      {x:4.65,z:4.36,role:"camera" as const,p:3},
    ];
    const count=this.quality==="low"?3:4;
    for(const job of jobs.slice(0,count)){
      if(!this.humanStaff(job.x,job.z,job.role,job.p))
        this.crew(job.x,job.z,job.role,job.p);
    }
  }

  /** The actual owner-supplied AssetSmith statue is a phototextured,
   * UNSKINNED GLB. Do not invent a skeleton or promise human bending.
   * The separate existing 25-bone queue skier does the moving warm-up. */
  private userSuppliedSkier(x:number,z:number){
    if(!this.userSkierAsset)return;
    const parent=new pc.Entity("OWNER AssetSmith static human skier (no skeleton)");
    parent.setPosition(x,this.h(x,z),z);
    parent.setLocalEulerAngles(0,22,0);
    this.root.addChild(parent);
    const model=(this.userSkierAsset.resource as pc.ContainerResource)
      .instantiateRenderEntity();
    parent.addChild(model);
    for(const c of model.findComponents("render"))
      (c as pc.RenderComponent).castShadows=this.quality!=="low";
    this.staticSkierModels.push(parent);
    this.stats.staticSkierModels++;
    this.stats.waitingRacers++;
  }

  /** Native 80-bone Rocketbox human and authentic motion capture. Swapping
   * wardrobe nodes avoids rendering the 4 overlapping outfits packaged in
   * Ethan's GLB. Face, hair and skin are the actual model, never primitives. */
  private humanStaff(
    x:number,z:number,role:StaffTVRole,phase:number,
  ):boolean{
    if(!this.coachHumanAsset)return false;
    const resource=this.coachHumanAsset.resource as pc.ContainerResource;
    const tracks=resource.animations;
    if(!tracks?.length)return false;
    const parent=new pc.Entity("REAL Rocketbox human "+role+" "+phase);
    parent.setPosition(x,this.h(x,z),z);
    // Real source faces +Z. Lead coach should look toward the real skier AND
    // toward the coach TV camera at x=-.52, z=2.04; +105 turned his BACK.
    const yaw=role==="coach"?(x>0?-68:58):
      role==="referee"?38: -35;
    parent.setLocalEulerAngles(0,yaw,0);
    const scale=role==="referee"?1.03:phase===2?.974:1;
    parent.setLocalScale(scale,scale,scale);
    this.root.addChild(parent);
    const rig=resource.instantiateRenderEntity();
    parent.addChild(rig);
    for(const garment of [
      "Outfit_formal","Outfit_original","Skin_formal","Skin_original",
      "Top_shirt","Top_tee","Skin_shirt","Skin_tee","Trousers","Shoes",
    ]){
      const part=rig.findByName(garment);
      // The owner's real Ethan ships with a striped polo + SHORTS!
      // That outfit was visibly wrong for a winter race in the first
      // browser screenshot. His skinned FORMAL jacket has long sleeves and
      // trousers and can be recolored as a sober technical outer layer.
      if(part)part.enabled=garment==="Outfit_formal"||
        garment==="Skin_formal";
    }
    // Real skinned long-sleeve jacket/trousers remain, but their source
    // business-suit texture includes a PURPLE TIE: unacceptable on snow.
    // Re-skin the outfit ONLY with an original matte weatherproof fabric.
    // Preserve face, hands, shoes, PBR normals, motion and anatomy.
    const coatCanvas=document.createElement("canvas");
    coatCanvas.width=512;coatCanvas.height=512;
    const cx=coatCanvas.getContext("2d")!;
    const fabricBase=role==="referee"?"#4a3137":
      phase===1?"#293c47":"#36454b";
    cx.fillStyle=fabricBase;cx.fillRect(0,0,512,512);
    let seed=phase*617+19;
    const rand=()=>{
      seed=(seed*1664525+1013904223)>>>0;
      return seed/4294967296;
    };
    for(let n=0;n<3200;n++){
      const x=rand()*512,y=rand()*512;
      cx.fillStyle=rand()>.5?"rgba(200,221,226,.027)":
        "rgba(5,12,20,.052)";
      cx.fillRect(x,y,1+rand()*2,1+rand()*3);
    }
    for(let y=52;y<512;y+=82){
      cx.strokeStyle="rgba(0,9,16,.095)";
      cx.lineWidth=5;cx.beginPath();
      cx.moveTo(0,y);cx.bezierCurveTo(180,y-3,320,y+4,512,y);
      cx.stroke();
      cx.strokeStyle="rgba(180,209,215,.08)";
      cx.lineWidth=1;cx.beginPath();
      cx.moveTo(0,y+5);cx.lineTo(512,y+5);cx.stroke();
    }
    const coatTexture=new pc.Texture(this.app.graphicsDevice,{
      name:"Original weatherproof fabric on the Rocketbox skinned parka "+phase,
      mipmaps:true,
    });
    coatTexture.setSource(coatCanvas);this.textures.push(coatTexture);
    const outer=rig.findByName("Outfit_formal") as pc.Entity|null;
    if(outer){
      for(const component of outer.findComponents("render")){
        for(const instance of (component as pc.RenderComponent).meshInstances){
          if(!(instance.material instanceof pc.StandardMaterial))continue;
          const jacket=instance.material.clone();
          jacket.diffuseMap=coatTexture;
          jacket.diffuse.set(1,1,1);
          jacket.gloss=.12;
          jacket.useMetalness=false;
          jacket.update();
          instance.material=jacket;
          this.materials.push(jacket);
        }
      }
    }
    const idle=tracks.find(t=>t.resource?.name==="Idle");
    const cheer=tracks.find(t=>t.resource?.name==="Cheer");
    if(!idle?.resource||!cheer?.resource){
      parent.destroy();return false;
    }
    rig.addComponent("anim",{activate:true});
    const names=new Set<string>();
    for(const track of tracks){
      if(!track.resource)continue;
      const name=track.resource.name;
      rig.anim!.assignAnimation(name,track.resource);
      names.add(name);
    }
    rig.anim?.baseLayer?.play("Idle");
    rig.anim!.speed=role==="coach"?.90:role==="referee"?.78:.75;
    for(const c of rig.findComponents("render"))
      (c as pc.RenderComponent).castShadows=this.quality==="ultra";
    this.realStaff.push({rig,role,phase,active:"Idle",available:names});
    this.stats.staffMocapClips=Math.max(
      this.stats.staffMocapClips,names.size);
    if(role==="coach")this.stats.coaches++,this.stats.realCoaches++;
    else this.stats.officials++,this.stats.realOfficials++;
    return true;
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
  /**
   * Original anatomical all-weather staff: layered slim ski parkas, realistic
   * hood and ONE wraparound mirrored ski goggle, natural face and warm gaiter.
   * 12 independent joints (2 hips, knees, shoulders, elbows and wrists,
   * chest, head). NO toy googly eyes or bulbous coat boxes.
   *
   * All geometry is locally authored: no proprietary broadcast model used.
   */
  private crew(x:number,z:number,role:"coach"|"referee"|"camera",phase:number){
    const root=new pc.Entity(
      "Articulated technical snow staff: "+role+" "+phase);
    root.setPosition(x,this.h(x,z),z);
    const facing=role==="coach"?(x>0?105:-105):
      role==="referee"?-105:28;
    root.setLocalEulerAngles(0,facing,0);
    this.root.addChild(root);
    const colour=role==="coach"?(phase===1?"#333e42":"#465158"):
      role==="referee"?"#8b3038":"#3f4d50";
    const coat=this.mat("Staff charcoal ski parka shell "+role+" "+phase,
      colour,0,.12);
    const undercoat=this.mat("Matte parka hood lining "+phase,
      role==="referee"?"#502630":"#202d36",0,.08);
    const pants=this.mat("Insulated charcoal ski trousers "+phase,
      "#222b34",0,.09);
    const seams=this.mat("Subtle winter-jacket seams "+phase,
      role==="referee"?"#b55d67":"#627780",0,.10);
    const reflective=this.mat("Small reflective tape for staff "+phase,
      "#a5afb2",.12,.28);
    const skin=this.mat("Warm realistic face skin "+phase,
      phase%2?"#a77d64":"#b48e77",0,.14);
    const balaclava=this.mat("Fleece neck gaiter and gloves "+phase,
      "#22292e",0,.10);
    const beanie=this.mat("Knitted ribbed alpine beanie "+phase,
      phase%2?"#263944":"#293039",0,.07);
    const glasses=this.mat("Single smoked professional ski goggle "+phase,
      phase%2?"#344f5c":"#242e39",.45,.66);
    const glassesRim=this.mat("Slim rubber goggle frame "+phase,
      "#161d25",0,.13);
    const boot=this.mat("Winter boot technical rubber "+phase,
      "#1c232b",.02,.12);
    const metal=this.mat("Black radio & insulated stopwatch "+phase,
      "#25353b",.24,.27);
    const hips:pc.Entity[]=[],knees:pc.Entity[]=[];
    const wrists:pc.Entity[]=[],elbows:pc.Entity[]=[];
    const shoulder:pc.Entity[]=[];

    // 87cm inseam and planted footwear; two true pivoted leg chains.
    for(const side of [-1,1]){
      const hip=new pc.Entity(side<0?"Left hip joint":"Right hip joint");
      hip.setLocalPosition(side*.135,.83,0);root.addChild(hip);
      shape(hip,"capsule","Tapered quilted ski-pant upper leg",
        [0,-.20,0],[.167,.43,.175],pants);
      const knee=new pc.Entity(side<0?"Left knee joint":"Right knee joint");
      knee.setLocalPosition(0,-.41,.013);hip.addChild(knee);
      shape(knee,"capsule","Anatomical lower leg and snow trousers",
        [0,-.15,0],[.145,.34,.152],pants);
      shape(knee,"box","Grounded alpine insulated shoe",
        [0,-.315,-.052],[.246,.167,.339],boot);
      this.box("Low-contrast soft boot buckle",
        0,-.247,-.207,.12,.018,.012,seams,knee);
      hips.push(hip);knees.push(knee);
    }

    const torso=new pc.Entity("Staff independently rotating upper body");
    torso.setLocalPosition(0,.835,0);root.addChild(torso);
    // Body contour: natural waist taper, broad shoulder, short collar.
    const p:number[]=[],tri:number[]=[],sides=24;
    const rings=[
      [.77,.245,.168],[.87,.263,.185],[1.10,.282,.195],
      [1.34,.296,.206],[1.46,.270,.186],[1.56,.205,.150],
    ];
    for(const [absoluteHeight,rx,rz] of rings)
      for(let k=0;k<sides;k++){
        const theta=k*Math.PI*2/sides;
        p.push(Math.cos(theta)*rx,absoluteHeight-.835,
          Math.sin(theta)*rz);
      }
    for(let i=0;i<rings.length-1;i++)
      for(let k=0;k<sides;k++){
        const a=i*sides+k,b=i*sides+(k+1)%sides;
        const c=(i+1)*sides+k,d=(i+1)*sides+(k+1)%sides;
        tri.push(a,c,b,b,c,d);
      }
    const coatShell=meshEntity(this.app.graphicsDevice,torso,
      "Round-section anatomical technical snow parka",p,tri,coat);
    coatShell.render!.castShadows=this.quality!=="low";

    // No giant white patches. Weatherproof zipper, chest logo-free badge,
    // stitched pocket lips and restrained bands at sleeve hems.
    for(const y of [.14,.31,.49]){
      this.box("Matte horizontal insulated baffle",
        0,y,-.200,.39,.013,.010,undercoat,torso);
    }
    this.box("Fine concealed technical jacket zipper",
      0,.38,-.214,.012,.62,.012,seams,torso);
    for(const side of [-1,1]){
      this.box("Weather-proof diagonal parka pocket",
        side*.174,.16,-.172,.111,.014,.012,seams,torso);
      this.box("Discreet reflective accreditation strip",
        side*.170,.53,-.160,.13,.028,.015,reflective,torso);
    }
    shape(torso,"cylinder","Raised black protective parka collar",
      [0,.72,0],[.222,.16,.23],undercoat);

    const head=new pc.Entity("Hooded snow staff 3-axis head joint");
    head.setLocalPosition(0,.82,0);torso.addChild(head);
    // Slightly recessed insulated parka hood behind the face. At camera
    // distance it reads as a real technical ski hood, not a round cartoon cap.
    shape(head,"sphere","Parka hood volume around neck and ears",
      [0,.057,.082],[.303,.334,.248],undercoat);
    shape(head,"sphere","Anatomical cheekbone and forehead",
      [0,.054,-.071],[.205,.244,.195],skin);
    shape(head,"sphere","Natural jaw and chin taper",
      [0,-.084,-.099],[.166,.112,.145],skin);
    shape(head,"sphere","Textile neck gaiter over lower half of face",
      [0,-.061,-.182],[.182,.103,.062],balaclava);
    // A single continuous mirrored goggle rather than two oversized
    // side-by-side circular bug eyes.
    this.box("Fitted goggle frame",0,.106,-.239,
      .376,.126,.037,glassesRim,head);
    this.box("Smoked wraparound ski goggle visor",0,.106,-.262,
      .348,.102,.018,glasses,head);
    for(const side of [-1,1])
      this.box("Short winter goggle retaining strap",side*.197,.10,-.084,
        .014,.058,.184,glassesRim,head);
    shape(head,"sphere","Snow beanie sloped crown",
      [0,.241,-.025],[.240,.125,.217],beanie);
    shape(head,"cylinder","Fitted beanie fabric brim",
      [0,.207,-.034],[.247,.055,.224],beanie);
    // Micro-ribbing: few thin dark grooves, not colored circles.
    for(const dx of [-.150,-.077,0,.077,.150])
      this.box("Subtle knitted vertical wool rib",
        dx,.265,-.227,.009,.058,.007,undercoat,head);

    // Separate pivot hierarchy shoulders > elbows > wrists. Slim sleeves
    // taper toward gloves: the previous huge vertical capsule-arms
    // looked like a rigid inflatable mascot.
    for(const side of [-1,1]){
      const arm=new pc.Entity(side<0?
        "Left clavicle/shoulder rotation":"Right clavicle/shoulder rotation");
      arm.setLocalPosition(side*.281,.525,0);torso.addChild(arm);
      shape(arm,"capsule","Tapered technical snow-jacket upper sleeve",
        [side*.008,-.176,0],[.157,.367,.164],coat);
      const elbow=new pc.Entity(side<0?"Left elbow hinge":"Right elbow hinge");
      elbow.setLocalPosition(side*.014,-.343,0);arm.addChild(elbow);
      shape(elbow,"capsule","Tapered winter sleeve forearm",
        [0,-.155,0],[.140,.323,.147],coat);
      this.box("Dark elastic parka wrist gaiter",
        0,-.285,0,.222,.07,.233,undercoat,elbow);
      const wrist=new pc.Entity(side<0?
        "Left gloved wrist articulation":"Right gloved wrist articulation");
      wrist.setLocalPosition(0,-.321,0);elbow.addChild(wrist);
      shape(wrist,"capsule","Snowproof five-finger mitten silhouette",
        [0,-.057,-.017],[.117,.163,.113],balaclava);
      shoulder.push(arm);elbows.push(elbow);wrists.push(wrist);
    }

    if(role==="coach"||role==="referee"){
      // Small hand-held UHF/race-time instrument moves with wrist.
      const holder=wrists[0];
      this.box(role==="referee"?
        "Race official electronic timer":"Coach radio and split-time remote",
        0,-.076,-.135,.122,.172,.049,metal,holder);
      this.box("Small luminous instrument strip",
        0,-.066,-.167,.078,.061,.008,reflective,holder);
      if(role==="coach")
        this.box("Hand radio retractable antenna",
          .047,.046,-.133,.010,.130,.010,metal,holder);
    }
    if(role==="camera"){
      const holder=wrists[1];
      this.box("Handheld producer comms",0,-.065,-.128,
        .14,.11,.16,metal,holder);
    }
    this.extras.push({
      head,leftArm:shoulder[0],rightArm:shoulder[1],phase,role,
      joints:{torso,leftElbow:elbows[0],rightElbow:elbows[1],
        leftWrist:wrists[0],rightWrist:wrists[1],
        leftHip:hips[0],rightHip:hips[1],
        leftKnee:knees[0],rightKnee:knees[1]},
    });
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
    this.stats.coachCue="observe";
    let animatedRacers=0,animatedCoaches=0;
    for(const extra of this.extras){
      const j=extra.joints;
      if(extra.role==="racer" && j){
        const p=waitingAthletePose(this.anim,extra.phase,
          startPhase);
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
          set(side+"UpLeg",p.hipPitch+
            (left?p.leftHipOffset:p.rightHipOffset),0,
            (left?1:-1)*p.pelvisRoll*.23);
          set(side+"Leg",p.kneePitch+
            (left?p.leftKneeOffset:p.rightKneeOffset));
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
        extra.head?.setLocalEulerAngles(
          p.headPitch,p.headYaw,p.neckRoll);
        extra.leftArm?.setLocalEulerAngles(
          p.leftShoulder,0,p.leftShoulderRoll);
        extra.rightArm?.setLocalEulerAngles(
          p.rightShoulder,0,p.rightShoulderRoll+p.rightArmRaise);
        j?.torso?.setLocalEulerAngles(
          p.torsoPitch,p.torsoYaw,p.torsoRoll);
        j?.leftElbow?.setLocalEulerAngles(p.leftElbow,0,0);
        j?.rightElbow?.setLocalEulerAngles(p.rightElbow,0,0);
        j?.leftWrist?.setLocalEulerAngles(p.leftWrist,0,-7);
        j?.rightWrist?.setLocalEulerAngles(p.rightWrist,0,7);
        j?.leftHip?.setLocalEulerAngles(p.leftHip,0,0);
        j?.rightHip?.setLocalEulerAngles(p.rightHip,0,0);
        j?.leftKnee?.setLocalEulerAngles(p.leftKnee,0,0);
        j?.rightKnee?.setLocalEulerAngles(p.rightKnee,0,0);
        if(extra.role==="coach"){
          animatedCoaches++;
          if(p.cue==="signal"||p.cue==="encourage"||
            this.stats.coachCue==="observe")
            this.stats.coachCue=p.cue;
        }
      }
    }
    // Real 80-bone humans play the actual supplied GLB motion capture.
    // No handcrafted capsule or shoulder-angle animation is applied to them.
    for(const real of this.realStaff){
      const wanted=staffTVClip(real.role,real.phase,startPhase);
      const next=real.available.has(wanted)?wanted:"Idle";
      if(real.active!==next){
        real.rig.anim?.baseLayer?.transition(next,.20);
        real.active=next;
      }
      if(real.role==="coach"){
        animatedCoaches++;
        if(real.phase===1){
          this.stats.coachClip=real.active;
          this.stats.coachCue=real.active==="Cheer"?"encourage":
            real.active==="Wave"?"signal":"observe";
        }
      }
    }
    this.stats.animatedRacers=animatedRacers;
    this.stats.animatedCoaches=animatedCoaches;
  }
}
