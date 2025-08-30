const CACHE = 'destajos-cache-v1';
const APP_SHELL = [
  '/',
  '/static/css/custom.css',
  '/static/css/tailwind.min.css',
  '/static/js/indexedDB.js',
  '/static/js/alpine.min.js',
  '/manifest.json',
  '/offline.html'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(new Request(e.request, { credentials: "include" }))
        .catch(() =>
          new Response(JSON.stringify({ offline: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((res) =>
        res || fetch(new Request(e.request, { credentials: "include" }))
      )
    );
  }
});

