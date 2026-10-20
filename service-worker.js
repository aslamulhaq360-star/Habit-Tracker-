const CACHE_NAME = 'dhara-habit-tracker-v2';
const ASSETS = ['./','./index.html','./style.css','./app.js','./manifest.json','./icon.svg'];

self.addEventListener('install', (event)=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event)=>{
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event)=>{
  if(event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached=>{
      const networkFetch = fetch(event.request).then(response=>{
        if(response && response.status===200 && response.type==='basic'){
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache=> cache.put(event.request, clone));
        }
        return response;
      }).catch(()=> cached);
      return cached || networkFetch;
    })
  );
});
