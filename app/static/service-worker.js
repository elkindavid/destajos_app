const CACHE = 'destajos-cache-v1';
const APP_SHELL = [
  '/',
  '/static/js/app.js',
  '/static/js/idb.js',
  '/manifest.webmanifest'
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
