/* TTG Ops v4 — six-portal oversight app.
   Live mode: data only from the private, key-gated Apps Script API; kept in memory (never localStorage, URLs or the SW cache).
   Fixture mode (?fixtures=1): fictional data through an in-memory stand-in; never touches the network, even if a key is stored.
   Nothing here sends email or texts. Approving a draft only marks it for a person to send. */
(function () {
  'use strict';
  var M = window.TTG_V4_MODEL, BC = window.TTG_BILLING;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var view = $('#view');
  var FIXTURE = /[?&](fixtures|demo)=1(&|$)/.test(location.search);
  var S = { mode: FIXTURE ? 'fixture' : 'live', boot: null, P: null, clinical: null, billing: null, loading: {}, route: 'home', params: [],
    q: '', stuQ: '', noteF: {}, rep: {}, reportDraft: null, busy: false, cal: {}, stuGroup: '' };
  var KEY = '', fake = null, started = false;

  /* ---------- API ---------- */
  function apiUrl() { return (window.TTG_CONFIG && TTG_CONFIG.API_URL) || localStorage.getItem('ttgops.api') || ''; }
  function allowedApi(u) { return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u) || /^http:\/\/(localhost|127\.0\.0\.1):\d+\/api$/.test(u); }
  function api(action, data) {
    if (S.mode === 'fixture') {
      if (!fake) fake = window.TTG_FAKE_API.create(window.TTG_V4_FIXTURES, BC);
      return fake(action, data);
    }
    if (!KEY) return Promise.reject(new Error('unauthorized'));
    var u = apiUrl(); if (!allowedApi(u)) return Promise.reject(new Error('API address is missing or not allowed'));
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, 45000) : null;
    return fetch(u, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key: KEY, action: action, data: data || {} }),
      redirect: 'follow', referrerPolicy: 'no-referrer', cache: 'no-store', credentials: 'omit', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(timer); return r.json().catch(function () { throw new Error('bad reply'); }); }, function (e) { clearTimeout(timer); throw e; })
      .then(function (j) { if (!j || j.ok !== true) throw new Error((j && j.error) || 'request failed'); return j; });
  }
  // Network and server errors in plain words. 'unauthorized' passes through so the key screen can catch it.
  function plainError(e) {
    var m = String((e && e.message) || e || '');
    if (/unauthorized/.test(m)) return m;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'This device is offline. Connect to the internet and try again.';
    if (e && e.name === 'AbortError' || /abort/i.test(m)) return 'The server took too long to answer. Try again in a minute.';
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(m)) return 'Could not reach the TTG Ops server. Check the connection and try again.';
    if (/bad reply|unexpected token|json/i.test(m)) return 'The server sent a reply the app could not read. It may be updating; try again in a minute.';
    return m || 'Something went wrong.';
  }
  function reqId() {
    var a = new Uint8Array(12); try { crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); }
    return 'r' + Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function toast(msg) { var t = $('#toast'); if (!t) return; t.hidden = false; t.textContent = msg; clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 3200); }
  function banner() { return S.mode === 'fixture' ? '<div class="sample">Fictional sample data · changes stay in this tab only, nothing is saved</div>' : ''; }
  function head(title, backHref, backLabel) { return '<div class="back"><a href="' + esc(backHref || '#/') + '">' + esc(backLabel || 'Home') + '</a><h1>' + esc(title) + '</h1></div>' + banner(); }
  function card(inner, cls) { return '<div class="card' + (cls ? ' ' + cls : '') + '">' + inner + '</div>'; }
  function section(title, body) { return card('<b>' + esc(title) + '</b><div class="muted" style="margin-top:6px">' + body + '</div>'); }
  function pill(t, cls) { return '<span class="pill' + (cls ? ' ' + cls : '') + '">' + esc(t) + '</span>'; }
  function warn(t) { return '<div class="banner warn">' + t + '</div>'; }
  function info(t) { return '<div class="banner">' + t + '</div>'; }
  function nof(v) { return v ? esc(v) : '<span class="muted">Not on file</span>'; }
  function kv(rows) { return '<dl class="kv">' + rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + (r[2] ? r[1] : nof(r[1])) + '</dd>'; }).join('') + '</dl>'; }
  function ext(u, label) { u = M.safeUrl(u); return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(label || 'Open link') + '</a>' : ''; }
  function opt(v, label, sel) { return '<option value="' + esc(v) + '"' + (sel ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function daysAgo(n) { var d = new Date(Date.now() - n * 864e5); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  var STATE = { aligned: ['Aligned', ''], mismatch: ['Mismatch', 'bad'], no_note: ['No note', 'warn'], ambiguous: ['Ambiguous', 'warn'], duplicate: ['Duplicate', 'bad'], needs_review: ['Needs review', 'warn'] };

  /* ---------- lazy sources ---------- */
  function v4Missing() { return S.mode === 'live' && S.P && !S.P.v4; }
  function ensureClinical() {
    if (S.clinical || S.loading.clinical) return;
    if (v4Missing()) { S.clinical = M.normalizeClinical({ available: false, reason: 'The private API has not been updated with the clinical-notes source yet (v4 backend not deployed).' }); return; }
    S.loading.clinical = true;
    api('clinicalNotes', {}).then(function (r) { S.clinical = M.normalizeClinical(r.clinical, S.P); })
      .catch(function (e) { S.clinical = M.normalizeClinical({ available: false, reason: 'Could not load clinical notes. ' + plainError(e) }); })
      .then(function () { S.loading.clinical = false; render(); });
  }
  function ensureBilling() {
    if (S.billing || S.loading.billing) return;
    if (v4Missing()) { S.billing = { available: false, reason: 'The private API has not been updated with billing review yet (v4 backend not deployed).', batches: [] }; return; }
    S.loading.billing = true;
    api('billingReview', {}).then(function (r) { S.billing = r.billing; })
      .catch(function (e) { S.billing = { available: false, reason: 'Could not load billing. ' + plainError(e), batches: [] }; })
      .then(function () { S.loading.billing = false; render(); });
  }
  function loadingCard(what) { return card('<span class="muted">Loading ' + esc(what) + '…</span>'); }

  /* ---------- routes ---------- */
  function route() {
    var h = (location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(function (x) { try { return decodeURIComponent(x); } catch (e) { return ''; } });
    S.route = h[0] || 'home'; S.params = h.slice(1);
    if (S.route !== 'reports') { /* keep draft while moving around */ }
    render();
  }
  var ROUTES = {};
  function render() {
    if (!S.P) return;
    var fn = ROUTES[S.route] || ROUTES.home;
    view.innerHTML = fn();
    var moved = S._lastRoute !== undefined && S._lastRoute !== location.hash;
    try { window.scrollTo && S._lastRoute !== location.hash && window.scrollTo(0, 0); } catch (e) {}
    try { var h1 = moved && view.querySelector && view.querySelector('h1'); if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); } } catch (e) {}
    S._lastRoute = location.hash;
    callsCard();
  }
  /* Calls card (Plan the day, Check in before a meeting, End of day wrap): live mode on Home only, never in fixture or sample mode.
     The shared card is loaded from this site and talks only to the Calls API with the Calls key on this phone; that server answers Roni's key only. */
  function callsCard() {
    if (S.mode !== 'live' || S.route !== 'home') return;
    var slot = view.querySelector && view.querySelector('#callsSlot'); if (!slot) return;
    if (window.CallsCard) { window.CallsCard.mount(slot, 'ttg'); return; }
    if (S._ccLoad) return; S._ccLoad = true;
    try {
      var t = document.createElement('script'); t.src = 'calls-card.js?v=2';   // own copy (same file as /hub/calls-card.js), so no other repo's code runs next to the admin key
      t.onload = function () { if (S.mode === 'live' && S.route === 'home' && window.CallsCard) { var sl = view.querySelector('#callsSlot'); if (sl) window.CallsCard.mount(sl, 'ttg'); } };
      t.onerror = function () { S._ccLoad = false; };
      document.head.appendChild(t);
    } catch (e) { S._ccLoad = false; }
  }

  /* ---------- HOME ---------- */
  var ICONS = {
    person: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5"/></svg>',
    note: '<svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
    calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    checklist: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="6" height="6" rx="1"/><path d="M4.5 7l1.5 1.5L9 5.5M12 7h8M3 14h6v6H3zM12 17h8"/></svg>',
    bars: '<svg viewBox="0 0 24 24"><path d="M4 20h16"/><rect x="5" y="11" width="3" height="7"/><rect x="10.5" y="7" width="3" height="11"/><rect x="16" y="4" width="3" height="14"/></svg>',
    envelope: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 7l9 7 9-7"/></svg>'
  };
  ROUTES.home = function () {
    ensureBilling();
    var n = reviewCount();
    var tiles = [['students', 'Students\n& Cases', ICONS.person], ['notes', 'Clinical\nNotes', ICONS.note], ['providers', 'Providers\n& Schedules', ICONS.calendar],
      ['billing', 'Billing\nReview', ICONS.checklist], ['reports', 'Reports\n& Updates', ICONS.bars], ['email', 'Email &\nOpen Items', ICONS.envelope]];
    return '<div class="brand-row"><img src="icons/icon-192.png" alt=""><div><b>TTG Ops</b><small>Oversight workspace</small></div></div>' + banner() +
      '<form data-submit="home-search"><input class="search" id="homeQ" name="q" autocomplete="off" placeholder="Search students, providers, notes" aria-label="Search students, providers, notes and items"></form>' +
      '<a class="card review-link" href="#/review"><span>Needs your review</span><span class="badge' + (n ? '' : ' zero') + '" aria-label="' + plural(n, 'item') + '">' + n + '</span></a>' +
      (S.mode === 'live' ? '<div id="callsSlot" class="calls-slot"></div>' : '') +
      '<div class="tiles">' + tiles.map(function (t) { return '<a class="tile" href="#/' + t[0] + '"><span class="ico">' + t[2] + '</span><b>' + esc(t[1]) + '</b></a>'; }).join('') + '</div>' +
      '<p class="muted" style="margin-top:16px"><a href="#/settings">Settings &amp; data sources</a></p>';
  };
  // Needs-you items in separate sections (Oct 13): messages, reports, billing, then structural gaps and schedule problems.
  function structural() {
    var out = [];
    S.P.gaps.forEach(function (g) { out.push({ kind: 'Gap', href: '#/student/' + encodeURIComponent(g.case_id), title: g.student + ': ' + g.role + ' unstaffed', sub: g.days ? g.days + ' days' : '' }); });
    S.P.students.forEach(function (st) {
      if (!st.bcba.length && st.services.some(function (x) { return M.normService(x) === 'aba'; })) out.push({ kind: 'Gap', href: '#/student/' + encodeURIComponent(st.id), title: st.name + ': ABA with no BCBA on file', sub: '' });
    });
    var W = M.calendarWeek(S.P, null, { today: today() });
    if (W.overlapCount) out.push({ kind: 'Schedule', href: '#/providers', title: plural(W.overlapCount, 'schedule overlap') + ' this week', sub: 'A provider or child booked twice at once' });
    W.mandate.forEach(function (x) { out.push({ kind: 'Schedule', href: '#/student/' + encodeURIComponent(x.case_id), title: x.student + ' · ' + x.role + ': ' + M.fmtHours(x.minutes) + ' scheduled, mandate ' + M.fmtHours(x.mandateMin), sub: '' }); });
    return out;
  }
  function reviewCount() { return M.reviewItems(S.P, S.billing).length + structural().length; }
  ROUTES.review = function () {
    var items = M.reviewItems(S.P, S.billing).concat(structural()), h = head('Needs your review');
    if (!S.billing) ensureBilling();
    if (!items.length) h += '<div class="list-empty">Nothing waiting for you.</div>';
    [['Draft message', 'Messages to approve'], ['Report draft', 'Reports to review'], ['Billing', 'Billing to sign off'], ['Gap', 'Coverage gaps'], ['Schedule', 'Schedule problems']].forEach(function (g) {
      var xs = items.filter(function (x) { return x.kind === g[0]; }); if (!xs.length) return;
      h += '<div class="sec">' + esc(g[1]) + ' <span class="muted">' + xs.length + '</span></div>';
      xs.forEach(function (x) { h += '<a class="card row" href="' + esc(x.href) + '"><div class="grow"><b>' + esc(x.title) + '</b>' + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '') + '</div><span class="chev"></span></a>'; });
    });
    return h;
  };
  ROUTES.search = function () {
    if (!S.clinical) ensureClinical();
    var hits = M.searchAll(S.q, S.P, S.clinical), h = head('Search');
    h += '<form data-submit="home-search"><input class="search" id="homeQ" value="' + esc(S.q) + '" autocomplete="off" placeholder="Search students, providers, notes" aria-label="Search students, providers, notes and items"></form>';
    if (!S.q) h += '<div class="list-empty">Type a name, a service or a word from a note.</div>';
    else if (!hits.length) h += '<div class="list-empty">No matches for \u201c' + esc(S.q) + '\u201d.</div>';
    else h += '<p class="muted">' + plural(hits.length, 'match') .replace('matchs', 'matches') + '</p>';
    hits.forEach(function (x) { h += '<a class="card row" href="' + esc(x.href) + '"><div class="grow"><b>' + esc(x.title) + '</b><small>' + esc(x.type + (x.sub ? ' · ' + x.sub : '')) + '</small></div><span class="chev"></span></a>'; });
    return h;
  };

  /* ---------- STUDENTS ---------- */
  // Health colors are spelled out as words ("Check: service"), never shown as unexplained colored dots.
  function healthWords(hl) { return ['relationship', 'service', 'clinical', 'billing'].filter(function (k) { return hl && (hl[k] === 'red' || hl[k] === 'yellow'); }); }
  function studentRow(s) {
    var ini = s.name.split(/\s+/).map(function (p) { return p[0] || ''; }).join('').slice(0, 2).toUpperCase(), chk = healthWords(s.health);
    var un = s.openRoles.length && !/unstaff/i.test(s.why) ? 'Unstaffed: ' + s.openRoles.join(', ') : '';
    var why = [s.why, un].filter(Boolean).join(' · ') || (chk.length ? 'Check: ' + chk.join(', ') : '');
    return '<a class="card row" href="#/student/' + encodeURIComponent(s.id) + '"><div class="avatar">' + esc(ini) + '</div><div class="grow"><b>' + esc(s.name) + '</b><small>' +
      esc(s.services.join(' · ') || s.setting || 'No services on file') + '</small>' + (why ? '<small class="why">' + esc(why) + '</small>' : '') + '</div><span class="chev"></span></a>';
  }
  ROUTES.students = function () {
    var q = S.stuQ.toLowerCase(), list = S.P.students.filter(function (s) { return !q || (s.name + ' ' + s.services.join(' ') + ' ' + s.bcba.map(function (b) { return b.name; }).join(' ') + ' ' + (s.providers || []).map(function (b) { return b.name; }).join(' ')).toLowerCase().indexOf(q) >= 0; });
    var by = S.params[0] === 'bcba' ? 'bcba' : 'name', h = head('Students & Cases');
    if (S.P.ambiguous.length) h += warn('<b>Possible duplicate records:</b> ' + S.P.ambiguous.map(function (s) { return esc(s.name) + ' (' + esc(s.id) + ')'; }).join(', ') + '. Shown separately, never merged.');
    if (S.P.sync && S.P.sync.stale) h += warn('Roster and Case Board are out of sync' + (S.P.sync.roster_ok ? '' : ' (roster unreadable)') + '. See Settings.');
    h += '<input class="search" data-change="stu-filter" value="' + esc(S.stuQ) + '" placeholder="Filter by name, service or provider" aria-label="Filter students by name, service or provider" style="margin-bottom:12px">';
    h += '<div class="chip-row seg"><a class="chip' + (by === 'name' ? ' on' : '') + '" href="#/students">A to Z</a><a class="chip' + (by === 'bcba' ? ' on' : '') + '" href="#/students/bcba">By BCBA</a></div>';
    if (!list.length) h += '<div class="list-empty">' + (S.P.students.length ? 'No students match.' : 'No students on file.') + '</div>';
    if (by === 'name') list.forEach(function (s) { h += studentRow(s); });
    else {
      var groups = {}, order = [];
      list.forEach(function (s) {
        var names = s.bcba.length ? s.bcba.map(function (b) { return b.name; }) : [''];
        names.forEach(function (n) { if (!groups[n]) { groups[n] = []; order.push(n); } groups[n].push(s); });
      });
      order.sort(function (a, b) { return !a ? 1 : !b ? -1 : a.toLowerCase() < b.toLowerCase() ? -1 : 1; });
      order.forEach(function (n) {
        var bk = n && (M.findProvider(S.P.providers, n) || {}).key;
        h += '<div class="sec">' + (n ? (bk ? '<a href="#/provider/' + esc(bk) + '">' + esc(n) + '</a>' : esc(n)) : 'No BCBA on file') + ' <span class="muted">' + plural(groups[n].length, 'student') + '</span></div>';
        groups[n].forEach(function (s) { h += studentRow(s); });
      });
    }
    return h;
  };
  // Record pages show only sourced values, with one compact empty state per section.
  function presentKV(rows) {
    var kept = rows.map(function (r) { return [r[0], M.val(r[1])]; }).filter(function (r) { return r[1] !== ''; });
    return kept.length ? kv(kept) : '';
  }
  // Each record section is one tappable row with a one-line summary; details open only when tapped.
  function recordSection(title, body, empty, summary, open) {
    // Nothing to open: a plain row that says so once, with no arrow that leads to the same sentence.
    if (!body) return '<div class="card record-section empty" data-section="' + esc(title) + '"><span class="rs-t">' + esc(title) + '</span><span class="rs-s">' + esc(empty || 'Nothing connected yet.') + '</span></div>';
    return '<details class="card record-section" data-section="' + esc(title) + '"' + (open ? ' open' : '') + '><summary><span class="rs-t">' + esc(title) + '</span>' +
      '<span class="rs-s">' + esc(body ? (summary || '') : (empty || 'Nothing connected yet.')) + '</span></summary>' +
      '<div class="rs-body">' + (body || '<p class="muted">' + esc(empty || 'Nothing connected yet.') + '</p>') + '</div></details>';
  }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  // A small Mon to Sun strip of the planned week for one child or one provider.
  function miniWeek(plan) {
    var cols = [1, 2, 3, 4, 5, 6, 0].map(function (d) {
      var sl = []; plan.forEach(function (a) { a.slots.forEach(function (x) { if (x.day === d) sl.push({ t: M.timeRange(x), r: a.role, s: a.student, start: x.start }); }); });
      sl.sort(function (a, b) { return a.start - b.start; });
      return '<div class="mw-col' + (sl.length ? '' : ' empty') + '"><div class="mw-d">' + M.DAY_LABEL[d] + '</div>' + sl.map(function (x) { return '<div class="mw-s"><b>' + esc(x.t) + '</b><span>' + esc(x.r) + '</span></div>'; }).join('') + '</div>';
    }).join('');
    return '<div class="mini-week">' + cols + '</div>';
  }
  function billingSummary(match) {
    if (!S.billing || !S.billing.available) return '';
    var n = 0, bad = 0;
    S.billing.batches.forEach(function (b) { b.lines.forEach(function (l, i) { if (!match(l)) return; n++; var r = b.review[i]; if (r && r.state !== 'aligned') bad++; }); });
    return n ? plural(n, 'billed line') + (bad ? ' · ' + bad + ' to check' : ' · all match notes') : '';
  }
  function recordItem(body) { return '<div class="record-item">' + body + '</div>'; }
  function docLinks(docs) {
    return (docs || []).map(function (d) { return recordItem((d.url ? ext(d.url, d.title || 'Document') : esc(d.title)) + (d.status ? ' · ' + esc(d.status) : '')); }).join('');
  }
  function caseEditor(s) {
    return '<details class="record-item"><summary>Edit case fields</summary><div class="selects"><label for="editField">Field</label><select id="editField">' +
      s.fields.map(function (f) { return opt(f.k, f.k + (f.v ? ' (' + f.v.slice(0, 30) + ')' : ''), false); }).join('') + '</select><label for="editValue">New value</label><input id="editValue" class="field" autocomplete="off"></div>' +
      '<button class="btn secondary" type="button" data-act="case-edit" data-id="' + esc(s.id) + '" style="margin-top:10px">Save field</button><p class="muted">Changes the Case Board only; the roster is never written.</p></details>';
  }
  function recordBilling(match) {
    if (S.loading.billing || !S.billing) return '<p class="muted">Loading billing…</p>';
    if (!S.billing.available) return '<p class="muted">' + esc(S.billing.reason || 'Billing source is not connected.') + '</p>';
    var rows = [];
    S.billing.batches.forEach(function (b) { b.lines.forEach(function (l, i) { if (!match(l)) return;
      var r = b.review[i] || {}, state = STATE[r.state] || STATE.needs_review;
      // One compact line per billed session; the full comparison lives in the batch.
      rows.push(recordItem('<div class="row" style="min-height:0"><div class="grow"><b>' + esc((l.date || 'No date') + ' · ' + (l.service || 'No service')) + '</b><small>' +
        esc([l.provider, l.duration_min != null ? l.duration_min + ' min' : '', l.units != null ? l.units + ' units' : ''].filter(Boolean).join(' · ')) + '</small></div>' + pill(state[0], state[1]) + '</div>' +
        (r.reasons && r.reasons.length ? '<div class="muted">' + r.reasons.map(function (x) { return esc(plainReason(x, r).replace(' match the note below', ' match the note')); }).join(' · ') + '</div>' : '') +
        '<div class="src"><a href="#/billing/' + encodeURIComponent(b.id) + '">' + esc(b.id) + '</a> · ' + esc(b.audit.status) + '</div>'));
    }); });
    return rows.length ? '<p class="muted">Read-only analysis. Open a batch for the separate billing review.</p>' + rows.join('') : '';
  }
  function clinicalSummary(notes, href, attrs) {
    if (S.loading.clinical || !S.clinical) return '<p class="muted">Loading clinical data…</p>';
    if (!S.clinical.available) return '<p class="muted">' + esc(S.clinical.reason) + '</p>';
    if (!notes.length) return '<p class="muted">No clinical notes connected for this record.</p>';
    return '<p><a href="' + href + '"' + (attrs || '') + '>' + notes.length + ' clinical note' + (notes.length === 1 ? '' : 's') + '</a></p>' +
      notes.slice(0, 5).map(function (n) { return recordItem('<a href="#/note/' + encodeURIComponent(n.id) + '">' + esc(n.date + (n.service ? ' · ' + n.service : '')) + '</a>' +
        '<div class="muted">' + esc(n.student + (n.provider ? ' · ' + n.provider : '')) + '</div><div class="note-body clamp">' + esc(n.text) + '</div>'); }).join('');
  }
  ROUTES.student = function () {
    var s = M.student(S.P, S.params[0]); if (!s) return head('Student', '#/students', 'Students') + '<div class="list-empty">Student not found.</div>';
    ensureClinical(); ensureBilling();
    var h = head(s.name, '#/students', 'Students'), c = s.chart || {};
    if (s.duplicateId || s.sameNameIds.length) h += warn('Another record has the same name (' + esc(s.sameNameIds.join(', ')) + '). Records are kept separate.');
    var child = presentKV([['Name', s.name], ['OSIS', s.osis || c.osis], ['Date of birth', c.dob], ['Age', c.age], ['Parent / guardian', s.family.join('; ') || M.val(s.fieldMap['Parent contact'])],
      ['Guardian address', c.address], ['School', c.school], ['District', s.district || c.district], ['Attends school', c.attends], ['Setting', s.setting], ['Service location', c.location]]);
    var items = S.P.queue.filter(function (x) { return x.case_id === s.id && x.status === 'draft'; });
    if (items.length) child += '<p><a href="#/email/' + encodeURIComponent(s.id) + '">' + items.length + ' open item' + (items.length === 1 ? '' : 's') + '</a></p>';
    var ov = [s.services.filter(function (x) { return !(s.bcba.length && /^bcba$/i.test(x)); }).join(' · '), s.bcba.length ? 'BCBA ' + s.bcba.map(function (b) { return b.name; }).join(', ') : '', s.setting].filter(Boolean);
    h += '<div class="card overview"><div class="ov-line">' + esc(ov.join(' · ') || 'No services on file') + '</div>' + (s.why ? '<div class="ov-why">' + esc(s.why) + '</div>' : '') +
      (s.openRoles.length && !/unstaff/i.test(s.why) ? '<div class="ov-why">Unstaffed: ' + esc(s.openRoles.join(', ')) + '</div>' : '') + '</div>';
    h += recordSection('Child info', child, 'No child details connected.', [c.age != null && c.age !== '' ? 'Age ' + c.age : '', c.school, s.setting].filter(Boolean).join(' · '));
    var cases = s.caseRecords.map(function (r) {
      return recordItem('<h3>' + 'Case record' + '</h3>' + presentKV([
        ['Record ID', r.recordId], ['Service / discipline', r.service], ['Status', r.status], ['Assigned provider', r.provider], ['Authorization starts', r.authStart], ['Authorization ends', r.authEnd],
        ['Authorized hours', r.hours], ['Authorized units', r.units], ['Frequency', r.frequency], ['Rate', r.rate], ['Funding source', r.funding]]) + (r.source ? '<p class="src">' + esc(r.source) + '</p>' : ''));
    }).join('');
    var auth = s.caseRecords.map(function (r) { return r.authEnd; }).filter(Boolean)[0];
    h += recordSection('Cases', cases + caseEditor(s), 'No case records connected.', plural(s.caseRecords.length, 'case record') + (auth ? ' · authorization ends ' + auth : ''));
    var team = S.P.providers.filter(function (p) { return p.cases.some(function (x) { return x.case_id === s.id; }); }).map(function (p) {
      var roles = p.cases.filter(function (x) { return x.case_id === s.id; }).map(function (x) { return x.role; }).filter(Boolean);
      return recordItem('<a href="#/provider/' + esc(p.key) + '">' + esc(p.name) + '</a>' + presentKV([['Discipline', roles.join(' · ')], ['Phone', p.phone], ['Email', p.email]]));
    }).join('');
    if (s.related.length) team += '<p class="muted">Related services: ' + esc(s.related.join('; ')) + '</p>';
    if (s.openRoles.length) team += '<p>' + pill('Open: ' + s.openRoles.join(', '), 'warn') + '</p>';
    if (s.departed.length) team += '<p class="muted">Left the case: ' + esc(s.departed.join(', ')) + '</p>';
    var nTeam = S.P.providers.filter(function (p) { return p.cases.some(function (x) { return x.case_id === s.id; }); }).length;
    h += recordSection('Providers', team, 'No providers connected.', (nTeam ? plural(nTeam, 'provider') : 'No provider assigned') + (s.openRoles.length ? ' · ' + s.openRoles.length + ' unstaffed' : ''));
    var plan = M.weekPlan(S.P).filter(function (a) { return a.case_id === s.id; }), mins = plan.reduce(function (n, a) { return n + a.minutes; }, 0);
    var schedule = (plan.some(function (a) { return a.slots.length; }) ? miniWeek(plan) : '') + plan.map(function (a) {
      var vs = a.vsMandate === 'under' || a.vsMandate === 'over' ? pill('Scheduled ' + M.fmtHours(a.minutes) + ', mandate ' + M.fmtHours(a.mandateMin), 'warn') : '';
      return recordItem('<b>' + esc(a.role || 'Service') + '</b> · ' + (a.open ? pill('Unstaffed', 'warn') : a.providerKey ? '<a href="#/provider/' + esc(a.providerKey) + '">' + esc(a.provider) + '</a>' : esc(a.provider)) +
        '<div class="muted">' + esc(a.schedule || 'No schedule on file') + (a.mandateMin != null ? ' · mandate ' + esc(M.fmtHours(a.mandateMin)) + '/week' : '') + '</div>' + (vs ? '<div class="ev-flags">' + vs + '</div>' : ''));
    }).join('');
    // Chart schedule has its own provenance; it is not evidence of delivered sessions.
    if (c.schedule && !plan.some(function (a) { return a.schedule === c.schedule; })) schedule += presentKV([['Chart schedule', c.schedule], ['Chart hours / week', c.hours]]);
    if (plan.some(function (a) { return a.slots.length; })) schedule += '<p><a href="#/providers" data-act="cal-open" data-who="s:' + esc(s.id) + '">Open in calendar</a></p>';
    h += recordSection('Schedule', schedule, 'No schedule connected.', mins ? M.fmtHours(mins) + ' a week scheduled' + (plan.some(function (a) { return a.vsMandate === 'under' || a.vsMandate === 'over'; }) ? ' · differs from mandate' : '') : plural(plan.length, 'assignment'));
    var bm = function (l) { return l.case_id === s.id && l.case_status === 'matched'; };
    h += recordSection('Billing', recordBilling(bm), 'No billing lines for this child.', billingSummary(bm));
    var it = s.intake, en = s.ensora, docs = docLinks(s.documents);
    if (it) docs += presentKV([['Intake status', it.status], ['Received', it.received], ['Missing documents', it.missing]]) + it.links.map(function (u, i) { return '<p>' + ext(u, 'Document folder ' + (i + 1)) + '</p>'; }).join('');
    if (en) docs += presentKV([['Ensora records', en.data], ['Last capture', en.last], ['Missing records', en.missing]]) + (en.sourceUrl ? '<p>' + ext(en.sourceUrl, 'Ensora source') + '</p>' : '');
    S.P.reports.filter(function (r) { return r.scope === s.name; }).forEach(function (r) { docs += recordItem('<a href="#/report/' + encodeURIComponent(r.id) + '">' + esc(r.title) + '</a> ' + pill(r.status, r.status === 'draft' ? 'warn' : '')); });
    var nRep = S.P.reports.filter(function (r) { return r.scope === s.name; }).length;
    h += recordSection('Documents', docs, 'No documents connected.', [it && it.status ? 'Intake ' + it.status.toLowerCase() : '', s.documents.length ? plural(s.documents.length, 'document') : '', nRep ? plural(nRep, 'report') : '', en ? 'Ensora records' : ''].filter(Boolean).join(' · '));
    var notes = S.clinical && S.clinical.available ? M.filterNotes(S.clinical.notes, { caseId: s.id }) : [];
    var clinical = presentKV([['Goals', s.goals]]) + clinicalSummary(notes, '#/notes/' + encodeURIComponent(s.id));
    clinical += '<details class="record-item"><summary>Case history & notes</summary><p class="muted">Case notes and edits, separate from clinical notes.</p>' +
      s.caseLog.slice(0, 8).map(function (n) { return '<div style="margin-top:8px"><span class="src">' + esc(n.ts.slice(0, 10)) + ' · ' + esc(n.type) + '</span><div class="note-body">' + esc(n.text) + '</div></div>'; }).join('') +
      '<textarea id="caseNote" class="field" rows="2" placeholder="Add a case note"></textarea><button class="btn secondary" type="button" data-act="case-note" data-id="' + esc(s.id) + '">Save note</button></details>';
    h += recordSection('Clinical Data', clinical, 'No clinical data connected.', notes.length ? plural(notes.length, 'note') + ' · latest ' + notes.map(function (n) { return n.date; }).sort().pop() : S.clinical && S.clinical.available ? 'No clinical notes yet' : '');
    return h;
  };

  /* ---------- CLINICAL NOTES ---------- */
  ROUTES.notes = function () {
    if (S.params[0] !== undefined && S.params[0] !== 'unlinked' && S.noteF._route !== S.params[0]) { S.noteF = { caseId: S.params[0], _route: S.params[0] }; }
    ensureClinical();
    var h = head('Clinical Notes'), C = S.clinical, f = S.noteF, unl = S.params[0] === 'unlinked';
    if (S.loading.clinical || !C) return h + loadingCard('clinical notes');
    if (!C.available) return h + warn('<b>Clinical notes are not connected.</b> ' + esc(C.reason) + '<br>Nothing is shown rather than guessed. A missing note is never treated as a missed session.');
    var U = C.unlinked || [];
    h += '<input class="search" id="nfQ" data-change="note-filter" data-k="q" value="' + esc(f.q || '') + '" placeholder="Search words in notes" aria-label="Search words in notes" autocomplete="off">';
    if (U.length || C.unmatched) h += '<div class="chip-row seg" style="margin-top:12px"><a class="chip' + (unl ? '' : ' on') + '" href="#/notes">Linked to a student</a><a class="chip' + (unl ? ' on' : '') + '" href="#/notes/unlinked">Not linked (' + (U.length || C.unmatched) + ')</a></div>';
    if (unl) {
      h += info('These notes name a student the app could not match to exactly one record, so they are not attached to anyone. The name is shown exactly as the source wrote it. Linking them needs your confirmation.');
      if (!U.length) return h + '<div class="list-empty">' + (C.unmatched ? C.unmatched + ' notes are not linked, but the API does not send their text yet.' : 'None.') + '</div>';
      var ul = M.filterNotes(U, { q: f.q, from: f.from, to: f.to });
      h += '<p class="muted">' + ul.length + ' of ' + U.length + ' not-linked notes' + (ul.length > 200 ? ' · showing the newest 200, search to see the rest' : '') + '</p>';
      ul.slice(0, 200).forEach(function (n) { h += noteCard(n, false); });
      return h;
    }
    var provs = M.noteProviders(C.notes), stu = f.caseId ? M.student(S.P, f.caseId) : null, pr = f.providerKey ? provs.filter(function (p) { return p.key === f.providerKey; })[0] : null;
    var active = [stu && stu.name, pr && pr.name, f.from && 'from ' + f.from, f.to && 'to ' + f.to].filter(Boolean);
    h += '<details class="card filters"' + (S._nfOpen ? ' open' : '') + '><summary data-act="nf-toggle"><b>Filter</b><span class="muted" style="margin-left:8px">' + esc(active.join(' · ') || 'All students, providers and dates') + '</span></summary>' +
      '<div class="selects"><label for="nfStudent">Student</label><select id="nfStudent" data-change="note-filter" data-k="caseId">' + opt('', 'All students', !f.caseId) +
      S.P.students.map(function (s) { return opt(s.id, s.name, f.caseId === s.id); }).join('') + '</select>' +
      '<label for="nfProv">Provider</label><select id="nfProv" data-change="note-filter" data-k="providerKey">' + opt('', 'All providers', !f.providerKey) + provs.map(function (p) { return opt(p.key, p.name, f.providerKey === p.key); }).join('') + '</select>' +
      '<div class="two"><div><label for="nfFrom">From</label><input type="date" id="nfFrom" data-change="note-filter" data-k="from" value="' + esc(f.from || '') + '"></div>' +
      '<div><label for="nfTo">To</label><input type="date" id="nfTo" data-change="note-filter" data-k="to" value="' + esc(f.to || '') + '"></div></div>' +
      (active.length ? '<p><a href="#/notes" data-act="nf-clear">Clear filters</a></p>' : '') + '</div></details>';
    var list = M.filterNotes(C.notes, f);
    if (stu) h += card('<b>' + esc(stu.name) + '</b><div class="muted">' + esc(stu.services.join(' · ') || 'No services on file') + '</div>' + (stu.goals ? '<div>Goals: ' + esc(stu.goals) + '</div>' : '<div class="muted">Treatment goals are not in the connected sources yet.</div>') + '<a href="#/student/' + encodeURIComponent(stu.id) + '">Open student</a>');
    if (!C.notes.length) h += '<div class="list-empty">No clinical notes are linked to a student yet.</div>';
    else {
      h += '<p class="muted">' + list.length + ' of ' + plural(C.notes.length, 'note') + (list.length > 200 ? ' · showing the newest 200, filter to see the rest' : '') + '</p>';
      if (!list.length) h += '<div class="list-empty">No notes for this filter. That does not mean sessions were missed.</div>';
    }
    var lastMonth = '';
    list.slice(0, 200).forEach(function (n) {
      var mo = n.date.slice(0, 7); if (mo !== lastMonth) { lastMonth = mo; h += '<div class="sec-mini month">' + esc(monthName(mo)) + '</div>'; }
      h += noteCard(n, !f.caseId);
    });
    var ses = M.filterNotes(C.sessions, { caseId: f.caseId, from: f.from, to: f.to }).filter(function (s) { return !f.providerKey || M.findProvider(S.P.providers, s.provider) && M.findProvider(S.P.providers, s.provider).key === f.providerKey; });
    if (ses.length) h += warn('<b>Sessions without a note:</b> ' + ses.map(function (s) { return esc(s.date + ' · ' + s.student + ' · ' + (s.service || '') + ' ' + s.provider); }).join('; ') + '. A missing note does not mean a missed session.');
    return h;
  };
  function monthName(ym) { var p = ym.split('-'); return p.length === 2 ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][+p[1] - 1] + ' ' + p[0] : ym; }
  function noteCard(n, showStudent) {
    return '<a class="card note-card" href="#/note/' + encodeURIComponent(n.id) + '"><div class="nc-top"><b>' + esc(n.date) + '</b>' + (showStudent || n.unlinked ? '<span class="nc-stu">' + esc(n.student || 'No student named') + '</span>' : '') +
      (n.signed ? '' : pill('Unsigned', 'warn')) + '</div><div class="muted">' + esc((n.service || 'Service not recorded') + ' · ' + (n.provider || 'Provider not recorded') + (n.duration_min ? ' · ' + n.duration_min + ' min' : '')) + '</div>' +
      '<div class="note-body clamp">' + esc(n.text) + '</div></a>';
  }
  ROUTES.note = function () {
    ensureClinical();
    if (!S.clinical) return head('Note', '#/notes', 'Notes') + loadingCard('note');
    var n = (S.clinical.notes || []).concat(S.clinical.unlinked || []).filter(function (x) { return x.id === S.params[0]; })[0];
    if (!n) return head('Note', '#/notes', 'Notes') + '<div class="list-empty">Note not found.</div>';
    return head(n.date + ' · ' + (n.service || 'Note'), n.unlinked ? '#/notes/unlinked' : '#/notes', 'Notes') + card((n.unlinked ? '<b>' + esc(n.student || 'No student named') + '</b> ' + pill('Not linked to a record', 'warn') : '<b><a href="#/student/' + encodeURIComponent(n.case_id) + '">' + esc(n.student) + '</a></b>') +
      kv([['Provider', n.provider], ['Service', n.service], ['Time', n.time], ['Duration', n.duration_min ? n.duration_min + ' min' : ''], ['Location', n.location], ['Signature', n.signed || 'Not signed'], ['Created', n.created]]) +
      '<div class="note-body">' + esc(n.text) + '</div><div class="src">Source: ' + esc(n.source) + ' · ' + esc(n.id) + '</div>');
  };

  /* ---------- PROVIDERS & SCHEDULES ---------- */
  ROUTES.providers = function () {
    var tab = S.params[0] === 'schedules' ? 'schedules' : S.params[0] === 'list' ? 'providers' : 'calendar', h = head('Providers & Schedules');
    h += '<div class="chip-row seg"><a class="chip' + (tab === 'calendar' ? ' on' : '') + '" href="#/providers">Calendar</a><a class="chip' + (tab === 'providers' ? ' on' : '') + '" href="#/providers/list">Providers</a><a class="chip' + (tab === 'schedules' ? ' on' : '') + '" href="#/providers/schedules">By student</a></div>';
    if (tab === 'calendar') return h + calendarView();
    if (S.P.gaps.length) h += gapsCard();
    if (tab === 'providers') {
      if (!S.P.providers.length) h += warn('No providers in the connected sources.');
      var load = M.providerLoad(S.P);
      S.P.providers.forEach(function (p) {
        var l = load[p.key];
        h += '<a class="card row" href="#/provider/' + esc(p.key) + '"><div class="grow"><b>' + esc(p.name) + '</b><small>' + esc(p.roles.join(' · ') || 'Role not on file') + ' · ' + p.cases.length + ' case' + (p.cases.length === 1 ? '' : 's') +
          (l && l.minutes ? ' · ' + M.fmtHours(l.minutes) + '/week booked' : '') + '</small></div><span class="chev"></span></a>';
      });
    } else {
      S.P.students.forEach(function (s) {
        var rows = S.P.schedules.filter(function (r) { return r.case_id === s.id; });
        h += card('<b><a href="#/student/' + encodeURIComponent(s.id) + '">' + esc(s.name) + '</a></b>' + (rows.length ? rows.map(function (r) {
          return '<div style="margin-top:6px">' + esc(r.role) + ' · ' + (r.open ? pill('Unstaffed', 'warn') : r.providerKey ? '<a href="#/provider/' + esc(r.providerKey) + '">' + esc(r.provider) + '</a>' : esc(r.provider)) + '<br><span class="muted">' + (r.schedule ? esc(r.schedule) : 'No schedule on file') + (r.mandate ? ' · mandate ' + esc(r.mandate) + ' h/wk' : '') + '</span></div>';
        }).join('') : '<div class="muted">No assignments on file' + (s.chart && s.chart.schedule ? '; chart schedule: ' + esc(s.chart.schedule) : '') + '</div>'));
      });
      h += '<p class="src">Source: Provider Hub assignments and student chart</p>';
    }
    return h;
  };
  function gapsCard() {
    return card('<b>' + S.P.gaps.length + ' unstaffed role' + (S.P.gaps.length === 1 ? '' : 's') + '</b><div style="margin-top:6px">' + S.P.gaps.map(function (g) {
      return '<a href="#/student/' + encodeURIComponent(g.case_id) + '">' + esc(g.student) + '</a> · ' + esc(g.role) + (g.days ? ' · ' + esc(g.days) + ' day' + (g.days === 1 ? '' : 's') : '') + (g.departed ? ' <span class="muted">(left: ' + esc(g.departed) + ')</span>' : '') +
        coverHint(g.role);
    }).join('<br>') + '</div>');
  }
  // Same-discipline providers with their TTG weekly bookings. Outside availability is not recorded anywhere, so it is not claimed.
  function coverHint(role) {
    var load = M.providerLoad(S.P), n = M.normService(role);
    var same = S.P.providers.filter(function (p) { return p.roles.some(function (r) { return M.normService(r) === n; }); });
    if (!same.length) return '';
    return '<div class="muted">Same discipline: ' + same.map(function (p) { var l = load[p.key]; return esc(p.name) + ' (' + (l && l.minutes ? M.fmtHours(l.minutes) : '0 h') + '/wk booked)'; }).join(', ') + '</div>';
  }

  /* ---------- CALENDAR (inside Providers & Schedules) ---------- */
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function dshort(iso) { var p = iso.split('-'); return MONTHS[+p[1] - 1] + ' ' + (+p[2]); }
  function calScope() { var w = S.cal.who || ''; return { providerKey: w.indexOf('p:') === 0 ? w.slice(2) : '', caseId: w.indexOf('s:') === 0 ? w.slice(2) : '' }; }
  function eventCard(e, opts) {
    opts = opts || {};
    var flags = '';
    if (e.open) flags += pill('Unstaffed', 'warn');
    e.overlaps.forEach(function (o) { flags += pill('Overlaps ' + o.with + ' ' + o.time, 'bad'); });
    if (e.noteState === 'on_file') flags += pill('Note on file');
    else if (e.noteState === 'none') flags += '<span class="muted">No note on file</span>';
    return '<div class="ev' + (e.overlaps.length ? ' ev-bad' : '') + '"><div class="ev-time">' + esc(M.timeRange(e)) + '</div><div class="ev-body">' +
      (opts.hideStudent ? '' : '<a href="#/student/' + encodeURIComponent(e.case_id) + '"><b>' + esc(e.student) + '</b></a> ') + '<span class="muted">' + esc(e.role) + '</span>' +
      (opts.hideProvider || e.open ? '' : '<div>' + (e.providerKey ? '<a href="#/provider/' + esc(e.providerKey) + '">' + esc(e.provider) + '</a>' : esc(e.provider)) + '</div>') +
      (e.note ? '<div class="muted">' + esc(e.note) + '</div>' : '') + (flags ? '<div class="ev-flags">' + flags + '</div>' : '') + '</div></div>';
  }
  function calendarView() {
    if (!S.clinical) ensureClinical();
    var t = today(), sc = calScope();
    if (!S.cal.monday) S.cal.monday = M.weekStart(t);
    var W = M.calendarWeek(S.P, S.clinical, { monday: S.cal.monday, today: t, providerKey: sc.providerKey, caseId: sc.caseId });
    if (!S.cal.day || S.cal.day < W.monday || S.cal.day > W.sunday) S.cal.day = t >= W.monday && t <= W.sunday ? t : W.monday;
    var h = '<div class="card cal-head"><button type="button" class="nav-btn" data-act="cal-week" data-d="-1" aria-label="Previous week">‹</button><div class="grow"><b>' + esc(dshort(W.monday) + ' – ' + dshort(W.sunday)) + '</b>' +
      (W.monday === M.weekStart(t) ? '<small>This week</small>' : '<small><a href="#/providers" data-act="cal-week" data-d="0">Back to this week</a></small>') + '</div><button type="button" class="nav-btn" data-act="cal-week" data-d="1" aria-label="Next week">›</button></div>';
    h += '<div class="selects cal-who"><label for="calWho">Show</label><select id="calWho" data-change="cal-who">' + opt('', 'Everyone', !S.cal.who) +
      '<optgroup label="Providers">' + S.P.providers.filter(function (p) { return M.providerLoad(S.P)[p.key]; }).map(function (p) { return opt('p:' + p.key, p.name, S.cal.who === 'p:' + p.key); }).join('') + '</optgroup>' +
      '<optgroup label="Students">' + S.P.students.map(function (s) { return opt('s:' + s.id, s.name, S.cal.who === 's:' + s.id); }).join('') + '</optgroup></select></div>';
    // phone: day strip + agenda. wide screens: the whole week side by side (CSS decides).
    h += '<div class="day-strip" role="tablist">' + W.days.map(function (d) {
      var n = d.events.length;
      return '<button type="button" role="tab" class="day' + (d.date === S.cal.day ? ' on' : '') + (d.isToday ? ' today' : '') + '" data-act="cal-day" data-date="' + esc(d.date) + '" aria-selected="' + (d.date === S.cal.day) + '">' +
        '<span aria-hidden="true">' + esc(d.label) + '</span><b aria-hidden="true">' + esc(+d.date.slice(8)) + '</b><small aria-hidden="true">' + (n ? n : '–') + '</small>' +
        '<span class="sr">' + esc(d.label + ' ' + dshort(d.date) + ', ' + (n ? plural(n, 'session') : 'no sessions')) + '</span></button>';
    }).join('') + '</div>';
    var opts = { hideProvider: !!sc.providerKey, hideStudent: !!sc.caseId };
    var sel = W.days.filter(function (d) { return d.date === S.cal.day; })[0];
    h += '<div class="agenda">' + card('<div class="sec-mini">' + esc(sel.label + ', ' + dshort(sel.date)) + (sel.isToday ? ' · today' : '') + '</div>' +
      (sel.events.length ? sel.events.map(function (e) { return eventCard(e, opts); }).join('') : '<p class="muted">' + (W.days.some(function (d) { return d.events.length; }) ? 'Nothing scheduled this day. Tap another day above.' : 'Nothing scheduled this week.') + '</p>')) + '</div>';
    h += '<div class="week-grid">' + W.days.map(function (d) {
      return '<div class="wcol' + (d.isToday ? ' today' : '') + '"><div class="wcol-h">' + esc(d.label) + ' <b>' + esc(+d.date.slice(8)) + '</b></div>' +
        (d.events.length ? d.events.map(function (e) { return eventCard(e, opts); }).join('') : '<p class="muted">–</p>') + '</div>';
    }).join('') + '</div>';
    // What needs attention this week, in words.
    var att = [];
    if (W.overlapCount) att.push('<b>' + W.overlapCount + ' overlap' + (W.overlapCount === 1 ? '' : 's') + '</b>: a provider or a child booked in two sessions at once. Joint and supervision sessions are not counted.');
    W.mandate.forEach(function (a) { att.push('<a href="#/student/' + encodeURIComponent(a.case_id) + '">' + esc(a.student) + '</a> · ' + esc(a.role) + ': scheduled ' + esc(M.fmtHours(a.minutes)) + ' a week, mandate ' + esc(M.fmtHours(a.mandateMin)) + '.'); });
    var gapsHere = S.P.gaps.filter(function (g) { return !sc.caseId || g.case_id === sc.caseId; });
    if (!sc.providerKey) gapsHere.forEach(function (g) { att.push('<a href="#/student/' + encodeURIComponent(g.case_id) + '">' + esc(g.student) + '</a> · ' + esc(g.role) + ' is unstaffed.' + coverHint(g.role)); });
    var thisWeek = W.monday === M.weekStart(t);
    if (att.length) h += card('<b>Needs attention' + (thisWeek ? ' this week' : ', ' + esc(dshort(W.monday) + ' to ' + dshort(W.sunday))) + '</b>' + att.map(function (x) { return '<div class="att">' + x + '</div>'; }).join(''));
    var off = W.offCalendar.filter(function (o) { return !o.open || o.text; });
    if (off.length) h += '<details class="card"><summary><b>Not on the calendar (' + off.length + ')</b></summary><p class="muted">These schedules have no day and time the app can read, so they are shown as written.</p>' +
      off.map(function (o) { return '<div class="att"><a href="#/student/' + encodeURIComponent(o.case_id) + '">' + esc(o.student) + '</a> · ' + esc(o.role) + (o.provider ? ' · ' + esc(o.provider) : '') + '<div class="muted">' + esc(o.text || 'No schedule on file') + '</div></div>'; }).join('') + '</details>';
    if (!thisWeek) h += '<p class="muted">' + (W.monday < M.weekStart(t) ? 'This shows today\u2019s schedule on a past week. Schedule changes are not recorded, so it may differ from what was planned then.' : 'This shows today\u2019s schedule on a future week. It changes if the Provider Hub changes.') + '</p>';
    h += '<p class="src">From the Provider Hub schedules' + (W.notesAvailable ? ' and clinical notes. A day with no note is not a missed session.' : '. Clinical notes are not connected, so past days show no note status.') + '</p>';
    return h;
  }
  ROUTES.provider = function () {
    var p = S.P.providers.filter(function (x) { return x.key === S.params[0]; })[0];
    if (!p) return head('Provider', '#/providers', 'Providers') + '<div class="list-empty">Provider not found.</div>';
    ensureClinical(); ensureBilling();
    var h = head(p.name, '#/providers', 'Providers');
    var pl = M.weekPlan(S.P).filter(function (a) { return a.providerKey === p.key; }), pmin = pl.reduce(function (n, a) { return n + a.minutes; }, 0);
    h += '<div class="card overview"><div class="ov-line">' + esc([p.roles.join(' · '), plural(p.cases.length, 'case'), pmin ? M.fmtHours(pmin) + '/week booked' : ''].filter(Boolean).join(' · ')) + '</div></div>';
    h += recordSection('Provider info', presentKV([['Name', p.name], ['Discipline', p.roles.join(', ')], ['Phone', p.phone], ['Email', p.email], ['Provider ID', p.provider_id],
      ['Credentials', p.credentials], ['Rate', p.rate], ['Hours', p.hours], ['SSN (last 4 only)', p.ssn]]), '', [p.phone, p.email].filter(Boolean).join(' · '));
    var roster = p.cases.map(function (c) { return recordItem('<b><a href="#/student/' + encodeURIComponent(c.case_id) + '">' + esc(c.student) + '</a></b>' +
      presentKV([['Discipline', c.role], ['Schedule', c.schedule], ['Mandate (h/week)', c.mandate], ['Status', c.status], ['Setting', c.setting]])); }).join('');
    if (pl.some(function (a) { return a.slots.length; })) roster = miniWeek(pl.map(function (a) { return Object.assign({}, a, { role: a.student }); })) + roster + '<p><a href="#/providers" data-act="cal-open" data-who="p:' + esc(p.key) + '">Open in calendar</a></p>';
    h += recordSection('Case roster & schedule', roster, 'No case roster or schedule connected.', plural(p.cases.length, 'student') + (pmin ? ' · ' + M.fmtHours(pmin) + ' a week' : ''));
    // Prefer IDs; a name-only match must resolve uniquely to avoid mixing providers.
    var pm = function (l) { return l.provider_id && p.provider_id ? l.provider_id === p.provider_id : (M.findProvider(S.P.providers, l.provider) || {}).key === p.key; };
    h += recordSection('Billing sheets', recordBilling(pm), 'No billing lines for this provider.', billingSummary(pm));
    var docs = docLinks(p.documents);
    S.P.reports.filter(function (r) { return r.kind === 'provider' && r.scope === p.name; }).forEach(function (r) { docs += recordItem('<a href="#/report/' + encodeURIComponent(r.id) + '">' + esc(r.title) + '</a>'); });
    h += recordSection('Documents', docs, 'No provider documents connected.', docs ? plural((docs.match(/class="record-item"/g) || []).length, 'item') : '');
    var notes = S.clinical && S.clinical.available ? S.clinical.notes.filter(function (x) { return x.providerKey === p.key; }) : [];
    h += recordSection('Clinical data', clinicalSummary(notes, '#/notes', ' data-act="notes-by-provider" data-key="' + esc(p.key) + '"'), 'No clinical notes for this provider.', notes.length ? plural(notes.length, 'note') : S.clinical && S.clinical.available ? 'No notes yet' : '');
    return h;
  };

  /* ---------- BILLING REVIEW ---------- */
  function billState(b) { var st = b.audit.status; return pill(st, st === 'Signed off' ? '' : st === 'Needs review' ? 'warn' : 'bad'); }
  ROUTES.billing = function () {
    ensureBilling();
    var h = head('Billing Review', S.params[0] ? '#/billing' : '#/', S.params[0] ? 'Billing' : 'Home'), B = S.billing;
    if (S.loading.billing || !B) return h + loadingCard('billing');
    if (!B.available) return h + warn('<b>Incoming billing is not connected.</b> ' + esc(B.reason) + '<br>Billing is only reviewed against real billed lines and clinical notes; nothing is approved from counts.');
    var persisted = S.mode === 'live' && B.persisted !== false;
    if (!S.params[0]) {
      h += '<p class="muted">Compare each billed line with its clinical note, then sign off. No invoices or payments are handled here.</p>';
      if (!B.batches.length) h += '<div class="list-empty">No incoming billing.</div>';
      B.batches.forEach(function (b) {
        var bad = b.review.filter(function (r) { return r.state !== 'aligned'; }).length;
        h += '<a class="card row" href="#/billing/' + encodeURIComponent(b.id) + '"><div class="grow"><b>' + esc(b.id) + '</b><small>' + b.lines.length + ' line' + (b.lines.length === 1 ? '' : 's') + (bad ? ' · ' + bad + ' need attention' : '') + '</small></div>' + billState(b) + '<span class="chev"></span></a>';
      });
      return h;
    }
    var b = B.batches.filter(function (x) { return x.id === S.params[0]; })[0];
    if (!b) return h + '<div class="list-empty">Batch not found.</div>';
    var signed = !!b.audit.signoff;
    h += card('<div class="row"><div class="grow"><b>' + esc(b.id) + '</b><small>' + esc(uniqList(b.lines, 'student')) + ' · ' + esc(uniqList(b.lines, 'provider')) + '</small></div>' + billState(b) + '</div>' +
      '<p class="muted" style="margin:6px 0 0">' + (persisted ? 'Your checks, flags and sign-off are saved to the Billing Audit log.' : 'Preview only: checks, flags and sign-off stay in this tab and are NOT saved.') + '</p>' +
      (b.audit.prior_signoff ? warn('This batch changed after an earlier sign-off (' + esc(b.audit.prior_signoff.ts) + '). Review again.') : ''));
    var ctx = scheduleContext(b.lines);
    h += '<div class="bill-lines">';
    b.lines.forEach(function (l, i) {
      var r = b.review[i] || { state: 'needs_review', reasons: [] }, st = STATE[r.state] || STATE.needs_review, checked = !!b.audit.checks[l.id];
      h += card('<div class="row"><div class="grow"><b>' + esc(l.date || 'No date') + ' · ' + esc(l.student) + '</b><small>' + esc((l.service || 'No service') + ' · ' + (l.provider || 'No provider') + ' · ' +
        (l.duration_min != null ? l.duration_min + ' min' : 'no duration') + (l.units != null ? ' · ' + l.units + ' units' : '')) + '</small></div>' + pill(st[0], st[1]) + '</div>' +
        '<div class="muted">' + r.reasons.map(function (x) { return esc(plainReason(x, r)); }).join('<br>') + '</div>' + (ctx[i] ? '<div class="sched-ctx">' + ctx[i] + '</div>' : '') +
        (r.note ? '<div class="src">Note: <a href="#/note/' + encodeURIComponent(r.note.id) + '">' + esc(r.note.date + ' · ' + (r.note.service || '') + ' · ' + r.note.provider + (r.note.duration_min ? ' · ' + r.note.duration_min + ' min' : '')) + '</a></div>' : '') +
        (r.state === 'aligned' ? '<label class="check-row" style="margin-top:8px"><input type="checkbox" data-change="bill-check" data-batch="' + esc(b.id) + '" data-line="' + esc(l.id) + '"' + (checked ? ' checked' : '') + (signed ? ' disabled' : '') + '> <span>I checked this line against the note</span></label>' : ''));
    });
    h += '</div>';
    if (b.audit.flags.length) h += warn('<b>Flagged for correction:</b><br>' + b.audit.flags.map(function (f) { return esc(f.ts.slice(0, 10) + (f.line_id ? ' · line ' + f.line_id : '') + ': ' + f.reason); }).join('<br>'));
    if (signed) h += info('<b>Signed off</b> ' + esc(b.audit.signoff.ts) + (persisted ? ' · saved in the Billing Audit log.' : ' · preview only, not saved.'));
    else {
      h += card('<b>Sign off</b><p class="muted">' + (b.blocker ? 'Not yet: ' + esc(plainBlocker(b.blocker)) + '.' : 'All lines align with notes and you checked each one.') + '</p>' +
        '<button type="button" class="btn" data-act="bill-sign" data-batch="' + esc(b.id) + '"' + (b.blocker ? ' disabled' : '') + '>Sign off this batch</button>');
      h += '<details class="card"><summary><b>Flag for correction</b></summary><div class="selects"><label for="flagLine">Line (optional)</label><select id="flagLine">' + opt('', 'Whole batch', true) +
        b.lines.map(function (l) { return opt(l.id, l.date + ' · ' + l.provider, false); }).join('') + '</select><label for="flagReason">What needs correcting (required)</label><textarea id="flagReason" class="field" rows="2"></textarea></div>' +
        '<button type="button" class="btn warn" data-act="bill-flag" data-batch="' + esc(b.id) + '" style="margin-top:8px">Flag for correction</button>' +
        (b.audit.flags.length ? '<label for="clearReason" class="muted" style="display:block;margin-top:12px">Resolved? Say how (required)</label><textarea id="clearReason" class="field" rows="2"></textarea><button type="button" class="btn secondary" data-act="bill-clear" data-batch="' + esc(b.id) + '">Clear flag</button>' : '') + '</details>';
    }
    if (b.audit.history && b.audit.history.length) h += '<details class="card"><summary><b>Audit history</b></summary>' + b.audit.history.map(function (x) { return '<div class="muted">' + esc(x.ts + ' · ' + x.op + (x.line_id ? ' · ' + x.line_id : '') + (x.reason ? ' · ' + x.reason : '')) + '</div>'; }).join('') + '</details>';
    return h;
  };
  // Schedule context for each billed line (read-only, for Roni's judgment): was this child scheduled with this provider that weekday,
  // and do the billed hours that week go past the weekly mandate? Never blocks or changes sign-off; billing rules stay in billing-core.
  function scheduleContext(lines) {
    var plan = M.weekPlan(S.P), week = {}, out = [];
    lines.forEach(function (l) {
      var p = M.findProvider(S.P.providers, l.provider), d = /^\d{4}-\d{2}-\d{2}$/.test(l.date || '') ? new Date(l.date + 'T12:00:00') : null;
      var mine = plan.filter(function (a) { return a.case_id === l.case_id && p && a.providerKey === p.key; });
      if (!d || !mine.length || !mine.some(function (a) { return a.slots.length; })) { out.push(''); return; }
      var dow = d.getDay(), sl = []; mine.forEach(function (a) { a.slots.forEach(function (x) { if (x.day === dow) sl.push(M.timeRange(x)); }); });
      var k = l.case_id + '|' + p.key + '|' + M.weekStart(l.date); week[k] = (week[k] || 0) + (+l.duration_min || 0);
      out.push({ k: k, man: mine[0].mandateMin, txt: sl.length ? 'On the schedule that day: ' + sl.join(', ') : pill('No ' + ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow] + ' session on the schedule', 'warn') });
    });
    return out.map(function (o) { if (!o) return ''; return o.txt + (o.man != null && week[o.k] > o.man + 5 ? ' ' + pill('Billed ' + M.fmtHours(week[o.k]) + ' that week, mandate ' + M.fmtHours(o.man), 'warn') : ''); });
  }
  // billing-core wording stays as is (it is the audited logic); the screen drops internal note IDs and '(s)'.
  function plainReason(x, r) { x = String(x).replace(/^Student, date, provider, service, duration match/, 'Student, date, provider, service and duration match'); return r && r.note ? x.replace(/ match note N[0-9a-f]{6,}$/, ' match the note below') : x; }
  function plainBlocker(x) { return String(x || '').replace(/^(\d+) line\(s\)( do not| not)/, function (m, n, rest) { return n + (n === '1' ? ' line' : ' lines') + (n === '1' && rest === ' do not' ? ' does not' : rest); }); }
  function uniqList(a, k) { return a.map(function (x) { return x[k]; }).filter(function (x, i, arr) { return x && arr.indexOf(x) === i; }).join(', '); }

  /* ---------- REPORTS ---------- */
  ROUTES.reports = function () {
    ensureClinical();
    var r = S.rep, h = head('Reports & Updates');
    if (!r.caseId && S.P.students[0]) r.caseId = S.P.students[0].id;
    if (!S.P.students.length) return h + '<div class="list-empty">No students on file, so there is nothing to report on yet.</div>' + savedReports();
    if (!r.from) r.from = daysAgo(60); if (!r.to) r.to = today(); if (!r.audience) r.audience = 'Parent';
    h += '<div class="selects"><label for="repStudent">Student</label><select id="repStudent" data-change="rep-opt" data-k="caseId">' + S.P.students.map(function (s) { return opt(s.id, s.name, s.id === r.caseId); }).join('') + '</select>' +
      '<div class="two"><div><label for="repFrom">From</label><input type="date" id="repFrom" data-change="rep-opt" data-k="from" value="' + esc(r.from) + '"></div><div><label for="repTo">To</label><input type="date" id="repTo" data-change="rep-opt" data-k="to" value="' + esc(r.to) + '"></div></div>' +
      '<label for="repAudience">Audience</label><select id="repAudience" data-change="rep-opt" data-k="audience">' + ['Parent', 'School', 'Internal'].map(function (a) { return opt(a, a, a === r.audience); }).join('') + '</select></div>';
    if (S.clinical && !S.clinical.available) h += warn('Clinical notes are not connected (' + esc(S.clinical.reason) + '). Drafts need notes to say anything.');
    h += '<p style="margin:14px 0"><button type="button" class="btn" data-act="rep-create"' + (!S.clinical || S.loading.clinical ? ' disabled' : '') + '>Create draft from notes</button></p>';
    if (!S.clinical || S.loading.clinical) h += '<p class="muted" style="margin-top:-6px">Loading clinical notes…</p>';
    var d = S.reportDraft;
    if (d) {
      h += '<div class="print-area"><div class="sec">Draft · awaiting your review</div>' + d.warnings.map(function (w) { return warn(esc(w)); }).join('') +
        '<textarea id="repBody" class="field draft" data-input="rep-body" rows="16" aria-label="Draft text">' + esc(d.body) + '</textarea>' +
        '<pre class="print-copy"></pre><div class="src">' + (d.sources.length ? 'Sources (' + d.sources.length + ' notes):<ul class="sources">' + d.sources.map(function (s) { return '<li><a href="#/note/' + encodeURIComponent(s.id) + '">' + esc(s.label) + '</a></li>'; }).join('') + '</ul>' : 'Sources: no notes in this period.') + '</div>' +
        '<p class="muted">' + esc(d.limits) + '</p></div>' +
        '<div class="btns"><button type="button" class="btn secondary" data-act="rep-print">Print / PDF</button><button type="button" class="btn secondary" data-act="rep-download">Download text</button></div>' +
        '<p><button type="button" class="btn" data-act="rep-save"' + (v4Missing() ? ' disabled' : '') + '>Save draft to Reports</button></p>' +
        (v4Missing() ? '<p class="muted">Saving needs the v4 API update; print or download works now.</p>' : S.mode === 'fixture' ? '<p class="muted">Preview: saved drafts stay in this tab only.</p>' : '');
    }
    h += savedReports();
    h += '<details class="card"><summary><b>Other report types</b></summary><div class="selects"><label for="mrStudent">Student status report</label><select id="mrStudent">' + S.P.students.map(function (s) { return opt(s.id, s.name, false); }).join('') + '</select>' +
      '<button type="button" class="btn secondary" data-act="mr-create" data-kind="student" style="margin-top:8px">Create student status</button>' +
      '<label for="mrProvider">Provider hours & billing</label><select id="mrProvider">' + S.P.providers.map(function (p) { return opt(p.name, p.name, false); }).join('') + '</select>' +
      '<label for="mrMonth">Month</label><input type="month" id="mrMonth" value="' + esc(today().slice(0, 7)) + '">' +
      '<button type="button" class="btn secondary" data-act="mr-create" data-kind="provider" style="margin-top:8px">Create provider report</button>' +
      '<div class="btns" style="margin-top:8px"><button type="button" class="btn secondary" data-act="mr-create" data-kind="intake">Intake status</button><button type="button" class="btn secondary" data-act="mr-create" data-kind="month">Monthly report</button></div></div></details>';
    return h;
  };
  var KIND = { student: 'Student status', provider: 'Provider hours and billing', intake: 'Intake status', month: 'Monthly report', 'notes-update': 'Update from notes' };
  function kindLabel(k) { return KIND[k] || (k ? String(k).charAt(0).toUpperCase() + String(k).slice(1) : 'Report'); }
  function savedReports() {
    var h = '<div class="sec">Saved reports</div>';
    if (!S.P.reports.length) h += '<div class="list-empty">No saved reports.</div>';
    S.P.reports.slice(0, 30).forEach(function (x) { h += '<a class="card row" href="#/report/' + encodeURIComponent(x.id) + '"><div class="grow"><b>' + esc(x.title) + '</b><small>' + esc(String(x.created || '').slice(0, 10) + ' · ' + kindLabel(x.kind)) + '</small></div>' + pill(x.status, x.status === 'draft' ? 'warn' : '') + '<span class="chev"></span></a>'; });
    if (S.P.reports.length > 30) h += '<p class="muted">Showing the newest 30 of ' + S.P.reports.length + '.</p>';
    return h;
  }
  ROUTES.report = function () {
    var r = S.P.reports.filter(function (x) { return x.id === S.params[0]; })[0];
    if (!r) return head('Report', '#/reports', 'Reports') + '<div class="list-empty">Report not found.</div>';
    return head(r.title, '#/reports', 'Reports') + '<div class="print-area">' + card(pill(r.status, r.status === 'draft' ? 'warn' : '') + ' <span class="muted">' + esc(kindLabel(r.kind) + ' · created ' + r.created + (r.updated ? ' · updated ' + r.updated : '')) + '</span>' +
      '<textarea id="srBody" class="field draft" rows="16" aria-label="Report text">' + esc(r.body) + '</textarea><pre class="print-copy"></pre>') + '</div>' +
      '<div class="btns"><button type="button" class="btn secondary" data-act="sr" data-op="edit" data-id="' + esc(r.id) + '">Save edits</button>' +
      (r.status === 'draft' ? '<button type="button" class="btn" data-act="sr" data-op="done" data-id="' + esc(r.id) + '">Mark reviewed</button>' : '<button type="button" class="btn secondary" data-act="sr" data-op="reopen" data-id="' + esc(r.id) + '">Reopen</button>') + '</div>' +
      '<div class="btns" style="margin-top:10px"><button type="button" class="btn secondary" data-act="rep-print">Print / PDF</button><button type="button" class="btn ghost" data-act="sr" data-op="remove" data-id="' + esc(r.id) + '">Remove</button></div>' +
      '<p class="muted">Reports are drafts for you; nothing is sent.</p>';
  };

  /* ---------- EMAIL & OPEN ITEMS ---------- */
  function itemRow(x) {
    var who = x.recipient && x.title.indexOf(x.recipient) >= 0 ? '' : (x.recipient || 'No recipient');
    return '<a class="card row" href="#/item/' + encodeURIComponent(x.id) + '"><div class="grow"><b>' + esc(x.title) + '</b><small>' + esc([who, x.student].filter(Boolean).join(' · ') + (x.created ? ' · ' + x.created.slice(0, 10) : '')).replace(/^ · /, '') + '</small></div><span class="chev"></span></a>';
  }
  ROUTES.email = function () {
    var cid = S.params[0] || '', g = M.queueGroups(S.P), stu = cid ? M.student(S.P, cid) : null;
    var f = function (a) { return a.filter(function (x) { return !cid || x.case_id === cid; }); };
    var h = head(stu ? 'Open items · ' + stu.name : 'Email & Open Items', stu ? '#/student/' + encodeURIComponent(cid) : '#/', stu ? stu.name : 'Home');
    h += '<p class="muted">Drafts and follow-ups from the cases. Nothing is sent from TTG Ops; approving marks a draft for Katya to send.</p>';
    h += '<div class="sec">Needs your review</div>';
    var mine = f(g.needsYou); if (!mine.length) h += '<div class="list-empty">Nothing waiting for you.</div>'; mine.forEach(function (x) { h += itemRow(x); });
    var today_ = S.P.todayItems.filter(function (x) { return !cid || x.case_id === cid; });
    if (today_.length) h += '<details class="card"><summary><b>Today\u2019s follow-ups (' + today_.length + ')</b></summary>' + today_.map(function (x) { return '<div class="muted" style="margin-top:6px">' + esc(x.trigger + ' · ' + (x.student || '') + ' · ' + x.recipient + (x.note ? ' · ' + x.note : '')) + '</div>'; }).join('') + '</details>';
    [['With others', f(g.others)], ['Approved, waiting to be sent by Katya', f(g.approved)], ['Dismissed', f(g.dismissed)]].forEach(function (grp) {
      if (grp[1].length) h += '<details class="card"><summary><b>' + esc(grp[0]) + ' (' + grp[1].length + ')</b></summary>' + grp[1].map(itemRow).join('') + '</details>';
    });
    var reqs = S.P.requests.filter(function (r) { return !cid || r.case_id === cid; });
    h += '<div class="sec">Requests to Katya</div>';
    reqs.slice().reverse().slice(0, 20).forEach(function (r) { h += card('<div class="row"><div class="grow">' + esc(r.text) + '<small>' + esc((r.student ? r.student + ' · ' : '') + r.ts.slice(0, 10)) + '</small></div>' + pill(r.status || 'new', r.status === 'done' ? '' : 'warn') + '</div>' + (r.reply ? '<div class="note-body muted">' + esc(r.reply) + '</div>' : '')); });
    h += card('<textarea id="reqText" class="field" rows="2" placeholder="Ask Katya for something' + (stu ? ' about ' + esc(stu.name) : '') + '"></textarea><button type="button" class="btn secondary" data-act="req-add" data-case="' + esc(cid) + '">Add request</button>');
    return h;
  };
  ROUTES.item = function () {
    var x = S.P.queue.filter(function (q) { return q.id === S.params[0]; })[0];
    if (!x) return head('Item', '#/email', 'Open items') + '<div class="list-empty">Item not found.</div>';
    var draft = x.status === 'draft';
    var h = head(x.title, '#/email', 'Open items');
    h += card(kv([['Status', esc(x.status), true], ['To', x.recipient], ['Contact', x.contact], ['Channel', x.channel], ['Student', x.case_id ? '<a href="#/student/' + encodeURIComponent(x.case_id) + '">' + esc(x.student) + '</a>' : '', !!x.case_id],
      ['Provider', x.providerKey ? '<a href="#/provider/' + esc(x.providerKey) + '">' + esc(x.recipient) + '</a>' : '', !!x.providerKey], ['Why', x.triggerName && x.triggerName !== x.trigger ? x.triggerName : x.trigger ? 'Follow-up rule ' + x.trigger + ' (no description on file)' : ''], ['Owner', x.owner]]));
    h += '<div class="selects"><label for="qSubject">Subject</label><input id="qSubject" class="field" value="' + esc(x.subject) + '"' + (draft ? '' : ' readonly') + '>' +
      '<label for="qMessage">Message (draft)</label><textarea id="qMessage" class="field" rows="8"' + (draft ? '' : ' readonly') + '>' + esc(x.message) + '</textarea></div>';
    if (draft) h += '<div class="btns" style="margin-top:10px"><button type="button" class="btn secondary" data-act="q" data-op="edit" data-id="' + esc(x.id) + '">Save draft</button><button type="button" class="btn" data-act="q" data-op="approve" data-id="' + esc(x.id) + '">Approve for Katya</button></div>' +
      '<p><button type="button" class="btn ghost" data-act="q" data-op="dismiss" data-id="' + esc(x.id) + '">Dismiss</button></p>';
    else h += '<p><button type="button" class="btn secondary" data-act="q" data-op="reopen" data-id="' + esc(x.id) + '">Reopen as draft</button></p>';
    h += '<p class="muted">Approving does not send anything. It marks the draft for Katya to send and logs it.</p>';
    return h;
  };

  /* ---------- SETTINGS ---------- */
  ROUTES.settings = function () {
    var P = S.P, h = head('Settings'), sy = P.sync || {}, v = P.v4;
    var src = function (name, ok, detail) { return '<dt>' + esc(name) + '</dt><dd>' + (ok ? pill('Connected') : pill('Not connected', 'warn')) + ' <span class="muted">' + esc(detail || '') + '</span></dd>'; };
    h += card('<b>Data sources</b><dl class="kv" style="margin-top:8px">' +
      src('Case roster', sy.roster_ok, (sy.roster_updated ? 'updated ' + sy.roster_updated : '') + (sy.stale ? ' · out of sync with Case Board' : '')) +
      src('Student chart', P.chartSync && P.chartSync.ok, P.chartSync ? P.chartSync.matched + ' of ' + P.chartSync.rows + ' rows matched' : '') +
      src('Clinical notes', v && v.clinical.present, v ? plural(v.clinical.rows, 'row') : 'API update needed') +
      src('Sessions without notes', v && v.noNote.present, v ? plural(v.noNote.rows, 'row') : 'API update needed') +
      src('Incoming billing', v && v.billing.present, v ? v.billing.rows + ' lines' : 'API update needed') +
      (v && !v.audit.present ? '<dt>Billing audit log</dt><dd>' + pill('Not started') + ' <span class="muted">created on your first billing decision</span></dd>' : src('Billing audit log', v && v.audit.present, v ? plural(v.audit.rows, 'entry').replace('entrys', 'entries') : 'API update needed')) +
      '</dl>' + (sy.roster_only && sy.roster_only.length ? '<p class="muted">On roster, not on Case Board: ' + esc(sy.roster_only.join(', ')) + '</p>' : '') +
      (sy.board_only && sy.board_only.length ? '<p class="muted">On Case Board, not on roster: ' + esc(sy.board_only.join(', ')) + '</p>' : '') +
      '<p class="muted">Ensora exports are imported privately into the Clinical Notes tab; they are never part of this public app.</p>');
    h += card('<b>Access</b><p class="muted">Mode: ' + esc(S.mode === 'fixture' ? 'fictional preview (no network)' : 'live') + '. The key stays on this device; case data is never stored on the device or in links.</p>' +
      (S.mode === 'live' ? '<button type="button" class="btn secondary" data-act="forget-key">Forget key on this device</button>' : '<a class="btn secondary" href="./">Leave preview</a>'));
    return h;
  };

  /* ---------- actions ---------- */
  function applyResult(r) {
    if (!r) return;
    if (r.case) { S.boot.cases = S.boot.cases.map(function (c) { return c.id === r.case.id ? r.case : c; }); }
    if (r.queue) S.boot.queue = r.queue;
    if (r.requests) S.boot.requests = r.requests;
    if (r.reports) S.boot.reports = r.reports;
    if (r.case || r.queue || r.requests || r.reports) S.P = M.normalizeBootstrap(S.boot);
    if (r.billing) S.billing = r.billing;
  }
  function run(action, data, okMsg) {
    if (S.busy) return Promise.resolve(null);
    S.busy = true;
    return api(action, data).then(function (r) { applyResult(r); if (okMsg) toast(okMsg); return r; })
      .catch(function (e) { toast(e.message === 'unauthorized' ? 'Key rejected' : 'Not saved: ' + plainError(e)); return null; })
      .then(function (r) { S.busy = false; render(); return r; });
  }
  function v(id) { var el = $('#' + id); return el ? String(el.value || '') : ''; }
  var saved = function () { return S.mode === 'fixture' ? ' (preview only)' : ''; };
  var ACT = {
    'home-search': function () { S.q = v('homeQ').trim(); if (location.hash === '#/search') render(); else location.hash = '#/search'; },
    'cal-week': function (el, e) {
      if (e && e.preventDefault) e.preventDefault();
      var d = +el.getAttribute('data-d'); S.cal.monday = d === 0 ? M.weekStart(today()) : M.addDays(S.cal.monday || M.weekStart(today()), 7 * d); S.cal.day = ''; render();
    },
    'cal-open': function (el) { S.cal.who = el.getAttribute('data-who') || ''; S.cal.monday = ''; S.cal.day = ''; },
    'cal-day': function (el) { S.cal.day = el.getAttribute('data-date'); render(); },
    'cal-who': function (el) { S.cal.who = String(el.value || ''); render(); },
    'stu-filter': function (el) { S.stuQ = String(el.value || ''); render(); },
    'nf-toggle': function () { S._nfOpen = !S._nfOpen; },
    'nf-clear': function () { S.noteF = { q: S.noteF.q }; S._nfOpen = false; },
    'note-filter': function (el) { S.noteF[el.getAttribute('data-k')] = String(el.value || ''); render(); },
    'notes-by-provider': function (el) { S.noteF = { providerKey: el.getAttribute('data-key') }; },
    'case-note': function (el) { var t = v('caseNote').trim(); if (!t) return toast('Write a note first'); return run('addNote', { case_id: el.getAttribute('data-id'), text: t, type: 'note' }, 'Note saved' + saved()); },
    'case-edit': function (el) {
      var f = v('editField'); if (M.EDITABLE.indexOf(f) < 0) return toast('Pick a field');
      return run('updateCase', { case_id: el.getAttribute('data-id'), field: f, value: v('editValue') }, 'Field saved' + saved());
    },
    'q': function (el) {
      var op = el.getAttribute('data-op'), d = { id: el.getAttribute('data-id'), op: op };
      if (op === 'edit' || op === 'approve') { d.subject = v('qSubject'); d.message = v('qMessage'); }
      if (op === 'approve' && !confirm('Approve this draft for Katya to send? Nothing is sent from TTG Ops.')) return;
      if (op === 'dismiss' && !confirm('Dismiss this draft?')) return;
      return run('queueAction', d, { edit: 'Draft saved', approve: 'Approved for Katya', dismiss: 'Dismissed', reopen: 'Reopened' }[op] + saved());
    },
    'req-add': function (el) { var t = v('reqText').trim(); if (!t) return toast('Write the request first'); return run('addRequest', { text: t, case_id: el.getAttribute('data-case') || '', kind: 'free text' }, 'Request added' + saved()); },
    'rep-opt': function (el) { S.rep[el.getAttribute('data-k')] = String(el.value || ''); },
    'rep-create': function () {
      var s = M.student(S.P, S.rep.caseId); if (!s) return toast('Pick a student');
      if (S.rep.from && S.rep.to && S.rep.from > S.rep.to) return toast('From date is after To date');
      S.reportDraft = M.buildReportDraft(s, S.clinical, { from: S.rep.from, to: S.rep.to, audience: S.rep.audience }); render();
    },
    'rep-body': function (el) { if (S.reportDraft) S.reportDraft.body = String(el.value || ''); },
    'rep-print': function () {
      var ta = $('.print-area textarea'), pre = $('.print-area .print-copy'); if (ta && pre) pre.textContent = ta.value;
      var done = function () { document.body.classList.remove('print-draft'); };
      document.body.classList.add('print-draft');
      try { window.addEventListener('afterprint', done, { once: true }); setTimeout(done, 60000); window.print(); } catch (e) { done(); } },
    'rep-download': function () {
      var d = S.reportDraft; if (!d) return;
      var text = d.body + '\n\nSources:\n' + d.sources.map(function (s) { return '- ' + s.label + ' (' + s.source + ')'; }).join('\n') + '\n';
      var a = document.createElement('a'), url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      a.href = url; a.download = 'ttg-update-' + today() + '.txt'; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    },
    'rep-save': function () {
      var d = S.reportDraft; if (!d || !d.body.trim()) return toast('Nothing to save');
      var body = d.body + '\n\nSources: ' + (d.sources.map(function (s) { return s.label + ' [' + s.id + ']'; }).join('; ') || 'none');
      return run('saveReportDraft', { case_id: d.case_id, title: d.title, body: body, audience: d.audience, from: d.from, to: d.to }, 'Draft saved to Reports' + saved());
    },
    'sr': function (el) {
      var op = el.getAttribute('data-op'), d = { id: el.getAttribute('data-id'), op: op };
      if (op === 'edit') d.body = v('srBody');
      if (op === 'remove' && !confirm('Remove this report?')) return;
      return run('reportAction', d, { edit: 'Saved', done: 'Marked reviewed', reopen: 'Reopened', remove: 'Removed' }[op] + saved()).then(function (r) { if (r && op === 'remove') location.hash = '#/reports'; });
    },
    'mr-create': function (el) {
      var k = el.getAttribute('data-kind'), d = { kind: k };
      if (k === 'student') d.case_id = v('mrStudent');
      if (k === 'provider') { d.provider = v('mrProvider'); d.month = v('mrMonth'); }
      if (k === 'month') d.month = v('mrMonth') || today().slice(0, 7);
      return run('makeReport', d, 'Report created' + saved()).then(function (r) { if (r && r.report) location.hash = '#/report/' + encodeURIComponent(r.report.id); });
    },
    'bill-check': function (el) { return billDecide(el.getAttribute('data-batch'), { op: el.checked ? 'check' : 'uncheck', line_id: el.getAttribute('data-line') }); },
    'bill-flag': function (el) { var r = v('flagReason').trim(); if (r.length < 5) return toast('Say what needs correcting'); return billDecide(el.getAttribute('data-batch'), { op: 'flag', line_id: v('flagLine'), reason: r }); },
    'bill-clear': function (el) { var r = v('clearReason').trim(); if (r.length < 5) return toast('Say how it was resolved'); return billDecide(el.getAttribute('data-batch'), { op: 'clear_flag', reason: r }); },
    'bill-sign': function (el) {
      var b = batch(el.getAttribute('data-batch')); if (!b || b.blocker) return toast(b ? plainBlocker(b.blocker) : 'Batch not found');
      if (!confirm('Sign off ' + b.id + '? ' + (b.lines.length === 1 ? 'The line matches its note' : 'All ' + b.lines.length + ' lines match their notes') + ' and you checked each one.' + (S.mode === 'fixture' ? ' (Preview: not saved.)' : ' This is recorded in the Billing Audit log.') + ' It does not pay or send anything.')) return;
      return billDecide(b.id, { op: 'signoff', confirm: true });
    },
    'forget-key': function () { if (confirm('Remove your key from this device?')) { localStorage.removeItem('ttgops.k'); location.reload(); } },
    'retry': function () { S.P = null; load(); }
  };
  function batch(id) { return S.billing && (S.billing.batches || []).filter(function (x) { return x.id === id; })[0]; }
  function billDecide(batchId, d) {
    var b = batch(batchId); if (!b) return toast('Batch not found');
    d.batch_id = b.id; d.batch_version = b.version; d.request_id = reqId();
    return run('billingDecision', d, { check: 'Checked', uncheck: 'Unchecked', flag: 'Flagged', clear_flag: 'Flag cleared', signoff: 'Signed off' }[d.op] + (S.mode === 'fixture' ? ' (preview only, not saved)' : ' · saved to audit log'));
  }
  function delegate(type, attr) {
    view.addEventListener(type, function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[' + attr + ']') : null; if (!el || !view.contains(el)) return;
      var name = el.getAttribute(attr); if (!ACT[name]) return;
      if (type === 'submit') e.preventDefault();
      ACT[name](el, e);
    });
  }

  /* ---------- gate / error / start ---------- */
  function gate(kind, msg) {
    var h = '<div class="gate"><div class="brand-row"><img src="icons/icon-192.png" alt=""><div><b>TTG Ops</b><small>Private</small></div></div>' + (msg ? warn(esc(msg)) : '');
    if (kind === 'key') h += '<p class="muted">Open TTG Ops with your personal admin link, or paste the key once below.</p><input id="gateKey" type="password" autocomplete="off" placeholder="Admin key" aria-label="Admin key"><button class="btn" id="gateSaveKey">Save key</button>';
    else h += '<p class="muted">API address missing. Paste the Apps Script web app /exec URL.</p><input id="gateApi" placeholder="https://script.google.com/macros/s/…/exec" aria-label="Apps Script web app address"><button class="btn" id="gateSaveApi">Save API address</button>';
    h += '<p class="muted" style="margin-top:16px"><a href="?fixtures=1">Open the fictional preview</a> (sample data only, no connection)</p></div>';
    view.innerHTML = h;
    var sk = $('#gateSaveKey'); if (sk) sk.onclick = function () { var k = ($('#gateKey').value || '').trim(); if (!/^[A-Za-z0-9_-]{20,128}$/.test(k)) return toast('Key looks invalid'); localStorage.setItem('ttgops.k', k); KEY = k; load(); };
    [['#gateKey', sk], ['#gateApi', null]].forEach(function (x) { var i = $(x[0]); if (i) i.onkeydown = function (e) { if (e.key === 'Enter') { var b = x[1] || $('#gateSaveApi'); if (b) b.onclick(); } }; });
    var sa = $('#gateSaveApi'); if (sa) sa.onclick = function () { var u = ($('#gateApi').value || '').trim(); if (!allowedApi(u)) return toast('Address looks invalid'); localStorage.setItem('ttgops.api', u); load(); };
  }
  function errorView(msg) {
    view.innerHTML = '<div class="gate"><div class="brand-row"><img src="icons/icon-192.png" alt=""><div><b>TTG Ops</b><small>Could not load</small></div></div>' +
      warn('<b>Live data could not be loaded.</b> ' + esc(msg) + '<br>No sample data is shown in its place.') +
      '<button class="btn" id="retryBtn">Try again</button><p class="muted" style="margin-top:16px"><a href="?fixtures=1">Open the fictional preview instead</a></p></div>';
    var rb = $('#retryBtn'); if (rb) rb.onclick = function () { load(); };
    // Try again by itself when the connection comes back.
    try { window.addEventListener('online', function once() { window.removeEventListener('online', once); if ($('#retryBtn')) load(); }); } catch (e) {}
  }
  function load() {
    if (S.mode === 'live') {
      if (!KEY) return gate('key');
      if (!allowedApi(apiUrl())) return gate('api');
    }
    view.innerHTML = '<div class="gate"><div class="brand-row"><img src="icons/icon-192.png" alt=""><div><b>TTG Ops</b><small>Loading your caseload…</small></div></div></div>';
    return api('bootstrap').then(function (d) {
      S.boot = d; S.P = M.normalizeBootstrap(d); S.clinical = null; S.billing = null; route();
    }).catch(function (e) {
      if (/unauthorized/.test(e.message)) return gate('key', KEY ? 'The saved key was not accepted.' : '');
      errorView(plainError(e));
    });
  }
  /* Fixture files are only fetched in fixture mode, so live mode never has sample records in memory. */
  function loadScripts(list) {
    return list.reduce(function (p, src) {
      return p.then(function () { return new Promise(function (res, rej) { var sc = document.createElement('script'); sc.src = src; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); }); });
    }, Promise.resolve());
  }
  function start() {
    if (started) return; started = true;
    KEY = S.mode === 'live' ? (localStorage.getItem('ttgops.k') || '') : '';
    window.addEventListener('hashchange', route);
    /* Registering the v9 worker replaces older workers and deletes their caches (see sw.js). */
    try { if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {}
    delegate('click', 'data-act'); delegate('change', 'data-change'); delegate('input', 'data-input'); delegate('submit', 'data-submit');
    if (S.mode === 'fixture' && !(window.TTG_V4_FIXTURES && window.TTG_FAKE_API)) return loadScripts(['fixtures/v4-sample.js', 'fixtures/fake-api.js']).then(load, function () { errorView('Fictional preview files could not be loaded.'); });
    return load();
  }
  if (window.__TTG_TEST__) window.__TTG_TEST__.app = { S: S, ACT: ACT, render: render, route: route, api: api, load: load, esc: esc, ROUTES: ROUTES };
  start();
})();
