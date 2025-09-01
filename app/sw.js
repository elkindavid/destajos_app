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

define(["./static/js/workbox-dab8777c.js"], function (e) {
  "use strict";

  // Escucha mensajes desde la app
  self.addEventListener("message", e => {
    if (e.data && e.data.type === "SKIP_WAITING") {
      self.skipWaiting();
    }
  });

  // Archivos a cachear y servir offline
  e.precacheAndRoute(
    [
      { url: "index.js", revision: "efddccbd4f8b4b920fddc713a6d39f5d" },
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
      { url: "static/service-worker.js", revision: "bc959155201efedc23bcd206150d44a0" },
      { url: "templates/auth_change_password.html", revision: "c3a71aebd43b2810e42e3ae7923422cb" },
      { url: "templates/auth_login.html", revision: "4d2bf654821c8040e89319ca71095318" },
      { url: "templates/auth_register.html", revision: "49760cdf2cd144446936225d80d6074e" },
      { url: "templates/base.html", revision: "ecfbf3d6567822cece929e9d46f435a8" },
      { url: "templates/consultar.html", revision: "5ee72638e2361e36ae2cf9f7d02e4c67" },
      { url: "templates/destajos.html", revision: "3257f616c2549b29ed53873bf2ebf7c5" },
      { url: "templates/home.html", revision: "579bfb310cbfacca0dce0cb0519a6f26" },
      { url: "templates/offline.html", revision: "c0e14c726211ac41743e6fa15b3aefe0" },
      { url: "templates/usuarios_listado.html", revision: "b4a16fda78ae8e29923f85c34201f933" }
    ],
    {
      ignoreURLParametersMatching: [/^utm_/, /^fbclid$/]
    }
  );
});

//# sourceMappingURL=sw.js.map
