/* Runs first. Takes #k=<key> (and optional api=<web app URL or deployment id>) from the link once, keeps it on this device,
   and strips it from the address bar so it is never sent as a Referer or left in history. */
(function () {
  try {
    var u = new URL(location.href), h = new URLSearchParams((u.hash || '').replace(/^#/, '')), k = h.get('k') || u.searchParams.get('k'), api = h.get('api');
    if (k && /^[A-Za-z0-9_-]{20,128}$/.test(k)) { if (localStorage.getItem('ttgops.k') !== k) localStorage.removeItem('ttgops.cache'); localStorage.setItem('ttgops.k', k); }
    if (api) {
      if (/^[A-Za-z0-9_-]{30,120}$/.test(api)) api = 'https://script.google.com/macros/s/' + api + '/exec';
      if (/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(api) || /^http:\/\/(localhost|127\.0\.0\.1):\d+\/api$/.test(api)) localStorage.setItem('ttgops.api', api);
    }
    if (k || api) { u.searchParams.delete('k'); history.replaceState(null, '', u.pathname + u.search); }
  } catch (e) {}
  var de = document.documentElement;
  function fit() { de.classList.toggle('wide', window.innerWidth >= 960); }
  fit(); window.addEventListener('resize', fit);
})();
