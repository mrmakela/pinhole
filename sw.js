/* Neulanreikäkamera Service Worker v5 */

const CACHE = 'neulanreika-v5';

// self.location.href is e.g. https://user.github.io/repo/sw.js
// so APP_URL becomes https://user.github.io/repo/index.html — always correct
const APP_URL = self.location.href.replace('sw.js', 'index.html');

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.add(APP_URL))
      .then(() => self.skipWaiting())
      .catch(e => { console.warn('SW install error:', e); self.skipWaiting(); })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.protocol === 'chrome-extension:') return;

  // Fonts: network first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      fetch(event.request)
        .then(res => { caches.open(CACHE).then(c => c.put(event.request, res.clone())); return res; })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Navigation (app launch): always serve the cached HTML
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(APP_URL)
        .then(cached => cached || fetch(APP_URL))
    );
    return;
  }

  // Other: cache first, network fallback
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .then(res => {
          if (res.ok && url.origin === self.location.origin) {
            caches.open(CACHE).then(c => c.put(event.request, res.clone()));
          }
          return res;
        })
      )
  );
});
