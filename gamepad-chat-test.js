(function chatSource(){
'use strict';
if(window.CR3ChatTest)return;
const css=document.createElement('style');
css.textContent=`
#cr3chat-demo{display:none;position:fixed;inset:0;z-index:7000;overflow:auto;background:rgba(3,12,27,.97);color:white;font:15px system-ui;padding:10px 8px 30px;box-sizing:border-box}
#cr3chat-demo.open{display:block}
#cr3chat-demo .card{box-sizing:border-box;max-width:650px;margin:0 auto;background:#13233b;border:1px solid #4b6f8b;border-radius:17px;padding:14px;box-shadow:0 12px 36px #0009}
#cr3chat-demo h2{margin:0 0 7px;font-size:20px}#cr3chat-demo p{line-height:1.4;margin:5px 0 9px;color:#cbd5e1}
#cr3chat-messages{min-height:60px;max-height:150px;overflow:auto;border-radius:9px;background:#051426;padding:8px;word-wrap:break-word}
#cr3chat-text{box-sizing:border-box;width:100%;min-height:65px;margin:9px 0 4px;background:#081627;color:white;border:1px solid #6297b7;border-radius:9px;padding:9px;font:17px system-ui}
#cr3chat-demo .actions{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
#cr3chat-demo .actions button,#cr3chat-demo .actions a,#cr3chat-demo .keyboard button{display:inline-flex!important;align-items:center;justify-content:center;min-height:42px!important;background:#245071!important;color:white!important;border:1px solid #6b97ad!important;border-radius:9px!important;box-shadow:none!important;padding:7px 10px!important;font:700 13px system-ui!important;text-decoration:none!important}
#cr3chat-demo .actions button.primary{background:#078263!important}
#cr3chat-demo .keyboard{margin-top:8px}
#cr3chat-demo .keyrow{display:flex;gap:3px;justify-content:center;margin:5px 0}
#cr3chat-demo .keyboard button{flex:1 1 0;min-width:0!important;min-height:43px!important;padding:6px 0!important;font-size:clamp(11px,3vw,17px)!important}
#cr3chat-demo .keyboard button.selected{background:#099d78!important;outline:2px solid #bbf7d0!important;outline-offset:1px}
`;
document.head.appendChild(css);
const root=document.createElement('section');root.id='cr3chat-demo';root.setAttribute('aria-label','Clavier manette de démonstration');
root.innerHTML=`
<div class="card">
<h2>💬 Chat — essai clavier Battletron</h2>
<p>Ce chat est une <strong>démonstration locale</strong> : les messages ne sont pas envoyés à Google Apps Script. Le chat réel reste accessible séparément et inchangé.</p>
<div id="cr3chat-messages" aria-live="polite"></div>
<textarea id="cr3chat-text" placeholder="Écris au clavier PC, au tactile Android ou avec la manette…"></textarea>
<div class="actions">
 <button id="cr3chat-kbtoggle" type="button">⌨️ Afficher / masquer clavier</button>
 <button id="cr3chat-send" type="button" class="primary">📨 Envoyer (test)</button>
 <a id="cr3chat-real" href="#" rel="noopener">🌐 Ouvrir le chat réel</a>
 <button id="cr3chat-exit" type="button">✖ Fermer</button>
</div>
<div id="cr3chat-keyboard" class="keyboard"></div>
<p>Manette : L2 ouvrir/fermer • pavé tactile (si reconnu) afficher clavier • joystick/flèches naviguer • A écrire • B effacer • R2 envoyer. Le tactile et les claviers Android/PC restent actifs.</p>
</div>`;
document.body.appendChild(root);
const $=id=>document.getElementById(id);
const textarea=$('cr3chat-text'),messages=$('cr3chat-messages'),keyboardEl=$('cr3chat-keyboard');
let showKb=true,y=0,x=0;
const rows=['AZERTYUIOP','QSDFGHJKLM',"WXCVBN,.'?","1234567890"].map(s=>Array.from(s));
rows.push(['Espace','←','Envoyer']);
function draw(){
 keyboardEl.replaceChildren();
 if(!showKb){keyboardEl.hidden=true;return;}
 keyboardEl.hidden=false;
 rows.forEach((letters,ri)=>{
   const row=document.createElement('div');row.className='keyrow';
   letters.forEach((label,ci)=>{
     const b=document.createElement('button');b.type='button';
     b.className=ri===y&&ci===x?'selected':'';
     b.textContent=label;
     b.addEventListener('click',()=>{y=ri;x=ci;type(label);draw();});
     row.append(b);
   });keyboardEl.append(row);
 });
}
function type(label){
 if(label==='Envoyer'){send();return;}
 if(label==='←'){erase();return;}
 textarea.value+=label==='Espace'?' ':label;
 textarea.dispatchEvent(new Event('input',{bubbles:true}));
 textarea.scrollTop=textarea.scrollHeight;
}
function send(){
 const msg=textarea.value.trim();if(!msg)return;
 const p=document.createElement('div');p.style.cssText='margin:7px 0;padding:7px;background:#1a3953;border-radius:8px';
 p.textContent='🎮 '+msg;messages.append(p);messages.scrollTop=messages.scrollHeight;
 textarea.value='';
}
function erase(){textarea.value=textarea.value.slice(0,-1);}
function move(dx,dy){
 if(!showKb)return;
 y=(y+dy+rows.length)%rows.length;
 x=(x+dx+rows[y].length)%rows[y].length;
 draw();
}
function keyboard(){showKb=!showKb;draw();}
function open(){
 root.classList.add('open');showKb=true;draw();
}
function close(){root.classList.remove('open');}
function toggle(){if(root.classList.contains('open'))close();else open();}
function select(){if(showKb)type(rows[y][x]);}
const url=new URL('https://script.google.com/macros/s/AKfycbzhla8VlrjSomRZaI596ezb0OM887q8NRqBcI34-Pq9iBTL11tjFgf1zd8hSH6bvtkd/exec');
url.searchParams.set('page','chat');url.searchParams.set('pseudo',(localStorage.getItem('cariste_player')||'Joueur').trim()||'Joueur');
$('cr3chat-real').href=url.href;
$('cr3chat-exit').onclick=close;
$('cr3chat-send').onclick=send;
$('cr3chat-kbtoggle').onclick=keyboard;
textarea.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.classList.contains('open')){e.preventDefault();close();}});
draw();
window.CR3ChatTest={open,close,toggle,keyboard,move,select,erase,send,isOpen:()=>root.classList.contains('open')};
})();