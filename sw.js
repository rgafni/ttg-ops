/* App shell cache only. API responses (case data) are NEVER cached: they are cross-origin POSTs.
   Requests with a query string (e.g. a ?k= admin link) are never written to the cache; shell files are stored
   under their clean path only. Bumping V deletes every older cache (including any entry an older version kept). */
var V = 'ttgops-v9', SHELL = [
  './', 'index.html', 'app.css', 'app.js', 'boot.js', 'config.js', 'model.js', 'billing-core.js',
  'fixtures/v4-sample.js', 'fixtures/fake-api.js', 'install.js', 'install.css', 'manifest.webmanifest', 'icons/icon-192.png'
];
var SCOPE = self.registration ? new URL(self.registration.scope).pathname : '/';
function shellPath(p) {
  var rel = p.indexOf(SCOPE) === 0 ? p.slice(SCOPE.length) : null;
  if (rel === null) return false;
  return rel === '' || SHELL.indexOf(rel) >= 0;
}
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // API traffic is cross-origin POST: untouched
  var clean = u.origin + u.pathname, cacheable = shellPath(u.pathname);
  e.respondWith(fetch(e.request).then(function (r) {
    if (cacheable && !u.search && r && r.ok && r.type === 'basic') { var c = r.clone(); caches.open(V).then(function (ca) { ca.put(clean, c); }); }
    return r;
  }).catch(function () {
    return caches.match(clean, { ignoreSearch: true }).then(function (r) { return r || caches.match(SCOPE + 'index.html') || caches.match('index.html'); });
  }));
});
