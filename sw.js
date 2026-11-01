// Офлайн-режим: все файлы планера лежат в кэше телефона.
// После правок сайта меняй номер версии — тогда телефон скачает новые файлы.
const CACHE = 'planner-v1';
const PICS = ['wake', 'water', 'sleep', 'bar', 'run', 'workout', 'meditate', 'study', 'school', 'work', 'food', 'read', 'walk', 'default'];
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'icons/icon-64.png', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  ...PICS.map(p => `img/${p}.jpg`)
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Сначала отдаём из кэша (мгновенно и без интернета), а в фоне тихо обновляем файл
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const own = url.origin === location.origin;
  if (!own && !FONT_HOSTS.includes(url.hostname)) return;

  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, {ignoreSearch: own});
    const fresh = fetch(req).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(fresh); return cached; }
    const res = await fresh;
    if (res) return res;
    // без сети и без кэша: для страниц отдаём главную
    if (req.mode === 'navigate') return cache.match('index.html');
    return Response.error();
  }));
});
