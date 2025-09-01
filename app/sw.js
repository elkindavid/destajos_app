if (!self.define) {
  let e, s = {};

  const c = (c, i) => (
    c = new URL(c + ".js", i).href,
    s[c] || new Promise(s => {
      if ("document" in self) {
        const e = document.createElement("script");
        e.src = c;
        e.onload = s;
        document.head.appendChild(e);
      } else {
        e = c;
        importScripts(c);
        s();
      }
    }).then(() => {
      let e = s[c];
      if (!e) throw new Error(`Module ${c} didn’t register its module`);
      return e;
    })
  );

  self.define = (i, t) => {
    const a = e || ("document" in self ? document.currentScript.src : "") || location.href;
    if (s[a]) return;

    let r = {};
    const f = e => c(e, a),
          n = { module: { uri: a }, exports: r, require: f };

    s[a] = Promise.all(i.map(e => n[e] || f(e))).then(e => (t(...e), r));
  }
}

define(["./static/js/workbox-dab8777c"], function (workbox) {
  "use strict";

  self.addEventListener("message", e => {
    if (e.data && e.data.type === "SKIP_WAITING") {
      self.skipWaiting();
    }
  });

  // Precaching con Workbox (esto ya crea el Cache Storage automáticamente)
  workbox.precacheAndRoute(
    [
      { url: "static/css/custom.css", revision: "d41d8cd98f00b204e9800998ecf8427e" },
      { url: "static/css/input.css", revision: "7294805e1e94a856333999f9c0ad4814" },
      { url: "static/css/tailwind.min.css", revision: "582b2b0fa320069f34983ab0824ce1fe" },
      { url: "static/images/logo-192.png", revision: "0b8faf326015f8b78aa0bcbc4986fe1c" },
      { url: "static/images/logo-512.png", revision: "7ff5862c648c202faafdc99356c04529" },
      { url: "static/images/logo.png", revision: "19c8992f4c7bb06384aa1bcaa9bce9f4" },
      { url: "static/js/alpine.min.js", revision: "7f47218dc7a869a66fc54c27ac678f2c" },
      { url: "static/js/indexedDB.js", revision: "dd05c9ccc67b18ca6b968c5e4fec35ec" },
      { url: "static/manifest.json", revision: "44af4eb434f84c1e6088907c8dca47db" },
      { url: "static/screenshots/screenshot1.png", revision: "095130d2d0fb0591fc030d05f8c30a51" },
      { url: "static/screenshots/screenshot2.png", revision: "f5be7395849940abbeb8f6c273f7e917" },
      { url: "static/offline.html", revision: "123456" }
    ],
    {
      ignoreURLParametersMatching: [/^utm_/, /^fbclid$/]
    }
  );

  self.addEventListener("activate", (e) => {
    e.waitUntil(
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      )
    );
    self.clients.claim();
  });

  // Fetch con fallback
  self.addEventListener("fetch", (e) => {
    const url = new URL(e.request.url);

    if (url.pathname.startsWith("/api/")) {
      e.respondWith(
        fetch(e.request).catch(() =>
          new Response(JSON.stringify({ offline: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
    } else {
      e.respondWith(
        caches.match(e.request).then((res) => {
          return res || fetch(e.request).catch(() =>
            caches.match("static/offline.html").then((fallback) =>
              fallback || new Response("Sin conexión", {
                status: 503,
                headers: { "Content-Type": "text/plain" },
              })
            )
          );
        })
      );
    }
  });
});

