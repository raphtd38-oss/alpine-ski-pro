// Alpine Ski Pro — deterministic professional 18-bone racer generator.
// The GLB stays original, playable on the Web and reproducible without Blender.
import { writeFileSync, mkdirSync } from "node:fs";
function buildAthleteGlb() {
  const PI=Math.PI, TAU=2*PI;
  const nodes=[], world=[], names={};
  function joint(name,p,parent){
    const id=nodes.length;names[name]=id;
    const n={name,translation:p.slice()}; nodes.push(n);
    if(parent){
      const pidx=names[parent]; nodes[pidx].children??=[];nodes[pidx].children.push(id);
      const base=world[pidx];world.push(p.map((v,i)=>v+base[i]));
    }else world.push(p.slice());
    return id;
  }
  joint("Armature",[0,0,0]);
  joint("Pelvis",[0,.92,0],"Armature");
  joint("Spine",[0,.14,.04],"Pelvis");
  joint("Chest",[0,.22,.08],"Spine");
  joint("Neck",[0,.12,.06],"Chest");
  joint("Head",[0,.13,.02],"Neck");
  for(const [side,sgn] of [["L",-1],["R",1]]){
    joint(side+"Hip",[.13*sgn,-.02,0],"Pelvis");
    joint(side+"Knee",[0,-.4,.13],side+"Hip");
    joint(side+"Ankle",[0,-.38,-.11],side+"Knee");
    joint(side+"Shoulder",[.23*sgn,.05,.02],"Chest");
    joint(side+"Elbow",[.07*sgn,-.26,.12],side+"Shoulder");
    joint(side+"Wrist",[.03*sgn,-.23,.14],side+"Elbow");
  }
  const M=[
   ["Race suit / alpine crimson",[.82,.065,.055,1],.05,.45],
   ["Race suit / graphite compression",[.025,.039,.064,1],.06,.50],
   ["Race bib / competition ivory",[.89,.93,.96,1],0,.76],
   ["Carbon racing boots",[.045,.054,.077,1],.25,.34],
   ["Aerodynamic race helmet",[.95,.967,.97,1],.25,.28],
   ["Mirrored ski goggles / copper",[.64,.30,.09,1],.7,.16],
   ["Balaclava / graphite",[.045,.055,.075,1],.01,.85],
   ["Shin guards / race ivory",[.93,.96,.98,1],.06,.46],
   ["Technical gloves / black",[.037,.046,.056,1],.05,.64],
   ["Team trim / glacier teal",[.13,.8,.86,1],.16,.42],
   ["Race bib / edges",[.72,.77,.83,1],.03,.69],
   ["Helmet vents / carbon",[.022,.038,.047,1],.35,.40],
   ["Metallic boot buckles",[.7,.78,.80,1],.65,.24]
  ];
  const materials=M.map(([name,c,metal,rough])=>({name,pbrMetallicRoughness:{baseColorFactor:c,metallicFactor:metal,roughnessFactor:rough},doubleSided:true}));
  const data=[], views=[], access=[], primitives=[];
  function aligned(){while(data.length%4)data.push(0);}
  function accessor(rows,type,component,kind){
    aligned();const offset=data.length;
    let flat=Array.isArray(rows[0])?rows.flat():rows;
    const buf=new ArrayBuffer(flat.length*(component===5123?2:4)),v=new DataView(buf);
    flat.forEach((n,i)=>{if(component===5126)v.setFloat32(i*4,n,true);else if(component===5123)v.setUint16(i*2,n,true);else v.setUint32(i*4,n,true);});
    data.push(...new Uint8Array(buf));
    const vi=views.length; views.push({buffer:0,byteOffset:offset,byteLength:data.length-offset});
    const a={bufferView:vi,componentType:component,count:rows.length,type};
    if(kind==="POSITION"){
      a.min=[0,1,2].map(i=>Math.min(...rows.map(r=>r[i])));
      a.max=[0,1,2].map(i=>Math.max(...rows.map(r=>r[i])));
    }
    access.push(a);
    return access.length-1;
  }
  function influence(bone,t,enable=true){
    const b=names[bone],out=[[b,1]];
    if(!enable)return [[b,0,0,0],[1,0,0,0]];
    let near=null,pct=0;
    const name=bone.replace(/^[LR]/,"");
    if(name==="Hip"||name==="Knee"||name==="Shoulder"||name==="Elbow"){
      const next=bone.endsWith("Hip")?bone[0]+"Knee":bone.endsWith("Knee")?bone[0]+"Ankle":bone.endsWith("Shoulder")?bone[0]+"Elbow":bone[0]+"Wrist";
      const parent=bone.endsWith("Hip")?"Pelvis":bone.endsWith("Knee")?bone[0]+"Hip":bone.endsWith("Shoulder")?"Chest":bone[0]+"Shoulder";
      if(t<.32){near=next;pct=.55*Math.pow((.32-t)/.32,1.3);}
      if(t>.8){near=parent;pct=.22*Math.pow((t-.8)/.2,1.2);}
    }else if(bone==="Spine"){
      if(t<.28){near="Pelvis";pct=.35*(.28-t)/.28;}
      if(t>.60){near="Chest";pct=.46*(t-.60)/.4;}
    }else if(bone==="Chest"){
      if(t<.27){near="Spine";pct=.27*(.27-t)/.27;}
      if(t>.82){near="Neck";pct=.10*(t-.82)/.18;}
    }else if(bone==="Pelvis"){
      if(t>.65){near="Spine";pct=.20*(t-.65)/.35;}
    }
    if(near&&names[near]!==undefined){out[0][1]-=pct;out.push([names[near],pct]);}
    const joints=out.map(q=>q[0]),weights=out.map(q=>q[1]);while(joints.length<4){joints.push(0);weights.push(0);}
    return [joints.slice(0,4),weights.slice(0,4)];
  }
  function loft(bone,offset,rings,mat,segments=24,arc=null,blended=true){
    const base=world[names[bone]],p=[],idx=[],joints=[],weights=[];
    const n=segments,minY=Math.min(...rings.map(r=>r[0])),maxY=Math.max(...rings.map(r=>r[0]));
    const full=!arc;
    for(const [y,rx,rz,zc] of rings){
      const t=(y-minY)/Math.max(.001,maxY-minY);
      const [js,ws]=influence(bone,t,blended);
      for(let i=0;i<n;i++){
        const a=full?TAU*i/n:arc[0]+(arc[1]-arc[0])*i/(n-1);
        p.push([base[0]+offset[0]+Math.cos(a)*rx,base[1]+offset[1]+y,base[2]+offset[2]+zc+Math.sin(a)*rz]);
        joints.push(js);weights.push(ws);
      }
    }
    const lim=full?n:n-1;
    for(let r=0;r<rings.length-1;r++)for(let i=0;i<lim;i++){
      const a=r*n+i,b=r*n+(i+1)%n,c=a+n,d=b+n;
      idx.push(a,c,b,b,c,d);
    }
    const normals=Array.from({length:p.length},()=>[0,0,0]);
    for(let i=0;i<idx.length;i+=3){
      const [ia,ib,ic]=idx.slice(i,i+3),a=p[ia],b=p[ib],c=p[ic];
      const u=b.map((v,k)=>v-a[k]),v=c.map((val,k)=>val-a[k]);
      const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      for(const k of [ia,ib,ic])for(let d=0;d<3;d++)normals[k][d]+=normal[d];
    }
    const normalUnit=normals.map(n=>{const length=Math.hypot(...n)||1;return n.map(x=>x/length)});
    primitives.push({attributes:{POSITION:accessor(p,"VEC3",5126,"POSITION"),NORMAL:accessor(normalUnit,"VEC3",5126),JOINTS_0:accessor(joints,"VEC4",5123),WEIGHTS_0:accessor(weights,"VEC4",5126)},indices:accessor(idx,"SCALAR",5125),material:mat});
  }
  function ellipsoid(bone,offset,radii,mat,segments=24,arc=null){
    const [rx,ry,rz]=radii,rings=[];
    for(let i=0;i<=14;i++){const a=-PI/2+PI*i/14;rings.push([Math.sin(a)*ry,Math.max(.0006,Math.cos(a)*rx),Math.max(.0006,Math.cos(a)*rz),0]);}
    loft(bone,offset,rings,mat,segments,arc,false);
  }
  function panel(bone,offset,rings,mat,arc=0.64,segments=13){
    loft(bone,offset,rings,mat,segments,[PI/2-arc,PI/2+arc],false);
  }
  // Racing anatomy: sharply tailored hips, aerodynamic torso and muscular shoulders.
  loft("Pelvis",[0,0,0],[[-.16,.118,.112,.015],[-.08,.184,.130,0],[.02,.186,.128,0],[.14,.151,.109,.013],[.19,.136,.100,.022]],0,28);
  loft("Spine",[0,-.075,0],[[-.08,.151,.106,-.005],[0,.170,.123,.015],[.13,.185,.127,.048],[.22,.221,.126,.068],[.29,.209,.119,.079],[.335,.149,.104,.085]],0,28);
  panel("Spine",[0,-.073,.007],[[-.015,.168,.123,.02],[.07,.178,.129,.039],[.17,.195,.129,.058],[.25,.215,.123,.077],[.295,.196,.116,.078]],1,.55,16);
  // White bib must be a FRONT panel, not a full circular shirt covering the suit.
  panel("Chest",[0,-.065,.018],[[-.062,.191,.135,.0],[-.01,.207,.139,.014],[.075,.208,.136,.026],[.15,.179,.12,.029]],2,.72,20);
  // Thin side trim on the bib, leaving white center visible.
  for(const side of [-1,1])panel("Chest",[side*.145,-.06,.01],[[-.045,.062,.136,.006],[.06,.064,.136,.018],[.15,.052,.12,.023]],9,.28,8);
  ellipsoid("Neck",[0,.016,0],[.073,.092,.075],6,18);
  ellipsoid("Head",[0,0,.017],[.108,.138,.106],6,28);
  ellipsoid("Head",[0,.045,-.025],[.137,.153,.147],4,32);
  // Aero race helmet lip, goggle nose bridge and mirrored curved visor.
  panel("Head",[0,.055,.025],[[-.020,.116,.125,.018],[.016,.126,.128,.035],[.053,.119,.129,.027],[.088,.110,.120,.012]],5,.95,21);
  panel("Head",[0,.124,-.012],[[-.018,.129,.145,.005],[.003,.136,.147,.005],[.034,.131,.146,-.001]],4,.97,21);
  ellipsoid("Head",[0,-.064,.092],[.112,.038,.070],6,20);
  for(const side of [-1,1]){
    ellipsoid("Head",[side*.113,.064,-.045],[.017,.018,.062],11,14);
    ellipsoid("Head",[side*.116,-.014,.013],[.014,.018,.082],6,14);
  }
  // Aerodynamic shin guards, boots and hand protection follow the original rig.
  for(const side of ["L","R"]){
    loft(side+"Hip",[0,0,0],[[-.44,.074,.079,.126],[-.35,.090,.095,.104],[-.20,.111,.103,.058],[-.075,.118,.111,.023],[.024,.089,.082,0]],0,24);
    // Athletic front thigh panel improves suit material breakup while staying skin bound.
    panel(side+"Hip",[0,0,.006],[[-.38,.075,.080,.126],[-.23,.111,.101,.062],[-.09,.118,.109,.027],[.005,.087,.082,.007]],1,.59,12);
    loft(side+"Knee",[0,0,0],[[-.378,.060,.064,-.107],[-.296,.066,.071,-.095],[-.15,.074,.078,-.055],[-.025,.081,.084,-.002],[.043,.077,.082,.012]],0,22);
    panel(side+"Knee",[0,0,.012],[[-.32,.069,.077,-.089],[-.23,.078,.087,-.074],[-.12,.082,.086,-.029],[-.025,.084,.089,-.001]],7,.70,14);
    ellipsoid(side+"Knee",[0,-.008,.069],[.082,.083,.037],7,16);
    // Tall carbon racing boots with cuff, toe shell, white buckle accents.
    ellipsoid(side+"Ankle",[0,.065,.036],[.084,.157,.154],3,24);
    ellipsoid(side+"Ankle",[0,-.032,.138],[.10,.055,.165],3,24);
    panel(side+"Ankle",[0,.038,.045],[[-.061,.074,.151,.08],[.01,.083,.161,.057],[.08,.08,.140,.049],[.128,.071,.132,.036]],7,.47,10);
    ellipsoid(side+"Shoulder",[0,.008,-.002],[.086,.074,.084],0,16);
    loft(side+"Shoulder",[0,0,0],[[-.282,.057,.061,.121],[-.221,.072,.077,.103],[-.13,.086,.085,.06],[-.05,.10,.092,.015],[.047,.088,.084,0]],0,22);
    panel(side+"Shoulder",[0,0,.012],[[-.27,.061,.068,.113],[-.15,.092,.092,.055],[-.04,.10,.097,.013]],1,.65,10);
    loft(side+"Elbow",[0,0,0],[[-.243,.044,.046,.148],[-.15,.056,.059,.095],[-.065,.066,.069,.043],[.036,.061,.064,0]],0,18);
    ellipsoid(side+"Elbow",[0,-.09,.074],[.059,.055,.027],7,14);
    ellipsoid(side+"Wrist",[0,-.033,.023],[.064,.094,.073],8,20);
    // Glove cuff in matching competition fabric.
    ellipsoid(side+"Wrist",[0,.023,.005],[.069,.032,.074],1,16);
  }
  // Independent mesh node with skin binding, compatible with PlayCanvas' 18-bone animation.
  const bind=world.map(p=>[1,0,0,0,0,1,0,0,0,0,1,0,-p[0],-p[1],-p[2],1]);
  const ibm=accessor(bind,"MAT4",5126);
  const meshNode=nodes.length;nodes.push({name:"Pro athlete skinned surface",mesh:0,skin:0});
  const gltf={
    asset:{version:"2.0",generator:"Alpine Ski Pro V1.3 original professional racer"},
    scene:0,scenes:[{nodes:[0,meshNode]}],nodes,
    skins:[{joints:world.map((_,i)=>i),inverseBindMatrices:ibm,skeleton:0}],
    meshes:[{name:"Competition skier PBR high-detail multi-weight",primitives}],
    materials,buffers:[{byteLength:data.length}],bufferViews:views,accessors:access
  };
  const json=JSON.stringify(gltf);
  const jsonBytes=[]; for(let i=0;i<json.length;i++)jsonBytes.push(json.charCodeAt(i));while(jsonBytes.length%4)jsonBytes.push(32);
  while(data.length%4)data.push(0);
  const length=12+8+jsonBytes.length+8+data.length;
  const out=new Uint8Array(length),view=new DataView(out.buffer);
  view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,length,true);
  view.setUint32(12,jsonBytes.length,true);view.setUint32(16,0x4e4f534a,true);
  out.set(jsonBytes,20);
  const binaryStart=20+jsonBytes.length;
  view.setUint32(binaryStart,data.length,true);view.setUint32(binaryStart+4,0x004e4942,true);
  out.set(data,binaryStart+8);
  return {data:out,stats:{bytes:out.length,joints:world.length,surfaces:primitives.length,materials:materials.length,vertices:primitives.reduce((n,p)=>n+access[p.attributes.POSITION].count,0),triangles:primitives.reduce((n,p)=>n+access[p.indices].count/3,0)}};
}
const generated=buildAthleteGlb();
mkdirSync("public/assets",{recursive:true});
writeFileSync("public/assets/skier.glb",Buffer.from(generated.data));
console.log("Generated original professional ski athlete:", generated.stats);
