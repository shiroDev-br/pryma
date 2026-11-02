// Fluxos: D-pad em viewport Fire Stick e toque em celular. Saída: linhas ok/FAIL + screenshots.
import { chromium } from 'playwright'; import fs from 'fs';
const [,,base,out]=process.argv; fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch(); let fails=0;
const check=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m); if(!c) fails++;};
async function login(p){await p.goto(base+'/login',{waitUntil:'networkidle'});const i=await p.$$('input');await i[0].fill('demo');await i[1].fill('password');await p.keyboard.press('Enter');await p.waitForURL(base+'/',{timeout:15000});await p.waitForTimeout(1500);}
const active=(p)=>p.evaluate(()=>{const a=document.activeElement;return {tag:a?.tagName,nav:a?.dataset?.nav,label:a?.getAttribute('aria-label'),href:a?.getAttribute('href'),cid:a?.dataset?.channelId,text:(a?.textContent||'').trim().slice(0,30)}});
// ── Fire Stick
{const ctx=await b.newContext({viewport:{width:960,height:540},deviceScaleFactor:2});await ctx.addInitScript(()=>{try{sessionStorage.setItem('iptv.introShown','1')}catch{}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await login(p);const k=async(x,t=250)=>{await p.keyboard.press(x);await p.waitForTimeout(t)};
let a=await active(p);check(/TV ao Vivo/i.test(a.label||''),'home: foco inicial em TV ao Vivo ('+a.label+')');
await k('ArrowRight',400);a=await active(p);check(/Filmes/i.test(a.label||''),'home: → vai para Filmes ('+a.label+')');
await k('ArrowLeft',400);await k('ArrowDown',400);a=await active(p);check(/Jogos do dia|Próximo jogo|Time/i.test(a.label||''),'home: ↓ desce para a barra ('+a.label+')');
await k('ArrowUp',400);a=await active(p);check(a.tag==='A','home: ↑ volta ao carrossel');
await p.goto(base+'/',{waitUntil:'networkidle'});await p.waitForTimeout(1200);
await k('Enter',1800);check(p.url().includes('/browse/tv'),'home: OK abre TV ao vivo');
await p.waitForTimeout(800);a=await active(p);check(a.nav==='sidebar','tv: foco inicial nos grupos ('+a.text+')');
await k('ArrowRight');a=await active(p);check(a.nav==='row','tv: → vai para a lista');const first=a.cid;
await k('ArrowDown');a=await active(p);check(a.nav==='row'&&a.cid!==first,'tv: ↓ anda na lista');const cid=a.cid;
await k('Enter',1200);const rs=await p.evaluate(()=>!!document.querySelector('.live-row[aria-current="true"]'));check(rs,'tv: 1º OK escolhe o canal');
await p.screenshot({path:out+'/fire-tv-selected.png'});
await k('Enter',1000);check(p.url().includes('full=1'),'tv: 2º OK abre tela cheia');
await p.screenshot({path:out+'/fire-tv-full.png'});
await k('ArrowDown',900);const after=await p.evaluate(()=>document.querySelector('.live-row[aria-current="true"]')?.dataset.channelId);check(after&&after!==cid,'tv: ↓ em tela cheia troca de canal');
await k('Escape',800);check(!p.url().includes('full=1'),'tv: Voltar fecha a tela cheia');a=await active(p);check(a.nav==='row','tv: foco volta à linha do canal');
await k('ArrowLeft');a=await active(p);check(a.nav==='sidebar','tv: ← volta aos grupos');
const groups=await p.$$('[data-nav="sidebar"]');
await p.click('[data-group="__espn__"]').catch(()=>{});await p.waitForTimeout(1200);const espn=await p.evaluate(()=>document.querySelectorAll('[data-nav="row"]').length);console.log('     grupo ESPN (mock) linhas:',espn);
await p.goto(base+'/browse/filmes',{waitUntil:'networkidle'});await p.waitForTimeout(800);a=await active(p);check(a.tag==='A'||a.label,'filmes: foco inicial num card ('+(a.label||a.text)+')');
await k('ArrowDown');await k('ArrowRight');a=await active(p);check(!!a.href,'filmes: ↓→ anda no trilho');
await p.goto(base+'/browse/filmes/todos',{waitUntil:'networkidle'}).catch(()=>{});await p.waitForTimeout(1000);a=await active(p);const gridFocus=await p.evaluate(()=>!!document.activeElement?.matches?.('[data-media-card]'));check(gridFocus,'categoria: foco inicial no 1º card (carga direta)');
await k('ArrowRight');const h1=(await active(p)).href;console.log('     card',h1);await k('Enter',1800);const det=p.url();check(/detalhes|series|medias/.test(det),'categoria: OK abre o título ('+det.replace(base,'')+')');
await p.goBack();await p.waitForTimeout(1400);a=await active(p);check(a.href===h1,'categoria: Voltar devolve o foco ao card');
await p.goto(base+'/about',{waitUntil:'networkidle'});check(errs.length===0,'fire: sem erros de página '+[...new Set(errs)].join(' | ').slice(0,200));await ctx.close();}
// ── celular
{const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});await ctx.addInitScript(()=>{try{sessionStorage.setItem('iptv.introShown','1')}catch{}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await login(p);
await p.screenshot({path:out+'/phone-home.png',fullPage:true});
const tiles=await p.$$('.home-tile');check(tiles.length===9,'celular: home em grade com 9 destinos');
const tv=await p.$('.home-tile[href="/browse/tv"]');await tv.tap();await p.waitForTimeout(2000);check(p.url().includes('/browse/tv'),'celular: toque abre TV ao vivo');
const sw=await p.evaluate(()=>document.documentElement.scrollWidth);check(sw<=390,'celular: TV ao vivo sem estouro lateral ('+sw+')');
await p.screenshot({path:out+'/phone-tv-empty.png'});
const row=await p.$('[data-nav="row"]');await row.tap();await p.waitForTimeout(1400);await p.screenshot({path:out+'/phone-tv-selected.png'});
const box=await (await p.$('.pv-thumb')).boundingBox();check(box&&box.width>300&&box.height>150,'celular: prévia aparece no topo ('+JSON.stringify(box&&{w:box.width|0,h:box.height|0,y:box.y|0})+')');
await p.evaluate(()=>window.scrollTo(0,900));await p.waitForTimeout(400);const box2=await (await p.$('.pv-thumb')).boundingBox();check(box2.y>=0&&box2.y<100,'celular: prévia fica fixa ao rolar (y='+(box2.y|0)+')');await p.screenshot({path:out+'/phone-tv-scrolled.png'});
await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(200);
await (await p.$('.pv-thumb')).tap();await p.waitForTimeout(900);check(p.url().includes('full=1'),'celular: toque na prévia abre tela cheia');
await p.screenshot({path:out+'/phone-tv-full.png'});
const fb=await (await p.$('.pv-thumb')).boundingBox();check(fb.width===390&&fb.y===0,'celular: tela cheia cobre a tela');
await p.goBack();await p.waitForTimeout(600);
await p.goto(base+'/browse/filmes/todos',{waitUntil:'networkidle'});await p.waitForTimeout(800);await p.screenshot({path:out+'/phone-cat.png'});
const cols=await p.evaluate(()=>{const g=document.querySelector('[data-media-grid]');return g?getComputedStyle(g).gridTemplateColumns.split(' ').length:0});check(cols>=2&&cols<=3,'celular: grade de títulos com '+cols+' colunas');
const href=await p.evaluate(()=>document.querySelector('[data-media-card]')?.getAttribute('href'));await p.goto(base+href,{waitUntil:'networkidle'});await p.waitForTimeout(1200);await p.screenshot({path:out+'/phone-detail.png'});
check((await p.evaluate(()=>document.documentElement.scrollWidth))<=390,'celular: detalhe sem estouro');
check(errs.length===0,'celular: sem erros de página '+[...new Set(errs)].join(' | ').slice(0,200));await ctx.close();}
await b.close();console.log(fails?`\n${fails} FALHA(S)`:'\nTUDO OK');
