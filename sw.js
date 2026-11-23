// Tasriton offline support.
// The app always tries the internet first, so updates arrive right away.
// Without Wi-Fi it opens the copy saved on the tablet.
const CACHE = 'tasriton-v10';   // bump to clear old copies on every device
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'fonts/fonts.css',
  "fonts/david-libre-hebrew-0.woff2",  "fonts/david-libre-hebrew-2.woff2",  "fonts/david-libre-latin-1.woff2",  "fonts/david-libre-latin-3.woff2",  "fonts/rubik-hebrew-4.woff2",  "fonts/rubik-latin-5.woff2",  "fonts/secular-one-hebrew-6.woff2",  "fonts/secular-one-latin-7.woff2",
  'icons/tasriton-192.png', 'icons/tasriton-512.png', 'icons/tasriton-apple-180.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Fonts never change: take them from the tablet. (Icons are fetched fresh, so a new logo reaches everyone.)
// Everything else: internet first (give up after 4 seconds of slow Wi-Fi), then the saved copy.
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (/\/fonts\//.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await Promise.race([
        fetch(req, { cache: 'no-cache' }),
        new Promise((_, no) => setTimeout(() => no(new Error('slow')), 4000))
      ]);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      return (await cache.match(req, { ignoreSearch: true }))
        || (req.mode === 'navigate' ? await cache.match('index.html') : undefined)
        || Response.error();
    }
  })());
});
