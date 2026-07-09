
(() => {
  const $ = s => document.querySelector(s);
const OIL_BARREL_OFFSET = 180; // Ecart en px entre palettes et bidon d'huile

  const canvas = $('#game');
  const gameFrame = $('#gameFrame');
  const ctx = canvas.getContext('2d');

  // ===== Audio (beep / crash / bonus / malus) =====
  let audioCtx=null;
  function ensureAudio(){try{if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended') audioCtx.resume();}catch{}}
  function beep(){if(!audioCtx) return; const o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.type='square'; o.frequency.value=880; g.gain.setValueAtTime(0.0001,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.06,audioCtx.currentTime+0.01); g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.09); o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+0.1)}
  function crash(){if(!audioCtx) return; const g=audioCtx.createGain(); g.gain.setValueAtTime(0.18,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.35); const n=audioCtx.createBufferSource(); const sr=audioCtx.sampleRate,len=sr*0.28,buf=audioCtx.createBuffer(1,len,sr),d=buf.getChannelData(0); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len); n.buffer=buf; const bp=audioCtx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=280; bp.Q.value=0.7; n.connect(bp).connect(g).connect(audioCtx.destination); n.start() }
  function giftSound(){
    if(!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const now = audioCtx.currentTime;
    o.type = 'sine';
    o.frequency.setValueAtTime(523.25, now);
    o.frequency.linearRampToValueAtTime(659.25, now + 0.18);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.1, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    o.connect(g).connect(audioCtx.destination);
    o.start(now); o.stop(now + 0.36);
  }
  function malusSound(){
    if(!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const now = audioCtx.currentTime;
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(440, now);
    o.frequency.linearRampToValueAtTime(196, now + 0.22);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    o.connect(g).connect(audioCtx.destination);
    o.start(now); o.stop(now + 0.26);
  }
  window.addEventListener('pointerdown',ensureAudio,{once:true});
  window.addEventListener('keydown',ensureAudio,{once:true});

  // ===== Persistence =====
  const LS_PLAYER='cariste_player'; const LS_BEST_PREFIX='cariste_best_';
  // URL API de scores / pseudos
  const SCORE_API_URL = "https://script.google.com/macros/s/AKfycbw7DhCZAIBRf3200soATYvJHH0ypodz5dNQaltUk86bfTLWPWv7N0y3gDOmivHiQnQ/exec";
  const getPlayer=()=> (localStorage.getItem(LS_PLAYER)||'').trim();
  const setPlayer=n=> localStorage.setItem(LS_PLAYER,n);
  const getBestFor=n=> Number(localStorage.getItem(LS_BEST_PREFIX+n)||0);
  const setBestFor=(n,s)=> localStorage.setItem(LS_BEST_PREFIX+n,String(s));
  // ===== Banque de messages =====
  const LOSE_MESSAGES = [
    "Bouhh… même un escargot aurait survécu plus longtemps.",
    "Tu joues ou tu fais un stage de cascadeur raté ?",
    "Bravo, t’as gagné… un aller simple pour la honte.",
    "Les palettes t’applaudissent… pour ton crash.",
    "On dirait que ton cariste a démissionné.",
    "Game Over sponsorisé par la maladresse.",
    "Même le tutoriel était plus impressionnant.",
    "Ton score fait rire le classement.",
    "C’était beau… enfin, surtout la chute.",
    "Tu viens d’inventer le concept du “fast game over”.",
    "Tes réflexes étaient en RTT ?",
    "Bravo, champion de la gamelle !",
    "Le gyrophare s’est éteint par pitié.",
    "Même la musique a honte de toi.",
    "Félicitations, ton score est officiellement un gag.",
    "Tu viens d’être élu employé du mois… du néant.",
    "On peut appeler ça une performance… catastrophique.",
    "Tu t’es fait manger par les palettes.",
    "Tu veux qu’on rajoute des petites roues stabilisatrices ?",
    "Même la physique du jeu s’est moquée de toi.",
    "Ton pseudo brille en rouge dans le classement : danger public.",
    "Tu viens de signer un CDI en échec.",
    "L’échec est un art… et toi, t’es un artiste.",
    "Game Over express : livraison gratuite.",
    "Si on comptait les défaites, tu serais premier.",
    "Tes points sont partis en vacances.",
    "Même les malus ont eu peur de ton niveau.",
    "Le cariste pleure dans son casque.",
    "Tu viens de battre ton record… de nullité.",
    "Bravo ! On envoie ton score au musée des ratés."
  ];

  const WIN_MESSAGES = [
    "Wouah, enfin quelque chose à montrer à ta mère !",
    "Félicitations, tu viens de faire un miracle.",
    "Les palettes s’inclinent devant ta gloire.",
    "Ton joystick a transpiré mais ça valait le coup.",
    "Tu viens de pulvériser ton ancien toi.",
    "Même le gyrophare danse de joie.",
    "Ton record précédent s’est enfui en pleurant.",
    "Bravo, promotion en “Cariste niveau 2” !",
    "Tu viens de gagner le respect des palettes.",
    "Tes doigts ont enfin trouvé le mode “compétent”.",
    "T’as battu ton record ! On appelle ça : la légende locale.",
    "Même le jeu ne croyait pas en toi.",
    "Les autres joueurs vont avoir peur de ton pseudo.",
    "Bravo, tu passes du rang de boulet à celui de champion.",
    "Ton ancien score a rage quit.",
    "Chapeau, t’as enfin prouvé que tu sais jouer.",
    "Même les malus se sont inclinés.",
    "La victoire te va mieux que la honte.",
    "T’es passé de “touriste” à “boss du quai”.",
    "On t’attend pour signer ton autographe.",
    "Félicitations, tu es la fierté des palettes.",
    "Les autres caristes murmurent ton nom.",
    "Tu viens d’inventer le “style cariste légendaire”.",
    "Ton cariste a sorti le champagne.",
    "Même le classement en ligne t’applaudit.",
    "Bravo, tu deviens officiellement une légende… du dépôt.",
    "La victoire est à toi, profite avant de rechuter.",
    "Tes points ont pris l’ascenseur express.",
    "Ton ancien record est maintenant obsolète.",
    "Tu viens d’écrire l’histoire : “Cariste Runner, chapitre toi”."
  ];

  function randomItem(arr){ return arr[(Math.random()*arr.length)|0]; }

  function nameOrDefault(){
    try{
      const n = (state.playerName || getPlayer() || '').trim();
      return n || 'Joueur';
    }catch(e){
      return 'Joueur';
    }
  }
  function personalizeMessage(msg, name){
    try{
      const who = (name || nameOrDefault()).trim();
      if(!who) return msg;
      if (/{name}/i.test(msg)) return msg.replace(/{name}/gi, who);
      // par défaut: on préfixe proprement avec le pseudo
      return who + " — " + msg;
    }catch(e){
      return (name || 'Joueur') + " — " + msg;
    }
  }



  // ===== DPI fit =====
  let scale=1;
  function isFullscreenGame(){
    return !!(gameFrame && gameFrame.classList.contains('is-fullscreen'));
  }
  function fit(){
    // On garde les coordonnées du jeu en pixels CSS pour éviter l'effet trop petit sur Android installé.
    // En mode plein écran, le canvas prend réellement toute la zone disponible.
    const cssW=Math.max(1, Math.round(canvas.clientWidth || window.innerWidth || 960));
    const cssH=isFullscreenGame()
      ? Math.max(1, Math.round(canvas.clientHeight || window.innerHeight || 320))
      : Math.round(cssW*(320/960));
    canvas.style.height=cssH+'px';
    canvas.width=cssW;
    canvas.height=cssH;
    scale=1;
    if(!state.playing && !state.gameover){ player.y=ground()-player.h; draw(); }
  }
  window.addEventListener('resize',fit);
  window.addEventListener('orientationchange',()=>setTimeout(fit,220));
  setTimeout(fit,0);

  // ===== Constantes gameplay =====
  const GROUND_Y=0.83, GRAVITY=2400, JUMP_V=900, BASE_SPEED=300;
  const MIN_GAP_FLOOR=240;

  const player={x:110,y:0,w:84,h:62,vy:0,onGround:true,wheel:0,beacon:0,jumpCount:0,maxJumps:2};
  const realisticForkliftImg = new Image();
  realisticForkliftImg.decoding = 'async';
  realisticForkliftImg.src = './game/forklift-realistic.png';
  const palletLowImg = new Image();
  palletLowImg.decoding = 'async';
  palletLowImg.src = './game/pallet-low-realistic.png';
  const palletStackedImg = new Image();
  palletStackedImg.decoding = 'async';
  palletStackedImg.src = './game/pallet-stacked-realistic.png';
  const hitbox=()=>({x:player.x+10*scale,y:player.y+8*scale,w:player.w-20*scale,h:player.h-12*scale});

  const state={playing:false,paused:false,gameover:false,level:1,obstacles:[],score:0,best:0,speedMul:1,progress:0,target:0,time:0,tLast:performance.now(),playerName:getPlayer()};

  // === BONUS CADEAUX (+100) — rares
  const bonuses = []; // {x,y,w,h,taken:false}
  let lastBonusAt = -999;
  const BONUS_COOLDOWN = 18;
  const BONUS_SPAWN_CHANCE = 0.08;
  const BONUS_MAX_ACTIVE = 1;

  // === MALUS TÊTE DE MORT (-50) — suspendu
  const maluses = []; // {x,y,w,h,taken:false}
  let lastMalusAt = -999;
  const MALUS_COOLDOWN = 14;
  const MALUS_SPAWN_CHANCE = 0.05; // 5% par fenêtre de spawn
  const MALUS_SAFE_PAD_LEFT = 100;  // zone sans palettes autour du malus
  const MALUS_SAFE_PAD_RIGHT = 160;
  // === PALETTE EN OR (+200) — suspendue
  const golds = []; let lastGoldAt = -999;
  const GOLD_COOLDOWN = 16; const GOLD_SPAWN_CHANCE = 0.05; const GOLD_MAX_ACTIVE = 1;

  // === BIDON D’HUILE (ralenti 3s) — au sol
  const oils = []; let lastOilAt = -999;
  const OIL_COOLDOWN = 12; const OIL_SPAWN_CHANCE = 0.05; const OIL_MAX_ACTIVE = 1;

  // === CASQUE (immunité 5s) — suspendu
  const helmets = []; let lastHelmetAt = -999;
  const HELMET_COOLDOWN = 20; const HELMET_SPAWN_CHANCE = 0.04; const HELMET_MAX_ACTIVE = 1;

  // Effets temporaires
  let slowUntil = 0; // state.time jusqu'à
  let invUntil  = 0; // state.time jusqu'à


  // UI refs
  const scoreEl=$('#score'), bestEl=$('#best'), speedEl=$('#speed'), levelEl=$('#level');
  const playBtn=$('#playBtn'), pauseBtn=$('#pauseBtn');
  const nameModal=$('#nameModal'), nameInput=$('#nameInput'), saveNameBtn=$('#saveNameBtn'), setNameBtn=$('#setNameBtn'), nameStatus=$('#nameStatus');

  const viewportMeta = document.querySelector('meta[name="viewport"]');
  const VIEWPORT_LOCK = 'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover';
  function lockMobileViewport(){
    try{ if(viewportMeta) viewportMeta.setAttribute('content', VIEWPORT_LOCK); }catch(e){}
  }
  lockMobileViewport();
  const playerNameEl=$('#playerName'); const lvlBar=$('#lvlBar');
  const toast=$('#toast'), toastMsg=$('#toastMsg');
  const frameFullscreenBtn=$('#frameFullscreenBtn'), frameExitBtn=$('#frameExitBtn'), fsHelp=$('#fsHelp'), fsNotice=$('#fsNotice');
  const fsScoreEl=$('#fsScore'), fsBestEl=$('#fsBest'), fsLevelEl=$('#fsLevel'), fsSpeedEl=$('#fsSpeed');
  const fsPauseBtn=$('#fsPauseBtn'), fsLeaderboardBtn=$('#fsLeaderboardBtn');
  const firstPlayOverlay=$('#firstPlayOverlay'), firstPlayBtn=$('#firstPlayBtn');
  let firstManualStartDone=false;

  function refreshPlayerUI(){ const n=state.playerName||'—'; playerNameEl.textContent=n; if(state.playerName){ state.best=getBestFor(state.playerName); bestEl.textContent=String(state.best); playBtn.disabled=false } else { bestEl.textContent='0'; playBtn.disabled=true } updateFirstPlayOverlay(); }
  function updateFirstPlayOverlay(){
    if(!firstPlayOverlay) return;
    const shouldShow = !firstManualStartDone && !state.playing && !state.gameover;
    firstPlayOverlay.hidden = !shouldShow;
  }
  function hideFirstPlayOverlay(){ if(firstPlayOverlay) firstPlayOverlay.hidden = true; }
  function manualStartGame(){
    if(!state.playerName){ openName(); updateFirstPlayOverlay(); return; }
    firstManualStartDone = true;
    hideFirstPlayOverlay();
    reset();
  }
  function setNameStatus(txt, cls=''){
    if(!nameStatus) return;
    nameStatus.textContent = txt || '';
    nameStatus.className = 'name-status' + (cls ? ' ' + cls : '');
  }
  function setNameSaveEnabled(enabled){
    if(saveNameBtn) saveNameBtn.disabled = !enabled;
  }
  function normalizePseudo(n){
    return String(n||'').trim().replace(/\s+/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  }
  function cleanPseudoInput(){
    return String(nameInput.value||'').trim().replace(/\s+/g,' ').slice(0,20);
  }
  function getOnlineListFromPayload(data){
    if(Array.isArray(data)) return data;
    if(data && Array.isArray(data.leaderboard)) return data.leaderboard;
    if(data && Array.isArray(data.scores)) return data.scores;
    if(data && Array.isArray(data.results)) return data.results;
    if(data && Array.isArray(data.data)) return data.data;
    return [];
  }
  function itemPseudo(item){
    if(!item) return '';
    if(typeof item === 'string') return item;
    return String(item.name || item.pseudo || item.player || item.playerName || item.username || '').trim();
  }
  async function fetchTakenPseudos(){
    if(!SCORE_API_URL) return new Set();
    const sep = SCORE_API_URL.includes('?') ? '&' : '?';
    const res = await fetch(SCORE_API_URL + sep + 'check=pseudos&t=' + Date.now(), { method:'GET', cache:'no-store' });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const taken = new Set();
    getOnlineListFromPayload(data).forEach(item => {
      const n = normalizePseudo(itemPseudo(item));
      if(n) taken.add(n);
    });
    return taken;
  }

  let pseudoListCache = null;
  let pseudoListLoading = null;
  let pseudoCheckTimer = 0;
  let pseudoCheckSeq = 0;
  let pseudoOnlineConfirmed = false;

  async function loadPseudoList(force=false){
    if(!force && pseudoListCache) return pseudoListCache;
    if(!force && pseudoListLoading) return pseudoListLoading;
    pseudoListLoading = fetchTakenPseudos()
      .then(set => { pseudoListCache = set; return set; })
      .finally(() => { pseudoListLoading = null; });
    return pseudoListLoading;
  }
  function isCurrentPseudo(raw){
    const current = normalizePseudo(state.playerName || getPlayer());
    return !!current && normalizePseudo(raw) === current;
  }
  function localPseudoState(){
    const raw = cleanPseudoInput();
    const wanted = normalizePseudo(raw);
    if(!raw) return { status:'empty', raw, wanted, message:'Entre un pseudo entre 2 et 20 caractères.' };
    if(raw.length < 2) return { status:'short', raw, wanted, message:'Choisis un pseudo d’au moins 2 caractères.' };
    if(isCurrentPseudo(raw)) return { status:'current', raw, wanted, message:'Pseudo actuel conservé ✅' };
    if(!pseudoListCache) return { status:'loading', raw, wanted, message:'Chargement des pseudos existants…' };
    if(pseudoListCache.has(wanted)) return { status:'taken', raw, wanted, message:'Ce pseudo existe déjà. Choisis un autre pseudo.' };
    return { status:'local-ok', raw, wanted, message:'Pseudo disponible localement. Vérification en ligne…' };
  }
  function refreshPseudoInputState(){
    clearTimeout(pseudoCheckTimer);
    pseudoOnlineConfirmed = false;
    setNameSaveEnabled(false);
    const st = localPseudoState();
    if(st.status === 'empty' || st.status === 'short'){
      setNameStatus(st.message, 'err');
      return;
    }
    if(st.status === 'current'){
      pseudoOnlineConfirmed = true;
      setNameStatus(st.message, 'ok');
      setNameSaveEnabled(true);
      return;
    }
    if(st.status === 'loading'){
      setNameStatus(st.message, 'wait');
      return;
    }
    if(st.status === 'taken'){
      setNameStatus(st.message, 'err');
      return;
    }
    setNameStatus(st.message, 'wait');
    pseudoCheckTimer = setTimeout(() => confirmPseudoOnline(false), 450);
  }
  async function confirmPseudoOnline(finalCheck=false){
    const seq = ++pseudoCheckSeq;
    const st = localPseudoState();
    if(st.status === 'current'){
      pseudoOnlineConfirmed = true;
      setNameSaveEnabled(true);
      return true;
    }
    if(st.status !== 'local-ok'){
      refreshPseudoInputState();
      return false;
    }
    setNameSaveEnabled(false);
    setNameStatus(finalCheck ? 'Dernière vérification en ligne…' : 'Vérification en ligne…', 'wait');
    try{
      const taken = await loadPseudoList(true);
      if(seq !== pseudoCheckSeq && !finalCheck) return false;
      if(taken.has(st.wanted)){
        pseudoOnlineConfirmed = false;
        setNameStatus('Ce pseudo existe déjà. Choisis un autre pseudo.', 'err');
        setNameSaveEnabled(false);
        return false;
      }
      pseudoOnlineConfirmed = true;
      setNameStatus('Pseudo disponible ✅', 'ok');
      setNameSaveEnabled(true);
      return true;
    }catch(e){
      console.warn('Pseudo live check error:', e);
      pseudoOnlineConfirmed = false;
      setNameStatus('Impossible de vérifier en ligne. Vérifie ta connexion.', 'err');
      setNameSaveEnabled(false);
      return false;
    }
  }
  async function reservePseudoOnline(raw){
    // Avec l'API actuelle de score, on réserve le pseudo par un score 0.
    // Le classement filtre ensuite les scores à 0 pour ne pas polluer l'affichage public.
    if(!SCORE_API_URL) return;
    const body = new URLSearchParams({ name: String(raw||'Anonyme').slice(0,20), score: '0', register: '1' });
    const res = await fetch(SCORE_API_URL, { method:'POST', body });
    if(!res.ok) throw new Error('HTTP ' + res.status);
  }
  function openName(){
    lockMobileViewport();
    nameModal.classList.add('open');
    nameInput.value=state.playerName||'';
    pseudoOnlineConfirmed = false;
    setNameSaveEnabled(false);
    setNameStatus('Chargement des pseudos existants…', 'wait');
    loadPseudoList(true)
      .then(() => refreshPseudoInputState())
      .catch(e => {
        console.warn('Pseudo list load error:', e);
        setNameStatus('Impossible de charger les pseudos. Vérifie ta connexion.', 'err');
        setNameSaveEnabled(false);
      });
  }
  function closeName(){ nameModal.classList.remove('open') }
  setNameBtn.addEventListener('click',openName);
  saveNameBtn.addEventListener('click',saveName);
  nameInput.addEventListener('focus',()=>{ lockMobileViewport(); document.documentElement.classList.add('cr-name-focus'); setTimeout(()=>{ try{nameInput.scrollIntoView({block:'center',inline:'nearest'});}catch(e){} },80); });
  nameInput.addEventListener('blur',()=>{ lockMobileViewport(); document.documentElement.classList.remove('cr-name-focus'); setTimeout(()=>{ try{ window.scrollTo({left:0,top:0,behavior:'instant'}); }catch(e){ try{window.scrollTo(0,0)}catch(_){} } },120); });
  nameInput.addEventListener('touchstart', lockMobileViewport, {passive:true});
  nameInput.addEventListener('input',refreshPseudoInputState);
  nameInput.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); if(!saveNameBtn.disabled) saveName(); } })
  async function saveName(){
    const raw=cleanPseudoInput();
    if(!raw){ setNameStatus('Entre un pseudo entre 2 et 20 caractères.', 'err'); setNameSaveEnabled(false); return }
    if(raw.length < 2){ setNameStatus('Choisis un pseudo d’au moins 2 caractères.', 'err'); setNameSaveEnabled(false); return }
    if(isCurrentPseudo(raw)){
      setPlayer(raw); state.playerName=raw; refreshPlayerUI(); closeName(); return;
    }
    const st = localPseudoState();
    if(st.status === 'taken'){
      setNameStatus('Ce pseudo existe déjà. Choisis un autre pseudo.', 'err');
      setNameSaveEnabled(false);
      return;
    }
    setNameSaveEnabled(false);
    try{
      const ok = await confirmPseudoOnline(true);
      if(!ok) return;
      setNameStatus('Réservation du pseudo…', 'wait');
      await reservePseudoOnline(raw);
      if(pseudoListCache) pseudoListCache.add(normalizePseudo(raw));
      setPlayer(raw);
      state.playerName=raw;
      refreshPlayerUI();
      setNameStatus('Pseudo validé ✅', 'ok');
      closeName();
    }catch(e){
      console.warn('Pseudo save error:', e);
      setNameStatus('Impossible de valider le pseudo en ligne. Réessaie.', 'err');
      setNameSaveEnabled(false);
    }
  }

  if(!state.playerName) openName(); refreshPlayerUI();

  // ===== Niveaux
  function targetObstaclesFor(level){ return 8 + Math.floor(level*2.2) }
  function paramsFor(level){
    const L=Math.max(1,Math.min(25,level));
    const speedMul=1 + (L-1)*0.06;
    const gapMin=Math.max(MIN_GAP_FLOOR, 600 - (L-1)*8);
    const gapMax=Math.max(gapMin+110, 1020 - (L-1)*8);
    const stackedChance=Math.min(0.7, 0.18 + (L-1)*0.02);
    const doubleChance=Math.min(0.55, 0.10 + (L-1)*0.02);
    const trainChance = (L%5===0) ? 0.35 : 0.08 + (L-1)*0.01;
    return {speedMul,gapMin,gapMax,stackedChance,doubleChance,trainChance}
  }
  function levelUp(){ if(state.level>=25) return; state.level++; state.target=targetObstaclesFor(state.level); state.progress=0; showToast(`Niveau ${state.level}`); }
  let toastTimer=null; let toastHoldUntil=0;
  function showToast(txt, dur=2000){
    const now = performance.now();
    // Si un message long est en cours, ignorer les toasts plus courts
    if (now < toastHoldUntil && (now + dur) < toastHoldUntil) {
      return;
    }
    // Mettre à jour le message et étendre la durée minimale si nécessaire
    toastMsg.textContent = txt;
    toast.classList.add('show');
    try{
      if(fsNotice){
        fsNotice.textContent = txt;
        fsNotice.classList.add('show');
        window.clearTimeout(window.__fsNoticeTimer);
        window.__fsNoticeTimer = window.setTimeout(()=>fsNotice.classList.remove('show'), Math.min(Math.max(dur, 1800), 5200));
      }
    }catch(e){}
    toastHoldUntil = Math.max(toastHoldUntil, now + dur);
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    const schedule = () => {
      const left = toastHoldUntil - performance.now();
      if (left > 10) {
        toastTimer = setTimeout(schedule, Math.min(500, left));
      } else {
        toast.classList.remove('show');
        toastTimer = null;
        toastHoldUntil = 0;
      }
    };
    schedule();
  }

  // ===== Obstacles
  function spawnOne(x){
    // Chaque palette reçoit un nombre de couches réellement aléatoire.
    // 4 cartons par couche, de 1 à 10 couches en hauteur.
    // La hauteur augmente avec chaque couche, tout en restant franchissable au saut.
    const layers = 1 + ((Math.random()*10)|0);
    const cols = 4;
    const boxCount = layers * cols;
    const w = 66 * scale;
    const palletH = 5.5 * scale;
    const boxH = 7.0 * scale;
    const h = palletH + layers * boxH;
    const tone = 0.92 + Math.random()*0.12;
    return {
      x,
      y: ground() - h,
      w,
      h,
      stacked: layers >= 2,
      boxCount,
      cols,
      rows: layers,
      layers,
      boxesPerLayer: cols,
      tone,
      counted: false
    };
  }

  let distSinceSpawn=0, nextGap=680;

  // === zones protégées (pas de palettes) autour des malus actifs
  function isInMalusSafeZone(x){
    for(const m of maluses){
      const left = (m.x - MALUS_SAFE_PAD_LEFT);
      const right = (m.x + m.w + MALUS_SAFE_PAD_RIGHT);
      if(x >= left && x <= right) return true;
    }
    return false;
  }

  function maybeSpawn(dt){
    const {gapMin,gapMax,doubleChance,trainChance}=paramsFor(state.level);
    const speed=currentSpeed();
    distSinceSpawn += speed*dt;

    if(distSinceSpawn >= nextGap){
      distSinceSpawn = 0; nextGap = rand(gapMin,gapMax);
      const spawnX = canvas.width + rand(0, 60);

      // 1) Tentative de MALUS suspendu (remplace les palettes dans la zone)
      const canSpawnMalus = (state.time - lastMalusAt >= MALUS_COOLDOWN);
      if (canSpawnMalus && Math.random() < MALUS_SPAWN_CHANCE && !isInMalusSafeZone(spawnX+120)) {
        const m = spawnMalus(spawnX + 120);
        maluses.push(m);
        lastMalusAt = state.time;
        // Supprime tout obstacle qui chevauche la zone de sécurité du malus (garantie: passage libre dessous)
        const left = (m.x - MALUS_SAFE_PAD_LEFT);
        const right = (m.x + m.w + MALUS_SAFE_PAD_RIGHT);
        state.obstacles = state.obstacles.filter(o => (o.x + o.w < left) || (o.x > right));
        // IMPORTANT: ne pas ajouter d'obstacles pour ce tick => on sort.
        return;
      }

      // 2) Sinon on génère des palettes (train/double/solo) UNIQUEMENT hors zones protégées
      const r=Math.random();
      if(r < trainChance){
        const n=3 + ((state.level/5)|0);
        const tight = Math.max(MIN_GAP_FLOOR, 260 - state.level*2);
        for(let i=0;i<n;i++){
          const x = spawnX + i*(tight);
          if(!isInMalusSafeZone(x)) state.obstacles.push(spawnOne(x));
        }
      } else if(r < trainChance + doubleChance){
        const tight = Math.max(MIN_GAP_FLOOR, 260 - state.level*2);
        if(!isInMalusSafeZone(spawnX)) state.obstacles.push(spawnOne(spawnX));
        if(!isInMalusSafeZone(spawnX + tight)) state.obstacles.push(spawnOne(spawnX + tight));
      } else {
        if(!isInMalusSafeZone(spawnX)) state.obstacles.push(spawnOne(spawnX));
      }

      // 3) Apparition RARE d’un bonus 🎁 (indépendant) tant qu’il n’entre pas en conflit de zone
      const canSpawnBonus = (state.time - lastBonusAt >= BONUS_COOLDOWN) && (bonuses.length < BONUS_MAX_ACTIVE);
      const bonusX = spawnX + 120;
      if (canSpawnBonus && Math.random() < BONUS_SPAWN_CHANCE && !isInMalusSafeZone(bonusX)) {
        bonuses.push(spawnBonus(bonusX));
        lastBonusAt = state.time;
      }

      // GOLD
      const canSpawnGold = (state.time - lastGoldAt >= GOLD_COOLDOWN) && (golds.length < GOLD_MAX_ACTIVE);
      const goldX = spawnX + 140;
      if (canSpawnGold && Math.random() < GOLD_SPAWN_CHANCE && !isInMalusSafeZone(goldX)) {
        golds.push(spawnGold(goldX)); lastGoldAt = state.time;
      }

      // OIL
      const canSpawnOil = (state.time - lastOilAt >= OIL_COOLDOWN) && (oils.length < OIL_MAX_ACTIVE);
      const lastObs = state.obstacles[state.obstacles.length-1];
      const oilX = lastObs ? (lastObs.x + lastObs.w + OIL_BARREL_OFFSET) : (spawnX + OIL_BARREL_OFFSET);
      if (canSpawnOil && Math.random() < OIL_SPAWN_CHANCE && !isInMalusSafeZone(oilX)) {
        oils.push(spawnOil(oilX)); lastOilAt = state.time;
      }

      // HELMET
      const canSpawnHelmet = (state.time - lastHelmetAt >= HELMET_COOLDOWN) && (helmets.length < HELMET_MAX_ACTIVE);
      const helmX = spawnX + 200;
      if (canSpawnHelmet && Math.random() < HELMET_SPAWN_CHANCE && !isInMalusSafeZone(helmX)) {
        helmets.push(spawnHelmet(helmX)); lastHelmetAt = state.time;
      }
    }
  }

  // ===== Utilitaires =====
  const ground=()=> canvas.height*GROUND_Y;
  const groundY = () => canvas.height*GROUND_Y;
  const rand=(a,b)=> Math.random()*(b-a)+a;
  const overlap=(a,b)=> a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  const clamp=(v,a,b)=> Math.max(a,Math.min(b,v));
  function currentSpeed(){
    const base = BASE_SPEED * state.speedMul;
    const lvlMul = paramsFor(state.level).speedMul;
    const slowMul = (state.time < slowUntil) ? 0.6 : 1;
    return base * lvlMul * slowMul;
  }

  // ===== BONUS helpers/draw
  function spawnBonus(x){
    const size = 28 * scale;
    const y = ground() - (player.h*2.2 + size);
    return { x, y, w: size, h: size, taken: false, t: 0 };
  }
  function drawBonus(b){
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3*scale;
    ctx.beginPath();
    ctx.moveTo(b.x + b.w/2, b.y);
    ctx.lineTo(b.x + b.w/2, b.y + b.h);
    ctx.moveTo(b.x, b.y + b.h/2);
    ctx.lineTo(b.x + b.w, b.y + b.h/2);
    ctx.stroke();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.ellipse(b.x + b.w/2, b.y + b.h/2, b.w*0.85, b.h*0.85, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ===== MALUS helpers/draw
  function spawnMalus(x){
    const size = 32 * scale;
    const y = ground() - (player.h*2.2 + size);
    return { x, y, w: size, h: size, taken: false, t: 0 };
  }
  function drawMalus(m){
    // Halo rouge léger
    ctx.globalAlpha = 0.20;
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.ellipse(m.x + m.w/2, m.y + m.h/2, m.w*0.9, m.h*0.9, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Crâne
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(m.x + m.w/2, m.y + m.h*0.48, m.w*0.42, 0, Math.PI*2);
    ctx.fill();

    // Machoire
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(m.x + m.w*0.30, m.y + m.h*0.60, m.w*0.40, m.h*0.22);

    // Yeux
    ctx.fillStyle = "#0b1220";
    ctx.beginPath();
    ctx.arc(m.x + m.w*0.38, m.y + m.h*0.48, m.w*0.10, 0, Math.PI*2);
    ctx.arc(m.x + m.w*0.62, m.y + m.h*0.48, m.w*0.10, 0, Math.PI*2);
    ctx.fill();

    // Os croisés
    ctx.strokeStyle = "#0b1220";
    ctx.lineWidth = 2*scale;
    ctx.beginPath();
    ctx.moveTo(m.x + m.w*0.30, m.y + m.h*0.80);
    ctx.lineTo(m.x + m.w*0.70, m.y + m.h*0.95);
    ctx.moveTo(m.x + m.w*0.70, m.y + m.h*0.80);
    ctx.lineTo(m.x + m.w*0.30, m.y + m.h*0.95);
    ctx.stroke();
  }

function spawnGold(x){
    const w = 36 * scale, h = 26 * scale;
    const y = ground() - (player.h*2.2 + h);
    return { x, y, w, h, taken:false, t:0 };
  }
  function drawGold(g){
    ctx.fillStyle = "#fbbf24"; // corps
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.fillStyle = "#fde68a"; // lattes
    ctx.fillRect(g.x + 4*scale, g.y + 4*scale, g.w - 8*scale, 5*scale);
    ctx.fillRect(g.x + 4*scale, g.y + g.h - 9*scale, g.w - 8*scale, 5*scale);
  }
  function spawnOil(x){
    const w = 44*scale, h = 16*scale;
    const y = ground() - h + 2*scale;
    return { x, y, w, h, taken:false, t:0 };
  }
  function drawOil(o){
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#7c3aed";
    ctx.beginPath(); ctx.ellipse(o.x + o.w/2, o.y + o.h/2, o.w/2, o.h/2.2, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  function spawnHelmet(x){
    const s = 28*scale;
    const y = ground() - (player.h*2.2 + s);
    return { x, y, w:s, h:s, taken:false, t:0 };
  }
  function drawHelmet(h){
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(h.x + h.w/2, h.y + h.h*0.65, h.w*0.45, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(h.x + h.w*0.25, h.y + h.h*0.65, h.w*0.5, h.h*0.2);
  }
  // ===== Boucle de jeu
  function reset(){
  /* === Réinit stricte des effets & spawns (patch puriste 2025-09-26) === */
  try {
    if (typeof invUntil !== "undefined") { invUntil = 0; }
    if (typeof slowUntil !== "undefined") { slowUntil = 0; }
    if (typeof golds !== "undefined" && golds && typeof golds.length === "number") { golds.length = 0; }
    if (typeof oils !== "undefined" && oils && typeof oils.length === "number") { oils.length = 0; }
    if (typeof helmets !== "undefined" && helmets && typeof helmets.length === "number") { helmets.length = 0; }
    if (typeof lastGoldAt !== "undefined")   { lastGoldAt = -999; }
    if (typeof lastOilAt !== "undefined")    { lastOilAt  = -999; }
    if (typeof lastHelmetAt !== "undefined") { lastHelmetAt = -999; }
    if (typeof state !== "undefined" && state) {
      state.time = 0;
      if (typeof performance !== "undefined" && performance.now) {
        state.tLast = performance.now();
      }
      if (typeof state.speedMul !== "undefined") { state.speedMul = 1; }
    }
    if (typeof player !== "undefined" && player) {
      if (typeof ground === "function") {
        player.y = ground() - player.h;
      }
      player.vy = 0;
      player.onGround = true;
      player.jumpCount = 0;
    }
  } catch(e) { console.warn("[reset patch puriste] ", e); }
 if(!state.playerName){ openName(); updateFirstPlayOverlay(); return } hideFirstPlayOverlay(); state.playing=true; state.paused=false; state.gameover=false; state.level=1; state.progress=0; state.target=targetObstaclesFor(1); state.score=0; state.speedMul=1; state.obstacles.length=0; { const first = spawnOne(Math.max(canvas.width + 50, 800)); first.y = ground() - first.h; state.obstacles.push(first); } /* obstacle forcé au démarrage */ distSinceSpawn=0; nextGap=680; player.y=ground()-player.h; player.vy=0; player.onGround=true; state.time=0; state.tLast=performance.now(); bonuses.length=0; lastBonusAt=-999; maluses.length=0; lastMalusAt=-999; pauseBtn.textContent='Pause'; updateHUD() }
  function updateHUD(){
    const scoreTxt=String(Math.floor(state.score));
    const bestTxt=String(state.best);
    const speedTxt=currentSpeedMulText();
    const levelTxt=String(state.level);
    scoreEl.textContent = scoreTxt; bestEl.textContent = bestTxt; speedEl.textContent = speedTxt; levelEl.textContent = levelTxt; lvlBar.style.width = clamp((state.progress/state.target)*100, 0, 100) + '%';
    if(fsScoreEl) fsScoreEl.textContent=scoreTxt;
    if(fsBestEl) fsBestEl.textContent=bestTxt;
    if(fsLevelEl) fsLevelEl.textContent=levelTxt;
    if(fsSpeedEl) fsSpeedEl.textContent=speedTxt;
    if(fsPauseBtn) fsPauseBtn.textContent = state.paused ? '▶️' : '⏸️';
  }
  function currentSpeedMulText(){ const slowMul = (state.time < slowUntil) ? 0.6 : 1; const mul = paramsFor(state.level).speedMul * state.speedMul * slowMul; return mul.toFixed(2)+'x' }

  playBtn.addEventListener('click',manualStartGame);
  if(firstPlayBtn) firstPlayBtn.addEventListener('click',(e)=>{ if(e){ e.preventDefault(); e.stopPropagation(); } manualStartGame(); });
  pauseBtn.addEventListener('click',()=>{ if(!state.playing||state.gameover) return; state.paused=!state.paused; pauseBtn.textContent= state.paused? 'Reprendre':'Pause'; updateHUD(); });

  function wantJump(){
    if(!state.playing){
      if(!firstManualStartDone){ updateFirstPlayOverlay(); showToast('Appuie sur ▶ Jouer pour lancer la première partie.'); return; }
      reset(); return
    }
    if(state.paused||state.gameover) return
    if(player.onGround || player.jumpCount < player.maxJumps){
      player.vy = -JUMP_V;
      player.onGround = false;
      player.jumpCount++;
      beep();
    }
  }
  window.addEventListener('keydown',e=>{ const k=e.key.toLowerCase(); if(k===' '||k==='arrowup'||k==='w'){ e.preventDefault(); wantJump() } else if(k==='p'){ pauseBtn.click() } else if(k==='r'){ reset() } },{passive:false});
  canvas.addEventListener('pointerdown',wantJump);

  function tick(){
    const now=performance.now(); let dt=(now-state.tLast)/1000; state.tLast=now; if(!state.playing||state.paused){ requestAnimationFrame(tick); return }
    dt = Math.min(dt, 1/30);
    state.time += dt; state.speedMul = clamp(state.speedMul + dt*0.015, 1, 1.5);

    // Physique joueur
    player.vy += GRAVITY*dt; player.y += player.vy*dt; const gy=ground(); if(player.y>=gy-player.h){ player.y=gy-player.h; player.vy=0; player.onGround=true; player.jumpCount=0 }

    // Monde
    const speed = currentSpeed();
    state.obstacles.forEach(o=> o.x -= speed*dt);
    maybeSpawn(dt);

    // BONUS: défilement & collisions
    for(const b of bonuses){ b.x -= speed*dt; b.t += dt; }
    for(const b of bonuses){ if(!b.taken && overlap(hitbox(), b)){ b.taken = true; } }
    for(const b of bonuses){ if(b.taken && !b._applied){ b._applied = true; state.score += 100; giftSound(); showToast('🎁 +100 (rare)'); } }
    for(let i=bonuses.length-1;i>=0;i--){ const b=bonuses[i]; if(b.taken || b.x < -b.w-10){ bonuses.splice(i,1); } }

    // MALUS: défilement & collisions
    for(const m of maluses){ m.x -= speed*dt; m.t += dt; }
    for(const m of maluses){ if(!m.taken && overlap(hitbox(), m)){ m.taken = true; } }
    for(const m of maluses){ if(m.taken && !m._applied){ m._applied = true; state.score = Math.max(0, state.score - 50); malusSound(); showToast('💀 -50 (malus)'); } }
    
    // GOLD: défilement & collisions
    for(const g of golds){ g.x -= speed*dt; g.t += dt; }
    for(const g of golds){ if(!g.taken && overlap(hitbox(), g)){ g.taken = true; } }
    for(const g of golds){ if(g.taken && !g._applied){ g._applied = true; state.score += 200; giftSound(); showToast('🥇 +200 (palette d’or)'); } }
    for(let i=golds.length-1;i>=0;i--){ const g=golds[i]; if(g.taken || g.x < -g.w-10){ golds.splice(i,1); } }

    // OIL: défilement & collisions
    for(const o of oils){ o.x -= speed*dt; o.t += dt; }
    for(const o of oils){ if(!o.taken && overlap(hitbox(), o)){ o.taken = true; } }
    for(const o of oils){ if(o.taken && !o._applied){ o._applied = true; slowUntil = Math.max(slowUntil, state.time + 3); malusSound();
      showToast('🛢️ vitesse −40% (3s)'); } }
    for(let i=oils.length-1;i>=0;i--){ const o=oils[i]; if(o.taken || o.x < -o.w-10){ oils.splice(i,1); } }

    // HELMET: défilement & collisions
    for(const h of helmets){ h.x -= speed*dt; h.t += dt; }
    for(const h of helmets){ if(!h.taken && overlap(hitbox(), h)){ h.taken = true; } }
    for(const h of helmets){ if(h.taken && !h._applied){ h._applied = true; invUntil = Math.max(invUntil, state.time + 5); giftSound();
      showToast('🪖 Immunité (5s)'); } }
    for(let i=helmets.length-1;i>=0;i--){ const h=helmets[i]; if(h.taken || h.x < -h.w-10){ helmets.splice(i,1); } }
for(let i=maluses.length-1;i>=0;i--){ const m=maluses[i]; if(m.taken || m.x < -m.w-10){ maluses.splice(i,1); } }

    // Scoring + progression
    state.score += speed*dt*0.05;
    for(const o of state.obstacles){ if(!o.counted && (o.x+o.w) < player.x){ o.counted=true; state.progress++; if(state.progress>=state.target){ levelUp() } } }

    // Collision (palettes)
    const hb=hitbox();
    if(!(state.time < invUntil)){
      for(const o of state.obstacles){ if(overlap(hb,o)){ gameOver(); break } }
    }

    // Nettoyage obstacles
    state.obstacles = state.obstacles.filter(o=> o.x > -o.w-10);

    // Rendu
    draw(); updateHUD(); requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function gameOver(){ const finalScore = Math.floor(state.score); const name = state.playerName || getPlayer(); const bestBefore = getBestFor(name||''); const beatPersonal = finalScore > bestBefore; state.gameover=true; state.playing=false; crash(); if(state.playerName && beatPersonal){ state.best=finalScore; setBestFor(state.playerName,state.best) } updateHUD(); postOnlineScore(state.playerName || 'Anonyme', finalScore); (function(){ const msg = beatPersonal ? randomItem(WIN_MESSAGES) : randomItem(LOSE_MESSAGES); showToast((beatPersonal ? '🏆 ' : '💥 ') + personalizeMessage(msg, (state.playerName || getPlayer() || 'Joueur')), 8000); })() }

  // ===== Rendu
  function draw(){ const w=canvas.width, h=canvas.height; ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#0b1426'; ctx.fillRect(0, ground(), w, h-ground());
    ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.beginPath(); ctx.moveTo(0,ground()+1); ctx.lineTo(w,ground()+1); ctx.stroke();
    for(const o of state.obstacles){ drawObstacle(o) }
    for(const b of bonuses){ if(!b.taken) drawBonus(b); }
    for(const m of maluses){ if(!m.taken) drawMalus(m); }
    for(const g of golds){ if(!g.taken) drawGold(g); }
    for(const o of oils){ if(!o.taken) drawOil(o); }
    for(const h of helmets){ if(!h.taken) drawHelmet(h); }
    
    // === COMPTE À REBOURS D'IMMUNITÉ (affiché derrière le chariot) ===
    (function(){
      const remainFloat = (invUntil - state.time);
      if (remainFloat > 0.001) {
        const remain = Math.ceil(remainFloat);
        const cx = player.x + player.w * 0.5;
        const gy = groundY();
        // placé au-dessus du chariot; s'il saute, on suit; sinon on colle juste au-dessus du toit
        const cy = Math.min(player.y - 10*scale, gy - player.h - 12*scale);
        ctx.save();
        // gros chiffre rouge bien visible
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#ef4444";
        ctx.textAlign = "center";
        const fs = Math.max(36, Math.floor(90 * scale));
        ctx.font = `bold ${fs}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
        // halo + contour pour lisibilité
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 10 * scale;
        ctx.fillText(String(remain), cx, cy);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = Math.max(1, Math.floor(3*scale));
        ctx.strokeStyle = '#111827';
        ctx.strokeText(String(remain), cx, cy);
        ctx.restore();
      }
    })();
    // === COMPTE À REBOURS RALENTI (flaque d'huile) — derrière le chariot ===
    (function(){
      const remainFloat = (slowUntil - state.time);
      if (remainFloat > 0.001) {
        const remain = Math.ceil(remainFloat);
        const cx = player.x + player.w * 0.5;
        const gy = groundY();
        // Décalé un peu plus haut que l'immunité pour éviter le chevauchement visuel
        const baseY = Math.min(player.y - 10*scale, gy - player.h - 12*scale);
        const cy = baseY - 18*scale;
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#f59e0b"; // orange
        ctx.textAlign = "center";
        const fs = Math.max(30, Math.floor(80 * scale));
        ctx.font = `bold ${fs}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 10 * scale;
        ctx.fillText(String(remain), cx, cy);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = Math.max(1, Math.floor(3*scale));
        ctx.strokeStyle = '#111827';
        ctx.strokeText(String(remain), cx, cy);
        ctx.restore();
      }
    })();


    // === Badges HUD (secours) pour durées résiduelles ===
    (function(){
      // Affiche de petits badges en haut-gauche si compteurs actifs
      const pad = 10*scale;
      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.font = `bold ${Math.max(10, Math.floor(14*scale))}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;

      let y = pad;
      const immLeft = Math.ceil(invUntil - state.time);
      if (immLeft > 0) {
        ctx.fillStyle = "rgba(239,68,68,0.85)"; // rouge
        ctx.fillRect(pad, y, 38*scale, 18*scale);
        ctx.fillStyle = "#fff";
        ctx.fillText(String(immLeft)+'s', pad+6*scale, y+3*scale);
        y += 20*scale;
      }
      const slowLeft = Math.ceil(slowUntil - state.time);
      if (slowLeft > 0) {
        ctx.fillStyle = "rgba(245,158,11,0.85)"; // orange
        ctx.fillRect(pad, y, 38*scale, 18*scale);
        ctx.fillStyle = "#fff";
        ctx.fillText(String(slowLeft)+'s', pad+6*scale, y+3*scale);
      }
      ctx.restore();
    })();
drawForklift(player);
    if(state.gameover){ ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(0,0,w,h); ctx.fillStyle='#fff'; ctx.font= `${18*scale}px system-ui,Segoe UI,Roboto`; ctx.textAlign='center'; ctx.fillText('Game Over — appuie sur Jouer / Rejouer ou sur R', w/2, h*0.45) }
  }

  const obstacleSpriteCache = new Map();

  function buildObstacleSprite(o){
    const s = scale;
    const layers = Math.max(1, Math.min(10, o.layers || o.rows || 1));
    const cols = 4;
    const count = layers * cols;
    const rows = layers;
    const pad = Math.ceil(5*s);
    const spriteW = Math.max(1, Math.ceil(o.w + pad*2));
    const spriteH = Math.max(1, Math.ceil(o.h + pad*2));
    const sprite = document.createElement('canvas');
    sprite.width = spriteW;
    sprite.height = spriteH;
    const g = sprite.getContext('2d', {alpha:true});
    if(!g) return null;

    const ox = pad;
    const oy = pad;
    const palletH = Math.max(5*s, Math.min(7*s, o.h * 0.18));
    const boxesH = o.h - palletH;
    const boxH = boxesH / rows;
    const gap = 1.0*s;
    const innerW = o.w - 4.5*s;
    const boxW = (innerW - gap*(cols-1)) / cols;
    const palletY = oy + o.h - palletH;

    function rr(x,y,w,h,r){
      g.beginPath();
      g.moveTo(x+r,y);
      g.arcTo(x+w,y,x+w,y+h,r);
      g.arcTo(x+w,y+h,x,y+h,r);
      g.arcTo(x,y+h,x,y,r);
      g.arcTo(x,y,x+w,y,r);
      g.closePath();
    }

    // Palette bois réaliste : calculée une seule fois par obstacle.
    const woodTop = g.createLinearGradient(ox, palletY, ox, palletY + palletH);
    woodTop.addColorStop(0, '#d79a45');
    woodTop.addColorStop(0.48, '#b8742e');
    woodTop.addColorStop(1, '#7a451d');
    g.fillStyle = woodTop;
    rr(ox, palletY, o.w, palletH*0.42, 1.2*s); g.fill();

    g.strokeStyle = 'rgba(86,45,18,.55)';
    g.lineWidth = 0.75*s;
    for(let i=1;i<5;i++){
      const xx = ox + (o.w/5)*i;
      g.beginPath(); g.moveTo(xx, palletY + 0.4*s); g.lineTo(xx, palletY + palletH*0.40); g.stroke();
    }

    const blockY = palletY + palletH*0.38;
    const blockH = palletH*0.42;
    const blockW = o.w*0.15;
    g.fillStyle = '#92531f';
    for(const p of [0.04, 0.43, 0.81]){
      rr(ox + o.w*p, blockY, blockW, blockH, 0.8*s); g.fill();
    }
    g.fillStyle = '#6f3d18';
    rr(ox + 1*s, palletY + palletH*0.78, o.w - 2*s, palletH*0.22, 0.6*s); g.fill();

    // 4 cartons par couche, jusqu'à 10 couches. Le visuel complet est mis en cache.
    let remaining = count;
    for(let row=0; row<rows; row++){
      const boxesThisRow = Math.min(cols, remaining);
      remaining -= boxesThisRow;
      const rowY = palletY - (row+1)*boxH;
      const rowWidth = boxesThisRow*boxW + (boxesThisRow-1)*gap;
      const startX = ox + (o.w - rowWidth)/2;

      for(let c=0; c<boxesThisRow; c++){
        const bx = startX + c*(boxW + gap);
        const by = rowY;
        const bw = boxW;
        const bh = boxH;
        const shade = Math.max(0.84, Math.min(1.08, (o.tone || 1) + ((c+row)%3 - 1)*0.025));
        const baseR = Math.round(191*shade), baseG = Math.round(126*shade), baseB = Math.round(71*shade);

        const front = g.createLinearGradient(bx, by, bx+bw, by+bh);
        front.addColorStop(0, `rgb(${Math.min(255,baseR+18)},${Math.min(255,baseG+16)},${Math.min(255,baseB+12)})`);
        front.addColorStop(0.56, `rgb(${baseR},${baseG},${baseB})`);
        front.addColorStop(1, `rgb(${Math.max(0,baseR-22)},${Math.max(0,baseG-18)},${Math.max(0,baseB-15)})`);
        g.fillStyle = front;
        rr(bx, by, bw, bh, 1.0*s); g.fill();

        g.fillStyle = 'rgba(232,177,115,.60)';
        g.beginPath();
        g.moveTo(bx + 1*s, by + 0.7*s);
        g.lineTo(bx + bw*0.18, by - 1.8*s);
        g.lineTo(bx + bw - 1*s, by - 0.7*s);
        g.lineTo(bx + bw - 1*s, by + 1.5*s);
        g.closePath(); g.fill();

        g.fillStyle = 'rgba(92,46,20,.18)';
        g.fillRect(bx + bw*0.84, by + 1.2*s, bw*0.16, bh - 1.8*s);

        g.fillStyle = 'rgba(229,181,127,.62)';
        g.fillRect(bx + bw*0.45, by, Math.max(1.6*s,bw*0.10), bh);
        g.fillStyle = 'rgba(244,206,159,.70)';
        g.fillRect(bx + bw*0.39, by - 0.7*s, bw*0.22, 1.8*s);

        if(((row*cols+c) % 2) === 0 && bw > 13*s){
          g.fillStyle = 'rgba(247,247,244,.90)';
          rr(bx + bw*0.08, by + bh*0.20, bw*0.28, bh*0.24, 0.45*s); g.fill();
          g.fillStyle = 'rgba(35,35,35,.58)';
          for(let k=0;k<4;k++) g.fillRect(bx + bw*0.11 + k*1.1*s, by + bh*0.25, 0.5*s, bh*0.13);
        }

        g.fillStyle = 'rgba(31,25,20,.80)';
        g.font = `${Math.max(5, Math.floor(6.5*s))}px system-ui, -apple-system, Segoe UI, sans-serif`;
        g.textAlign = 'right';
        g.textBaseline = 'bottom';
        g.fillText('↑↑  ◇  ☂', bx + bw - 1.4*s, by + bh - 1.0*s);

        g.strokeStyle = 'rgba(76,42,22,.52)';
        g.lineWidth = 0.7*s;
        rr(bx, by, bw, bh, 1.0*s); g.stroke();
        g.strokeStyle = 'rgba(255,230,195,.20)';
        g.beginPath(); g.moveTo(bx + 1*s, by + 1.2*s); g.lineTo(bx + bw - 1*s, by + 1.2*s); g.stroke();
      }
    }

    return {canvas:sprite, pad};
  }

  function drawObstacle(o){
    const s = scale;
    const key = `${Math.max(1, Math.min(10, o.layers || o.rows || 1))}|${o.w}|${o.h}|${s}`;

    // Ombre dynamique très légère : coût négligeable.
    ctx.save();
    ctx.globalAlpha = 0.20;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(o.x + o.w*0.52, o.y + o.h + 2.2*s, o.w*0.58, 3.4*s, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // Le visuel complexe des cartons est calculé une seule fois, puis réutilisé à chaque frame.
    // Cela évite de recréer jusqu'à 40 gradients, textes, étiquettes et contours par palette à 60 FPS.
    let cached = obstacleSpriteCache.get(key);
    if(!cached){
      cached = buildObstacleSprite(o);
      if(cached) obstacleSpriteCache.set(key, cached);
    }
    if(cached && cached.canvas){
      ctx.drawImage(cached.canvas, o.x - cached.pad, o.y - cached.pad);
      return;
    }

    // Secours minimal si la création du cache canvas échoue.
    ctx.fillStyle = '#b8742e';
    roundedRect(o.x, o.y, o.w, o.h, 2*s); ctx.fill();
  }

  function roundedRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }

  function drawTire(cx, cy, r, rot){
    ctx.fillStyle = "#0f172a";
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#111827"; ctx.lineWidth = 2*scale;
    ctx.beginPath(); ctx.arc(cx, cy, r*0.92, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = "#475569";
    ctx.beginPath(); ctx.arc(cx, cy, r*0.55, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#cbd5e1";
    for(let i=0;i<5;i++){
      const a = rot + i * (Math.PI*2/5);
      ctx.beginPath(); ctx.arc(cx + Math.cos(a)*r*0.28, cy + Math.sin(a)*r*0.28, 1.8*scale, 0, Math.PI*2); ctx.fill();
    }
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(rot);
    ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 2*scale;
    for(let i=0;i<6;i++){
      const a = i*(Math.PI/3);
      ctx.beginPath(); ctx.moveTo(Math.cos(a)*(r*0.85), Math.sin(a)*(r*0.85));
      ctx.lineTo(Math.cos(a)*(r*0.60), Math.sin(a)*(r*0.60)); ctx.stroke();
    }
    ctx.restore();
  }

  function drawForklift(p){
    const {x,y,w,h} = p;
    const r = scale;
    const gy = groundY();

    // Ombre
    const dist = Math.max(0, gy - (y + h));
    const shadowScale = Math.max(0.35, 1 - dist / (h * 1.3));
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.ellipse(x + w*0.50, gy + 3*r, (w*0.60) * shadowScale, (7*r) * shadowScale, 0, 0, Math.PI*2);
    ctx.fillStyle = "#000"; ctx.fill();
    ctx.globalAlpha = 1;

    if(realisticForkliftImg.complete && realisticForkliftImg.naturalWidth){
      const aspect = realisticForkliftImg.naturalWidth / realisticForkliftImg.naturalHeight;
      let drawH = h * 1.18;
      let drawW = drawH * aspect;
      const maxW = w * 1.60;
      if(drawW > maxW){ drawW = maxW; drawH = drawW / aspect; }
      const imgX = x - w*0.06;
      const imgY = (y + h) - drawH - 2*r;
      ctx.drawImage(realisticForkliftImg, imgX, imgY, drawW, drawH);

      p.beacon += 0.15 * state.speedMul;
      const flash = (Math.sin(p.beacon) * 0.5 + 0.5);
      const isImmune = (state.time < invUntil);
      const base = isImmune ? [239,68,68] : [251,191,36];
      const beaconX = imgX + drawW*0.58;
      const beaconY = imgY + drawH*0.18;
      ctx.fillStyle = 'rgba(30,41,59,.78)';
      roundedRect(beaconX - 2*r, beaconY + 1.8*r, 4*r, 2*r, 0.9*r); ctx.fill();
      ctx.fillStyle = `rgba(${base[0]}, ${base[1]}, ${base[2]}, ${0.28 + 0.42*flash})`;
      ctx.beginPath(); ctx.arc(beaconX, beaconY, 4.2*r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = `rgba(${base[0]}, ${base[1]}, ${base[2]}, 0.68)`; ctx.lineWidth = 1*r;
      ctx.beginPath(); ctx.arc(beaconX, beaconY, 4.8*r + 1.5*r*flash, 0, Math.PI*2); ctx.stroke();

      ctx.restore();
      return;
    }


    // Mât double
    ctx.fillStyle = "#0b1220";
    const mastX = x + w*0.70;
    const mastW = w*0.10;
    ctx.fillRect(mastX, y - h*0.05, mastW*0.38, h*0.95);
    ctx.fillRect(mastX + mastW*0.62, y - h*0.05, mastW*0.38, h*0.95);
    ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 2*r;
    ctx.beginPath();
    ctx.moveTo(mastX + mastW*0.10, y + h*0.10);
    ctx.lineTo(mastX + mastW*0.90, y + h*0.20);
    ctx.moveTo(mastX + mastW*0.10, y + h*0.35);
    ctx.lineTo(mastX + mastW*0.90, y + h*0.45);
    ctx.stroke();

    // Tablier + dosseret
    const carH = h*0.28, carY = y + h*0.52;
    ctx.fillStyle = "#111827";
    roundedRect(mastX - w*0.02, carY, mastW + w*0.12, carH, 3*r); ctx.fill();
    ctx.fillStyle = "#223045";
    for(let i=0;i<4;i++){
      ctx.fillRect(mastX - w*0.005 + i*(mastW*0.25), carY - h*0.10, 2*r, h*0.10);
    }

    // Fourches
    ctx.fillStyle = "#6b7280";
    const forkY = carY + carH*0.65;
    const forkL = w*0.45;
    ctx.fillRect(mastX + mastW*0.05, forkY, forkL, 7*r);
    ctx.beginPath();
    ctx.moveTo(mastX + mastW*0.05, forkY - 4*r);
    ctx.lineTo(mastX + mastW*0.18, forkY);
    ctx.lineTo(mastX + mastW*0.05, forkY);
    ctx.closePath();
    ctx.fill();

    // Carrosserie
    const bodyX = x + w*0.06, bodyY = y + h*0.38, bodyW = w*0.60, bodyH = h*0.42;
    const grad = ctx.createLinearGradient(bodyX, bodyY, bodyX, bodyY + bodyH);
    grad.addColorStop(0, "#facc15");
    grad.addColorStop(1, "#f59e0b");
    ctx.fillStyle = grad;
    roundedRect(bodyX, bodyY, bodyW, bodyH, 6*r); ctx.fill();
    ctx.fillStyle = "#d97706";
    roundedRect(bodyX + bodyW*0.42, bodyY + bodyH*0.05, bodyW*0.35, bodyH*0.80, 6*r); ctx.fill();

    // Cabine + vitrage
    const cabX = x + w*0.12, cabY = y + h*0.02, cabW = w*0.36, cabH = h*0.50;
    ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 2.2*r;
    roundedRect(cabX, cabY, cabW, cabH, 4*r); ctx.stroke();
    const glass = ctx.createLinearGradient(0, cabY, 0, cabY + cabH);
    glass.addColorStop(0, "rgba(148,163,184,0.16)");
    glass.addColorStop(1, "rgba(148,163,184,0.06)");
    ctx.fillStyle = glass;
    roundedRect(cabX + 2*r, cabY + 2*r, cabW - 4*r, cabH - 4*r, 3*r); ctx.fill();
    ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 2*r;
    ctx.beginPath();
    ctx.moveTo(cabX, cabY);
    ctx.lineTo(cabX + cabW, cabY - 3*r);
    ctx.lineTo(cabX + cabW, cabY + 6*r);
    ctx.lineTo(cabX, cabY + 9*r);
    ctx.closePath(); ctx.stroke();

    // Siège + volant
    ctx.fillStyle = "#0b1220";
    roundedRect(x + w*0.22, y + h*0.40, w*0.15, h*0.12, 3*r); ctx.fill();
    ctx.fillRect(x + w*0.22, y + h*0.34, w*0.11, h*0.08);
    ctx.strokeStyle = "#0b1220"; ctx.lineWidth = 2*r;
    ctx.beginPath();
    ctx.moveTo(x + w*0.31, y + h*0.38);
    ctx.lineTo(x + w*0.40, y + h*0.32);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(x + w*0.41, y + h*0.30, 5*r, 0, Math.PI*2); ctx.stroke();

    // Gyrophare
    p.beacon += 0.15 * state.speedMul;
    const flash = (Math.sin(p.beacon) * 0.5 + 0.5);
    const isImmune = (state.time < invUntil);
    const base = isImmune ? [239,68,68] : [251,191,36]; // rouge pendant immunité, jaune sinon
    ctx.fillStyle = `rgba(${base[0]}, ${base[1]}, ${base[2]}, ${0.25 + 0.45*flash})`;
    ctx.beginPath(); ctx.arc(cabX + cabW*0.08, cabY - 3*r, 4.5*r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = `rgba(${base[0]}, ${base[1]}, ${base[2]}, 0.7)`; ctx.lineWidth = 1*r;
    ctx.beginPath(); ctx.arc(cabX + cabW*0.08, cabY - 3*r, 4.5*r + 1.5*r*flash, 0, Math.PI*2); ctx.stroke();
// Roues
    p.wheelRot = (p.wheelRot || 0) + 0.18 * state.speedMul;
    drawTire(x + w*0.22, y + h*0.80, 14*r, p.wheelRot);
    drawTire(x + w*0.56, y + h*0.80, 14*r, p.wheelRot);

    // Contour carrosserie
    ctx.strokeStyle = "rgba(0,0,0,.55)";
    ctx.lineWidth = 1.4*r;
    roundedRect(bodyX, bodyY, bodyW, bodyH, 6*r); ctx.stroke();
  }

  function stopFrameEvent(e){ if(e){ e.preventDefault(); e.stopPropagation(); } }
  function showFullscreenHelp(){
    if(!fsHelp) return;
    fsHelp.classList.add('show');
    window.clearTimeout(window.__fsHelpTimer);
    window.__fsHelpTimer = window.setTimeout(()=>fsHelp.classList.remove('show'), 5200);
  }
  async function enterFullscreenGame(e){
    stopFrameEvent(e);
    if(!gameFrame) return;
    gameFrame.classList.add('is-fullscreen');
    document.documentElement.classList.add('cr-fs-active');
    showFullscreenHelp();
    try{ if(gameFrame.requestFullscreen && !document.fullscreenElement) await gameFrame.requestFullscreen(); }catch(err){ console.warn('Plein écran refusé :', err); }
    try{ if(screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); }catch(err){ console.warn('Orientation paysage non verrouillée :', err); showFullscreenHelp(); }
    setTimeout(fit,80);
    setTimeout(fit,360);
  }
  async function exitFullscreenGame(e){
    stopFrameEvent(e);
    try{ if(screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); }catch(err){}
    try{ if(document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen(); }catch(err){}
    if(gameFrame) gameFrame.classList.remove('is-fullscreen');
    document.documentElement.classList.remove('cr-fs-active');
    setTimeout(fit,80);
  }
  if(frameFullscreenBtn) frameFullscreenBtn.addEventListener('click', enterFullscreenGame);
  if(frameExitBtn) frameExitBtn.addEventListener('click', exitFullscreenGame);
  if(fsPauseBtn) fsPauseBtn.addEventListener('click',(e)=>{ stopFrameEvent(e); if(pauseBtn) pauseBtn.click(); updateHUD(); });
  if(fsLeaderboardBtn) fsLeaderboardBtn.addEventListener('click',(e)=>{ stopFrameEvent(e); window.location.href='game/leaderboard.html'; });
  // Ne jamais preventDefault sur pointerdown/touchstart ici : sur Android, cela peut empêcher le click des boutons overlay.
  // On stoppe seulement la propagation pour éviter tout geste parasite, et chaque bouton garde son vrai gestionnaire click.
  ['pointerdown','touchstart'].forEach(evt=>{
    document.querySelectorAll('.fs-btn,.fs-back,.frame-fs-btn,.fs-volume,.fs-volume input').forEach(el=>{
      el.addEventListener(evt, (e)=>{ if(e) e.stopPropagation(); }, {passive:true});
    });
  });
  document.addEventListener('fullscreenchange',()=>{
    if(!document.fullscreenElement && gameFrame && gameFrame.classList.contains('is-fullscreen')){
      gameFrame.classList.remove('is-fullscreen');
      document.documentElement.classList.remove('cr-fs-active');
      setTimeout(fit,80);
    }
  });

  // V3.6.11 : démarrage manuel conservé + correction zoom champ pseudo mobile.
  updateFirstPlayOverlay();
  draw();


  async function postOnlineScore(name, score){
    try{
      if(!SCORE_API_URL) return;
      const body = new URLSearchParams({ name: String(name||'Anonyme').slice(0,20), score: String(Math.floor(score||0)) });
      const res = await fetch(SCORE_API_URL, { method:'POST', body });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
    }catch(e){ console.warn('postOnlineScore error:', e); }
  }

  (function(){
    const b = document.getElementById('onlineBtn');
    if(b){ b.addEventListener('click', ()=>{ window.location.href = 'game/leaderboard.html'; }); }
  })();

})();
