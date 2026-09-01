/**
 * KeyFlow Service Worker (v2.3.2)
 */

const CACHE_NAME = 'keyflow-v2.3.2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './styles/main.css',
  './styles/keyboard.css',
  './styles/hand-guide.css',
  './styles/typing-area.css',
  './styles/dashboard.css',
  './styles/results.css',
  './styles/components.css',
  './styles/themes.css',
  './styles/custom-practice.css',
  './styles/racing.css',
  './js/app.js',
  './js/state.js',
  './js/sound-engine.js',
  './js/finger-mapping.js',
  './js/layouts.js',
  './js/mastery.js',
  './js/curriculum.js',
  './js/typing-engine.js',
  './js/keyboard-renderer.js',
  './js/hand-renderer.js',
  './js/analytics.js',
  './js/achievements.js',
  './js/streak-challenge.js',
  './js/ghost-racer.js',
  './js/custom-practice.js',
  './js/ui.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
