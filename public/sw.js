// The service worker. Cache-first for everything, versioned per build.
//
// IPAD.md: the app is small and entirely static, so cache-first with a
// version bump on deploy is correct and simple. Do not get clever.
//
// The one thing worth being careful about is the failure mode: an app
// launched from the home screen has no reload button, so a broken cache
// is unrecoverable for a child. Hence a new version deletes every old
// cache and takes over immediately, rather than waiting for every tab
// to close — there is only ever one tab, and it belongs to a
// seven-year-old who cannot be asked to close it.

const VERSION = '__VERSION__';
const CACHE = `lerninseln-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './main.js',
  './style.css',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // addAll is atomic: one missing file and nothing is cached, which
      // is the right failure — a half-cached app is worse than none.
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        // Cache what we fetch, so the voice files and any asset the app
        // asks for later are there on the next flight with no signal.
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    }),
  );
});
