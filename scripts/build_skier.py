"""Original Alpine Ski Pro athlete. Deterministic GLB with PBR meshes and a skin.
No external model or textures. Units: metres; +Z forward. Rebuild: npm run assets.
The stylized athletic anatomy is an initial asset, not a photorealistic scan.
"""
import math, struct, json, pathlib
nodes=[]; world=[]; names={}
def joint(name,p,parent=None):
 i=len(nodes);names[name]=i;n={'name':name,'translation':list(p)};nodes.append(n)
 if parent is not None:
  pi=names[parent];nodes[pi].setdefault('children',[]).append(i);w=world[pi];world.append(tuple(p[j]+w[j] for j in range(3)))
 else: world.append(p)
 return i
joint('Armature',(0,0,0));joint('Pelvis',(0,.92,0),'Armature');joint('Spine',(0,.14,.04),'Pelvis');joint('Chest',(0,.22,.08),'Spine');joint('Neck',(0,.12,.06),'Chest');joint('Head',(0,.13,.02),'Neck')
for side,sign in [('L',-1),('R',1)]:
 joint(side+'Hip',(.13*sign,-.02,0),'Pelvis');joint(side+'Knee',(0,-.40,.13),side+'Hip');joint(side+'Ankle',(0,-.38,-.11),side+'Knee')
 joint(side+'Shoulder',(.23*sign,.05,.02),'Chest');joint(side+'Elbow',(.07*sign,-.26,.12),side+'Shoulder');joint(side+'Wrist',(.03*sign,-.23,.14),side+'Elbow')
materials=[]
for name,c,metal,rough in [('Race suit / ember',[.92,.16,.045,1],.05,.48),('Graphite panels',[.022,.045,.063,1],.08,.48),('Ivory bib',[.89,.93,.91,1],0,.8),('Carbon boots',[.035,.045,.055,1],.32,.3),('Helmet',[.89,.93,.92,1],.28,.25),('Amber lens',[.99,.41,.06,1],.85,.12),('Skin',[.67,.42,.28,1],0,.75)]:materials.append({'name':name,'pbrMetallicRoughness':{'baseColorFactor':c,'metallicFactor':metal,'roughnessFactor':rough}})
prims=[];blob=bytearray();views=[];access=[]
def acc(data,kind,typ,component=5126):
 while len(blob)%4:blob.append(0)
 start=len(blob);flat=[v for row in data for v in row] if isinstance(data[0],(list,tuple)) else data
 fmt={5126:'f',5123:'H',5125:'I'}[component];blob.extend(struct.pack('<'+fmt*len(flat),*flat));vi=len(views);views.append({'buffer':0,'byteOffset':start,'byteLength':len(blob)-start})
 a={'bufferView':vi,'componentType':component,'count':len(data),'type':typ}
 if kind=='pos':a.update({'min':[min(p[i] for p in data) for i in range(3)],'max':[max(p[i] for p in data) for i in range(3)]})
 access.append(a);return len(access)-1

def loft(bone,offset,rings,mat,scale=(1,1),segments=18):
 # rings = local y, x radius, z radius, z center. Y-oriented contoured anatomy.
 b=names[bone];o=world[b];pos=[];norm=[];idx=[];joints=[];weights=[]
 for ri,(y,rx,rz,zc) in enumerate(rings):
  for j in range(segments):
   a=j/segments*math.tau;dx=math.cos(a);dz=math.sin(a)
   pos.append((o[0]+offset[0]+dx*rx,o[1]+offset[1]+y,o[2]+offset[2]+zc+dz*rz));norm.append((dx*.9,0,dz*.9));joints.append((b,0,0,0));weights.append((1,0,0,0))
 for r in range(len(rings)-1):
  for j in range(segments):
   a=r*segments+j;b1=r*segments+(j+1)%segments;c=a+segments;d=b1+segments;idx.extend([a,c,b1,b1,c,d])
 # Compute smoothed vertex normals from faces, including shoulder and helmet curvature.
 ns=[[0.,0.,0.] for _ in pos]
 for i in range(0,len(idx),3):
  ia,ib,ic=idx[i:i+3];a,bp,cp=pos[ia],pos[ib],pos[ic];u=[bp[k]-a[k] for k in range(3)];v=[cp[k]-a[k] for k in range(3)];n=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])
  for ix in (ia,ib,ic):
   for k in range(3):ns[ix][k]+=n[k]
 norm=[tuple(v/math.sqrt(sum(x*x for x in n)) if sum(x*x for x in n)>0 else 0 for v in n) for n in ns]
 prims.append({'attributes':{'POSITION':acc(pos,'pos','VEC3'),'NORMAL':acc(norm,'','VEC3'),'JOINTS_0':acc(joints,'','VEC4',5123),'WEIGHTS_0':acc(weights,'','VEC4')},'indices':acc(idx,'','SCALAR',5125),'material':mat})

