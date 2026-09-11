const CACHE = 'saathi-field-v0.5.0';
const APP_SHELL = [
  '/', '/index.html', '/styles.css', '/manifest.webmanifest', '/public/icons/icon.svg',
  '/src/app.mjs', '/src/ui/icons.mjs', '/src/core/finance-engine.mjs', '/src/core/speech-parser.mjs',
  '/src/core/research-events.mjs', '/src/core/device-capabilities.mjs', '/src/core/voice-flow.mjs',
  '/src/core/voice-copy.mjs', '/src/core/activity-store.mjs', '/src/core/ledger-store.mjs', '/src/core/audio-capture.mjs'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    if(response.ok) event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    return response;
  }).catch(() => caches.match(event.request).then(hit => hit || (event.request.mode === 'navigate' ? caches.match('/index.html') : Response.error()))));
});
