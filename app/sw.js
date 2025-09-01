// Nombre de cache principal
const CACHE_NAME = "destajos-cache-v1";

// Archivos a precachear (todos los que tienes en Cache Storage)
const PRECACHE_URLS = [
  "/",                // home.html
  "/destajos",        // destajos.html
  "/consultar",       // consultar.html
  "/usuarios",        // usuarios_listado.html
  "/login",           // auth_login.html
  "/register",        // auth_register.html
  "/change-password", // auth_change_password.html
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

// Manejo de peticiones (fetch)
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // --- 1. API: Respuesta offline en JSON ---
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          JSON.stringify({ offline: true, message: "Sin conexión a la API" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        )
      )
    );
    return; // 👈 importante: salir aquí
  }

  // --- 2. Archivos estáticos (HTML, CSS, JS, imágenes) ---
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cacheRes => {
      // Si está en caché, devuélvelo
      if (cacheRes) {
        return cacheRes;
      }

      // Si no está en caché, intenta desde la red
      return fetch(event.request).catch(() => {
        // Si falla (sin conexión), dar fallback
        if (event.request.destination === "document") {
          return caches.match("/static/offline.html", { ignoreSearch: true });
        }
        if (event.request.destination === "image") {
          return caches.match("/static/images/fallback.png", { ignoreSearch: true });
        }
        // Fallback genérico
        return new Response("Sin conexión y recurso no disponible en caché", {
          status: 503,
          headers: { "Content-Type": "text/plain" }
        });
      });
    })
  );
});

