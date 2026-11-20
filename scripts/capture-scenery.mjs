import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const label=process.argv[2] || 'after', quality=process.env.QUALITY || 'medium';
const racer=process.env.RACER || 'mobile';
const viewport={width:Number(process.env.WIDTH || 1280),height:Number(process.env.HEIGHT || 800)};
const out=`docs/references/graphics-v118/${label}-${quality}`;mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try {
 const page=await browser.newPage({viewport}),errors=[];
 page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:5173'}/?quality=${quality}&racer=${racer}&renderer=webgl2`);
 await page.locator('#loading').waitFor({state:'detached',timeout:90000});
 console.log('Loaded',label,quality);
 // Fixed visual fixtures do not exercise input actionability. Actual keyboard,
 // menu clicks and timing are covered by the browser regression suite.
 await page.evaluate(()=>{window.__ski.start();window.__ski.freezeSimulation(true);});
 await page.addStyleTag({content:'#hud,#countdown {visibility:hidden !important}'});
 console.log('Inspection ready');
 const metrics={};
 const stations=[['schuss',100],['forest',1100],['finish',2010]];
 for(const [name,z] of stations.filter(([name])=>!process.env.SECTOR || name===process.env.SECTOR)){
  await page.evaluate(z=>{
   const api=window.__ski,c=api.getCourse();const g=c.gates.reduce((a,b)=>Math.abs(b.z-z)<Math.abs(a.z-z)?b:a);
   api.inspectScenery({t:10,x:g.x,z,heading:0,edge:0,height:0,tuck:.45,fallen:0,vx:0,vz:28,pressure:1,lateralAcceleration:0,load:.5,flex:.4,startPhase:12});
  },z);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.screenshot({path:`${out}/${name}.png`,timeout:90000});
  metrics[name]=await page.evaluate(()=>window.__ski.getRenderMetrics());
  console.log('Captured',name);
 }
 const materials=await page.evaluate(()=>window.__ski.getSceneryMaterials?.() ?? null);
 writeFileSync(`${out}/metrics.json`,JSON.stringify({fixture:'Fixed visual inspection poses, no race or GPU benchmark',quality,racer,viewport,metrics,materials,errors},null,2));
 console.log(JSON.stringify({out,errors}));
}finally{await browser.close();}
