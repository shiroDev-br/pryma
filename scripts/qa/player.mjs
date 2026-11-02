import { webkit, chromium } from 'playwright';
const [,,base,out]=process.argv; let fails=0; const check=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m); if(!c) fails++;};
const b=await webkit.launch();
const ctx=await b.newContext({viewport:{width:960,height:540}});await ctx.addInitScript(()=>{try{sessionStorage.setItem('iptv.introShown','1')}catch{}});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
await p.goto(base+'/login',{waitUntil:'networkidle'});const i=await p.$$('input');await i[0].fill('demo');await i[1].fill('password');await p.keyboard.press('Enter');await p.waitForURL(base+'/',{timeout:15000});await p.waitForTimeout(800);
const v=()=>p.evaluate(()=>{const v=document.querySelector('video');return v?{t:v.currentTime,d:v.duration,paused:v.paused,rs:v.readyState,vol:v.volume,muted:v.muted,err:v.error?.code,wrapped:!!v.closest('.plyr'),src:!!v.currentSrc}:null});
await p.goto(base+'/medias/the-distant-odyssey-s01e02-m1',{waitUntil:'load'});
let s=null;for(let n=0;n<40;n++){await p.waitForTimeout(500);s=await v();if(s&&s.t>0.5&&!s.paused)break;}
console.log('     estado',JSON.stringify(s));
check(s&&s.t>0.5&&!s.paused,'player: vídeo toca sozinho');check(s&&!s.wrapped,'player: <video> sem wrapper de biblioteca');
await p.screenshot({path:out+'/player-hud.png'});
const hud=()=>p.evaluate(()=>!!document.querySelector('[aria-label="Voltar"]'));
check(await hud(),'player: HUD visível ao abrir');await p.waitForTimeout(4200);check(!(await hud()),'player: HUD some sozinho tocando');
const t0=(await v()).t;await p.keyboard.press('ArrowRight');await p.waitForTimeout(120);await p.keyboard.press('ArrowRight');await p.waitForTimeout(120);
const badge=await p.evaluate(()=>document.querySelector('[role="status"] .text-2xl')?.textContent?.trim());check(badge==='+20s','player: →→ acumula o selo ('+badge+')');check(await hud(),'player: tecla traz o HUD de volta');
await p.waitForTimeout(1500);const t1=(await v()).t;check(t1-t0>=18,'player: seek único de +20s ('+(t1-t0).toFixed(1)+'s)');
let st;
await p.evaluate(()=>document.activeElement?.blur?.());await p.keyboard.press('Enter');await p.waitForTimeout(600);st=await v();const overlay=await p.evaluate(()=>!!document.querySelector('[aria-label="Informações da mídia"]'));console.log('     paused',st.paused,'overlay',overlay);
check(st.paused&&overlay,'player: OK pausa e mostra o card');await p.screenshot({path:out+'/player-pause.png'});
await p.click('text=/Continuar assistindo|Assistir agora/');await p.waitForTimeout(700);st=await v();check(!st.paused,'player: card retoma');
await p.evaluate(()=>{const v=document.querySelector('video');v.volume=0.4;});await p.waitForTimeout(200);const saved=await p.evaluate(()=>localStorage.getItem('iptv-plyr'));check(saved&&saved.includes('0.4'),'player: volume salvo ('+saved+')');
await p.reload({waitUntil:'load'});await p.waitForTimeout(2500);st=await v();check(Math.abs(st.vol-0.4)<0.01,'player: volume restaurado ('+st.vol+')');
const held=await p.evaluateHandle(()=>document.querySelector('video'));
await p.goto(base+'/browse/filmes',{waitUntil:'load'}).catch(()=>{});
await p.goBack();await p.waitForTimeout(1500);
check(errs.length===0,'player: sem erros '+[...new Set(errs)].join('|'));
// saída por navegação interna: decoder solto
await p.evaluate(()=>{window.__v=document.querySelector('video')});await p.evaluate(()=>window.useNuxtApp?.()) ;
await p.keyboard.press('ArrowUp');await p.waitForTimeout(300);const back=await p.$('[aria-label="Voltar"]');if(back){await back.click();await p.waitForTimeout(1200);const r=await p.evaluate(()=>({src:window.__v?.getAttribute('src'),rs:window.__v?.readyState,paused:window.__v?.paused,path:location.pathname}));console.log('     após sair',JSON.stringify(r));check(r.paused!==false&&r.rs===0,'player: ao sair o <video> antigo fica vazio (decoder solto)');}
await b.close();console.log(fails?`\n${fails} FALHA(S)`:'\nTUDO OK');
