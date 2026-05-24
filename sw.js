/* Neulanreikäkamera Service Worker v4 */
/* Works on GitHub Pages /repo/, Netlify /, and any path */

const CACHE = 'neulanreika-v4';

// Resolve index.html relative to where sw.js lives
const APP_URL = new URL('./index.html', self.location.href).href;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.add(APP_URL).catch(e => console.warn('SW install cache:', e)))
      .then(() => self.skipWaiting())
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

  // Google Fonts: network first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      fetch(event.request)
        .then(res => { caches.open(CACHE).then(c => c.put(event.request, res.clone())); return res; })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // All navigation requests → serve the app HTML (handles subdirectory and 404)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(APP_URL)
        .then(cached => cached || fetch(APP_URL))
        .catch(() => fetch(APP_URL))
    );
    return;
  }

  // Other requests: cache first, network fallback
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .then(res => {
          if (res.ok && url.origin === self.location.origin) {
            caches.open(CACHE).then(c => c.put(event.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(APP_URL))
      )
  );
});
