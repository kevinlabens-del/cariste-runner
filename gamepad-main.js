(function mainSource(){
'use strict';
if(window.CR3PadMain)return;
const STORAGE='cr3pad-test-v1',def={jump:0,back:1,retry:2,play:3,volDown:4,volUp:5,chat:6,jumpAlt:7,leaderboard:8,pause:9,mouse:10,fullscreen:11,up:12,down:13,left:14,right:15,keyboard:17};
const names={jump:'Saut A/Croix',back:'Retour B/Rond',retry:'Rejouer X/Carré',play:'Jouer Y/Triangle',volDown:'Volume - L1',volUp:'Volume + R1',chat:'Chat test L2',jumpAlt:'Saut R2',leaderboard:'Classement Share',pause:'Pause Options',mouse:'Souris L3',fullscreen:'Plein écran R3',up:'Haut',down:'Bas',left:'Gauche',right:'Droite',keyboard:'Clavier clic pavé tactile'};
let map={...def};try{const v=JSON.parse(localStorage.getItem(STORAGE)||'null');if(v)for(const k of Object.keys(def))if(Number.isInteger(v[k])&&v[k]>=0)map[k]=v[k];}catch{}
const $=id=>document.getElementById(id);
const css=document.createElement('style');
css.textContent=`
#cr3pad-toggle{position:fixed!important;z-index:3500!important;left:8px;bottom:74px;background:#102538ed!important;color:white!important;border:1px solid #6e96b0!important;border-radius:10px!important;padding:6px 10px!important;min-width:48px!important;min-height:38px!important;font:700 12px system-ui!important;box-shadow:0 2px 9px #0008!important}
#cr3pad-cursor{position:fixed;z-index:8000;display:none;pointer-events:none;border-radius:50%;width:18px;height:18px;background:#2df4ed;border:2px solid white;box-shadow:0 0 9px #00fff9;transform:translate(-50%,-50%)}
#cr3pad-settings{position:fixed;z-index:7500;inset:0;display:none;background:#061425f7;color:white;overflow:auto;padding:15px;font:15px system-ui}
#cr3pad-settings.open{display:block}
#cr3pad-settings .card{max-width:650px;margin:auto;padding:18px;border-radius:15px;background:#142a42;border:1px solid #617e96}
#cr3pad-settings button{background:#294e68!important;color:white!important;border:1px solid #839fb3!important;border-radius:9px!important;padding:8px 10px!important;min-height:39px!important;min-width:75px!important;font:600 13px system-ui!important;margin:3px!important}
#cr3pad-settings button.wait{background:#b57921!important}
#cr3pad-settings .keys{display:flex;flex-wrap:wrap}
#cr3pad-status{font:12px monospace;color:#affbd0;word-break:break-word;margin:12px 0}
`;
document.head.appendChild(css);
const badge=document.createElement('button');badge.id='cr3pad-toggle';badge.type='button';badge.textContent='🎮 Manette ?';document.body.append(badge);
const cursor=document.createElement('div');cursor.id='cr3pad-cursor';document.body.append(cursor);
const menu=document.createElement('section');menu.id='cr3pad-settings';menu.innerHTML='<div class="card"><h2>🎮 Battletron — diagnostic et calibrage</h2><p>Appuie sur chaque ligne, puis sur le bouton correspondant de ta manette. Les affectations sont mémorisées dans ce navigateur. La touche F8 ouvre ce panneau sur PC.</p><div id="cr3pad-status">Recherche de manette…</div><button id="cr3pad-close">Fermer</button><button id="cr3pad-reset">Réglages par défaut</button><div id="cr3pad-keys" class="keys"></div></div>';document.body.append(menu);
let pending='',last=[],gamepadId='',mouse=false,cx=innerWidth/2,cy=innerHeight/2,lastTime=performance.now(),lastNav=0;
const openSettings=v=>{const show=v===undefined?!menu.classList.contains('open'):!!v;menu.classList.toggle('open',show);if(show){mouse=false;cursor.style.display='none';window.CR3ChatTest?.close();}};
badge.onclick=()=>openSettings();
$('cr3pad-close').onclick=()=>openSettings(false);
$('cr3pad-reset').onclick=()=>{map={...def};pending='';try{localStorage.removeItem(STORAGE)}catch{};drawMap();};
function drawMap(){
const el=$('cr3pad-keys');el.replaceChildren();
for(const [k,title] of Object.entries(names)){
 const b=document.createElement('button');b.type='button';b.className=pending===k?'wait':'';
 b.textContent=title+' : '+map[k];b.onclick=()=>{pending=k;drawMap();};el.append(b);
}}
drawMap();
window.addEventListener('keydown',e=>{if(e.key==='F8'){e.preventDefault();openSettings();}if(e.key==='F9'){e.preventDefault();window.CR3ChatTest?.toggle();}if(e.key==='Escape'&&menu.classList.contains('open'))openSettings(false);});
const getPad=()=>{try{return Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected)||null;}catch{return null;}};
const pressed=(p,i)=>i!==undefined&&i>=0&&!!p.buttons[i]&&(p.buttons[i].pressed||p.buttons[i].value>.55);
const edge=(p,k)=>pressed(p,map[k])&&!last[map[k]];
const click=(...ids)=>{for(const id of ids){const el=$(id);if(el&&!el.disabled){el.click();return true;}}return false;};
function key(k){window.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));}
function volume(d){const el=$('musicVolume');if(!el)return;el.value=Math.min(100,Math.max(0,Number(el.value)+d));el.dispatchEvent(new Event('input',{bubbles:true}));}
function toggleMouse(){mouse=!mouse;cursor.style.display=mouse?'block':'none';if(mouse){cx=innerWidth/2;cy=innerHeight/2;cursor.style.left=cx+'px';cursor.style.top=cy+'px';}}
function mouseClick(){const el=document.elementFromPoint(cx,cy);const target=el?.closest('button,a,input,label,textarea,[role="button"]')||el;if(target?.matches?.('input,textarea'))target.focus();else target?.click?.();}
function runGame(p,dt){
if(edge(p,'chat')){window.CR3ChatTest?.open();return;}
if(edge(p,'mouse'))toggleMouse();
if(edge(p,'fullscreen')){if($('gameFrame')?.classList.contains('is-fullscreen'))click('frameExitBtn');else click('frameFullscreenBtn');}
if(mouse){
 const ax=Math.abs(p.axes[0]||0)>.16?p.axes[0]:0,ay=Math.abs(p.axes[1]||0)>.16?p.axes[1]:0;
 cx=Math.max(10,Math.min(innerWidth-10,cx+ax*700*dt));cy=Math.max(10,Math.min(innerHeight-10,cy+ay*700*dt));
 cursor.style.left=cx+'px';cursor.style.top=cy+'px';
 if(edge(p,'jump'))mouseClick();if(edge(p,'back'))toggleMouse();
 if(Math.abs(p.axes[3]||0)>.25)scrollBy(0,p.axes[3]*460*dt);
 return;
}
if(edge(p,'jump')||edge(p,'jumpAlt'))key(' ');
if(edge(p,'play'))click('playBtn','firstPlayBtn');
if(edge(p,'retry'))key('r');
if(edge(p,'pause'))click('pauseBtn');
if(edge(p,'leaderboard'))click('onlineBtn');
if(edge(p,'left'))click('musicPrevBtn');
if(edge(p,'right'))click('musicNextBtn');
if(edge(p,'up'))click('musicPlayBtn');
if(edge(p,'down'))click('musicStopBtn');
if(edge(p,'volDown'))volume(-5);
if(edge(p,'volUp'))volume(5);
}
function runChat(p,now){
const ch=window.CR3ChatTest;
if(edge(p,'chat')){ch.close();return;}
if(edge(p,'keyboard')||edge(p,'mouse'))ch.keyboard();
if(edge(p,'jump'))ch.select();
if(edge(p,'jumpAlt'))ch.send();
if(edge(p,'back'))ch.erase();
if(edge(p,'left'))ch.move(-1,0);
if(edge(p,'right'))ch.move(1,0);
if(edge(p,'up'))ch.move(0,-1);
if(edge(p,'down'))ch.move(0,1);
if(now-lastNav>205){
 const x=p.axes[0]||0,y=p.axes[1]||0;
 if(Math.abs(x)>.75){ch.move(x>0?1:-1,0);lastNav=now;}
 else if(Math.abs(y)>.75){ch.move(0,y>0?1:-1);lastNav=now;}
}}
function loop(now){
const dt=Math.min(.05,Math.max(0,(now-lastTime)/1000));lastTime=now;
const p=getPad();
badge.textContent=p?'🎮 Connectée':'🎮 Manette ?';
if(!p){last=[];gamepadId='';if(menu.classList.contains('open'))$('cr3pad-status').textContent='Aucune manette reconnue. Sur Android, ouvre la page avec Chrome et appuie sur une touche.';}
else{
 if(gamepadId!==p.id){last=[];gamepadId=p.id;}
 if(menu.classList.contains('open')){
  const acts=p.buttons.map((_,i)=>pressed(p,i)?i:null).filter(x=>x!==null);
  $('cr3pad-status').textContent=p.id+' | mapping:'+p.mapping+' | '+p.buttons.length+' boutons | '+p.axes.length+' axes | actifs:'+acts.join(',')+' | axes:'+p.axes.map(v=>v.toFixed(2)).join(',');
  if(pending){const n=acts.find(x=>!last[x]);if(n!==undefined){map[pending]=n;pending='';try{localStorage.setItem(STORAGE,JSON.stringify(map));}catch{}drawMap();}}
 }else if(window.CR3ChatTest?.isOpen())runChat(p,now);
 else runGame(p,dt);
 last=p.buttons.map((_,i)=>pressed(p,i));
}
requestAnimationFrame(loop);
}
if(!navigator.getGamepads)badge.textContent='🎮 Non pris en charge';
requestAnimationFrame(loop);
window.CR3PadMain={openSettings,map};
})();