import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const src=fs.readFileSync('src/app/app.routes.ts','utf8');
const routes=[...src.matchAll(/path: '(tools\/[^']+)'[\s\S]*?(?=\n  \},)/g)].filter(m=>m[0].includes('loadComponent')).map(m=>m[1]);
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=JSON.parse(fs.readFileSync('../audit-evidence/browser.json'));
for(const lang of ['en','es']) for(const width of [390,1440]) {
const page=await browser.newPage();await page.setViewport({width,height:900,isMobile:width===390,hasTouch:width===390});
await page.evaluateOnNewDocument(l=>{try{localStorage.setItem('privknife_lang',l)}catch{}},lang);
for(const route of routes){
if(route==='tools/parametric-lamp-designer') continue;
const prior=results.filter(r=>r.route===route && r.lang===lang && r.width===width).at(-1); if(prior && !prior.error) continue;
const errors=[];const handler=e=>errors.push(e.message);page.on('pageerror',handler);
try{await page.goto('http://localhost:4200/'+route,{waitUntil:'networkidle0',timeout:30000});
const data=await page.evaluate(()=>({title:document.title,lang:document.documentElement.lang,h1:document.querySelector('h1')?.innerText,overflow:document.documentElement.scrollWidth>innerWidth+1,overflowElements:[...document.querySelectorAll('body *')].filter(e=>{let r=e.getBoundingClientRect();return r.width>0&&r.right>innerWidth+2}).slice(0,8).map(e=>e.tagName+'.'+e.className),ads:[...document.querySelectorAll('[class*="ad-slot"],ins.adsbygoogle')].map(e=>({class:e.className,visible:!!e.getBoundingClientRect().height})),text:document.body.innerText}));results.push({route,lang,width,...data,errors});
}catch(e){results.push({route,lang,width,error:e.message,errors});}
page.off('pageerror',handler);fs.writeFileSync('../audit-evidence/browser.json',JSON.stringify(results,null,2));console.log(lang,width,route);
}await page.close();}await browser.close();
