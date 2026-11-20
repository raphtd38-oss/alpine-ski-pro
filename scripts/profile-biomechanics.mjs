import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try {
 const page=await browser.newPage({viewport:{width:1100,height:720}});
 page.setDefaultTimeout(120000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const began=Date.now();
 await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:5173'}/?quality=low&racer=mobile&renderer=webgl2`);
 await page.locator('#loading').waitFor({state:'detached',timeout:90000});
 const loadMs=Date.now()-began;
 await page.locator('#play').click({noWaitAfter:true});
 await page.evaluate(()=>{window.__ski.start();window.__ski.freezeSimulation(true);window.__ski.step(1000,{steer:0,tuck:true,brake:false,jump:false});});
 const result=await page.evaluate(async()=>{
   const frames=[];let last=performance.now();
   for(let i=0;i<40;i++){
     await new Promise(requestAnimationFrame);
     const now=performance.now();if(i>4) frames.push(now-last);last=now;
   }
   const sorted=[...frames].sort((a,b)=>a-b);
   const averageMs=frames.reduce((a,b)=>a+b,0)/frames.length;
   const physics=Array.from({length:5},()=>window.__ski.profilePhysics(12000));
   const metrics=window.__ski.getRenderMetrics();
   const gl=document.querySelector('canvas').getContext('webgl2');
   const ext=gl?.getExtension('WEBGL_debug_renderer_info');
   return {samples:frames.length,averageMs,p50Ms:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],fps:1000/averageMs,
     ...metrics,physics,device:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown'};
 });
 const report={environment:'Linux cloud Chromium, software SwiftShader; NOT a PC/mobile GPU benchmark',quality:'low',viewport:[1100,720],loadMs,...result,errors};
 writeFileSync(process.env.OUT_FILE || 'docs/references/2026-11-18/profile.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
