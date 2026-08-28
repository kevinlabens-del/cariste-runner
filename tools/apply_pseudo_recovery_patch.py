from pathlib import Path
import re

HTML = Path('accueil.html')
JS = Path('script3.js')
SW = Path('service-worker.js')

modal_new = '''  <div class="modal" id="nameModal" role="dialog" aria-modal="true" aria-label="Gestion du pseudo">
    <div class="box">
      <h3 id="nameTitle" style="margin:0 0 10px;">Mon pseudo</h3>
      <p class="muted" id="nameHelp" style="margin:0 0 10px;">Choisis un pseudo et un code personnel à 4 chiffres.</p>
      <div class="name-mode-row" style="display:flex;gap:8px;margin:0 0 12px;">
        <button class="btn secondary" id="createNameModeBtn" type="button" style="flex:1;">Nouveau joueur</button>
        <button class="btn secondary" id="recoverNameModeBtn" type="button" style="flex:1;">Récupérer mon pseudo</button>
      </div>
      <div class="field" style="flex-wrap:wrap;">
        <input class="input" type="text" id="nameInput" placeholder="Ton pseudo" maxlength="20" autocomplete="nickname" style="flex-basis:100%;" />
        <input class="input" type="password" id="pinInput" placeholder="Code à 4 chiffres" maxlength="4" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="Code personnel à 4 chiffres" />
        <button class="btn icon-only-btn" id="saveNameBtn" type="button" aria-label="Valider" title="Valider">✅</button>
      </div>
      <div class="name-status" id="nameStatus" aria-live="polite">Aucune vérification permanente : le pseudo est contrôlé seulement à la création ou à la récupération.</div>
    </div>
  </div>'''

