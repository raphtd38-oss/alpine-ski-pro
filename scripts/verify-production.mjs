import {chromium} from '@playwright/test';
import {writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {dirname} from 'node:path';
const url=process.argv[2] || 'http://127.0.0.1:4174/?quality=low&racer=mobile&renderer=webgl2';
const prefix=process.argv[3] || 'test-results/production';
mkdirSync(dirname(prefix),{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try {
 const page=await browser.newPage({viewport:{width:1100,height:720}});
 const errors=[], failed=[], scripts=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});if(r.request().resourceType()==='script')scripts.push(r.url());});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('#loading').waitFor({state:'detached',timeout:90000});
 const devApi=await page.evaluate(()=>typeof window.__ski);
 if(devApi!=='undefined')throw new Error('DEV API exposed in production');
 await page.locator('#play').click();
 await page.waitForFunction(()=>document.querySelector('#time').textContent!=='00:00.00',{},{timeout:60000});
 await page.keyboard.down('ArrowRight');await page.keyboard.down('w');
 await page.waitForTimeout(1600);await page.keyboard.up('ArrowRight');await page.keyboard.up('w');
 const hud=await page.evaluate(()=>Object.fromEntries(['time','speed','gates','edge-label','renderer-info'].map(id=>[id,document.getElementById(id)?.textContent])));
 if(!hud.gates?.includes('/ 42'))throw new Error('Wrong course gate count');
 await page.screenshot({path:prefix+'.png',timeout:90000});
 const report={url,devApi,hud,errors,failed,scripts};
 writeFileSync(prefix+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 if(errors.length||failed.length)process.exitCode=1;
} finally {await browser.close();}
