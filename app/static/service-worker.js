const CACHE = 'destajos-cache-v1';
const APP_SHELL = [
  '/',
  '/templates/auth_change_password.html',
  '/templates/auth_login.html',
  '/templates/auth_register.html',
  '/templates/base.html',
  '/templates/consultar.html',
  '/templates/destajos.html',
  '/templates/home.html',
  '/templates/usuarios_listado.html',
  '/static/css/custom.css',
  '/static/css/tailwind.min.css',
  '/static/js/indexedDB.js',
  '/static/js/alpine.min.js',
  '/manifest.json',
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e)=>{
  const url = new URL(e.request.url);
  if(url.pathname.startsWith('/api/')){
    e.respondWith(
      fetch(e.request).catch(()=> new Response(JSON.stringify({offline:true}),{status:200, headers:{'Content-Type':'application/json'}}))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(res=> res || fetch(e.request))
    );
  }
});