js_new = r'''  function getOnlineListFromPayload(data){
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
  function cleanPinInput(){
    if(!pinInput) return '';
    const clean = String(pinInput.value || '').replace(/\D/g,'').slice(0,4);
    if(pinInput.value !== clean) pinInput.value = clean;
    return clean;
  }
  function hash32(text){
    let h = 0x811c9dc5;
    const s = String(text || '');
    for(let i=0;i<s.length;i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8,'0');
  }
  function recoveryMarker(raw, pin){
    const pseudo = normalizePseudo(raw);
    return '~r' + hash32(pseudo) + hash32(pseudo + '|' + pin + '|cariste-runner');
  }
  function isRecoveryMarker(raw){
    return /^~r[0-9a-f]{16}$/i.test(String(raw || '').trim());
  }
  async function fetchPseudoRecords(){
    if(!SCORE_API_URL) throw new Error('API indisponible');
    const sep = SCORE_API_URL.includes('?') ? '&' : '?';
    const res = await fetch(SCORE_API_URL + sep + 'check=pseudos&t=' + Date.now(), { method:'GET', cache:'no-store' });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return getOnlineListFromPayload(data).map(itemPseudo).filter(Boolean);
  }
  async function reserveTechnicalRecord(raw){
    const body = new URLSearchParams({ name: String(raw || '').slice(0,20), score: '0', register: '1' });
    const res = await fetch(SCORE_API_URL, { method:'POST', body });
    if(!res.ok) throw new Error('HTTP ' + res.status);
  }
  function isCurrentPseudo(raw){
    const current = normalizePseudo(state.playerName || getPlayer());
    return !!current && normalizePseudo(raw) === current;
  }

  let nameMode = 'create';
  function setNameMode(mode){
    nameMode = mode === 'recover' ? 'recover' : 'create';
    if(createNameModeBtn) createNameModeBtn.style.opacity = nameMode === 'create' ? '1' : '.55';
    if(recoverNameModeBtn) recoverNameModeBtn.style.opacity = nameMode === 'recover' ? '1' : '.55';
    if(nameTitle) nameTitle.textContent = nameMode === 'recover' ? 'Récupérer mon pseudo' : (state.playerName ? 'Mon pseudo' : 'Nouveau joueur');
    if(nameHelp) nameHelp.textContent = nameMode === 'recover'
      ? 'Entre ton ancien pseudo et le code à 4 chiffres que tu avais choisi.'
      : (state.playerName
          ? 'Tu peux sécuriser ton pseudo actuel ou en choisir un nouveau avec un code à 4 chiffres.'
          : 'Choisis un pseudo unique et ton propre code personnel à 4 chiffres.');
    setNameStatus(nameMode === 'recover'
      ? 'Le contrôle en ligne se fait uniquement lorsque tu appuies sur Valider.'
      : 'Le pseudo sera contrôlé une seule fois au moment de sa création.', '');
    refreshPseudoInputState();
  }
  function refreshPseudoInputState(){
    const raw = cleanPseudoInput();
    const pin = cleanPinInput();
    let ok = raw.length >= 2 && pin.length === 4;
    setNameSaveEnabled(ok);
    if(!raw){ setNameStatus('Entre un pseudo entre 2 et 20 caractères.', ''); return; }
    if(raw.length < 2){ setNameStatus('Choisis un pseudo d’au moins 2 caractères.', 'err'); return; }
    if(pin.length < 4){ setNameStatus('Choisis ton code personnel à 4 chiffres.', ''); return; }
    setNameStatus(nameMode === 'recover' ? 'Prêt à récupérer ce pseudo.' : 'Prêt à créer ou sécuriser ce pseudo.', 'ok');
  }
  function openName(){
    lockMobileViewport();
    nameModal.classList.add('open');
    nameInput.value = state.playerName || '';
    if(pinInput) pinInput.value = '';
    setNameMode('create');
    refreshPseudoInputState();
  }
  function closeName(){ nameModal.classList.remove('open') }
  setNameBtn.addEventListener('click',openName);
  saveNameBtn.addEventListener('click',saveName);
  if(createNameModeBtn) createNameModeBtn.addEventListener('click',()=>setNameMode('create'));
  if(recoverNameModeBtn) recoverNameModeBtn.addEventListener('click',()=>setNameMode('recover'));
  nameInput.addEventListener('focus',()=>{ lockMobileViewport(); document.documentElement.classList.add('cr-name-focus'); setTimeout(()=>{ try{nameInput.scrollIntoView({block:'center',inline:'nearest'});}catch(e){} },80); });
  nameInput.addEventListener('blur',()=>{ lockMobileViewport(); document.documentElement.classList.remove('cr-name-focus'); setTimeout(()=>{ try{ window.scrollTo({left:0,top:0,behavior:'instant'}); }catch(e){ try{window.scrollTo(0,0)}catch(_){} } },120); });
  nameInput.addEventListener('touchstart', lockMobileViewport, {passive:true});
  nameInput.addEventListener('input',refreshPseudoInputState);
  if(pinInput){
    pinInput.addEventListener('input',refreshPseudoInputState);
    pinInput.addEventListener('touchstart', lockMobileViewport, {passive:true});
    pinInput.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); if(!saveNameBtn.disabled) saveName(); } });
  }
  nameInput.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); if(pinInput) pinInput.focus(); } });

  async function saveName(){
    const raw = cleanPseudoInput();
    const pin = cleanPinInput();
    if(raw.length < 2){ setNameStatus('Choisis un pseudo d’au moins 2 caractères.', 'err'); return; }
    if(!/^\d{4}$/.test(pin)){ setNameStatus('Le code doit contenir exactement 4 chiffres.', 'err'); return; }
    setNameSaveEnabled(false);
    setNameStatus(nameMode === 'recover' ? 'Récupération du pseudo…' : 'Création du pseudo…', 'wait');
    try{
      const records = await fetchPseudoRecords();
      const normalizedRecords = new Set(records.filter(n => !isRecoveryMarker(n)).map(normalizePseudo));
      const marker = recoveryMarker(raw, pin);
      const markerExists = records.some(n => String(n).trim().toLowerCase() === marker.toLowerCase());

      if(nameMode === 'recover'){
        if(!normalizedRecords.has(normalizePseudo(raw))){
          setNameStatus('Ce pseudo n’existe pas.', 'err'); setNameSaveEnabled(true); return;
        }
        if(!markerExists){
          setNameStatus('Pseudo ou code incorrect. Les anciens pseudos sans code doivent d’abord être sécurisés depuis leur appareil actuel.', 'err');
          setNameSaveEnabled(true); return;
        }
        setPlayer(raw);
        localStorage.setItem('cariste_recovery_ready','1');
        state.playerName = raw;
        refreshPlayerUI();
        setNameStatus('Pseudo récupéré ✅', 'ok');
        closeName();
        return;
      }

      const current = isCurrentPseudo(raw);
      if(normalizedRecords.has(normalizePseudo(raw)) && !current){
        setNameStatus('Ce pseudo existe déjà. Choisis-en un autre ou utilise « Récupérer mon pseudo ».', 'err');
        setNameSaveEnabled(true); return;
      }

      if(!current && !normalizedRecords.has(normalizePseudo(raw))){
        await reserveTechnicalRecord(raw);
      }
      if(!markerExists){
        await reserveTechnicalRecord(marker);
      }
      setPlayer(raw);
      localStorage.setItem('cariste_recovery_ready','1');
      state.playerName = raw;
      refreshPlayerUI();
      setNameStatus(current ? 'Pseudo sécurisé avec ton code ✅' : 'Pseudo créé ✅', 'ok');
      closeName();
    }catch(e){
      console.warn('Pseudo create/recovery error:', e);
      setNameStatus('Connexion impossible. Réessaie lorsque tu as du réseau.', 'err');
      setNameSaveEnabled(true);
    }
  }

  if(!state.playerName) openName(); refreshPlayerUI();'''


