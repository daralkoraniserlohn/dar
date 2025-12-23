/* sw.js
   كل ما تغيّر CACHE_VERSION أو CACHE_NAME → يتم حذف كل الكاشات القديمة تلقائياً في activate
*/

const CACHE_VERSION = "v1.0.2"; // غيّرها عند كل تحديث
const CACHE_NAME = `masjid-app-cache-${CACHE_VERSION}`;

// عدّل الملفات اللي تريدها تتخزن Offline
// (لو مشروعك ملف HTML واحد فقط: خلي "/" واسم ملفك)
const PRECACHE_URLS = [
  "/",                       // الصفحة الرئيسية
  "./index.html",            // أو اسم ملفك الحقيقي
  "./sw.js",                 // اختياري
  "./manifest.webmanifest",  // إن وجد
  "./favicon.ico",           // إن وجد
];

// 1) Install: خزّن الملفات الأساسية
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting(); // فعّل النسخة الجديدة بسرعة
    })()
  );
});

// 2) Activate: احذف أي كاش قديم (أي اسم لا يطابق CACHE_NAME الحالي)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : Promise.resolve()))
      );
      await self.clients.claim(); // خلّ العملاء يستخدموا SW الجديد فوراً
    })()
  );
});

// 3) Fetch: كاش للطلبات GET لنفس الدومين فقط (حتى لا نخزّن API Apps Script)
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // لا نتعامل إلا مع GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // تجاهل طلبات خارج نفس الأصل (مثل Google Apps Script WebApp) → خليها Network فقط
  if (url.origin !== self.location.origin) return;

  // للـ navigation (فتح الصفحة): Network-first ثم fallback للكاش
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone());
          return fresh;
        } catch (e) {
          const cached = await caches.match(req);
          return cached || caches.match("./index.html") || Response.error();
        }
      })()
    );
    return;
  }

  // لباقي ملفات الستاتيك: Cache-first ثم Network وتخزين
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      const res = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, res.clone());
      return res;
    })()
  );
});
