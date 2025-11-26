// Simple service worker for Qur'an School PWA
const CACHE_NAME = 'quran-school-cache-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest'
  // إذا أضفت ملفات أخرى (CSS/JS/صور محلية) أضفها هنا
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
