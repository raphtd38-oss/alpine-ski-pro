/**
 * Reconstruct the ACTUAL 25-bone skier's BODY MESH (not merely its pose).
 * Uses an implicit, welded anatomical surface and blended skin weights.
 * Works on the committed, unchanged seamless-*.glb as a source of truth,
 * retaining boots, binding hardware, skis, helmet, the rig and animations.
 *
 * Output: seamless-human-{mobile,full}.glb. Source files NEVER overwritten.
 * Deterministic offline Node 24, no Blender/plugin account required.
 */
import {readFileSync,writeFileSync} from "node:fs";

const round=(n)=>Math.round(n*10000)/10000;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(v,s)=>v.map(x=>x*s);
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=(v)=>Math.hypot(...v);
const norm=(v)=>mul(v,1/(length(v)||1));
const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function mat4(n) {
  if(n.matrix)return n.matrix;
  const [x,y,z,w]=n.rotation??[0,0,0,1],[sx,sy,sz]=n.scale??[1,1,1];
  const [tx,ty,tz]=n.translation??[0,0,0];
  return [(1-2*(y*y+z*z))*sx,(2*(x*y+z*w))*sx,(2*(x*z-y*w))*sx,0,
    (2*(x*y-z*w))*sy,(1-2*(x*x+z*z))*sy,(2*(y*z+x*w))*sy,0,
    (2*(x*z+y*w))*sz,(2*(y*z-x*w))*sz,(1-2*(x*x+y*y))*sz,0,
    tx,ty,tz,1];
}
function matrixMultiply(a,b){
  const c=new Array(16).fill(0);
  for(let j=0;j<4;j++)for(let i=0;i<4;i++)
    for(let k=0;k<4;k++)c[i+j*4]+=a[i+k*4]*b[k+j*4];
  return c;
}
const transform=(m,p)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],
  m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],
  m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
function inverseAffine(m){
  const a=m[0],b=m[4],c=m[8],d=m[1],e=m[5],f=m[9],g=m[2],h=m[6],i=m[10];
  const A=e*i-f*h,B=c*h-b*i,C=b*f-c*e,D=f*g-d*i,E=a*i-c*g,F=c*d-a*f,G=d*h-e*g,H=b*g-a*h,I=a*e-b*d;
  const det=a*A+b*D+c*G;
  if(Math.abs(det)<1e-8)throw Error("Non-invertible GLB mesh node");
  const r=[A/det,D/det,G/det,0,B/det,E/det,H/det,0,C/det,F/det,I/det,0,0,0,0,1];
  const t=transform(r,[-m[12],-m[13],-m[14]]);
  r[12]=t[0];r[13]=t[1];r[14]=t[2];
  return r;
}
const transformNormalToLocal=(m,n)=>norm([
  m[0]*n[0]+m[1]*n[1]+m[2]*n[2],
  m[4]*n[0]+m[5]*n[1]+m[6]*n[2],
  m[8]*n[0]+m[9]*n[1]+m[10]*n[2],
]);
function parseGlb(path){
  const buffer=readFileSync(path);
  if(buffer.toString("ascii",0,4)!=="glTF"||buffer.readUInt32LE(4)!==2)
    throw Error("Expected glTF 2 binary: "+path);
  const n=buffer.readUInt32LE(12);
  const doc=JSON.parse(buffer.toString("utf8",20,20+n));
  const pos=20+n;const bin=buffer.subarray(pos+8,pos+8+buffer.readUInt32LE(pos));
  return {doc,bin};
}
/**
 * Retain the photographer-approved original body silhouette and PBR UVs,
 * but REBUILD the skinning topology. The first smooth-implicit sculpt looked
 * like swollen capsules in 3/4 view; it was correctly REJECTED on inspection.
 * The source itself is watertight with realistic anatomical contours.
 *
 * Vertex-level tangential fairing + joint-aware skin weight diffusion fixes
 * deformation pinches without reintroducing stick-limb geometry.
 */