def ellipsoid(bone,offset,radii,mat):
 rx,ry,rz=radii;r=[]
 for i in range(13):
  a=-math.pi/2+i*math.pi/12;r.append((math.sin(a)*ry,max(.001,math.cos(a)*rx),max(.001,math.cos(a)*rz),0))
 loft(bone,offset,r,mat)
loft('Pelvis',(0,0,0),[(-.13,.10,.08,0),(-.08,.19,.115,0),(.02,.195,.12,0),(.13,.16,.10,.015)],1)
loft('Spine',(0,-.07,0),[(0,.16,.105,0),(.10,.165,.11,.035),(.20,.195,.12,.07),(.29,.21,.115,.09),(.34,.14,.095,.10)],0)
# White race bib on torso, shaped to chest; an original equipment detail.
loft('Chest',(0,-.10,.003),[(-.02,.191,.123,-.025),(.04,.205,.125,-.008),(.12,.193,.111,.018)],2)
ellipsoid('Neck',(0,.015,0),(.065,.10,.064),6)
ellipsoid('Head',(0,0,.015),(.105,.145,.105),6)
ellipsoid('Head',(0,.04,-.01),(.127,.15,.135),4)
ellipsoid('Head',(0,.027,.105),(.113,.052,.041),5)
ellipsoid('Head',(0,-.055,.057),(.111,.033,.075),1)
for side,sign in [('L',-1),('R',1)]:
 loft(side+'Hip',(0,0,0),[(-.43,.072,.068,.13),(-.34,.082,.078,.105),(-.17,.103,.09,.045),(-.025,.115,.10,0),(.03,.085,.075,0)],0)
 loft(side+'Knee',(0,0,0),[(-.37,.049,.051,-.10),(-.22,.07,.066,-.07),(-.09,.075,.073,-.015),(.025,.071,.07,.005)],1)
 ellipsoid(side+'Ankle',(0,.035,.035),(.072,.12,.14),3)
 loft(side+'Shoulder',(0,0,0),[(-.28,.056,.055,.12),(-.18,.069,.063,.075),(-.06,.087,.083,.015),(.035,.075,.067,0)],0)
 loft(side+'Elbow',(0,0,0),[(-.24,.041,.045,.14),(-.13,.053,.057,.08),(.015,.056,.055,0)],1)
 ellipsoid(side+'Wrist',(0,-.018,.02),(.055,.075,.057),3)
# Identity bind rotations; inverse bind matrices translate each global rest joint.
mats=[]
for p in world:mats.append((1,0,0,0,0,1,0,0,0,0,1,0,-p[0],-p[1],-p[2],1))
ibm=acc(mats,'','MAT4');meshnode=len(nodes);nodes.append({'name':'Athlete skinned surface','mesh':0,'skin':0})
gltf={'asset':{'version':'2.0','generator':'Alpine Ski Pro original procedural athlete'},'scene':0,'scenes':[{'nodes':[0,meshnode]}],'nodes':nodes,'skins':[{'joints':list(range(len(world))),'inverseBindMatrices':ibm,'skeleton':0}],'meshes':[{'name':'Tailored race athlete','primitives':prims}],'materials':materials,'buffers':[{'byteLength':len(blob)}],'bufferViews':views,'accessors':access}
j=json.dumps(gltf,separators=(',',':')).encode();j+=b' '*((-len(j))%4);blob+=b'\0'*((-len(blob))%4)
out=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(blob))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(blob),0x004e4942)+blob
pathlib.Path('public/assets/skier.glb').write_bytes(out);print(f'Generated original skinned athlete: {len(out):,} bytes; {len(world)} bones, {len(prims)} PBR surfaces')
