/*
 * sw.js — Card Dex service worker.
 * App shell: cache-first with background refresh, so the dex opens instantly
 * (and offline, showing your caught collection).
 * PokéAPI / sprites / OCR engine: stale-while-revalidate, so cards you've
 * scanned before identify fast and repeat visits don't re-download Tesseract.
 */

const SHELL_CACHE = 'carddex-shell-v2';
const RUNTIME_CACHE = 'carddex-runtime-v1';

const SHELL = [
  './',
  './index.html',
  './pokedex.css',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './manifest.webmanifest',
  './js/app.js',
  './js/api.js',
  './js/matcher.js',
  './js/scanner.js',
  './js/storage.js',
  './js/game.js',
  './js/sfx.js',
];

const RUNTIME_HOSTS = [
  'pokeapi.co',
  'raw.githubusercontent.com',
  'cdn.jsdelivr.net',
  'tessdata.projectnaptha.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // App shell: serve from cache, refresh in the background.
    event.respondWith(
      caches.match(req).then((cached) => {
        const refresh = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || refresh;
      })
    );
    return;
  }

  if (RUNTIME_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))) {
    // Ranged media requests (cries via <audio>) get 206es the Cache API
    // rejects — let those go straight to the network.
    if (req.headers.get('range')) return;
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const refresh = fetch(req)
          .then((res) => {
            // Only cache full CORS-readable 200s: opaque responses are
            // quota-padded to ~7 MB each in Chrome, and 206es throw.
            if (res && res.status === 200 && res.type !== 'opaque') {
              cache.put(req, res.clone()).then(() => trimCache(cache)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || refresh;
      })
    );
  }
});

const RUNTIME_MAX_ENTRIES = 300;
async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= RUNTIME_MAX_ENTRIES) return;
  // Cache keys are in insertion order — drop the oldest overflow.
  await Promise.all(keys.slice(0, keys.length - RUNTIME_MAX_ENTRIES).map((k) => cache.delete(k)));
}
