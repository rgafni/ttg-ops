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
    q: '', stuQ: '', noteF: {}, rep: {}, reportDraft: null, busy: false };
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
    return fetch(u, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key: KEY, action: action, data: data || {} }),
      redirect: 'follow', referrerPolicy: 'no-referrer', cache: 'no-store', credentials: 'omit' })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j || j.ok !== true) throw new Error((j && j.error) || 'request failed'); return j; });
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
  function healthPills(h) {
    return ['relationship', 'service', 'clinical', 'billing'].map(function (k) { var c = h && h[k]; return c === 'red' ? pill(k, 'bad') : c === 'yellow' ? pill(k, 'warn') : ''; }).join(' ');
  }
  var STATE = { aligned: ['Aligned', ''], mismatch: ['Mismatch', 'bad'], no_note: ['No note', 'warn'], ambiguous: ['Ambiguous', 'warn'], duplicate: ['Duplicate', 'bad'], needs_review: ['Needs review', 'warn'] };

  /* ---------- lazy sources ---------- */
  function v4Missing() { return S.mode === 'live' && S.P && !S.P.v4; }
  function ensureClinical() {
    if (S.clinical || S.loading.clinical) return;
    if (v4Missing()) { S.clinical = M.normalizeClinical({ available: false, reason: 'The private API has not been updated with the clinical-notes source yet (v4 backend not deployed).' }); return; }
    S.loading.clinical = true;
    api('clinicalNotes', {}).then(function (r) { S.clinical = M.normalizeClinical(r.clinical, S.P); })
      .catch(function (e) { S.clinical = M.normalizeClinical({ available: false, reason: 'Could not load clinical notes: ' + e.message }); })
      .then(function () { S.loading.clinical = false; render(); });
  }
  function ensureBilling() {
    if (S.billing || S.loading.billing) return;
    if (v4Missing()) { S.billing = { available: false, reason: 'The private API has not been updated with billing review yet (v4 backend not deployed).', batches: [] }; return; }
    S.loading.billing = true;
    api('billingReview', {}).then(function (r) { S.billing = r.billing; })
      .catch(function (e) { S.billing = { available: false, reason: 'Could not load billing: ' + e.message, batches: [] }; })
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
    try { window.scrollTo && S._lastRoute !== location.hash && window.scrollTo(0, 0); } catch (e) {}
    S._lastRoute = location.hash;
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
    var n = M.reviewItems(S.P, S.billing).length;
    var tiles = [['students', 'Students\n& Cases', ICONS.person], ['notes', 'Clinical\nNotes', ICONS.note], ['providers', 'Providers\n& Schedules', ICONS.calendar],
      ['billing', 'Billing\nReview', ICONS.checklist], ['reports', 'Reports\n& Updates', ICONS.bars], ['email', 'Email &\nOpen Items', ICONS.envelope]];
    return '<div class="brand-row"><img src="icons/icon-192.png" alt=""><div><b>TTG Ops</b><small>Oversight workspace</small></div></div>' + banner() +
      '<form data-submit="home-search"><input class="search" id="homeQ" name="q" autocomplete="off" placeholder="Search students, providers, notes, items…" aria-label="Search"></form>' +
      '<a class="card review-link" href="#/review"><span>Needs your review</span><span class="badge">' + n + '</span></a>' +
      '<div class="tiles">' + tiles.map(function (t) { return '<a class="tile" href="#/' + t[0] + '"><span class="ico">' + t[2] + '</span><b>' + esc(t[1]) + '</b></a>'; }).join('') + '</div>' +
      '<p class="muted" style="margin-top:16px"><a href="#/settings">Settings &amp; data sources</a></p>';
  };
  ROUTES.review = function () {
    var items = M.reviewItems(S.P, S.billing), h = head('Needs your review');
    if (!S.billing) ensureBilling();
    if (!items.length) h += '<div class="list-empty">Nothing waiting for you.</div>';
    items.forEach(function (x) { h += '<a class="card row" href="' + esc(x.href) + '"><div class="grow"><b>' + esc(x.title) + '</b><small>' + esc(x.kind + (x.sub ? ' · ' + x.sub : '')) + '</small></div><span class="chev"></span></a>'; });
    return h;
  };
  ROUTES.search = function () {
    if (!S.clinical) ensureClinical();
    var hits = M.searchAll(S.q, S.P, S.clinical), h = head('Search');
    h += '<form data-submit="home-search"><input class="search" id="homeQ" value="' + esc(S.q) + '" autocomplete="off" aria-label="Search"></form>';
    if (!hits.length) h += '<div class="list-empty">No matches.</div>';
    hits.forEach(function (x) { h += '<a class="card row" href="' + esc(x.href) + '"><div class="grow"><b>' + esc(x.title) + '</b><small>' + esc(x.type + (x.sub ? ' · ' + x.sub : '')) + '</small></div><span class="chev"></span></a>'; });
    return h;
  };

  /* ---------- STUDENTS ---------- */
  ROUTES.students = function () {
    var q = S.stuQ.toLowerCase(), list = S.P.students.filter(function (s) { return !q || (s.name + ' ' + s.services.join(' ')).toLowerCase().indexOf(q) >= 0; });
    var h = head('Students & Cases');
    if (S.P.ambiguous.length) h += warn('<b>Possible duplicate records:</b> ' + S.P.ambiguous.map(function (s) { return esc(s.name) + ' (' + esc(s.id) + ')'; }).join(', ') + '. Shown separately, never merged.');
    if (S.P.sync && S.P.sync.stale) h += warn('Roster and Case Board are out of sync' + (S.P.sync.roster_ok ? '' : ' (roster unreadable)') + '. See Settings.');
    h += '<input class="search" data-change="stu-filter" value="' + esc(S.stuQ) + '" placeholder="Filter students" aria-label="Filter students" style="margin-bottom:12px">';
    if (!list.length) h += '<div class="list-empty">' + (S.P.students.length ? 'No students match.' : 'No students on file.') + '</div>';
    list.forEach(function (s) {
      var ini = s.name.split(/\s+/).map(function (p) { return p[0] || ''; }).join('').slice(0, 2).toUpperCase();
      h += '<a class="card row" href="#/student/' + encodeURIComponent(s.id) + '"><div class="avatar">' + esc(ini) + '</div><div class="grow"><b>' + esc(s.name) + '</b><small>' +
        esc(s.services.join(' · ') || s.setting || 'No services on file') + (s.openRoles.length ? ' · open: ' + esc(s.openRoles.join(', ')) : '') + '</small></div>' + healthPills(s.health) + '<span class="chev"></span></a>';
    });
    return h;
  };
  // Record pages show only sourced values, with one compact empty state per section.
  function presentKV(rows) {
    var kept = rows.map(function (r) { return [r[0], M.val(r[1])]; }).filter(function (r) { return r[1] !== ''; });
    return kept.length ? kv(kept) : '';
  }
  function recordSection(title, body, empty) {
    return '<section class="card record-section" data-section="' + esc(title) + '"><h2>' + esc(title) + '</h2>' +
      (body || '<p class="muted">' + esc(empty || 'Nothing connected yet.') + '</p>') + '</section>';
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
      rows.push(recordItem('<a href="#/billing/' + encodeURIComponent(b.id) + '">' + esc(b.id) + '</a> ' + pill(state[0], state[1]) +
        presentKV([['Date', l.date], ['Student', l.student], ['Provider', l.provider], ['Service', l.service], ['Duration', l.duration_min != null ? l.duration_min + ' min' : ''], ['Units', l.units], ['Review', b.audit.status]]) +
        (r.reasons && r.reasons.length ? '<p class="muted">' + r.reasons.map(esc).join(' · ') + '</p>' : '')));
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
    h += recordSection('Child info', child, 'No child details connected.');
    var cases = s.caseRecords.map(function (r) {
      return recordItem('<h3>' + esc(r.number ? 'Case # ' + r.number : 'Case record') + '</h3>' + presentKV([
        ['Record ID', r.recordId], ['Service / discipline', r.service], ['Status', r.status], ['Assigned provider', r.provider], ['Authorization starts', r.authStart], ['Authorization ends', r.authEnd],
        ['Authorized hours', r.hours], ['Authorized units', r.units], ['Frequency', r.frequency], ['Rate', r.rate], ['Funding source', r.funding]]) + (r.source ? '<p class="src">' + esc(r.source) + '</p>' : ''));
    }).join('');
    h += recordSection('Cases', cases + caseEditor(s), 'No case records connected.');
    var team = S.P.providers.filter(function (p) { return p.cases.some(function (x) { return x.case_id === s.id; }); }).map(function (p) {
      var roles = p.cases.filter(function (x) { return x.case_id === s.id; }).map(function (x) { return x.role; }).filter(Boolean);
      return recordItem('<a href="#/provider/' + esc(p.key) + '">' + esc(p.name) + '</a>' + presentKV([['Discipline', roles.join(' · ')], ['Phone', p.phone], ['Email', p.email]]));
    }).join('');
    if (s.related.length) team += '<p class="muted">Related services: ' + esc(s.related.join('; ')) + '</p>';
    if (s.openRoles.length) team += '<p>' + pill('Open: ' + s.openRoles.join(', '), 'warn') + '</p>';
    if (s.departed.length) team += '<p class="muted">Left the case: ' + esc(s.departed.join(', ')) + '</p>';
    h += recordSection('Providers', team, 'No providers connected.');
    var schedule = s.assignments.map(function (a) {
      return recordItem('<b>' + esc(a.role || 'Service') + '</b>' + presentKV([['Provider', a.open ? 'Unstaffed' : a.provider], ['Schedule', a.schedule], ['Mandate (h/week)', a.mandate], ['Setting', a.setting], ['Status', a.status]]));
    }).join('');
    // Chart schedule has its own provenance; it is not evidence of delivered sessions.
    schedule += presentKV([['Chart schedule', c.schedule], ['Chart hours / week', c.hours]]);
    h += recordSection('Schedule', schedule, 'No schedule connected.');
    h += recordSection('Billing', recordBilling(function (l) { return l.case_id === s.id && l.case_status === 'matched'; }), 'No billing lines for this child.');
    var it = s.intake, en = s.ensora, docs = docLinks(s.documents);
    if (it) docs += presentKV([['Intake status', it.status], ['Received', it.received], ['Missing documents', it.missing]]) + it.links.map(function (u, i) { return '<p>' + ext(u, 'Document folder ' + (i + 1)) + '</p>'; }).join('');
    if (en) docs += presentKV([['Ensora records', en.data], ['Last capture', en.last], ['Missing records', en.missing]]) + (en.sourceUrl ? '<p>' + ext(en.sourceUrl, 'Ensora source') + '</p>' : '');
    S.P.reports.filter(function (r) { return r.scope === s.name; }).forEach(function (r) { docs += recordItem('<a href="#/report/' + encodeURIComponent(r.id) + '">' + esc(r.title) + '</a> ' + pill(r.status, r.status === 'draft' ? 'warn' : '')); });
    h += recordSection('Documents', docs, 'No documents connected.');
    var notes = S.clinical && S.clinical.available ? M.filterNotes(S.clinical.notes, { caseId: s.id }) : [];
    var clinical = presentKV([['Goals', s.goals]]) + clinicalSummary(notes, '#/notes/' + encodeURIComponent(s.id));
    clinical += '<details class="record-item"><summary>Case history & notes</summary><p class="muted">Case notes and edits, separate from clinical notes.</p>' +
      s.caseLog.slice(0, 8).map(function (n) { return '<div style="margin-top:8px"><span class="src">' + esc(n.ts.slice(0, 10)) + ' · ' + esc(n.type) + '</span><div class="note-body">' + esc(n.text) + '</div></div>'; }).join('') +
      '<textarea id="caseNote" class="field" rows="2" placeholder="Add a case note"></textarea><button class="btn secondary" type="button" data-act="case-note" data-id="' + esc(s.id) + '">Save note</button></details>';
    h += recordSection('Clinical Data', clinical, 'No clinical data connected.');
    return h;
  };

  /* ---------- CLINICAL NOTES ---------- */
  ROUTES.notes = function () {
    if (S.params[0] !== undefined && S.noteF._route !== S.params[0]) { S.noteF = { caseId: S.params[0], _route: S.params[0] }; }
    ensureClinical();
    var h = head('Clinical Notes'), C = S.clinical, f = S.noteF;
    if (S.loading.clinical || !C) return h + loadingCard('clinical notes');
    if (!C.available) return h + warn('<b>Clinical notes are not connected.</b> ' + esc(C.reason) + '<br>Nothing is shown rather than guessed. A missing note is never treated as a missed session.');
    var provs = M.noteProviders(C.notes);
    h += '<div class="selects filters"><label for="nfStudent">Student</label><select id="nfStudent" data-change="note-filter" data-k="caseId">' + opt('', 'All students', !f.caseId) +
      S.P.students.map(function (s) { return opt(s.id, s.name, f.caseId === s.id); }).join('') + '</select>' +
      '<label for="nfProv">Provider</label><select id="nfProv" data-change="note-filter" data-k="providerKey">' + opt('', 'All providers', !f.providerKey) + provs.map(function (p) { return opt(p.key, p.name, f.providerKey === p.key); }).join('') + '</select>' +
      '<div class="two"><div><label for="nfFrom">From</label><input type="date" id="nfFrom" data-change="note-filter" data-k="from" value="' + esc(f.from || '') + '"></div>' +
      '<div><label for="nfTo">To</label><input type="date" id="nfTo" data-change="note-filter" data-k="to" value="' + esc(f.to || '') + '"></div></div>' +
      '<label for="nfQ">Words in note</label><input id="nfQ" class="field" data-change="note-filter" data-k="q" value="' + esc(f.q || '') + '" autocomplete="off"></div>';
    var list = M.filterNotes(C.notes, f);
    var stu = f.caseId ? M.student(S.P, f.caseId) : null;
    if (stu) h += card('<div class="muted">Context</div><b>' + esc(stu.name) + '</b><div class="muted">' + esc(stu.services.join(' · ') || 'No services on file') + '</div><div class="muted">Treatment goals are not in the connected sources yet.</div><a href="#/student/' + encodeURIComponent(stu.id) + '">Open case</a>');
    h += '<p class="muted">' + list.length + ' of ' + C.notes.length + ' notes' + (C.unmatched ? ' · ' + C.unmatched + ' source row(s) not linked to a student (not shown)' : '') + '</p>';
    if (!list.length) h += '<div class="list-empty">No notes for this filter. That does not mean sessions were missed.</div>';
    list.slice(0, 200).forEach(function (n) {
      h += '<a class="card" href="#/note/' + encodeURIComponent(n.id) + '"><div class="row"><b>' + esc(n.date) + '</b>' + (f.caseId ? '' : '<span class="muted">' + esc(n.student) + '</span>') +
        (n.signed ? '' : pill('Unsigned', 'warn')) + '</div><div class="muted">' + esc((n.service || 'Service not recorded') + ' · ' + (n.provider || 'Provider not recorded') + (n.duration_min ? ' · ' + n.duration_min + ' min' : '')) + '</div>' +
        '<div class="note-body clamp">' + esc(n.text) + '</div><div class="src">Source: ' + esc(n.source) + '</div></a>';
    });
    var ses = M.filterNotes(C.sessions, { caseId: f.caseId, from: f.from, to: f.to }).filter(function (s) { return !f.providerKey || M.findProvider(S.P.providers, s.provider) && M.findProvider(S.P.providers, s.provider).key === f.providerKey; });
    if (ses.length) h += warn('<b>Sessions without a note:</b> ' + ses.map(function (s) { return esc(s.date + ' · ' + s.student + ' · ' + (s.service || '') + ' ' + s.provider); }).join('; ') + '. A missing note does not mean a missed session.');
    return h;
  };
  ROUTES.note = function () {
    ensureClinical();
    if (!S.clinical) return head('Note', '#/notes', 'Notes') + loadingCard('note');
    var n = (S.clinical.notes || []).filter(function (x) { return x.id === S.params[0]; })[0];
    if (!n) return head('Note', '#/notes', 'Notes') + '<div class="list-empty">Note not found.</div>';
    return head(n.date + ' · ' + (n.service || 'Note'), '#/notes', 'Notes') + card('<b><a href="#/student/' + encodeURIComponent(n.case_id) + '">' + esc(n.student) + '</a></b>' +
      kv([['Provider', n.provider], ['Service', n.service], ['Time', n.time], ['Duration', n.duration_min ? n.duration_min + ' min' : ''], ['Location', n.location], ['Signature', n.signed || 'Not signed'], ['Created', n.created]]) +
      '<div class="note-body">' + esc(n.text) + '</div><div class="src">Source: ' + esc(n.source) + ' · ' + esc(n.id) + '</div>');
  };

  /* ---------- PROVIDERS & SCHEDULES ---------- */
  ROUTES.providers = function () {
    var tab = S.params[0] === 'schedules' ? 'schedules' : 'providers', h = head('Providers & Schedules');
    if (S.P.gaps.length) h += card(pill(S.P.gaps.length + ' coverage gap' + (S.P.gaps.length === 1 ? '' : 's'), 'warn') + '<div style="margin-top:8px">' + S.P.gaps.map(function (g) {
      return '<a href="#/student/' + encodeURIComponent(g.case_id) + '">' + esc(g.student) + '</a> · ' + esc(g.role) + (g.days != null ? ' · unstaffed ' + esc(g.days) + ' day' + (g.days === 1 ? '' : 's') : '') + (g.departed ? ' <span class="muted">(left: ' + esc(g.departed) + ')</span>' : '');
    }).join('<br>') + '</div>');
    h += '<div class="chip-row"><a class="chip' + (tab === 'providers' ? ' on' : '') + '" href="#/providers">Providers</a><a class="chip' + (tab === 'schedules' ? ' on' : '') + '" href="#/providers/schedules">Schedules by student</a></div>';
    if (tab === 'providers') {
      if (!S.P.providers.length) h += warn('No providers in the connected sources.');
      S.P.providers.forEach(function (p) {
        h += '<a class="card row" href="#/provider/' + esc(p.key) + '"><div class="grow"><b>' + esc(p.name) + '</b><small>' + esc(p.roles.join(' · ') || 'Role not on file') + ' · ' + p.cases.length + ' case' + (p.cases.length === 1 ? '' : 's') + '</small></div><span class="chev"></span></a>';
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
  ROUTES.provider = function () {
    var p = S.P.providers.filter(function (x) { return x.key === S.params[0]; })[0];
    if (!p) return head('Provider', '#/providers', 'Providers') + '<div class="list-empty">Provider not found.</div>';
    ensureClinical(); ensureBilling();
    var h = head(p.name, '#/providers', 'Providers');
    h += recordSection('Provider info', presentKV([['Name', p.name], ['Discipline', p.roles.join(', ')], ['Phone', p.phone], ['Email', p.email], ['Provider ID', p.provider_id],
      ['Credentials', p.credentials], ['Rate', p.rate], ['Hours', p.hours], ['SSN (last 4 only)', p.ssn]]));
    var roster = p.cases.map(function (c) { return recordItem('<b><a href="#/student/' + encodeURIComponent(c.case_id) + '">' + esc(c.student) + '</a></b>' +
      presentKV([['Discipline', c.role], ['Schedule', c.schedule], ['Mandate (h/week)', c.mandate], ['Status', c.status], ['Setting', c.setting]])); }).join('');
    h += recordSection('Case roster & schedule', roster, 'No case roster or schedule connected.');
    h += recordSection('Billing sheets', recordBilling(function (l) {
      // Prefer IDs; a name-only match must resolve uniquely to avoid mixing providers.
      return l.provider_id && p.provider_id ? l.provider_id === p.provider_id : (M.findProvider(S.P.providers, l.provider) || {}).key === p.key;
    }), 'No billing lines for this provider.');
    var docs = docLinks(p.documents);
    S.P.reports.filter(function (r) { return r.kind === 'provider' && r.scope === p.name; }).forEach(function (r) { docs += recordItem('<a href="#/report/' + encodeURIComponent(r.id) + '">' + esc(r.title) + '</a>'); });
    h += recordSection('Documents', docs, 'No provider documents connected.');
    var notes = S.clinical && S.clinical.available ? S.clinical.notes.filter(function (x) { return x.providerKey === p.key; }) : [];
    h += recordSection('Clinical data', clinicalSummary(notes, '#/notes', ' data-act="notes-by-provider" data-key="' + esc(p.key) + '"'), 'No clinical notes for this provider.');
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
    h += '<div class="bill-lines">';
    b.lines.forEach(function (l, i) {
      var r = b.review[i] || { state: 'needs_review', reasons: [] }, st = STATE[r.state] || STATE.needs_review, checked = !!b.audit.checks[l.id];
      h += card('<div class="row"><div class="grow"><b>' + esc(l.date || 'No date') + ' · ' + esc(l.student) + '</b><small>' + esc((l.service || 'No service') + ' · ' + (l.provider || 'No provider') + ' · ' +
        (l.duration_min != null ? l.duration_min + ' min' : 'no duration') + (l.units != null ? ' · ' + l.units + ' units' : '')) + '</small></div>' + pill(st[0], st[1]) + '</div>' +
        '<div class="muted">' + r.reasons.map(esc).join('<br>') + '</div>' +
        (r.note ? '<div class="src">Note: <a href="#/note/' + encodeURIComponent(r.note.id) + '">' + esc(r.note.date + ' · ' + (r.note.service || '') + ' · ' + r.note.provider + (r.note.duration_min ? ' · ' + r.note.duration_min + ' min' : '')) + '</a></div>' : '') +
        (r.state === 'aligned' ? '<label class="check-row" style="margin-top:8px"><input type="checkbox" data-change="bill-check" data-batch="' + esc(b.id) + '" data-line="' + esc(l.id) + '"' + (checked ? ' checked' : '') + (signed ? ' disabled' : '') + '> <span>I checked this line against the note</span></label>' : ''));
    });
    h += '</div>';
    if (b.audit.flags.length) h += warn('<b>Flagged for correction:</b><br>' + b.audit.flags.map(function (f) { return esc(f.ts.slice(0, 10) + (f.line_id ? ' · line ' + f.line_id : '') + ': ' + f.reason); }).join('<br>'));
    if (signed) h += info('<b>Signed off</b> ' + esc(b.audit.signoff.ts) + (persisted ? ' · saved in the Billing Audit log.' : ' · preview only, not saved.'));
    else {
      h += card('<b>Sign off</b><p class="muted">' + (b.blocker ? 'Not yet: ' + esc(b.blocker) + '.' : 'All lines align with notes and you checked each one.') + '</p>' +
        '<button type="button" class="btn" data-act="bill-sign" data-batch="' + esc(b.id) + '"' + (b.blocker ? ' disabled' : '') + '>Sign off this batch</button>');
      h += '<details class="card"><summary><b>Flag for correction</b></summary><div class="selects"><label for="flagLine">Line (optional)</label><select id="flagLine">' + opt('', 'Whole batch', true) +
        b.lines.map(function (l) { return opt(l.id, l.date + ' · ' + l.provider, false); }).join('') + '</select><label for="flagReason">What needs correcting (required)</label><textarea id="flagReason" class="field" rows="2"></textarea></div>' +
        '<button type="button" class="btn warn" data-act="bill-flag" data-batch="' + esc(b.id) + '" style="margin-top:8px">Flag for correction</button>' +
        (b.audit.flags.length ? '<label for="clearReason" class="muted" style="display:block;margin-top:12px">Resolved? Say how (required)</label><textarea id="clearReason" class="field" rows="2"></textarea><button type="button" class="btn secondary" data-act="bill-clear" data-batch="' + esc(b.id) + '">Clear flag</button>' : '') + '</details>';
    }
    if (b.audit.history && b.audit.history.length) h += '<details class="card"><summary><b>Audit history</b></summary>' + b.audit.history.map(function (x) { return '<div class="muted">' + esc(x.ts + ' · ' + x.op + (x.line_id ? ' · ' + x.line_id : '') + (x.reason ? ' · ' + x.reason : '')) + '</div>'; }).join('') + '</details>';
    return h;
  };
  function uniqList(a, k) { return a.map(function (x) { return x[k]; }).filter(function (x, i, arr) { return x && arr.indexOf(x) === i; }).join(', '); }

  /* ---------- REPORTS ---------- */
  ROUTES.reports = function () {
    ensureClinical();
    var r = S.rep, h = head('Reports & Updates');
    if (!r.caseId && S.P.students[0]) r.caseId = S.P.students[0].id;
    if (!r.from) r.from = daysAgo(60); if (!r.to) r.to = today(); if (!r.audience) r.audience = 'Parent';
    h += '<div class="selects"><label for="repStudent">Student</label><select id="repStudent" data-change="rep-opt" data-k="caseId">' + S.P.students.map(function (s) { return opt(s.id, s.name, s.id === r.caseId); }).join('') + '</select>' +
      '<div class="two"><div><label for="repFrom">From</label><input type="date" id="repFrom" data-change="rep-opt" data-k="from" value="' + esc(r.from) + '"></div><div><label for="repTo">To</label><input type="date" id="repTo" data-change="rep-opt" data-k="to" value="' + esc(r.to) + '"></div></div>' +
      '<label for="repAudience">Audience</label><select id="repAudience" data-change="rep-opt" data-k="audience">' + ['Parent', 'School', 'Internal'].map(function (a) { return opt(a, a, a === r.audience); }).join('') + '</select></div>';
    if (S.clinical && !S.clinical.available) h += warn('Clinical notes are not connected (' + esc(S.clinical.reason) + '). Drafts need notes to say anything.');
    h += '<p style="margin:14px 0"><button type="button" class="btn" data-act="rep-create"' + (!S.clinical || S.loading.clinical ? ' disabled' : '') + '>Create draft from notes</button></p>';
    var d = S.reportDraft;
    if (d) {
      h += '<div class="print-area"><div class="sec">Draft · awaiting your review</div>' + d.warnings.map(function (w) { return warn(esc(w)); }).join('') +
        '<textarea id="repBody" class="field draft" data-input="rep-body" rows="16" aria-label="Draft text">' + esc(d.body) + '</textarea>' +
        '<pre class="print-copy"></pre><div class="src">Sources: ' + (d.sources.length ? d.sources.map(function (s) { return '<a href="#/note/' + encodeURIComponent(s.id) + '">' + esc(s.label) + '</a>'; }).join(' · ') : 'none') + '</div>' +
        '<p class="muted">' + esc(d.limits) + '</p></div>' +
        '<div class="btns"><button type="button" class="btn secondary" data-act="rep-print">Print / PDF</button><button type="button" class="btn secondary" data-act="rep-download">Download text</button></div>' +
        '<p><button type="button" class="btn" data-act="rep-save"' + (v4Missing() ? ' disabled' : '') + '>Save draft to Reports</button></p>' +
        (v4Missing() ? '<p class="muted">Saving needs the v4 API update; print or download works now.</p>' : S.mode === 'fixture' ? '<p class="muted">Preview: saved drafts stay in this tab only.</p>' : '');
    }
    h += '<div class="sec">Saved reports</div>';
    if (!S.P.reports.length) h += '<div class="list-empty">No saved reports.</div>';
    S.P.reports.slice(0, 30).forEach(function (x) { h += '<a class="card row" href="#/report/' + encodeURIComponent(x.id) + '"><div class="grow"><b>' + esc(x.title) + '</b><small>' + esc(x.created.slice(0, 10) + ' · ' + x.kind) + '</small></div>' + pill(x.status, x.status === 'draft' ? 'warn' : '') + '<span class="chev"></span></a>'; });
    h += '<details class="card"><summary><b>Other report types</b></summary><div class="selects"><label for="mrStudent">Student status report</label><select id="mrStudent">' + S.P.students.map(function (s) { return opt(s.id, s.name, false); }).join('') + '</select>' +
      '<button type="button" class="btn secondary" data-act="mr-create" data-kind="student" style="margin-top:8px">Create student status</button>' +
      '<label for="mrProvider">Provider hours & billing</label><select id="mrProvider">' + S.P.providers.map(function (p) { return opt(p.name, p.name, false); }).join('') + '</select>' +
      '<label for="mrMonth">Month</label><input type="month" id="mrMonth" value="' + esc(today().slice(0, 7)) + '">' +
      '<button type="button" class="btn secondary" data-act="mr-create" data-kind="provider" style="margin-top:8px">Create provider report</button>' +
      '<div class="btns" style="margin-top:8px"><button type="button" class="btn secondary" data-act="mr-create" data-kind="intake">Intake status</button><button type="button" class="btn secondary" data-act="mr-create" data-kind="month">Monthly report</button></div></div></details>';
    return h;
  };
  ROUTES.report = function () {
    var r = S.P.reports.filter(function (x) { return x.id === S.params[0]; })[0];
    if (!r) return head('Report', '#/reports', 'Reports') + '<div class="list-empty">Report not found.</div>';
    return head(r.title, '#/reports', 'Reports') + '<div class="print-area">' + card(pill(r.status, r.status === 'draft' ? 'warn' : '') + ' <span class="muted">' + esc(r.kind + ' · created ' + r.created + (r.updated ? ' · updated ' + r.updated : '')) + '</span>' +
      '<textarea id="srBody" class="field draft" rows="16" aria-label="Report text">' + esc(r.body) + '</textarea><pre class="print-copy"></pre>') + '</div>' +
      '<div class="btns"><button type="button" class="btn secondary" data-act="sr" data-op="edit" data-id="' + esc(r.id) + '">Save edits</button>' +
      (r.status === 'draft' ? '<button type="button" class="btn" data-act="sr" data-op="done" data-id="' + esc(r.id) + '">Mark reviewed</button>' : '<button type="button" class="btn secondary" data-act="sr" data-op="reopen" data-id="' + esc(r.id) + '">Reopen</button>') + '</div>' +
      '<div class="btns" style="margin-top:10px"><button type="button" class="btn secondary" data-act="rep-print">Print / PDF</button><button type="button" class="btn ghost" data-act="sr" data-op="remove" data-id="' + esc(r.id) + '">Remove</button></div>' +
      '<p class="muted">Reports are drafts for you; nothing is sent.</p>';
  };

  /* ---------- EMAIL & OPEN ITEMS ---------- */
  function itemRow(x) {
    return '<a class="card row" href="#/item/' + encodeURIComponent(x.id) + '"><div class="grow"><b>' + esc(x.subject || x.triggerName) + '</b><small>' + esc((x.recipient || 'No recipient') + (x.student ? ' · ' + x.student : '') + (x.created ? ' · ' + x.created.slice(0, 10) : '')) + '</small></div><span class="chev"></span></a>';
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
    var h = head(x.subject || x.triggerName, '#/email', 'Open items');
    h += card(kv([['Status', esc(x.status), true], ['To', x.recipient], ['Contact', x.contact], ['Channel', x.channel], ['Student', x.case_id ? '<a href="#/student/' + encodeURIComponent(x.case_id) + '">' + esc(x.student) + '</a>' : '', !!x.case_id],
      ['Provider', x.providerKey ? '<a href="#/provider/' + esc(x.providerKey) + '">' + esc(x.recipient) + '</a>' : '', !!x.providerKey], ['Why', x.triggerName], ['Owner', x.owner]]));
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
      src('Clinical notes', v && v.clinical.present, v ? v.clinical.rows + ' rows' : 'API update needed') +
      src('Sessions without notes', v && v.noNote.present, v ? v.noNote.rows + ' rows' : 'API update needed') +
      src('Incoming billing', v && v.billing.present, v ? v.billing.rows + ' lines' : 'API update needed') +
      src('Billing audit log', v && v.audit.present, v ? (v.audit.present ? v.audit.rows + ' entries' : 'created on your first billing decision') : 'API update needed') +
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
      .catch(function (e) { toast(e.message === 'unauthorized' ? 'Key rejected' : 'Not saved: ' + e.message); return null; })
      .then(function (r) { S.busy = false; render(); return r; });
  }
  function v(id) { var el = $('#' + id); return el ? String(el.value || '') : ''; }
  var saved = function () { return S.mode === 'fixture' ? ' (preview only)' : ''; };
  var ACT = {
    'home-search': function () { S.q = v('homeQ').trim(); if (location.hash === '#/search') render(); else location.hash = '#/search'; },
    'stu-filter': function (el) { S.stuQ = String(el.value || ''); render(); },
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
      var b = batch(el.getAttribute('data-batch')); if (!b || b.blocker) return toast(b ? b.blocker : 'Batch not found');
      if (!confirm('Sign off ' + b.id + '? ' + b.lines.length + ' line(s) match their notes and you checked each one.' + (S.mode === 'fixture' ? ' (Preview: not saved.)' : ' This is recorded in the Billing Audit log.') + ' It does not pay or send anything.')) return;
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
    if (kind === 'key') h += '<p class="muted">Open TTG Ops with your personal admin link, or paste the key once below.</p><input id="gateKey" type="password" autocomplete="off" placeholder="Admin key"><button class="btn" id="gateSaveKey">Save key</button>';
    else h += '<p class="muted">API address missing. Paste the Apps Script web app /exec URL.</p><input id="gateApi" placeholder="https://script.google.com/macros/s/…/exec"><button class="btn" id="gateSaveApi">Save API address</button>';
    h += '<p class="muted" style="margin-top:16px"><a href="?fixtures=1">Open the fictional preview</a> (sample data only, no connection)</p></div>';
    view.innerHTML = h;
    var sk = $('#gateSaveKey'); if (sk) sk.onclick = function () { var k = ($('#gateKey').value || '').trim(); if (!/^[A-Za-z0-9_-]{20,128}$/.test(k)) return toast('Key looks invalid'); localStorage.setItem('ttgops.k', k); KEY = k; load(); };
    var sa = $('#gateSaveApi'); if (sa) sa.onclick = function () { var u = ($('#gateApi').value || '').trim(); if (!allowedApi(u)) return toast('Address looks invalid'); localStorage.setItem('ttgops.api', u); load(); };
  }
  function errorView(msg) {
    view.innerHTML = '<div class="gate"><div class="brand-row"><img src="icons/icon-192.png" alt=""><div><b>TTG Ops</b><small>Could not load</small></div></div>' +
      warn('<b>Live data could not be loaded.</b> ' + esc(msg) + '<br>No sample data is shown in its place.') +
      '<button class="btn" id="retryBtn">Try again</button><p class="muted" style="margin-top:16px"><a href="?fixtures=1">Open the fictional preview instead</a></p></div>';
    var rb = $('#retryBtn'); if (rb) rb.onclick = function () { load(); };
  }
  function load() {
    if (S.mode === 'live') {
      if (!KEY) return gate('key');
      if (!allowedApi(apiUrl())) return gate('api');
    }
    view.innerHTML = '<div class="gate"><p class="muted">Loading…</p></div>';
    return api('bootstrap').then(function (d) {
      S.boot = d; S.P = M.normalizeBootstrap(d); S.clinical = null; S.billing = null; route();
    }).catch(function (e) {
      if (/unauthorized/.test(e.message)) return gate('key', KEY ? 'The saved key was not accepted.' : '');
      errorView(e.message);
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
