// Simple service worker for Qur'an School PWA
// غيّر رقم النسخة هنا فقط عندما تريد مسح الكاش القديم بالكامل
const CACHE_VERSION = 'v4';
const CACHE_NAME = `quran-school-cache-${CACHE_VERSION}`;

const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest'
  // إذا أضفت ملفات أخرى (CSS/JS/صور محلية) أضفها هنا
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(URLS_TO_CACHE);

      // يجعل الـ SW الجديد جاهز للتفعيل مباشرة
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // امسح أي كاش قديم إذا تغيّر اسم/نسخة الكاش
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );

      // خذ التحكم في الصفحات فوراً
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // نتعامل فقط مع GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) للـ index.html: Network First
  //    إذا فيه تحديث على GitHub Pages بيجيب الجديد ويحدّث الكاش
  //    وإذا ما فيه نت يرجع للكاش القديم
  const isIndex =
    url.origin === self.location.origin &&
    (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));

  if (isIndex) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const fresh = await fetch(req, { cache: 'no-store' });
          // حدّث الكاش دائماً بأحدث نسخة
          cache.put(req, fresh.clone());
          return fresh;
        } catch (err) {
          const cached = await cache.match(req);
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // 2) باقي الملفات: Cache First (سريع) مع fallback للنت
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      const res = await fetch(req);
      // خزّن نسخة في الكاش (اختياري لكن مفيد)
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, res.clone());
      return res;
    })()
  );
});
