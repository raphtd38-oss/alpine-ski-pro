import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const label = process.argv[2] || 'after';
const out = `docs/references/2026-11-18/${label}`;
mkdirSync(out, {recursive:true});
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const page = await browser.newPage({viewport:{width:1100,height:720}});
const errors=[]; page.on('pageerror', e=>errors.push(e.message));
await page.goto((process.env.BASE_URL || 'http://127.0.0.1:5173') + '/?quality=low&racer=mobile&renderer=webgl2&lighting=sunset');
await page.locator('#loading').waitFor({state:'detached',timeout:90000});
await page.locator('#play').click();
await page.evaluate(()=> {window.__ski.start();window.__ski.freezeSimulation(true);});
const samples={};
for(const [name,edge,height,speed,force] of [['neutral',0,0,28,0],['right',.94,0,28,17],['left',-.94,0,28,-17],['slow',.94,0,1,.02],['flight',.7,1.3,28,0]]){
 const f={t:10,x:0,z:100,heading:0,edge,height,tuck:.45,fallen:0,vx:0,vz:speed,pressure:height?0:1.15,lateralAcceleration:force,load:edge>0?.87:.13,flex:.7,startPhase:12};
 await page.evaluate(f=>window.__ski.inspectPose(f),f);
 await page.waitForTimeout(2500);
 samples[name]=await page.evaluate(()=>window.__ski.getAthletePose());
 await page.screenshot({path:`${out}/${name}.png`});
}
writeFileSync(`${out}/measurements.json`,JSON.stringify({fixture:'Controlled render fixtures, not a recorded race or athlete measurements',samples,errors},null,2));
await browser.close();
console.log(out,errors);
