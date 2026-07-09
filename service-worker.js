const CACHE_NAME = 'cariste-runner-cache-v3-5-6-four-boxes-per-layer-10-layers-perf-cache-obstacles';

const CORE_ASSETS = [
  './',
  './index.html',
  './accueil.html',
  './chat.html',
  './manifest.json',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './assets/img/loading.webp',
  './assets/img/loading.jpg',
  './assets/img/lane.webp',
  './assets/img/lane.jpg',
  './game/accueil.html',
  './game/leaderboard.html',
  './game/1000933863.png',
  './game/forklift-realistic.png',
  './game/pallet-low-realistic.png',
  './game/pallet-stacked-realistic.png',
  './assets/warehouse-bg.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(CORE_ASSETS.map((asset) => cache.add(asset))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function networkTimeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('network-timeout')), ms);
  });
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

async function navigationResponse(request) {
  const url = new URL(request.url);
  const cache = await caches.open(CACHE_NAME);
  const cachedExact = await caches.match(request, { ignoreSearch: true });

  const fallbackIntro = await cache.match('./index.html');
  const fallbackHome = await cache.match('./accueil.html');

  try {
    const network = await Promise.race([fetch(request), networkTimeout(3500)]);
    if (network && network.ok) {
      cache.put(request, network.clone()).catch(() => {});
      return network;
    }
  } catch (e) {}

  if (cachedExact) return cachedExact;

  if (url.pathname.endsWith('/accueil.html') || url.pathname.endsWith('/game/accueil.html')) {
    return fallbackHome || fallbackIntro;
  }

  return fallbackIntro || fallbackHome || new Response('Cariste Runner indisponible hors ligne.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
    return;
  }

  event.respondWith(
    cacheFirst(request).catch(() => caches.match(request, { ignoreSearch: true }))
  );
});