def patch_js(text: str) -> str:
    old_ref = "const nameModal=$('#nameModal'), nameInput=$('#nameInput'), saveNameBtn=$('#saveNameBtn'), setNameBtn=$('#setNameBtn'), nameStatus=$('#nameStatus');"
    new_ref = "const nameModal=$('#nameModal'), nameInput=$('#nameInput'), pinInput=$('#pinInput'), saveNameBtn=$('#saveNameBtn'), setNameBtn=$('#setNameBtn'), nameStatus=$('#nameStatus'), createNameModeBtn=$('#createNameModeBtn'), recoverNameModeBtn=$('#recoverNameModeBtn'), nameTitle=$('#nameTitle'), nameHelp=$('#nameHelp');"
    if old_ref in text:
        text = text.replace(old_ref, new_ref, 1)
    elif new_ref not in text:
        raise SystemExit('UI refs marker not found')

    pattern = re.compile(r"  function getOnlineListFromPayload\(data\)\{.*?  if\(!state\.playerName\) openName\(\); refreshPlayerUI\(\);", re.S)
    if pattern.search(text):
        text = pattern.sub(js_new, text, count=1)
    elif "function recoveryMarker" not in text:
        raise SystemExit('Pseudo logic block not found')
    return text


# Patch the real live page (contains the game JS inline)
html = HTML.read_text(encoding='utf-8')
modal_pattern = re.compile(r'  <div class="modal" id="nameModal".*?\n  </div>\n\n  <div class="modal" id="leaderboardModal"', re.S)
if modal_pattern.search(html):
    html = modal_pattern.sub(modal_new + '\n\n  <div class="modal" id="leaderboardModal"', html, count=1)
elif 'id="pinInput"' not in html:
    raise SystemExit('Pseudo modal not found')
html = patch_js(html)
HTML.write_text(html, encoding='utf-8')

# Keep source JS synchronized too
js = JS.read_text(encoding='utf-8')
js = patch_js(js)
JS.write_text(js, encoding='utf-8')

# Force installed versions to refresh the modified accueil page.
sw = SW.read_text(encoding='utf-8')
sw = re.sub(r"const CACHE_NAME = '[^']+';", "const CACHE_NAME = 'cariste-runner-cache-v3-5-7-pseudo-recovery';", sw, count=1)
SW.write_text(sw, encoding='utf-8')

print('Pseudo recovery patch applied successfully.')
