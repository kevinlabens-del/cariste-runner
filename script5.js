
(function(){
  const installZone = document.getElementById('installPwaZone');
  const installBtn = document.getElementById('installPwaBtn');
  const statusEl = document.getElementById('installPwaStatus');
  const INSTALL_FLAG = 'cariste_runner_pwa_installed';
  let deferredPrompt = null;

  function isStandalone(){
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function rememberInstalled(){
    try { localStorage.setItem(INSTALL_FLAG, '1'); } catch(e){}
  }

  function hasInstalledMemory(){
    try { return localStorage.getItem(INSTALL_FLAG) === '1'; } catch(e){ return false; }
  }

  function notify(message){
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (toast && toastMsg) {
      toastMsg.textContent = message;
      toast.classList.add('show');
      window.clearTimeout(window.__installToastTimer);
      window.__installToastTimer = window.setTimeout(() => toast.classList.remove('show'), 3200);
    } else {
      alert(message);
    }
  }

  function setStatus(text){
    if (statusEl) statusEl.textContent = text;
  }

  function hideInstallButton(text){
    if (installBtn) installBtn.hidden = true;
    if (statusEl) statusEl.hidden = true;
    if (installZone) {
      installZone.classList.add('is-hidden');
      installZone.setAttribute('aria-hidden', 'true');
    }
    if (text) setStatus(text);
  }

  function showInstallButton(text){
    if (!installBtn) return;
    if (installZone) {
      installZone.classList.remove('is-hidden');
      installZone.removeAttribute('aria-hidden');
    }
    installBtn.hidden = false;
    installBtn.classList.add('ready');
    installBtn.textContent = '📲 Installer l’application';
    if (statusEl) statusEl.hidden = false;
    setStatus(text || 'Installation disponible.');
  }

  function refreshInstallButton(){
    if (!installBtn) return;

    if (isStandalone()) {
      rememberInstalled();
      hideInstallButton('Application déjà installée.');
      return;
    }

    if (hasInstalledMemory()) {
      hideInstallButton('Application déjà installée.');
      return;
    }

    if (deferredPrompt) {
      showInstallButton('Installation disponible.');
    } else {
      // On masque le bouton tant que le navigateur ne confirme pas que l’installation est possible.
      // Ça évite de garder un bouton inutile après installation ou dans les navigateurs non compatibles.
      hideInstallButton('Installation non proposée par le navigateur pour l’instant.');
    }
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();

    if (isStandalone()) {
      rememberInstalled();
      deferredPrompt = null;
      hideInstallButton('Application déjà installée.');
      return;
    }

    // Si le navigateur repropose vraiment l’installation, on considère que l’ancien marqueur local était périmé.
    try { localStorage.removeItem(INSTALL_FLAG); } catch(e){}

    deferredPrompt = event;
    refreshInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    rememberInstalled();
    hideInstallButton('Application installée.');
    notify('Cariste Runner est installé.');
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (isStandalone() || hasInstalledMemory()) {
        rememberInstalled();
        notify('Cariste Runner est déjà installé.');
        hideInstallButton('Application déjà installée.');
        return;
      }

      if (!deferredPrompt) {
        notify('Installation indisponible pour le moment. Recharge la page depuis Chrome si besoin.');
        hideInstallButton('Installation non proposée par le navigateur pour l’instant.');
        return;
      }

      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        deferredPrompt = null;

        if (choice && choice.outcome === 'accepted') {
          rememberInstalled();
          notify('Installation lancée.');
          hideInstallButton('Installation lancée.');
        } else {
          notify('Installation annulée.');
          hideInstallButton('Installation annulée. Recharge la page pour réessayer si besoin.');
        }
      } catch (error) {
        console.warn('Erreur installation PWA :', error);
        notify('Impossible de lancer l’installation depuis ce navigateur.');
        hideInstallButton('Installation impossible depuis ce navigateur.');
      }
    });
  }

  refreshInstallButton();
  window.setTimeout(refreshInstallButton, 700);
})();
