import { chromium } from 'playwright';
import fs from 'fs';
const [,, base, outDir, ...names] = process.argv;
const VIEW = { phoneP:[390,844,3,true], phoneL:[844,390,3,true], smallP:[360,640,3,true], tablet:[820,1180,2,true], fire:[960,540,2,false], tv:[1920,1080,1,false] };
const ROUTES = (process.env.ROUTES||'/,/browse/tv,/browse/filmes,/browse/series,/search,/about,/cache,/background,/team,/pricing,/youtube,/mtv,/musica,/login').split(',');
fs.mkdirSync(outDir,{recursive:true});
const b = await chromium.launch();
const views = names.length?names:Object.keys(VIEW);
for (const name of views) {
  const [width,height,dsf,mobile]=VIEW[name];
  const ctx = await b.newContext({viewport:{width,height},deviceScaleFactor:dsf>2?2:dsf,isMobile:mobile,hasTouch:mobile});
  await ctx.addInitScript(()=>{try{sessionStorage.setItem('iptv.introShown','1')}catch{}});
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,140)));
  // login mock
  await p.goto(base+'/login',{waitUntil:'networkidle'}).catch(()=>{});
  const inputs = await p.$$('input');
  if (inputs.length>=2){ await inputs[0].fill(process.env.U||'demo'); await inputs[1].fill(process.env.P||'demo1234'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);}
  for (const r of ROUTES){
    if (r==='/login') continue;
    await p.goto(base+r,{waitUntil:'load'}).catch(()=>{}); await p.waitForTimeout(+(process.env.WAIT||1800));
    const m = await p.evaluate(()=>{const de=document.documentElement;const over=[];const vw=innerWidth;for(const el of document.querySelectorAll('body *')){const s=getComputedStyle(el);if(s.position==='fixed'||s.visibility==='hidden')continue;const rc=el.getBoundingClientRect();if(rc.width>0&&rc.right>vw+2&&!el.closest('[class*=overflow-x],[class*=rail],.stage__viewport,.mountain,.app-bg')){over.push((el.tagName+'.'+String(el.className).slice(0,40)).trim());if(over.length>2)break;}}return{sw:de.scrollWidth,cw:de.clientWidth,sh:de.scrollHeight,font:getComputedStyle(de).fontSize,path:location.pathname,over};});
    console.log(name.padEnd(7),r.padEnd(16),'->',m.path.padEnd(14),'font',m.font.padEnd(9),'scrollW',m.sw,'/',m.cw, m.sw>m.cw+1?'⚠️ OVERFLOW':'', m.over.length?JSON.stringify(m.over):'');
    await p.screenshot({path:`${outDir}/${name}${r.replace(/\//g,'_')}.png`});
  }
  if(errs.length) console.log(name,'pageerrors',[...new Set(errs)]);
  await ctx.close();
}
await b.close();
