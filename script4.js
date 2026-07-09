
(function(){
  const audio = document.getElementById('userMusic');
  const filePicker = document.getElementById('musicPicker');
  const folderPicker = document.getElementById('musicFolderPicker');
  const playBtn = document.getElementById('musicPlayBtn');
  const stopBtn = document.getElementById('musicStopBtn');
  const prevBtn = document.getElementById('musicPrevBtn');
  const nextBtn = document.getElementById('musicNextBtn');
  const statusEl = document.getElementById('musicStatus');
  const volumeSlider = document.getElementById('musicVolume');
  const fsPlayBtn = document.getElementById('fsPlayMusicBtn');
  const fsStopBtn = document.getElementById('fsStopMusicBtn');
  const fsPrevBtn = document.getElementById('fsPrevMusicBtn');
  const fsNextBtn = document.getElementById('fsNextMusicBtn');
  const fsVolumeSlider = document.getElementById('fsMusicVolume');

  const DB_NAME = 'cariste_runner_music_v2';
  const STORE_NAME = 'settings';
  const DIR_KEY = 'musicDirectoryHandle';
  const VOL_KEY = 'cariste_runner_music_volume';
  const AUDIO_EXT_RE = /\.(mp3|m4a|aac|ogg|oga|wav|flac|opus|webm)$/i;
  const canPickDirectory = !!(window.showDirectoryPicker && window.isSecureContext);

  let tracks = [];
  let currentIndex = 0;
  let currentUrl = null;
  let directoryHandle = null;
  let busy = false;
  let lastPlayRequest = 0;

  initMusicVolume();
  if (volumeSlider) {
    volumeSlider.addEventListener('input', onVolumeInput);
    volumeSlider.addEventListener('change', onVolumeInput);
  }
  if (fsVolumeSlider) {
    fsVolumeSlider.addEventListener('input', onVolumeInput);
    fsVolumeSlider.addEventListener('change', onVolumeInput);
    fsVolumeSlider.addEventListener('pointerdown', (e)=>{ if(e) e.stopPropagation(); }, {passive:true});
    fsVolumeSlider.addEventListener('touchstart', (e)=>{ if(e) e.stopPropagation(); }, {passive:true});
    fsVolumeSlider.addEventListener('pointerup', onVolumeInput);
    fsVolumeSlider.addEventListener('touchend', (e)=>{ onVolumeInput({target:fsVolumeSlider}); }, {passive:true});
  }

  function cleanName(name){
    return String(name || 'musique').split('/').pop().replace(/\.[^/.]+$/, '').trim() || 'musique';
  }

  function setStatus(text){
    if (statusEl) statusEl.textContent = text;
  }

  function clampVolume(v){
    const n = Number(v);
    if (!Number.isFinite(n)) return 0.7;
    return Math.max(0, Math.min(1, n));
  }

  function setMusicVolume(value, save=true){
    const vol = clampVolume(value);
    if (audio) audio.volume = vol;
    const percent = String(Math.round(vol * 100));
    if (volumeSlider && volumeSlider.value !== percent) volumeSlider.value = percent;
    if (fsVolumeSlider && fsVolumeSlider.value !== percent) fsVolumeSlider.value = percent;
    if (save) { try{ localStorage.setItem(VOL_KEY, String(vol)); }catch(e){} }
  }

  function initMusicVolume(){
    let stored = null;
    try{ stored = localStorage.getItem(VOL_KEY); }catch(e){}
    setMusicVolume(stored !== null ? Number(stored) : 0.7, false);
  }

  function onVolumeInput(e){
    const raw = e && e.target ? Number(e.target.value) : 70;
    setMusicVolume(raw / 100, true);
  }

  function notify(message){
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (toast && toastMsg) {
      toastMsg.textContent = message;
      toast.classList.add('show');
      window.clearTimeout(window.__musicToastTimer);
      window.__musicToastTimer = window.setTimeout(() => toast.classList.remove('show'), 3600);
    } else {
      alert(message);
    }
  }

  function isAudioFile(fileOrName){
    const name = typeof fileOrName === 'string' ? fileOrName : (fileOrName && fileOrName.name) || '';
    const type = typeof fileOrName === 'string' ? '' : (fileOrName && fileOrName.type) || '';
    return /^audio\//.test(type) || AUDIO_EXT_RE.test(name);
  }

  function shuffle(list){
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function openDb(){
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('IndexedDB indisponible'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Erreur IndexedDB'));
    });
  }

  async function saveDirectoryHandle(handle){
    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(handle, DIR_KEY);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error('Sauvegarde dossier impossible'));
      });
      db.close();
    } catch (e) {
      console.warn('Dossier non mémorisé :', e);
    }
  }

  async function loadSavedDirectoryHandle(){
    try {
      const db = await openDb();
      const handle = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(DIR_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error || new Error('Lecture dossier impossible'));
      });
      db.close();
      return handle;
    } catch (e) {
      return null;
    }
  }

  async function verifyDirectoryPermission(handle){
    if (!handle) return false;
    if (!handle.queryPermission || !handle.requestPermission) return true;
    const opts = { mode: 'read' };
    try {
      if ((await handle.queryPermission(opts)) === 'granted') return true;
      return (await handle.requestPermission(opts)) === 'granted';
    } catch (e) {
      console.warn('Permission dossier impossible :', e);
      return false;
    }
  }

  async function scanDirectory(handle){
    const found = [];

    async function walk(dir, prefix, depth){
      if (!dir || depth > 6) return;
      const iterable = typeof dir.values === 'function' ? dir.values() : (typeof dir.entries === 'function' ? dir.entries() : []);

      for await (const item of iterable) {
        const entry = Array.isArray(item) ? item[1] : item;
        if (!entry) continue;

        if (entry.kind === 'file') {
          if (isAudioFile(entry.name)) {
            found.push({ name: entry.name, path: prefix + entry.name, handle: entry, source: 'directory' });
          }
        } else if (entry.kind === 'directory') {
          await walk(entry, prefix + entry.name + '/', depth + 1);
        }
      }
    }

    await walk(handle, '', 0);
    found.sort((a, b) => (a.path || a.name).localeCompare((b.path || b.name), 'fr', { sensitivity: 'base' }));
    return found;
  }

  function revokeCurrentUrl(){
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
      currentUrl = null;
    }
  }

  function normalizeIndex(index){
    if (!tracks.length) return 0;
    return (index + tracks.length) % tracks.length;
  }

  async function getTrackFile(track){
    if (!track) return null;
    if (track.file) return track.file;
    if (track.handle && typeof track.handle.getFile === 'function') return await track.handle.getFile();
    return null;
  }

  async function loadTrack(index){
    if (!audio || !tracks.length) {
      revokeCurrentUrl();
      if (audio) audio.removeAttribute('src');
      setStatus('🎵 Ma musique : appuie sur Play');
      return false;
    }

    currentIndex = normalizeIndex(index);
    const track = tracks[currentIndex];

    try {
      const file = await getTrackFile(track);
      if (!file) throw new Error('Fichier audio introuvable');

      revokeCurrentUrl();
      currentUrl = URL.createObjectURL(file);
      audio.src = currentUrl;
      audio.loop = false;
      audio.load();
      setStatus(`✅ Prêt • ${currentIndex + 1}/${tracks.length} • ${cleanName(track.path || track.name)}`);
      return true;
    } catch (e) {
      console.warn('Chargement musique impossible :', e);
      notify('Impossible de charger cette musique. J’essaie la suivante.');
      if (tracks.length > 1) return await loadTrack(currentIndex + 1);
      setStatus('🎵 Musique illisible');
      return false;
    }
  }

  async function playLoadedTrack(){
    if (!audio) return false;
    if (!audio.src && tracks.length) {
      const loaded = await loadTrack(currentIndex);
      if (!loaded) return false;
    }
    if (!audio.src) return false;

    try {
      await audio.play();
      const track = tracks[currentIndex];
      if (track) setStatus(`▶️ ${currentIndex + 1}/${tracks.length} • ${cleanName(track.path || track.name)}`);
      return true;
    } catch(e) {
      console.warn('Lecture audio bloquée :', e);
      notify('Lecture bloquée par le navigateur : appuie encore une fois sur Play.');
      return false;
    }
  }

  function prepareFilePicker(input){
    if (!input) return false;
    try { input.value = ''; } catch(e) {}
    input.click();
    return true;
  }

  async function pickDirectoryAndBuildPlaylist(){
    if (!canPickDirectory) {
      notify('Choix direct d’un dossier indisponible ici. Sélectionne tes musiques manuellement.');
      if (folderPicker && 'webkitdirectory' in folderPicker) {
        return prepareFilePicker(folderPicker);
      }
      return prepareFilePicker(filePicker);
    }

    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      const granted = await verifyDirectoryPermission(handle);
      if (!granted) {
        notify('Autorisation refusée pour le dossier musique.');
        return false;
      }

      directoryHandle = handle;
      await saveDirectoryHandle(handle);
      return await buildPlaylistFromDirectory(handle);
    } catch (e) {
      if (e && e.name !== 'AbortError') {
        console.warn('Choix du dossier impossible :', e);
        notify('Impossible d’ouvrir ce dossier. Sélectionne tes musiques manuellement.');
        return prepareFilePicker(filePicker);
      }
      return false;
    }
  }

  async function buildPlaylistFromDirectory(handle){
    if (!handle || busy) return false;
    busy = true;
    setStatus('🎵 Analyse du dossier musique…');

    try {
      const granted = await verifyDirectoryPermission(handle);
      if (!granted) {
        busy = false;
        notify('Autorise à nouveau le dossier musique.');
        return false;
      }

      const found = await scanDirectory(handle);
      busy = false;

      if (!found.length) {
        tracks = [];
        revokeCurrentUrl();
        if (audio) audio.removeAttribute('src');
        setStatus('🎵 Aucun fichier audio dans ce dossier');
        notify('Aucune musique compatible trouvée dans ce dossier.');
        return false;
      }

      tracks = shuffle(found);
      currentIndex = 0;
      await loadTrack(0);
      notify(`${tracks.length} musique${tracks.length > 1 ? 's' : ''} trouvée${tracks.length > 1 ? 's' : ''}. Appuie sur Play pour lancer.`);
      return true;
    } catch (e) {
      busy = false;
      console.warn('Analyse dossier impossible :', e);
      notify('Impossible d’analyser ce dossier musique.');
      return false;
    }
  }

  async function ensurePlaylistReady(){
    if (tracks.length) return true;

    if (directoryHandle) {
      const ok = await buildPlaylistFromDirectory(directoryHandle);
      if (ok) return true;
    }

    return await pickDirectoryAndBuildPlaylist();
  }

  async function handlePlay(){
    const token = Date.now();
    lastPlayRequest = token;
    if (busy) {
      setStatus('🎵 Préparation de la musique…');
      return;
    }

    if (!tracks.length) {
      const ok = await ensurePlaylistReady();
      if (!ok || lastPlayRequest !== token) return;
      // Important mobile : après sélection/autorisation, on demande un second appui Play.
      // Ça évite le blocage audio fréquent après showDirectoryPicker ou sélecteur de fichiers.
      return;
    }

    await playLoadedTrack();
  }

  function stopCurrent(){
    if (!audio) return;
    audio.pause();
    try { audio.currentTime = 0; } catch(e) {}
    const track = tracks[currentIndex];
    setStatus(track ? `⏹️ ${currentIndex + 1}/${tracks.length} • ${cleanName(track.path || track.name)}` : '🎵 Ma musique : appuie sur Play');
  }

  async function nextTrack(){
    if (!tracks.length) {
      await ensurePlaylistReady();
      return;
    }
    const loaded = await loadTrack(currentIndex + 1);
    if (loaded) await playLoadedTrack();
  }

  async function prevTrack(){
    if (!tracks.length) {
      await ensurePlaylistReady();
      return;
    }
    const loaded = await loadTrack(currentIndex - 1);
    if (loaded) await playLoadedTrack();
  }

  async function useSelectedFiles(fileList, sourceLabel){
    const selected = Array.from(fileList || []).filter(isAudioFile);

    if (!selected.length) {
      setStatus('🎵 Ma musique : appuie sur Play');
      notify('Aucun fichier audio sélectionné.');
      return;
    }

    directoryHandle = null;
    tracks = shuffle(selected.map((file) => ({
      name: file.name,
      path: file.webkitRelativePath || file.name,
      file,
      source: sourceLabel || 'files'
    })));
    currentIndex = 0;
    await loadTrack(0);
    notify(`${tracks.length} musique${tracks.length > 1 ? 's' : ''} sélectionnée${tracks.length > 1 ? 's' : ''}. Appuie sur Play.`);
  }

  if (filePicker) {
    filePicker.addEventListener('change', () => useSelectedFiles(filePicker.files, 'files'));
  }

  if (folderPicker) {
    folderPicker.addEventListener('change', () => useSelectedFiles(folderPicker.files, 'folder-input'));
  }

  function guardFsButton(fn){
    return function(e){
      if(e){ e.preventDefault(); e.stopPropagation(); }
      return fn();
    };
  }

  if (playBtn) playBtn.addEventListener('click', handlePlay);
  if (stopBtn) stopBtn.addEventListener('click', stopCurrent);
  if (nextBtn) nextBtn.addEventListener('click', nextTrack);
  if (prevBtn) prevBtn.addEventListener('click', prevTrack);
  if (fsPlayBtn) fsPlayBtn.addEventListener('click', guardFsButton(handlePlay));
  if (fsStopBtn) fsStopBtn.addEventListener('click', guardFsButton(stopCurrent));
  if (fsNextBtn) fsNextBtn.addEventListener('click', guardFsButton(nextTrack));
  if (fsPrevBtn) fsPrevBtn.addEventListener('click', guardFsButton(prevTrack));

  if (audio) {
    audio.addEventListener('ended', () => {
      if (tracks.length > 1) nextTrack();
      else stopCurrent();
    });
    audio.addEventListener('error', () => {
      console.warn('Erreur élément audio :', audio.error);
      notify('Cette musique ne peut pas être lue par le navigateur.');
    });
  }

  (async function initMusicFolder(){
    directoryHandle = await loadSavedDirectoryHandle();
    if (directoryHandle) {
      setStatus('🎵 Dossier mémorisé • Play');
    } else if (canPickDirectory) {
      setStatus('🎵 Play : choisir un dossier');
    } else {
      setStatus('🎵 Play : choisir des musiques');
    }
  })();

  window.addEventListener('beforeunload', revokeCurrentUrl);
})();
