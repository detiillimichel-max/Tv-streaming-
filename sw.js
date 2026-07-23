// OIO TV SW v1.2
const CACHE_NAME='oio-tv-v1.2';const ASSETS=['./','./index.html','./style.css','./script.js','./manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));});
self.addEventListener('fetch',e=>{
 const req=e.request;
 if(req.url.includes('.mp4')||req.url.includes('.webm')||req.url.includes('.m4v')){e.respondWith(fetch(req).catch(()=>caches.match(req)));return;}
 e.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{return caches.open(CACHE_NAME).then(cache=>{cache.put(req,res.clone());return res;});}).catch(()=>{if(req.destination==='document') return caches.match('./index.html');})));
});
