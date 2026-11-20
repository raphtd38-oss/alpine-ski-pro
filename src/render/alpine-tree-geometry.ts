/** Original batched conifer geometry. Open whorls of volumetric branch clusters
 * replace stacked solid cones. No billboards, downloaded textures or per-tree entities. */
export interface TreeMesh { p: number[]; i: number[]; colors: number[] }
export function appendAlpineTree(mesh: TreeMesh, x:number,y:number,z:number,
  height:number, random:()=>number, detail:number, larch=false): void {
  const {p,i,colors}=mesh;
  const vertex=(a:number,b:number,c:number,tint:number[])=>{
    const n=p.length/3;p.push(a,b,c);colors.push(...tint,1);return n;
  };
  const cluster=(cx:number,by:number,cz:number,dx:number,dz:number,length:number,
    width:number,thick:number,tint:number[],snowy:boolean)=>{
    const mx=cx+dx*length*.55,mz=cz+dz*length*.55,my=by-length*.16;
    const start=vertex(cx,by,cz,tint);
    vertex(mx-dz*width,my,mz+dx*width,tint);
    vertex(cx+dx*length,by-length*.22+thick,cz+dz*length,tint);
    vertex(mx+dz*width,my,mz-dx*width,tint);
    vertex(mx,my+thick,mz,snowy?[.83,.89,.92]:tint.map(v=>v*1.25));
    vertex(mx,my-thick,mz,tint.map(v=>v*.65));
    for(let j=0;j<4;j++){
      const k=(j+1)%4;i.push(start+j,start+k,start+4,start+k,start+j,start+5);
    }
  };
  const lean=(random()-.5)*height*.05;
  const yaw=random()*Math.PI*2;
  const bark=[.24,.17,.11];
  const n=p.length/3, r=height*.013;
  for(const t of [0,1]) for(let j=0;j<4;j++){
    const a=j*Math.PI/2+yaw;
    vertex(x+Math.cos(a)*r*(1-t*.8)+lean*t,y+height*t,z+Math.sin(a)*r*(1-t*.8),bark);
  }
  for(let j=0;j<4;j++){const k=(j+1)%4;i.push(n+j,n+k,n+4+j,n+k,n+4+k,n+4+j);}
  const tiers=detail+3;
  for(let tier=0;tier<tiers;tier++){
    const t=(tier+1)/(tiers+1), by=y+height*t;
    const branches=detail+2, phase=yaw+tier*2.39996;
    for(let b=0;b<branches;b++){
      if(random()<.12) continue;
      const a=phase+b*Math.PI*2/branches+(random()-.5)*.3;
      const length=height*.24*Math.pow(1-t,.7)*(.65+random()*.6);
      const dx=Math.cos(a),dz=Math.sin(a),cx=x+lean*t;
      const width=length*(larch?.035:detail>=5?.10:.23), thick=height*(larch?.004:.018);
      const tint=larch?[.28,.22,.13]:[.055+random()*.02,.13+random()*.05,.10+random()*.03];
      const snowy=!larch&&random()<.32;
      cluster(cx,by,z,dx,dz,length,width,thick,tint,snowy);
      // Only foreground trees get secondary needle sprays. The thinner main
      // whorl and alternating offshoots break the old diamond-shaped silhouette.
      if(detail>=5) for(let twig=1;twig<=2;twig++) for(const side of [-1,1]){
        const t=twig*.29, a2=a+side*(.65+random()*.25);
        const twigLength=length*(.44-t*.25)*(.85+random()*.3);
        cluster(cx+dx*length*t,by-length*.16*t,z+dz*length*t,
          Math.cos(a2),Math.sin(a2),twigLength,
          twigLength*(larch?.035:.23),thick*.65,tint,snowy&&twig===1);
      }
    }
  }
}
