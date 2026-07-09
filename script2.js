
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js', { scope: './' }).then((r)=>{ if(r.waiting) r.waiting.postMessage({type:'SKIP_WAITING'}); }).catch(console.error);
      });
    }
  