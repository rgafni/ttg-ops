/* Calls card: the same Katya Calls system, shown inside Home and TTG Ops (one file; TTG Ops keeps a byte-identical copy in its own repo).
   - Loaded only after the host app decides this viewer may see it (Home: the portal flag from its server; TTG Ops: live mode).
   - Talks only to the Calls API with the Calls key already on this phone (localStorage 'calls.k'). No key: "Open Calls once to connect".
   - The Calls server checks the key on every request and answers only Roni's key. Any other key: the card removes itself.
   - Scheduled calls are one-off (today or tomorrow). Once a time is set the card folds to one line; tap it to open.
   - The last missed, skipped or failed call shows for 24 hours (status and time only; never call content or transcripts).
   No names, no numbers and no data are kept here; the list lives in memory only. */
(function () {
  'use strict';
  if (window.CallsCard) return;
  var API = 'https://script.google.com/macros/s/AKfycbzi_sFF-Nn1L_UGW16_GjWsVQpQ8XOQcc-n3iiD59ZEXygMSrRWWSM4pgM9dNY6ukET/exec';
  var CALLS_URL = '/calls/', TZ = 'America/New_York';
  var PRESETS = {
    home: [
      { id: 'wake', type: 'wake', label: 'Wake me up', short: 'Wake', time: '07:00', day: 'tomorrow' },
      { id: 'goodnight', type: 'goodnight', label: 'Goodnight', short: 'Goodnight', time: '22:30', day: 'today' }
    ],
    ttg: [
      { id: 'plan', type: 'workplan', label: 'Plan the day', time: '09:00', day: 'tomorrow' },
      { id: 'meeting', type: 'checkin', label: 'Check in before a meeting', time: '', day: 'today', note: 'Check in before a meeting: who it is with and what he wants out of it.', ask: 'Which meeting? (optional)' },
      { id: 'wrap', type: 'workwrap', label: 'End of day wrap', time: '17:30', day: 'today' }
    ]
  };
  var OUTCOME = { missed: 'Missed', skipped: 'Skipped for Shabbat or Yom Tov', failed: 'Did not go through' };
  var S = { list: null, running: null, at: 0, loading: false, gone: false, err: '', busy: false, slots: {}, open: {} };

  (function css() {
    if (document.querySelector('link[data-calls-card]')) return;
    var me = document.currentScript && document.currentScript.src, href = me ? me.replace(/calls-card\.js(\?.*)?$/, 'calls-card.css?v=2') : '/hub/calls-card.css?v=2';
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.setAttribute('data-calls-card', '1');
    document.head.appendChild(l);
  })();

  function key() { try { return localStorage.getItem('calls.k') || ''; } catch (e) { return ''; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function api(a, d) {
    var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 30000);
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ k: key(), a: a }, d || {})),
      redirect: 'follow', referrerPolicy: 'no-referrer', credentials: 'omit', cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(t); return r.json(); }, function (e) { clearTimeout(t); throw e; });
  }
  function srcOf(place, p) { return 'card:' + place + ':' + p.id; }
  function mine(place, p, it) {
    var src = String(it.src || '');
    if (src === srcOf(place, p)) return true;
    return place === 'home' && it.type === p.type && src.indexOf('card:ttg:') !== 0;   // a wake-up set in the Calls app shows in Home too
  }
  function nextOf(place, p) { return (S.list || []).filter(function (x) { return x.status === 'scheduled' && mine(place, p, x); }).sort(function (a, b) { return a.at < b.at ? -1 : 1; })[0]; }
  function lastOutcome(place, p) {
    var done = (S.list || []).filter(function (x) { return x.status !== 'scheduled' && x.status !== 'canceled' && mine(place, p, x); })
      .sort(function (a, b) { return (a.updated || a.at) < (b.updated || b.at) ? 1 : -1; })[0];
    if (!done || !OUTCOME[done.status] || Date.now() - +new Date(done.updated || done.at) > 864e5) return null;
    return OUTCOME[done.status] + ': ' + when(done.at);
  }
  function ymd(d) { return d.toLocaleDateString('en-CA', { timeZone: TZ }); }
  function hm(d) { return d.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }); }   // 1:50 PM, no leading zero
  function dayLbl(d) {
    var now = new Date();
    return ymd(d) === ymd(now) ? 'Today' : ymd(d) === ymd(new Date(now.getTime() + 864e5)) ? 'Tomorrow' : d.toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' });
  }
  function when(iso) { var d = new Date(iso); return isNaN(d) ? '' : dayLbl(d) + ' ' + hm(d); }
  function fmt24(v) { var m = /^(\d{1,2}):(\d{2})$/.exec(v || ''); if (!m) return v; var h = +m[1]; return (h % 12 || 12) + ':' + m[2] + (h < 12 ? ' AM' : ' PM'); }
  function extra(p, it) {                      // the meeting the user typed, never anything about a past call
    if (!p.ask || !it || !it.note) return '';
    var n = String(it.note); return n.indexOf(p.note) === 0 ? n.slice(p.note.length).trim() : '';
  }

  function load(force) {
    if (!key() || S.gone || S.loading) return;
    if (!force && S.list && Date.now() - S.at < 60000) return;
    S.loading = true;
    api('callList').then(function (j) {
      if (j && j.ok) { S.list = j.scheduled || []; S.running = !!(j.scheduler && j.scheduler.running); S.err = ''; S.at = Date.now(); }
      else if (j && j.error === 'locked') { S.err = 'locked'; }
      else { S.gone = true; }                      // 'not allowed': not Roni's Calls key, so no card at all
    }).catch(function () { S.err = 'offline'; }).then(function () { S.loading = false; drawAll(); });
  }

  function line(place, ps) {
    var set = ps.map(function (p) { return { p: p, it: nextOf(place, p) }; }).filter(function (x) { return x.it; });
    if (place === 'home') return set.map(function (x) { var d = new Date(x.it.at), l = dayLbl(d); return esc(x.p.short) + ' ' + esc(hm(d)) + (l === 'Today' ? '' : ' ' + esc(l.toLowerCase())); }).join(', ');
    var n = set.sort(function (a, b) { return a.it.at < b.it.at ? -1 : 1; })[0], d = new Date(n.it.at), l = dayLbl(d);
    return 'Next call: ' + esc(n.p.label) + ', ' + esc(l === 'Today' || l === 'Tomorrow' ? l.toLowerCase() : l) + ' ' + esc(hm(d));
  }
  function draw(slot, place) {
    if (S.gone) { slot.innerHTML = ''; slot.hidden = true; return; }
    var head = function (less) { return '<div class="cc-head"><span class="cc-chip"><span class="cc-dot"></span>Calls</span><span>' + (less ? '<button type="button" class="cc-less" data-cc="less">Show less</button>' : '') + '<a class="cc-manage" href="' + CALLS_URL + '">Manage in Calls &rsaquo;</a></span></div>'; };
    if (!key() || S.err === 'locked') {
      slot.innerHTML = '<div class="cc-card">' + head() + '<p class="cc-p">Open Calls once to connect. Katya\u2019s calls show up here after that.</p><a class="cc-btn cc-btn-p" href="' + CALLS_URL + '">Open Calls</a></div>';
      return;
    }
    var ps = PRESETS[place] || [], anySet = !!S.list && ps.some(function (p) { return nextOf(place, p); });
    var outs = S.list ? ps.map(function (p) { var o = lastOutcome(place, p); return o ? esc(p.short || p.label) + ': ' + esc(o) : ''; }).filter(Boolean) : [];
    if (anySet && !S.open[place]) {
      slot.innerHTML = '<button type="button" class="cc-card cc-line" data-cc="open" aria-expanded="false"><span class="cc-dot"></span><span class="cc-grow">' + line(place, ps) +
        (outs.length ? '<span class="cc-warn">' + outs.join('<br>') + '</span>' : '') + '</span><span class="cc-chev" aria-hidden="true">&rsaquo;</span></button>';
      return;
    }
    var rows = ps.map(function (p) {
      var it = nextOf(place, p), o = S.list && lastOutcome(place, p), ex = extra(p, it);
      var sub = !S.list ? (S.err ? 'Could not load' : 'Loading\u2026') : it ? esc(when(it.at)) + (ex ? ' \u00b7 ' + esc(ex) : '') : S.running ? 'Not set' : '';
      var btn = S.list && (S.running || it) ? '<button type="button" class="cc-btn cc-btn-g" data-cc="set" data-p="' + p.id + '">' + (it ? 'Change' : 'Set time') + '</button>' : '';
      return '<div class="cc-row"><div class="cc-grow"><div class="cc-t">' + esc(p.label) + '</div>' + (sub ? '<div class="cc-s">' + sub + '</div>' : '') +
        (o ? '<div class="cc-s cc-warn">' + esc(o) + '</div>' : '') + '</div>' + btn + '</div>';
    }).join('');
    var off = S.list && !S.running ? '<div class="cc-note cc-off"><span>Scheduled calls are off. Turn them on in Calls.</span><a class="cc-btn cc-btn-g" href="' + CALLS_URL + '">Open Calls</a></div>' : '';
    slot.innerHTML = '<div class="cc-card">' + head(anySet) + (place === 'ttg' ? '<div class="cc-title">Work calls</div>' : '') + rows + off +
      '<button type="button" class="cc-btn cc-btn-p cc-block" data-cc="now">Call me now</button></div>';
  }
  function drawAll() { Object.keys(S.slots).forEach(function (pl) { var s = S.slots[pl]; if (s && s.isConnected !== false) draw(s, pl); }); }

  /* One toast at a time, 16px above the host's bottom bar, gone after 2.5 s; a sheet opening clears it. */
  var T = { el: null, t: 0 };
  function navGap() {
    var c = document.querySelectorAll('#mainNav, .nav, .tabbar, .bottom-nav, nav'), h = window.innerHeight;
    for (var i = 0; i < c.length; i++) { var r = c[i].getBoundingClientRect(); if (r.height && r.bottom >= h - 2 && r.top > h / 2) return h - r.top + 16; }
    return 16;
  }
  function clearToast() { clearTimeout(T.t); if (T.el && T.el.parentNode) T.el.parentNode.removeChild(T.el); T.el = null; }
  function toast(m, undo) {
    clearToast();
    var d = document.createElement('div'); d.className = 'cc-toast'; d.setAttribute('role', 'status');
    d.appendChild(document.createElement('span')).textContent = m;
    if (undo) { var b = d.appendChild(document.createElement('button')); b.type = 'button'; b.textContent = 'Undo'; b.addEventListener('click', function () { clearToast(); undo(); }); }
    d.style.bottom = 'calc(' + navGap() + 'px + env(safe-area-inset-bottom, 0px))';
    document.body.appendChild(d); T.el = d; T.t = setTimeout(clearToast, undo ? 5000 : 2500);
  }
  function sheet(html, onclick) {
    clearToast();
    var opener = document.activeElement, bg = document.createElement('div'); bg.className = 'cc-sheet';
    bg.innerHTML = '<div class="cc-sheet-card" role="dialog" aria-modal="true">' + html + '</div>';
    function close() { if (!bg.parentNode) return; bg.parentNode.removeChild(bg); document.removeEventListener("keydown", onKey); try { if (opener && opener.isConnected) opener.focus(); } catch (x) {} }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = [].filter.call(bg.querySelectorAll('button,input,select,a[href],textarea'), function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (!bg.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
      else if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
    document.addEventListener("keydown", onKey);
    bg.addEventListener('click', function (e) {
      if (e.target === bg || (e.target.closest && e.target.closest('[data-close]'))) return close();
      onclick && onclick(e, bg, close);
    });
    document.body.appendChild(bg);
    var f = bg.querySelector('button,input,select'); if (f) try { f.focus(); } catch (x) {}
    return bg;
  }
  function chips(name, items, on) {
    return '<div class="cc-chips" role="radiogroup">' + items.map(function (x) { return '<button type="button" class="cc-c' + (x[0] === on ? ' on' : '') + '" role="radio" aria-checked="' + (x[0] === on) + '" data-' + name + '="' + esc(x[0]) + '">' + esc(x[1]) + '</button>'; }).join('') + '</div>';
  }
  function pick(bg, name, v) { bg.querySelectorAll('[data-' + name + ']').forEach(function (b) { var on = b.getAttribute('data-' + name) === v; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }); }
  function noteFor(p, x) { x = String(x || '').trim(); return (p.note || '') + (x ? ' ' + x : ''); }
  function timeSelect(t) {                     // 5-minute steps, labels like 1:50 PM (a native time field shows 01:50 PM)
    var o = [], has = false;
    for (var m = 0; m < 1440; m += 5) { var v = ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2); if (v === t) has = true; o.push(v); }
    if (!has && /^\d{2}:\d{2}$/.test(t)) { o.push(t); o.sort(); }
    return '<select class="cc-in cc-time" id="ccTime" aria-label="Time">' + o.map(function (v) { return '<option value="' + v + '"' + (v === t ? ' selected' : '') + '>' + fmt24(v) + '</option>'; }).join('') + '</select>';
  }

  function callNowSheet(place) {
    var ps = PRESETS[place], cur = ps[0];
    var ask = function (p) { return p.ask ? '<input class="cc-in" id="ccAsk" maxlength="150" placeholder="' + esc(p.ask) + '">' : ''; };
    return sheet('<h3 class="cc-h">Katya calls you now</h3><p class="cc-p">What is it about?</p>' + chips('kind', ps.map(function (p) { return [p.id, p.label]; }), cur.id) +
      '<div id="ccAskWrap">' + ask(cur) + '</div><p class="cc-err" id="ccErr" hidden></p><div class="cc-actions"><button type="button" class="cc-btn cc-btn-g" data-close>Cancel</button><button type="button" class="cc-btn cc-btn-p" data-go>Call me now</button></div>',
    function (e, bg, close) {
      var k = e.target.closest('[data-kind]');
      if (k) { cur = ps.filter(function (p) { return p.id === k.getAttribute('data-kind'); })[0] || cur; pick(bg, 'kind', cur.id); bg.querySelector('#ccAskWrap').innerHTML = ask(cur); return; }
      if (!e.target.closest('[data-go]') || S.busy) return;
      var a = bg.querySelector('#ccAsk'), btn = e.target.closest('[data-go]'), er = bg.querySelector('#ccErr');
      S.busy = true; btn.disabled = true;
      api('callNow', { type: cur.type, note: noteFor(cur, a && a.value) }).then(function (j) {
        if (j && j.ok) { close(); toast('Katya is calling you now.'); }
        else { er.hidden = false; er.textContent = (j && j.error) || 'Could not place the call.'; btn.disabled = false; }
      }).catch(function () { er.hidden = false; er.textContent = 'No connection. Nothing was called.'; btn.disabled = false; }).then(function () { S.busy = false; });
    });
  }
  function setSheet(place, pid) {
    var p = (PRESETS[place] || []).filter(function (x) { return x.id === pid; })[0]; if (!p) return;
    var it = nextOf(place, p), day = p.day, t = p.time;
    if (it) { var d = new Date(it.at); day = ymd(d) === ymd(new Date()) ? 'today' : 'tomorrow'; t = d.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }); }
    if (!t) { var n = new Date(Date.now() + 36e5); t = ('0' + n.getHours()).slice(-2) + ':00'; }
    var edit = S.running;
    return sheet('<div class="cc-head"><span class="cc-chip"><span class="cc-dot"></span>Calls</span></div><h3 class="cc-h">' + esc(p.label) + (edit ? ' at' : '') + '</h3>' +
      (it ? '<p class="cc-p">Set for ' + esc(when(it.at)) + '</p>' : '') +
      (edit ? chips('day', [['today', 'Today'], ['tomorrow', 'Tomorrow']], day) + timeSelect(t) +
        (p.ask ? '<input class="cc-in" id="ccAsk" maxlength="150" placeholder="' + esc(p.ask) + '" value="' + esc(extra(p, it)) + '">' : '') +
        '<p class="cc-note">Katya does not call on Shabbat or Yom Tov.</p>' : '<p class="cc-note">Scheduled calls are off. Turn them on in Calls.</p>') +
      '<p class="cc-err" id="ccErr" hidden></p>' +
      (it ? '<button type="button" class="cc-quiet" data-off>Turn off this call</button>' : '') +
      '<div class="cc-actions"><button type="button" class="cc-btn cc-btn-g" data-close>' + (edit ? 'Cancel' : 'Close') + '</button>' + (edit ? '<button type="button" class="cc-btn cc-btn-p" data-save>Save</button>' : '') + '</div>',
    function (e, bg, close) {
      var dd = e.target.closest('[data-day]'); if (dd) { day = dd.getAttribute('data-day'); pick(bg, 'day', day); return; }
      if (e.target.closest('[data-off]')) { close(); turnOff(place, p, it); return; }
      if (!e.target.closest('[data-save]') || S.busy) return;
      var tm = bg.querySelector('#ccTime').value, a = bg.querySelector('#ccAsk'), er = bg.querySelector('#ccErr'), btn = e.target.closest('[data-save]');
      if (!/^\d{1,2}:\d{2}$/.test(tm)) { er.hidden = false; er.textContent = 'Pick a time'; return; }
      S.busy = true; btn.disabled = true;
      api('callSchedule', { type: p.type, label: p.label, note: noteFor(p, a && a.value), day: day, time: tm, src: srcOf(place, p) }).then(function (j) {
        if (j && j.ok) {
          S.list = j.scheduled || S.list; S.at = Date.now(); S.open[place] = false; close(); toast('Saved.'); drawAll();
          if (it) api('callCancel', { id: it.id }).then(function (k) { if (k && k.ok) { S.list = k.scheduled || S.list; drawAll(); } }, function () {});   // Change replaces the old time
        } else { er.hidden = false; er.textContent = (j && j.error) || 'Could not save.'; btn.disabled = false; if (j && /not switched on/.test(j.error || '')) { S.running = false; drawAll(); } }
      }).catch(function () { er.hidden = false; er.textContent = 'No connection. Nothing was scheduled.'; btn.disabled = false; }).then(function () { S.busy = false; });
    });
  }
  function turnOff(place, p, it) {
    if (S.busy || !it) return; S.busy = true;
    api('callCancel', { id: it.id }).then(function (j) {
      if (!(j && j.ok)) return toast((j && j.error) || 'Could not turn it off.');
      S.list = j.scheduled || []; S.at = Date.now(); S.open[place] = false;
      var d = new Date(it.at), day = ymd(d) === ymd(new Date()) ? 'today' : 'tomorrow', tm = d.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
      toast('Turned off. Katya will not call.', function () {
        api('callSchedule', { type: it.type, label: it.label, note: it.note || '', day: day, time: tm, src: it.src || srcOf(place, p) }).then(function (k) {
          if (k && k.ok) { S.list = k.scheduled || S.list; S.at = Date.now(); drawAll(); toast('Back on for ' + when(it.at) + '.'); }
          else toast((k && k.error) || 'Could not turn it back on.');
        }, function () { toast('No connection. Nothing changed.'); });
      });
    }).catch(function () { toast('No connection. Nothing changed.'); }).then(function () { S.busy = false; drawAll(); });
  }

  window.CallsCard = {
    mount: function (slot, place) {
      if (!slot || !PRESETS[place]) return;
      S.slots[place] = slot;
      if (!slot._cc) {
        slot._cc = 1;
        slot.addEventListener('click', function (e) {
          var b = e.target.closest && e.target.closest('[data-cc]'); if (!b) return;
          var a = b.getAttribute('data-cc');
          if (a === 'now') callNowSheet(place);
          else if (a === 'set') setSheet(place, b.getAttribute('data-p'));
          else if (a === 'open' || a === 'less') { S.open[place] = a === 'open'; draw(slot, place); var f = slot.querySelector(a === 'open' ? '.cc-less' : '.cc-line'); if (f) f.focus(); }
        });
      }
      slot.hidden = false;
      draw(slot, place); load(false);
    },
    _state: S, _presets: PRESETS
  };
})();
