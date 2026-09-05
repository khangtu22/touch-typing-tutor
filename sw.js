/**
 * KeyFlow Service Worker (v3.0.0 - Premium Edition)
 */

const CACHE_NAME = 'keyflow-v3.5.0';
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
  './styles/premium.css',
  './styles/arcade.css',
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
  './js/focus-zen.js',
  './js/goals-wellness.js',
  './js/theme-studio.js',
  './js/advanced-analytics.js',
  './js/premium-features.js',
  './js/arcade-games.js',
  './js/code-snippets.js',
  './js/speed-test.js',
  './js/command-palette.js',
  './js/certificate-generator.js',
  './js/weakness-engine.js',
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