function getAccessor(doc,bin,index){
  const a=doc.accessors[index],view=doc.bufferViews[a.bufferView];
  const dimensions={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
  const bytes={5126:4,5125:4,5123:2,5121:1}[a.componentType];
  if(!dimensions||!bytes)throw Error("Unsupported original GLB accessor");
  const stride=view.byteStride??dimensions*bytes;
  const offset=(view.byteOffset??0)+(a.byteOffset??0);
  const reader=new DataView(bin.buffer,bin.byteOffset,bin.byteLength);
  return Array.from({length:a.count},(_,i)=>Array.from({length:dimensions},(_,j)=>{
    const at=offset+i*stride+j*bytes;
    if(a.componentType===5126)return reader.getFloat32(at,true);
    if(a.componentType===5125)return reader.getUint32(at,true);
    if(a.componentType===5123)return reader.getUint16(at,true);
    return reader.getUint8(at);
  }));
}
function reconstructOriginalSurface(doc,bin,primitive,skin,rig){
  const p=primitive.attributes;
  const basePoints=getAccessor(doc,bin,p.POSITION);
  const uv=getAccessor(doc,bin,p.TEXCOORD_0);
  const normal=getAccessor(doc,bin,p.NORMAL);
  const sourceJoints=getAccessor(doc,bin,p.JOINTS_0);
  const sourceWeights=getAccessor(doc,bin,p.WEIGHTS_0);
  const triangles=getAccessor(doc,bin,primitive.indices).map(row=>row[0]);
  const adjacency=Array.from({length:basePoints.length},()=>new Set());
  for(let i=0;i<triangles.length;i+=3){
    const [a,b,c]=triangles.slice(i,i+3);
    if(a>=adjacency.length||b>=adjacency.length||c>=adjacency.length)
      throw Error("Source topology invalid");
    for(const [x,y] of [[a,b],[b,c],[c,a]]){
      adjacency[x].add(y);adjacency[y].add(x);
    }
  }
  // Preserve anatomical outlines. Only a subtle tangential relax at
  // transition skinning zones, so no shoulder bulbs or balloon thighs.
  const points=basePoints.map((v,i)=>{
    const n=normal[i];
    const neighbors=adjacency[i];
    if(neighbors.size===0)return [...v];
    const blended=sourceWeights[i].filter(w=>w>.08).length>1;
    if(!blended)return [...v];
    const avg=[0,0,0];
    for(const k of neighbors)for(let d=0;d<3;d++)avg[d]+=basePoints[k][d];
    for(let d=0;d<3;d++)avg[d]/=neighbors.size;
    const delta=sub(avg,v),along=dot(delta,n);
    const tangential=sub(delta,mul(n,along));
    return add(v,mul(tangential,.18));
  });
  // Smooth complex joints along the actual triangle connectivity, never
  // through 3D proximity (which could confuse near-touching legs).
  let weights=sourceJoints.map((js,i)=>{
    const map=new Map();
    for(let k=0;k<4;k++)
      if(sourceWeights[i][k]>0)
        map.set(js[k],(map.get(js[k])||0)+sourceWeights[i][k]);
    return map;
  });
  for(let pass=0;pass<3;pass++){
    const prev=weights;
    weights=prev.map((old,i)=>{
      const next=new Map();
      const add=(j,w)=>next.set(j,(next.get(j)||0)+w);
      const n=adjacency[i];
      if(!n.size)return new Map(old);
      const smooth=.22;
      for(const [j,w] of old)add(j,w*(1-smooth));
      const scale=smooth/n.size;
      for(const neighbor of n)for(const [j,w] of prev[neighbor])add(j,w*scale);
      return next;
    });
  }
  const joints=[],normalized=[];
  let countBlended=0;
  for(let i=0;i<weights.length;i++){
    const k=[...weights[i].entries()].filter(x=>x[1]>0)
      .sort((a,b)=>b[1]-a[1]).slice(0,4);
    const total=k.reduce((s,x)=>s+x[1],0);
    const js=k.map(x=>x[0]),ws=k.map(x=>x[1]/(total||1));
    while(js.length<4){js.push(0);ws.push(0);}
    if(ws.filter(w=>w>.08).length>1)countBlended++;
    joints.push(js);normalized.push(ws);
  }
  // Recompute the body normals in the same watertight topology. Accumulate
  // from ORIGINAL face winding: unlike capsule SDF, skin folds are retained.
  const normals=Array.from({length:points.length},()=>[0,0,0]);
  for(let i=0;i<triangles.length;i+=3){
    const [a,b,c]=triangles.slice(i,i+3);
    const v=cross(sub(points[b],points[a]),sub(points[c],points[a]));
    for(const k of [a,b,c])for(let d=0;d<3;d++)normals[k][d]+=v[d];
  }
  const smoothNormals=normals.map((v,i)=>length(v)>1e-6?norm(v):normal[i]);
  return {points,normals:smoothNormals,triangles,uv,
    influences:{indices:joints,weights:normalized},
    sourceVertices:basePoints.length,skinBlend:countBlended};
}
function pose(doc){
  const par=new Map();
  doc.nodes.forEach((node,i)=>node.children?.forEach(c=>par.set(c,i)));
  const world=[],named=new Map(doc.nodes.map((node,i)=>[node.name,i]));
  function resolve(i){
    if(!world[i]){
      const local=mat4(doc.nodes[i]);
      world[i]=par.has(i)?matrixMultiply(resolve(par.get(i)),local):local;
    }
    return world[i];
  }
  const p=(name)=>{
    const i=named.get(name);
    if(i===undefined)throw Error("Missing GLB joint "+name);
    return transform(resolve(i),[0,0,0]);
  };
  return {par,world:doc.nodes.map((_,i)=>resolve(i)),named,p};
}
function constructShapes(joints){
  const shapes=[];
  function ell(name,center,radius,joint) {
    shapes.push({type:"ell",name,center,radius,joint,
      evaluate(p){
        const d=sub(p,center);
        return (Math.hypot(d[0]/radius[0],d[1]/radius[1],d[2]/radius[2])-1)*
          Math.min(...radius);
      }});
  }
  function bone(name,a,b,rx,rz,cap=0.9,first=null){
    const va=joints.p(a),vb=joints.p(b),axis=norm(sub(vb,va));
    let basis=norm(cross(axis,[0,0,1]));
    if(length(basis)<.1)basis=norm(cross(axis,[0,1,0]));
    const other=norm(cross(axis,basis));
    const L=length(sub(vb,va));
    shapes.push({type:"tube",name,start:a,end:b,va,vb,axis,basis,other,L,rx,rz,cap,
      evaluate(p){
        const v=sub(p,va),along=dot(v,axis);
        const t=clamp(along/(L||.01),0,1);
        const center=add(va,mul(sub(vb,va),t));
        const r=sub(p,center);
        const u=dot(r,basis),w=dot(r,other);
        const taper=1-.17*Math.pow(Math.abs(t-.5)*2,2);
        const over=Math.max(-along,along-L,0);
        return (Math.sqrt((u/(rx*taper))**2+(w/(rz*taper))**2+
          (over/(Math.min(rx,rz)*cap))**2)-1)*Math.min(rx,rz);
      }});
  }
  const p=joints.p;
  ell("pelvis",p("Hips"),[.175,.16,.125],"Hips");
  bone("waist","Hips","Spine",.162,.118);
  bone("thorax","Spine","Chest",.215,.136);
  ell("ribcage",add(mul(p("Spine"),.3),mul(p("Chest"),.7)),
      [.221,.21,.138],"Chest");
  bone("neck","Chest","Neck",.077,.072);
  // Helmet already has its own dedicated visual geometry; reconstruct a
  // natural under-helmet head so there are no seams under the visor.
  ell("skull",add(p("Head"),[0,.028,0]),[.094,.126,.104],"Head");
  for(const side of ["Left","Right"]){
    const hip=side+"UpLeg",knee=side+"Leg",ankle=side+"Ankle";
    const shoulder=side+"UpperArm",elbow=side+"ForeArm",hand=side+"Hand";
    ell(side+" hip",p(hip),[.12,.118,.12],hip);
    bone(side+" thigh",hip,knee,.107,.115);
    ell(side+" knee",p(knee),[.076,.080,.081],knee);
    bone(side+" calf",knee,ankle,.075,.08);
    // The feet/shells already exist in the GLB and MUST NOT be recreated.
    ell(side+" shoulder",p(shoulder),[.095,.094,.095],shoulder);
    bone(side+" upperarm",shoulder,elbow,.077,.073);
    ell(side+" elbow",p(elbow),[.056,.060,.061],elbow);
    bone(side+" forearm",elbow,hand,.058,.055);
    ell(side+" glove",p(hand),[.057,.082,.06],hand);
  }
  return shapes;
}
function signedDistance(p,shapes){
  let result=1e3;
  for(const s of shapes){
    const d=s.evaluate(p);
    // Smoothly weld anatomical transitions into a *single* skin mesh.
    const k=.015;
    const h=clamp(.5+.5*(d-result)/k,0,1);
    result=d*(1-h)+result*h-k*h*(1-h);
  }
  return result;
}
function meshImplicit(shapes,step,maxTriangles){
  const low=[1e6,1e6,1e6],high=[-1e6,-1e6,-1e6];
  const expand=(p,r)=>{
    for(let k=0;k<3;k++){
      low[k]=Math.min(low[k],p[k]-r[k]-.045);
      high[k]=Math.max(high[k],p[k]+r[k]+.045);
    }
  };
  for(const s of shapes){
    if(s.type==="ell")expand(s.center,s.radius);
    else{
      const r=[Math.max(s.rx,s.rz)+.035,Math.max(s.rx,s.rz)+.035,
        Math.max(s.rx,s.rz)+.035];
      expand(s.va,r);expand(s.vb,r);
    }
  }
  const dim=low.map((n,k)=>Math.ceil((high[k]-n)/step)+1);
  if(dim.reduce((a,v)=>a*v,1)>400000)throw Error("Anatomy mesh grid too large "+dim);
  const [nx,ny,nz]=dim;
  const gid=(x,y,z)=>(z*ny+y)*nx+x;
  const xyz=(x,y,z)=>[low[0]+x*step,low[1]+y*step,low[2]+z*step];
  const field=new Float32Array(nx*ny*nz);
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)
    field[gid(x,y,z)]=signedDistance(xyz(x,y,z),shapes);
  const points=[],normals=[],triangles=[],cache=new Map();
  function makeVertex(idA,idB,pa,pb,da,db){
    const key=idA<idB?idA+":"+idB:idB+":"+idA;
    let v=cache.get(key);
    if(v!==undefined)return v;
    const t=clamp(da/(da-db),0,1);
    const p=add(pa,mul(sub(pb,pa),t));
    const eps=step*.45;
    const g=[0,1,2].map(k=>{
      const plus=p.slice(),minus=p.slice();plus[k]+=eps;minus[k]-=eps;
      return signedDistance(plus,shapes)-signedDistance(minus,shapes);
    });
    v=points.length;points.push(p);normals.push(norm(g));cache.set(key,v);
    return v;
  }
  function addTriangle(a,b,c){
    if(a===b||b===c||c===a)return;
    const p=points[a],q=points[b],r=points[c];
    const normal=cross(sub(q,p),sub(r,p)),out=add(add(normals[a],normals[b]),normals[c]);
    if(dot(normal,out)<0){triangles.push(a,c,b);}else{triangles.push(a,b,c);}
  }
  const tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
  for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
    const corners=[
      [x,y,z],[x+1,y,z],[x+1,y+1,z],[x,y+1,z],
      [x,y,z+1],[x+1,y,z+1],[x+1,y+1,z+1],[x,y+1,z+1]];
    const ids=corners.map(v=>gid(...v)),ds=ids.map(id=>field[id]);
    if(ds.every(v=>v>=0)||ds.every(v=>v<0))continue;
    const coords=corners.map(c=>xyz(...c));
    const intersection=(i,j)=>makeVertex(ids[i],ids[j],coords[i],coords[j],ds[i],ds[j]);
    for(const t of tetra){
      const inside=t.filter(i=>ds[i]<0),outside=t.filter(i=>ds[i]>=0);
      if(inside.length===1){
        const a=inside[0];addTriangle(...outside.map(b=>intersection(a,b)));
      }else if(inside.length===3){
        const b=outside[0];addTriangle(...inside.map(a=>intersection(a,b)));
      }else if(inside.length===2){
        const [a,b]=inside,[c,d]=outside;
        const v0=intersection(a,c),v1=intersection(a,d),
          v2=intersection(b,c),v3=intersection(b,d);
        addTriangle(v0,v1,v2);addTriangle(v1,v3,v2);
      }
    }
    if(triangles.length>maxTriangles*3)throw Error("Geometry budget exceeded");
  }
  if(points.length<1500||triangles.length<3000)
    throw Error("Body mesh missing geometry: "+points.length);
  return {points,normals,triangles,grid:dim};
}
function skinVertices(points,shapes,pose,skin){
  const jointIndex=new Map(skin.joints.map((n,i)=>[poseNodeName(n),i]));
  function poseNodeName(index){return pose.source.nodes[index].name;}
  const indices=[],weights=[];
  for(const p of points){
    let best=null,bestDist=Infinity;
    for(const s of shapes){
      const d=Math.abs(s.evaluate(p));
      if(d<bestDist){bestDist=d;best=s;}
    }
    const influence=new Map();
    const set=(bone,weight)=>{
      const index=jointIndex.get(bone);
      if(index===undefined)throw Error("GLB skin missing joint "+bone);
      influence.set(index,(influence.get(index)||0)+weight);
    };
    if(best.type==="ell"){
      set(best.joint,1);
    }else{
      const v=sub(p,best.va),t=clamp(dot(v,best.axis)/(best.L||.01),0,1);
      const proximal=best.start,distal=best.end;
      const distalWeight=.64*clamp((t-.48)/.52,0,1);
      set(proximal,1-distalWeight);set(distal,distalWeight);
    }
    const row=[...influence.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4);
    const sum=row.reduce((s,v)=>s+v[1],0);
    const j=row.map(a=>a[0]),w=row.map(a=>a[1]/sum);
    while(j.length<4){j.push(0);w.push(0);}
    indices.push(j);weights.push(w);
  }
  return {indices,weights};
}
function createHumanGlb(variant){
  const filename="public/assets/racer/seamless-"+variant+".glb";
  const {doc,bin}=parseGlb(filename);
  const p=pose(doc);p.source=doc;
  const bodyNodeIndex=doc.nodes.findIndex(n=>n.name==="ONE seamless fused skinned athlete body");
  if(bodyNodeIndex<0)throw Error("Original connected body node missing");
  const body=doc.nodes[bodyNodeIndex];
  if(body.mesh===undefined||body.skin===undefined)
    throw Error("Seamless body must be a skinned mesh node");
  const original=doc.meshes[body.mesh];
  if(!original?.primitives?.length)throw Error("Original body primitives missing");
  const skin=doc.skins[body.skin];
  const useCapsuleExperiment=process.env.REBUILD_SDF==="1";
  const shapes=useCapsuleExperiment?constructShapes(p):null;
  const data=useCapsuleExperiment?
    meshImplicit(shapes,variant==="mobile"?.036:.024,
      variant==="mobile"?75000:160000):
    reconstructOriginalSurface(doc,bin,original.primitives[0],skin,p);
  const meshToLocal=inverseAffine(p.world[bodyNodeIndex]);
  const points=useCapsuleExperiment?
    data.points.map(v=>transform(meshToLocal,v)):data.points;
  const normals=useCapsuleExperiment?
    data.normals.map(v=>transformNormalToLocal(p.world[bodyNodeIndex],v)):
    data.normals;
  const uv=useCapsuleExperiment?
    data.points.map(v=>[(Math.atan2(v[2],v[0])/(Math.PI*2)+.5),
      clamp((v[1]-.2)/1.7,0,1)]):data.uv;
  const inf=useCapsuleExperiment?
    skinVertices(data.points,shapes,p,skin):data.influences;
  const appended=[];let totalBytes=bin.length;
  const views=doc.bufferViews??[],access=doc.accessors??[];
  function pushBuffer(data,component,type,semantic){
    const count=data.length;
    const width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[type];
    const flat=type==="SCALAR"?data:data.flat();
    const bytes=component===5126?4:component===5125?4:2;
    while(totalBytes%4){appended.push(Buffer.from([0]));totalBytes++;}
    const chunk=Buffer.alloc(flat.length*bytes);
    const view=new DataView(chunk.buffer,chunk.byteOffset,chunk.byteLength);
    for(let i=0;i<flat.length;i++){
      if(component===5126)view.setFloat32(i*4,flat[i],true);
      else if(component===5125)view.setUint32(i*4,flat[i],true);
      else if(component===5123)view.setUint16(i*2,flat[i],true);
      else throw Error("Unexpected component "+component);
    }
    const vi=views.length;views.push({buffer:0,byteOffset:totalBytes,byteLength:chunk.length});
    totalBytes+=chunk.length;appended.push(chunk);
    const accessor={bufferView:vi,componentType:component,count,type};
    if(semantic==="POSITION"){
      accessor.min=[0,1,2].map(k=>Math.min(...data.map(v=>v[k])));
      accessor.max=[0,1,2].map(k=>Math.max(...data.map(v=>v[k])));
    }
    access.push(accessor);return access.length-1;
  }
  const attrs={
    POSITION:pushBuffer(points,5126,"VEC3","POSITION"),
    NORMAL:pushBuffer(normals,5126,"VEC3"),
    TEXCOORD_0:pushBuffer(uv,5126,"VEC2"),
    JOINTS_0:pushBuffer(inf.indices,5123,"VEC4"),
    WEIGHTS_0:pushBuffer(inf.weights,5126,"VEC4"),
  };
  const indices=pushBuffer(data.triangles,5125,"SCALAR");
  const material=original.primitives[0].material;
  original.primitives=[{attributes:attrs,indices,material,mode:4}];
  original.name="Rebuilt human body — sculpted source anatomy + repaired 25-bone skin";
  const old=body.name;
  body.name=old; // preserve every findByName call in PlayCanvas
  doc.asset={...doc.asset,generator:"Alpine Ski Pro anatomical 25-bone surface rebuild"};
  doc.extras={...doc.extras,humanRebuild:{
    version:1,variant,vertices:points.length,triangles:data.triangles.length/3,
    joints:skin.joints.length,grid:data.grid??null,
    source:filename,method:useCapsuleExperiment?"implicit-prototype":"anatomical-source-skin-reconstruction"}};
  doc.buffers[0].byteLength=totalBytes;
  const json=Buffer.from(JSON.stringify(doc));
  const jsonPad=(4-json.length%4)%4;
  const paddedJson=Buffer.concat([json,Buffer.alloc(jsonPad,32)]);
  while(totalBytes%4){appended.push(Buffer.from([0]));totalBytes++;}
  doc.buffers[0].byteLength=totalBytes;
  const finalJson=Buffer.from(JSON.stringify(doc));
  const finalPad=(4-finalJson.length%4)%4;
  const finalJsonPadded=Buffer.concat([finalJson,Buffer.alloc(finalPad,32)]);
  const newBin=Buffer.concat([bin,...appended]);
  if(newBin.length!==totalBytes)throw Error("Binary payload length mismatch");
  const len=12+8+finalJsonPadded.length+8+newBin.length;
  const out=Buffer.alloc(12);
  out.write("glTF",0,"ascii");out.writeUInt32LE(2,4);out.writeUInt32LE(len,8);
  const header=Buffer.alloc(8);header.writeUInt32LE(finalJsonPadded.length,0);
  header.write("JSON",4,"ascii");
  const binHead=Buffer.alloc(8);binHead.writeUInt32LE(newBin.length,0);
  binHead.write("BIN\0",4,"ascii");
  const target="public/assets/racer/seamless-human-"+variant+".glb";
  writeFileSync(target,Buffer.concat([out,header,finalJsonPadded,binHead,newBin]));
  console.info("[HUMAN_MESH_REBUILT]",JSON.stringify({
    target,bytes:len,vertices:points.length,triangles:data.triangles.length/3,
    skinBlend:inf.weights.filter(w=>w.filter(v=>v>.08).length>1).length,
    method:useCapsuleExperiment?"implicit-prototype":"anatomical-source-skin-reconstruction",
    grid:data.grid??null,boneCount:skin.joints.length}));
}
for(const variant of ["mobile","full"])createHumanGlb(variant);
