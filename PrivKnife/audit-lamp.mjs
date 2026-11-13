import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const results=[];
for(const lang of ['en','es']) for(const width of [390,1440]) {
 const b=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const p=await b.newPage();await p.setViewport({width,height:900,isMobile:width===390,hasTouch:width===390});
 await p.evaluateOnNewDocument(l=>{try{localStorage.setItem('privknife_lang',l)}catch{}},lang);
 const errors=[],failed=[],pending=new Set();p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>pending.add(r.url()));p.on('requestfinished',r=>pending.delete(r.url()));p.on('requestfailed',r=>{pending.delete(r.url());failed.push({url:r.url(),error:r.failure()})});
 const start=Date.now();const row={route:'tools/parametric-lamp-designer',lang,width,errors,failed};
 try{
 await p.goto('http://localhost:4200/'+row.route,{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForSelector('app-parametric-lamp-designer h1',{timeout:60000}).catch(()=>p.waitForSelector('h1',{timeout:1000}));
 await p.waitForNetworkIdle({idleTime:500,timeout:15000}).catch(e=>row.networkIdleWarning=e.message);
 Object.assign(row,await p.evaluate(()=>({h1:document.querySelector('h1')?.innerText,documentLang:document.documentElement.lang,title:document.title,overflow:document.documentElement.scrollWidth>innerWidth+1,ads:[...document.querySelectorAll('[class*="ad-slot"]')].map(e=>e.className),canvases:[...document.querySelectorAll('canvas')].map(e=>({width:e.width,height:e.height,rect:e.getBoundingClientRect().toJSON()})),text:document.body.innerText,buttons:[...document.querySelectorAll('button')].map(e=>e.innerText)})));
 await p.screenshot({path:`../audit-evidence/lamp-${lang}-${width}.png`,fullPage:true,timeout:30000});
 }catch(e){row.error=e.message}
 row.elapsedMs=Date.now()-start;row.pendingRequests=[...pending];results.push(row);fs.writeFileSync('../audit-evidence/lamp-recheck.json',JSON.stringify(results,null,2));console.log(JSON.stringify({lang,width,error:row.error,elapsedMs:row.elapsedMs,errors,failed,pending:row.pendingRequests}));await b.close();
}
