const CACHE_NAME = 'liftcontrol-cz-v1-6-5-369';
const CORE_APP_SHELL = [
  './index.html',
  './revize-machine-db.js',
  './liftcontrol-backup-data.js',
  './assets/vendor/firebase-app-compat-10.12.5.js',
  './assets/vendor/firebase-firestore-compat-10.12.5.js',
  './assets/vendor/firebase-storage-compat-10.12.5.js'
];
const OPTIONAL_APP_SHELL = [
  './',
  './version.json',
  './manifest.json',
  './assets/vendor/heic-converter-0.3.0/index.mjs',
  './assets/vendor/heic-converter-0.3.0/heic-decoder.wasm',
  './icon-192.png',
  './icon-512.png',
  './assets/stamps/revizni-razitko-zz.png',
  './assets/stamps/revizni-razitko-ez.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        await cache.addAll(CORE_APP_SHELL);
        await Promise.all(OPTIONAL_APP_SHELL.map(async path => {
          try{
            const response = await fetch(new Request(path, {cache:'reload'}));
            if(!response.ok) throw new Error('HTTP ' + response.status + ' pro ' + path);
            await cache.put(path, response);
          }catch(error){
            console.warn('Volitelny offline soubor se nepodarilo ulozit:', path, error);
          }
        }));
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function fetchWithTimeout(request, options={}, timeoutMs=4500) {
  if(typeof AbortController === 'undefined') return fetch(request, options);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(request, {...options, signal:controller.signal})
    .finally(() => clearTimeout(timer));
}

async function fetchAndCache(request, cacheKey=request, options={}) {
  const response = await fetchWithTimeout(request, options);
  if(response && response.ok){
    const cache = await caches.open(CACHE_NAME);
    await cache.put(cacheKey, response.clone());
  }
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/reset.html')) {
    event.respondWith(fetchWithTimeout(request, {cache:'no-store'}));
    return;
  }

  if (url.pathname.endsWith('/version.json')) {
    const network = fetchAndCache(request, './version.json', {cache:'no-store'});
    event.respondWith(
      network.catch(() => caches.open(CACHE_NAME).then(cache => cache.match('./version.json')))
    );
    return;
  }

  if (request.mode === 'navigate') {
    const network = fetchAndCache(request, './index.html', {cache:'no-store'});
    event.waitUntil(network.then(() => undefined, () => undefined));
    if(url.searchParams.has('update')){
      event.respondWith(
        network.catch(() => caches.open(CACHE_NAME).then(cache => cache.match('./index.html')))
      );
      return;
    }
    event.respondWith(
      caches.open(CACHE_NAME)
        .then(cache => cache.match('./index.html'))
        .then(cached => cached || network)
    );
    return;
  }

  const network = fetchAndCache(request);
  event.waitUntil(network.then(() => undefined, () => undefined));
  event.respondWith(
    caches.open(CACHE_NAME)
      .then(cache => cache.match(request, {ignoreSearch:true}))
      .then(cached => cached || network)
  );
});


















