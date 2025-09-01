// importScripts("/static/js/workbox-dab8777c.js");

// // Control inmediato del nuevo SW
// workbox.core.skipWaiting();
// workbox.core.clientsClaim();

// // Limpieza automática de caches viejos
// workbox.precaching.cleanupOutdatedCaches();

// // Precaching (solo una vez, con tus archivos)
// workbox.precaching.precacheAndRoute([
//   { url: "/static/css/custom.css", revision: "1" },
//   { url: "/static/css/input.css", revision: "1" },
//   { url: "/static/css/tailwind.min.css", revision: "1" },
//   { url: "/static/images/logo-192.png", revision: "1" },
//   { url: "/static/images/logo-512.png", revision: "1" },
//   { url: "/static/images/logo.png", revision: "1" },
//   { url: "/static/js/alpine.min.js", revision: "1" },
//   { url: "/static/js/indexedDB.js", revision: "1" },
//   { url: "/static/manifest.json", revision: "1" },
//   { url: "/static/screenshots/screenshot1.png", revision: "1" },
//   { url: "/static/screenshots/screenshot2.png", revision: "1" },
//   { url: "/static/offline.html", revision: "1" }
// ]);

// // Evento activate (ya con clientsClaim arriba)
// self.addEventListener("activate", (event) => {
//   const currentCaches = [workbox.core.cacheNames.precache, "api-cache"];
//   event.waitUntil(
//     caches.keys().then((keys) =>
//       Promise.all(
//         keys
//           .filter((key) => !currentCaches.includes(key))
//           .map((key) => caches.delete(key))
//       )
//     )
//   );
//   self.clients.claim();
// });


// // Fetch con fallback offline
// self.addEventListener("fetch", (event) => {
//   const url = new URL(event.request.url);

//   if (url.pathname.startsWith("/api/")) {
//     // Respuesta offline para API
//     event.respondWith(
//       fetch(event.request).catch(() =>
//         new Response(JSON.stringify({ offline: true }), {
//           status: 200,
//           headers: { "Content-Type": "application/json" },
//         })
//       )
//     );
//   } else {
//     // Static + fallback offline.html
//     event.respondWith(
//       caches.match(event.request, {ignoreSearch: true}).then((res) => {
//         return (
//           res ||
//           fetch(event.request).catch(() =>
//             caches.match("/static/offline.html", {ignoreSearch: true}).then(
//               (fallback) =>
//                 fallback ||
//                 new Response("Sin conexión", {
//                   status: 503,
//                   headers: { "Content-Type": "text/plain" },
//                 })
//             )
//           )
//         );
//       })
//     );
//   }
// });


// Nombre de cache principal
const CACHE_NAME = "destajos-cache-v1";

// Archivos a precachear (todos los que tienes en Cache Storage)
const PRECACHE_URLS = [
  "/static/css/custom.css",
  "/static/css/input.css",
  "/static/css/tailwind.min.css",
  "/static/images/logo-192.png",
  "/static/images/logo-512.png",
  "/static/images/logo.png",
  "/static/js/alpine.min.js",
  "/static/js/indexedDB.js",
  "/static/manifest.json",
  "/static/screenshots/screenshot1.png",
  "/static/screenshots/screenshot2.png",
  "/static/offline.html"
];

// Instalación del SW y precache
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activación del SW y limpieza de caches antiguos
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch handler con manejo offline
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // API: respuesta offline con JSON
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ offline: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
    );
    return;
  }

  // Archivos estáticos + fallback offline.html
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(res => {
      return res || fetch(event.request).catch(() =>
        caches.match("/static/offline.html", { ignoreSearch: true })
          .then(fallback => fallback || new Response("Sin conexión", {
            status: 503,
            headers: { "Content-Type": "text/plain" }
          }))
      );
    })
  );
});
