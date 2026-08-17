const CACHE_NAME = 'liftcontrol-cz-v1-6-5-344';
const APP_VERSION_URL = './index.html?v=5.344';
const APP_SHELL = [
  './',
  './index.html',
  './version.json',
  './revize-machine-db.js',
  './liftcontrol-backup-data.js',
  './manifest.json',
  './assets/vendor/firebase-app-compat-10.12.5.js',
  './assets/vendor/firebase-firestore-compat-10.12.5.js',
  './assets/vendor/firebase-storage-compat-10.12.5.js',
  './icon-192.png',
  './icon-512.png',
  './assets/stamps/revizni-razitko-zz.png',
  './assets/stamps/revizni-razitko-ez.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
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
      .then(() => self.clients.matchAll({type:'window', includeUncontrolled:true}))
      .then(clients => Promise.all(clients.map(client => {
        const target = new URL(APP_VERSION_URL, self.registration.scope);
        target.searchParams.set('forcedUpdate', String(Date.now()));
        return client.navigate(target.toString()).catch(() => null);
      })))
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  if (url.pathname.endsWith('/reset.html')) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
  );
});


















