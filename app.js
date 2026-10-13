/* TTG Ops front-end. All data comes from the authenticated Apps Script API; nothing is stored in the repo,
   and case data is kept in memory only (not written to localStorage or the service-worker cache). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var S = { data: null, route: 'home', caseId: null, filt: { q: '', side: 'any', color: 'any', bcba: '', prov: '' }, qtab: 'draft', busy: false };
  var SIDES = ['relationship', 'service', 'clinical', 'billing'];
  var KEY = localStorage.getItem('ttgops.k') || '';
  function apiUrl() { return (window.TTG_CONFIG && TTG_CONFIG.API_URL) || localStorage.getItem('ttgops.api') || ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(t) { var e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(e._t); e._t = setTimeout(function () { e.hidden = true; }, 2600); }
  function api(action, data) {
    return fetch(apiUrl(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key: KEY, action: action, data: data || {} }), redirect: 'follow', referrerPolicy: 'no-referrer' })
      .then(function (r) { return r.json(); }).then(function (j) { if (!j.ok) throw new Error(j.error || 'error'); return j; });
  }
  function load(quiet) {
    if (!quiet) $('#view').innerHTML = '<div class="empty">Loading cases…</div>';
    return api('bootstrap').then(function (d) { S.data = d; render(); }).catch(function (e) {
      if (/unauthorized/.test(e.message)) return gate('key');
      $('#view').innerHTML = '<div class="card empty">Could not reach the TTG Ops service.<br><span class="small">' + esc(e.message) + '</span><div class="btns" style="justify-content:center"><button class="btn" onclick="location.reload()">Try again</button></div></div>';
    });
  }
  function gate(kind) {
    var h = '<div class="gate"><img src="icons/icon-192.png" alt=""><h1>TTG Ops</h1>';
    if (kind === 'key') h += '<p class="sub">This app is private. Open it with your personal admin link.</p>';
    else h += '<p class="sub">One-time step: paste the Apps Script web app URL (ends in <b>/exec</b>).</p><input id="apiIn" type="text" placeholder="https://script.google.com/macros/s/…/exec"><div class="btns" style="justify-content:center"><button class="btn" id="apiSave">Connect</button></div>';
    $('#view').innerHTML = h + '</div>'; $('#katyaFab').hidden = true;
    var b = $('#apiSave'); if (b) b.onclick = function () {
      var v = $('#apiIn').value.trim();
      if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(v)) return toast('That doesn\u2019t look like a web app /exec URL');
      localStorage.setItem('ttgops.api', v); $('#katyaFab').hidden = false; load();
    };
  }
  /* ---------- helpers ---------- */
  function caseBy(id) { return (S.data.cases || []).filter(function (c) { return c.id === id; })[0]; }
  function dots(h) { return '<span class="hdots">' + SIDES.map(function (s) { return '<span class="dot ' + h[s] + '" title="' + s + ': ' + h[s] + '"></span>'; }).join('') + '</span>'; }
  function pill(c, t) { return '<span class="pill p-' + c + '">' + esc(t || c) + '</span>'; }
  function val(v) { return v && !/^\[(no source|blank|none listed)\]$/i.test(v) && !/^from schedule:/i.test('x') ? esc(v) : '<span class="miss">no data yet</span>'; }
  function ini(n) { return esc(String(n).split(/\s+/).map(function (x) { return x[0]; }).join('').slice(0, 2).toUpperCase()); }
  function fmtTs(t) { if (!t) return ''; var d = new Date(t.length <= 10 ? t + 'T12:00' : t); if (isNaN(d)) return esc(t); return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: t.length > 10 ? 'numeric' : undefined, minute: t.length > 10 ? '2-digit' : undefined }) + (t.length > 10 ? ' ET' : ''); }
  function drafts() { return (S.data.queue || []).filter(function (q) { return q.status === 'draft' && ownerOf(q) !== 'Nina'; }); }
  /* ---------- router ---------- */
  function route() {
    var h = location.hash.replace(/^#\/?/, '').split('/');
    S.route = h[0] || 'home'; S.caseId = S.route === 'case' ? h[1] : null;
    document.querySelectorAll('.tabs a').forEach(function (a) { a.classList.toggle('on', a.dataset.r === (S.route === 'case' ? 'cases' : S.route)); });
    if (S.data) render(); window.scrollTo(0, 0);
  }
  function render() {
    var n = drafts().length, b = $('#qBadge'); b.hidden = !n; b.textContent = n;
    var v = { home: home, cases: cases, case: caseView, queue: queue, triggers: triggers, settings: settings }[S.route] || home;
    $('#view').innerHTML = v();
    bind();
  }
  /* ---------- Dashboard ---------- */
  function home() {
    var D = S.data, sm = D.summary, n = D.cases.length;
    var h = '<h1>Good ' + (new Date().getHours() < 12 ? 'morning' : 'afternoon') + ', Roni</h1><p class="sub">' + n + ' cases · ' + drafts().length + ' drafts waiting for you · ' + esc(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })) + '</p>';
    h += '<div class="grid4">' + SIDES.map(function (s) {
      var c = sm.health[s], t = n || 1;
      return '<a class="card side" href="#/cases" data-side="' + s + '" style="text-decoration:none;color:inherit"><h3>' + s + '</h3><div class="bar">' + ['red', 'yellow', 'green', 'unknown'].map(function (k) { return '<span class="' + k + '" style="width:' + (100 * c[k] / t) + '%"></span>'; }).join('') + '</div><div class="cnts"><span><i class="dot red"></i>' + c.red + '</span><span><i class="dot yellow"></i>' + c.yellow + '</span><span><i class="dot green"></i>' + c.green + '</span><span><i class="dot unknown"></i>' + c.unknown + ' ?</span></div></a>';
    }).join('') + '</div>';
    h += '<div class="twocol"><div><h2>Needs you</h2><div class="card">' + (sm.needs.length ? sm.needs.map(function (x, i) {
      return '<a class="row" href="#/case/' + x.id + '"><span class="rank">' + (i + 1) + '</span><div class="grow"><b>' + esc(x.student) + '</b><small>' + esc(x.why || 'Open drafts') + '</small></div>' + dots(x.health) + '</a>';
    }).join('') : '<div class="empty">Nothing urgent.</div>') + '</div></div>';
    var ti = D.today_items || [];
    h += '<div><h2>Today\u2019s triggers</h2><div class="card">' + (ti.length ? ti.slice(0, 12).map(function (t) {
      var tr = (D.triggers || []).filter(function (x) { return x.id === t.trigger; })[0] || {};
      return '<a class="row" href="' + (t.case_id ? '#/case/' + t.case_id : '#/queue') + '"><span class="rank">' + esc(t.trigger) + '</span><div class="grow"><b>' + esc(tr.name || t.trigger) + '</b><small>' + esc((t.student ? t.student + ' · ' : '') + '→ ' + t.recipient + (t.note ? ' · ' + t.note : '')) + '</small></div></a>';
    }).join('') + (ti.length > 12 ? '<div class="small" style="padding-top:8px">+' + (ti.length - 12) + ' more</div>' : '') : '<div class="empty">No triggers firing today.</div>') +
      '<div class="btns"><button class="btn" data-act="run">Create drafts in Approval Queue</button></div></div></div></div>';
    return h;
  }
  /* ---------- Case board ---------- */
  function names(key) { var m = {}; S.data.cases.forEach(function (c) { c.team.forEach(function (t) { if (key === 'bcba' ? t.role === 'BCBA' : (t.role !== 'BCBA' && t.role !== 'Parent')) m[t.name] = 1; }); }); return Object.keys(m).sort(); }
  function cases() {
    var F = S.filt, list = S.data.cases.filter(function (c) {
      if (F.q && (c.student + ' ' + c.bcba + ' ' + c.providers + ' ' + c.setting + ' ' + c.why).toLowerCase().indexOf(F.q.toLowerCase()) < 0) return false;
      if (F.color !== 'any') { var sides = F.side === 'any' ? SIDES : [F.side]; if (!sides.some(function (s) { return c.health[s] === F.color; })) return false; }
      if (F.bcba && !c.team.some(function (t) { return t.role === 'BCBA' && t.name === F.bcba; })) return false;
      if (F.prov && !c.team.some(function (t) { return t.name === F.prov; })) return false;
      return true;
    });
    var opt = function (arr, cur, lab) { return '<option value="">' + lab + '</option>' + arr.map(function (x) { return '<option' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join(''); };
    var h = '<h1>Case board</h1><p class="sub">' + list.length + ' of ' + S.data.cases.length + ' cases</p><input type="search" id="q" placeholder="Search student, BCBA, provider…" value="' + esc(F.q) + '">';
    h += '<div class="chips" style="margin-top:10px">' + ['any', 'red', 'yellow', 'green', 'unknown'].map(function (c) { return '<button class="chip' + (F.color === c ? ' on' : '') + '" data-color="' + c + '">' + (c === 'any' ? 'All colors' : '<i class="dot ' + c + '"></i>' + (c === 'unknown' ? 'No data' : c[0].toUpperCase() + c.slice(1))) + '</button>'; }).join('') + '</div>';
    h += '<div class="chips">' + ['any'].concat(SIDES).map(function (s) { return '<button class="chip' + (F.side === s ? ' on' : '') + '" data-side2="' + s + '">' + (s === 'any' ? 'Any side' : s[0].toUpperCase() + s.slice(1)) + '</button>'; }).join('') + '</div>';
    h += '<div class="filters"><select id="fb">' + opt(names('bcba'), F.bcba, 'All BCBAs') + '</select><select id="fp">' + opt(names('prov'), F.prov, 'All providers') + '</select></div>';
    h += '<div class="card">' + (list.length ? list.map(function (c) {
      return '<a class="row" href="#/case/' + c.id + '"><div class="grow"><b>' + esc(c.student) + '</b><small>' + esc([c.setting, c.bcba ? 'BCBA ' + c.bcba : 'No BCBA', c.providers].filter(Boolean).join(' · ')) + '</small>' + (c.why ? '<small style="color:var(--ink)">' + esc(c.why) + '</small>' : '') + '</div>' + dots(c.health) + '</a>';
    }).join('') : '<div class="empty">No cases match.</div>') + '</div>';
    return h;
  }
  /* ---------- Case detail ---------- */
  function ef(c, k, label) { var v = c.fields[k]; return '<dt>' + esc(label || k) + '</dt><dd><span class="edit" data-edit="' + esc(k) + '">' + val(v) + '</span></dd>'; }
  function caseView() {
    var c = caseBy(S.caseId); if (!c) return '<div class="empty">Case not found. <a href="#/cases">Back to board</a></div>';
    var f = c.fields, pct = c.bank.pct;
    var h = '<a href="#/cases" class="small" style="color:var(--brand);text-decoration:none">‹ Case board</a><h1>' + esc(c.student) + '</h1><p class="sub">' + esc(c.setting || 'Setting not on file') + ' · ID ' + esc(c.id) + '</p>';
    h += '<div class="chips" style="flex-wrap:wrap">' + SIDES.map(function (s) { return '<button class="pill p-' + c.health[s] + '" data-edit="Health: ' + s[0].toUpperCase() + s.slice(1) + '" style="border:0;cursor:pointer">' + s + ': ' + (c.health[s] === 'unknown' ? '?' : c.health[s]) + '</button>'; }).join('') + '</div>';
    if (c.why) h += '<div class="banner"><b>Why:</b> ' + esc(c.why) + '</div>';
    h += '<h2>Quick actions</h2><div class="qa"><button data-qa="Draft check-in to parent">✉️ Draft check-in to parent</button><button data-qa="Ask BCBA for update">🩺 Ask BCBA for update</button><button data-qa="Summarize this case">📝 Summarize this case</button><button data-qa="Prep Josh update">📊 Prep Josh update</button></div>';
    h += '<div class="twocol"><div><h2>Team</h2><div class="card team">' + (c.team.length ? c.team.map(function (t) {
      return '<div class="row"><span class="av">' + ini(t.name) + '</span><div class="grow"><b>' + esc(t.name) + '</b><small>' + esc(t.role) + (t.email ? ' · ' + esc(t.email) : '') + (t.phone ? ' · ' + esc(t.phone) : '') + '</small></div></div>';
    }).join('') : '<div class="empty">No team on file</div>') + (c.team.some(function (t) { return t.role === 'Parent'; }) ? '' : '<div class="row"><span class="av">?</span><div class="grow"><b class="miss">Parent contact missing</b><small><span class="edit" data-edit="Parent contact">Add parent contact</span></small></div></div>') + '</div>';
    h += '<h2>Hour bank</h2><div class="card">' + (pct != null ? '<div class="meter"><span style="width:' + Math.max(0, Math.min(100, pct)) + '%;background:' + (pct < (+S.data.settings.hour_bank_pct.value || 20) ? 'var(--red)' : 'var(--brand2)') + '"></span></div><p class="small">' + pct + '% remaining</p>' : '') + '<dl class="kv">' + ef(c, 'Hour bank total') + ef(c, 'Hours used') + ef(c, 'Auth expiry') + ef(c, 'Sched hrs/wk', 'Scheduled hrs/wk') + '</dl></div>';
    h += '<h2>Sessions</h2><div class="card"><dl class="kv">' + ef(c, 'Delivered this wk') + ef(c, 'Sched vs delivered (month)', 'Sched vs delivered (mo)') + ef(c, 'Sessions logged (mo)') + '</dl>' +
      (c.assignments.length ? '<div class="small" style="margin-top:8px">' + c.assignments.map(function (a) { return '<div>• ' + esc(a.provider + ' (' + a.role + '): ' + (a.schedule || 'no schedule')) + '</div>'; }).join('') + '</div>' : '') + '</div></div>';
    h += '<div><h2>Last contacts</h2><div class="card"><dl class="kv">' + ef(c, 'Last contact: parent', 'Parent') + ef(c, 'Last contact: BCBA', 'BCBA') + ef(c, 'Last contact: provider(s)', 'Provider(s)') + ef(c, 'Last contact: Nina', 'Nina') + '</dl></div>';
    h += '<h2>Clinical due dates</h2><div class="card"><dl class="kv">' + ef(c, 'Assessment/report due') + ef(c, 'Progress report due') + ef(c, 'Tx plan review') + ef(c, 'Related services (Nina)', 'Related services') + '</dl></div>';
    h += '<h2>Billing</h2><div class="card"><dl class="kv">' + ef(c, 'Notes submitted') + ef(c, 'Invoice submitted') + ef(c, 'Billing gap', 'Billing gap (sessions)') + '</dl></div>';
    h += '<h2>Notes timeline</h2><div class="card"><dl class="kv" style="margin-bottom:10px">' + ef(c, 'Roster notes (live issues)', 'Live issues') + ef(c, 'Why', 'Why (board)') + '</dl><textarea id="noteIn" placeholder="Add a note (call summary, decision…)"></textarea><div class="btns"><button class="btn sm" data-act="note">Add note</button></div>' +
      '<div class="tl" style="margin-top:14px">' + (c.notes.length ? c.notes.map(function (n) { return '<div><small>' + fmtTs(n.ts) + ' · ' + esc(n.author) + ' · ' + esc(n.type) + '</small>' + esc(n.text) + '</div>'; }).join('') : '<div class="small">No notes yet.</div>') + '</div></div>';
    var qs = (S.data.queue || []).filter(function (q) { return q.case_id === c.id; });
    h += '<h2>Outreach for this case</h2><div class="card">' + (qs.length ? qs.map(function (q) { return '<a class="row" href="#/queue"><span class="rank">' + esc(q.trigger) + '</span><div class="grow"><b>' + esc(q.recipient) + '</b><small>' + esc(q.status) + ' · ' + fmtTs(q.updated) + '</small></div></a>'; }).join('') : '<div class="small">No outreach drafts.</div>') + '</div></div></div>';
    return h;
  }
  /* ---------- Approval queue ---------- */
  var SECS = [['reply', 'Needs your reply', '💬'], ['struct', 'Structural gaps', '🧩'], ['routine', 'Routine updates', '📨'], ['over', 'Oversight', '🔍'], ['bill', 'Billing', '💵'], ['nina', 'Nina · Recruiting', '👥']];
  var TSEC = { T1: 'routine', T2: 'routine', T5: 'routine', T3: 'over', T4: 'over', T8: 'over', T6: 'reply', T14: 'reply', T13: 'struct', T7: 'bill', T9: 'bill', T10: 'bill', T11: 'bill', T12: 'nina' };
  function ownerOf(q) { return q.owner || (q.trigger === 'T12' || /unstaffed|recruit/i.test((q.message || '') + ' ' + (q.note || '')) ? 'Nina' : 'Roni'); }
  function secOf(q) { return ownerOf(q) === 'Nina' ? 'nina' : (TSEC[q.trigger] || 'reply'); }
  function inTab(q, t) { return t === 'all' || (t === 'approved' ? /^approved/.test(q.status) : q.status === t); }
  function queue() {
    var Q = S.data.queue || [], tabs = [['draft', 'To review'], ['approved', 'Approved'], ['dismissed', 'Dismissed'], ['all', 'All']];
    var sec = S.qsec, h;
    if (!sec) {
      var mine = drafts().length;
      h = '<h1>Approval queue</h1><p class="sub">' + mine + ' for you to review. Nothing is ever sent by the app.</p><div class="tiles">';
      h += SECS.map(function (x) { var n = Q.filter(function (q) { return q.status === 'draft' && secOf(q) === x[0]; }).length;
        return '<button class="tile' + (x[0] === 'nina' ? ' nina' : '') + (n ? '' : ' zero') + '" data-qsec="' + x[0] + '"><span class="ti">' + x[2] + '</span><span class="tn">' + n + '</span><span class="tl">' + x[1] + '</span></button>'; }).join('');
      return h + '</div><div class="btns" style="margin:4px 0 12px"><button class="btn sm ghost" data-act="run">⚡ Re-check triggers now</button></div>';
    }
    var S0 = SECS.filter(function (x) { return x[0] === sec; })[0], inSec = Q.filter(function (q) { return secOf(q) === sec; });
    h = '<button class="back" data-qsec="">‹ All sections</button><h1>' + S0[2] + ' ' + S0[1] + '</h1>';
    if (sec === 'nina') {
      var open = inSec.filter(function (q) { return q.status === 'draft'; }), g = {};
      open.forEach(function (q) { (g[q.trigger] = g[q.trigger] || []).push(q); });
      h += '<p class="sub">Nina\u2019s items. View only.</p>';
      h += Object.keys(g).length ? Object.keys(g).map(function (t) { var L = g[t];
        var title = t === 'T12' ? 'students unstaffed 7+ days' : 'recruiting items';
        return '<details class="card grp"><summary><span class="gn">' + L.length + '</span><span class="grow"><b>' + title + '</b><small>Recruiting · tap to see list</small></span><span class="pill p-brand">' + esc(t) + '</span></summary>' +
          L.map(function (q) { var m = /:\s*(.+?) unstaffed/.exec(q.message || ''); return '<a class="row" href="#/case/' + esc(q.case_id) + '"><div class="grow"><b>' + esc(q.student || q.case_id) + '</b><small>' + esc(m ? m[1] : 'provider') + '</small></div></a>'; }).join('') + '</details>'; }).join('') : '<div class="card empty">Nothing open for Nina.</div>';
      return h;
    }
    var list = inSec.filter(function (q) { return inTab(q, S.qtab); });
    h += '<div class="chips">' + tabs.map(function (t) { var n = inSec.filter(function (q) { return inTab(q, t[0]); }).length; return '<button class="chip' + (S.qtab === t[0] ? ' on' : '') + '" data-qtab="' + t[0] + '">' + t[1] + ' (' + n + ')</button>'; }).join('') + '</div>';
    h += list.length ? list.map(function (q) {
      var st = q.status === 'draft' ? pill('yellow', 'draft') : /^approved/.test(q.status) ? pill('green', q.status) : pill('unknown', q.status);
      return '<div class="card qitem" data-q="' + esc(q.id) + '"><div class="meta"><span class="pill p-brand">' + esc(q.trigger) + '</span>' + st + (q.student ? '<a class="small" href="#/case/' + esc(q.case_id) + '">' + esc(q.student) + '</a>' : '') + '</div>' +
        '<b>To: ' + esc(q.recipient) + '</b> <span class="small">' + esc(q.channel) + (q.recipient_contact ? ' · ' + esc(q.recipient_contact) : '') + '</span><p>' + esc(q.message) + '</p>' + (q.note ? '<div class="small">' + esc(q.note) + '</div>' : '') +
        '<div class="btns">' + (q.status === 'draft' ? '<button class="btn sm" data-qop="approve">Approve</button><button class="btn sm ghost" data-qop="edit">Edit</button><button class="btn sm warn" data-qop="dismiss">Dismiss</button>' : '<button class="btn sm ghost" data-qop="reopen">Reopen</button>') + '</div></div>';
    }).join('') : '<div class="card empty">Nothing here.</div>';
    return h;
  }
  /* ---------- Triggers ---------- */
  function triggers() {
    var h = '<h1>Triggers</h1><p class="sub">The 14 rules from the Triggers tab, evaluated live against the board. Thresholds come from Cadence.</p>';
    h += (S.data.triggers || []).map(function (t) {
      return '<div class="card tg"><span class="id">' + esc(t.id) + '</span><div class="grow" style="flex:1"><b>' + esc(t.name) + '</b> ' + (t.fired ? pill('red', t.fired + ' firing') : t.missing ? pill('unknown', 'needs data') : pill('green', 'clear')) +
        '<div class="small">' + esc(t.side) + ' · ' + esc(t.cadence) + ' · ' + esc(t.who) + ' · ' + esc(t.channel) + '</div>' + (t.missing ? '<div class="small" style="color:var(--yel)">Missing: ' + esc(t.missing) + '</div>' : '') + '</div></div>';
    }).join('');
    return h + '<div class="btns"><button class="btn" data-act="run">Create drafts for everything firing</button></div>';
  }
  /* ---------- Settings ---------- */
  function settings() {
    var st = S.data.settings, keys = Object.keys(st).filter(function (k) { return !/^last_/.test(k); });
    var h = '<h1>Cadence</h1><p class="sub">How often each stakeholder is contacted and when alerts fire. Saved to the Settings tab.</p><div class="card">';
    h += keys.map(function (k) { var wd = /weekday/.test(k); return '<label class="set"><span>' + esc(st[k].label || k) + '</span>' + (wd ? '<select data-set="' + k + '">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(function (d) { return '<option' + (String(st[k].value) === d ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select>' : '<input type="number" min="0" data-set="' + k + '" value="' + esc(st[k].value) + '">') + '</label>'; }).join('');
    h += '</div><div class="small">Last Josh update: ' + esc(st.last_josh_update.value || 'never') + ' · Last Nina sync: ' + esc(st.last_nina_sync.value || 'never') + ' (set when you approve T1/T2)</div><div class="btns"><button class="btn" data-act="saveSet">Save cadence</button></div>';
    h += '<h2>Privacy</h2><div class="card small">Only your admin link opens this app. Case numbers, SSNs and TINs are never sent to the app. Case data stays in memory on this device and is not saved offline.<div class="btns"><button class="btn sm warn" data-act="forget">Sign out on this device</button></div></div>';
    return h;
  }
  /* ---------- Katya panel ---------- */
  function openSheet(html) { var s = $('#sheet'); $('.sheet-card', s).innerHTML = html; s.hidden = false; }
  function closeSheet() { $('#sheet').hidden = true; }
  function katya(prefill, kind) {
    var c = S.caseId ? caseBy(S.caseId) : null, R = (S.data.requests || []).slice();
    var mine = c ? R.filter(function (r) { return r.case_id === c.id; }) : R;
    var thread = mine.slice(-30).map(function (r) {
      var st = r.status === 'done' ? pill('green', 'done') : r.status === 'new' ? pill('unknown', 'sent to Katya') : pill('yellow', r.status);
      return '<div class="msg me">' + (r.student && !c ? '<b>' + esc(r.student) + ':</b> ' : '') + (r.kind && r.kind !== 'free text' ? '<b>' + esc(r.kind) + '</b>\n' : '') + esc(r.text) + '<small>' + fmtTs(r.timestamp) + '</small></div>' +
        '<div style="text-align:right;margin-top:-4px">' + st + '</div>' + (r.reply ? '<div class="msg k"><b>Katya</b>\n' + esc(r.reply) + '<small>' + fmtTs(r.replied_at) + '</small></div>' : '');
    }).join('');
    var ctx = c ? 'Case: ' + c.student + ' (' + c.id + ') · ' + SIDES.map(function (s) { return s[0].toUpperCase() + ':' + c.health[s][0]; }).join(' ') + (c.why ? ' · ' + c.why : '') : (S.route === 'queue' ? 'Context: Approval queue (' + drafts().length + ' drafts)' : 'Context: ' + S.route);
    openSheet('<div class="hd"><b>💬 Ask Katya</b><button class="icon" data-close>✕</button></div><div class="ctx">' + esc(ctx) + '</div><div class="thread" id="thread">' + (thread || '<div class="empty">No requests yet. Type or dictate with the keyboard mic.</div>') + '</div>' +
      '<div class="composer"><textarea id="kIn" placeholder="Ask Katya…" enterkeyhint="send">' + esc(prefill || '') + '</textarea><button class="btn" id="kSend">Send</button></div><div class="small" style="margin-top:6px">Goes to the Katya Requests tab. Katya replies there.</div>');
    var t = $('#thread'); t.scrollTop = t.scrollHeight;
    $('#kSend').onclick = function () {
      var txt = $('#kIn').value.trim(); if (!txt) return;
      $('#kSend').disabled = true;
      api('addRequest', { text: txt, case_id: c ? c.id : '', kind: kind || 'free text' }).then(function (d) { S.data.requests = d.requests; toast('Sent to Katya'); katya(); }).catch(function (e) { toast(e.message); $('#kSend').disabled = false; });
    };
  }
  function quick(kind) {
    var c = caseBy(S.caseId); if (!c) return;
    var t = { 'Draft check-in to parent': 'Please draft a monthly check-in to the parent for ' + c.student + ' (use the T5 script). Draft only; I\u2019ll approve.',
      'Ask BCBA for update': 'Please draft a note to ' + (c.bcba || 'the BCBA') + ' asking for a programming/progress update on ' + c.student + '. Draft only.',
      'Summarize this case': 'Please summarize ' + c.student + ': team, hours, last contacts, open issues (' + (c.why || 'none listed') + '), what\u2019s due next.',
      'Prep Josh update': 'Please prep a short Josh update on ' + c.student + ' (status across relationship/service/clinical/billing and any asks).' }[kind];
    if (!confirm('Send to Katya?\n\n' + t)) return;
    api('addRequest', { text: t, case_id: c.id, kind: kind }).then(function (d) { S.data.requests = d.requests; toast('Katya request created'); katya(); }).catch(function (e) { toast(e.message); });
  }
  /* ---------- editing ---------- */
  function editField(k) {
    var c = caseBy(S.caseId), v = c.fields[k] || '', health = /^Health:/.test(k);
    openSheet('<div class="hd"><b>' + esc(k) + '</b><button class="icon" data-close>✕</button></div><div class="small" style="margin-bottom:8px">' + esc(c.student) + ' · writes to Case Board</div>' +
      (health ? '<select id="eIn">' + ['', 'Green', 'Yellow', 'Red', '?'].map(function (x) { return '<option' + (x.toLowerCase() === String(v).toLowerCase() ? ' selected' : '') + ' value="' + x + '">' + (x || '(blank)') + '</option>'; }).join('') + '</select>'
        : '<textarea id="eIn">' + esc(/^\[(no source|blank|none listed)\]$/i.test(v) ? '' : v) + '</textarea>') + '<div class="btns"><button class="btn" id="eSave">Save</button></div>');
    $('#eSave').onclick = function () {
      $('#eSave').disabled = true;
      api('updateCase', { case_id: c.id, field: k, value: $('#eIn').value }).then(function (d) { replaceCase(d.case); closeSheet(); toast('Saved'); }).catch(function (e) { toast(e.message); $('#eSave').disabled = false; });
    };
  }
  function replaceCase(nc) { if (!nc) return; S.data.cases = S.data.cases.map(function (c) { return c.id === nc.id ? nc : c; }); load(true); }
  function editQueue(q) {
    openSheet('<div class="hd"><b>Edit draft · ' + esc(q.trigger) + '</b><button class="icon" data-close>✕</button></div><label class="small">Recipient</label><input type="text" id="qR" value="' + esc(q.recipient) + '"><label class="small">Contact</label><input type="text" id="qC" value="' + esc(q.recipient_contact) + '"><label class="small">Channel</label><input type="text" id="qCh" value="' + esc(q.channel) + '"><label class="small">Message</label><textarea id="qM" style="min-height:160px">' + esc(q.message) + '</textarea>' +
      '<div class="btns"><button class="btn" id="qAp">Save &amp; approve</button><button class="btn ghost" id="qSv">Save draft</button></div>');
    var go = function (op) { qop(q.id, op, { recipient: $('#qR').value, recipient_contact: $('#qC').value, channel: $('#qCh').value, message: $('#qM').value }); };
    $('#qAp').onclick = function () { go('approve'); }; $('#qSv').onclick = function () { go('edit'); };
  }
  function qop(id, op, extra) {
    var d = Object.assign({ id: id, op: op }, extra || {});
    api('queueAction', d).then(function (r) { S.data.queue = r.queue; closeSheet(); toast(op === 'approve' ? 'Approved – Katya to send' : op === 'dismiss' ? 'Dismissed' : 'Saved'); render(); }).catch(function (e) { toast(e.message); });
  }
  function runTriggers() {
    toast('Checking triggers…');
    api('runTriggers').then(function (r) { S.data.queue = r.queue; S.data.triggers = r.triggers; toast(r.added ? r.added + ' new draft' + (r.added > 1 ? 's' : '') + ' in queue' : 'No new drafts'); S.qtab = 'draft'; S.qsec = null; location.hash = '#/queue'; render(); }).catch(function (e) { toast(e.message); });
  }
  /* ---------- binding ---------- */
  function bind() {
    var v = $('#view');
    v.querySelectorAll('[data-side]').forEach(function (a) { a.onclick = function () { S.filt.side = a.dataset.side; S.filt.color = 'red'; }; });
    v.querySelectorAll('[data-color]').forEach(function (b) { b.onclick = function () { S.filt.color = b.dataset.color; render(); }; });
    v.querySelectorAll('[data-side2]').forEach(function (b) { b.onclick = function () { S.filt.side = b.dataset.side2; render(); }; });
    var q = $('#q'); if (q) q.oninput = function () { S.filt.q = q.value; var p = q.selectionStart; render(); var n = $('#q'); n.focus(); n.setSelectionRange(p, p); };
    var fb = $('#fb'); if (fb) fb.onchange = function () { S.filt.bcba = fb.value; render(); };
    var fp = $('#fp'); if (fp) fp.onchange = function () { S.filt.prov = fp.value; render(); };
    v.querySelectorAll('[data-edit]').forEach(function (e) { e.onclick = function () { editField(e.dataset.edit); }; });
    v.querySelectorAll('[data-qa]').forEach(function (b) { b.onclick = function () { quick(b.dataset.qa); }; });
    v.querySelectorAll('[data-qsec]').forEach(function (b) { b.onclick = function () { S.qsec = b.dataset.qsec || null; S.qtab = 'draft'; render(); window.scrollTo(0, 0); }; });
    v.querySelectorAll('[data-qtab]').forEach(function (b) { b.onclick = function () { S.qtab = b.dataset.qtab; render(); }; });
    v.querySelectorAll('[data-qop]').forEach(function (b) {
      b.onclick = function () {
        var id = b.closest('[data-q]').dataset.q, it = S.data.queue.filter(function (x) { return x.id === id; })[0], op = b.dataset.qop;
        if (op === 'edit') return editQueue(it);
        if (op === 'approve' && !confirm('Mark as \u201capproved – Katya to send\u201d? (Nothing is sent by the app.)')) return;
        qop(id, op);
      };
    });
    v.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () {
        var a = b.dataset.act;
        if (a === 'run') runTriggers();
        if (a === 'note') { var t = $('#noteIn').value.trim(); if (!t) return; api('addNote', { case_id: S.caseId, text: t }).then(function (d) { replaceCase(d.case); toast('Note added'); }).catch(function (e) { toast(e.message); }); }
        if (a === 'saveSet') { var vals = {}; v.querySelectorAll('[data-set]').forEach(function (i) { vals[i.dataset.set] = i.value; }); api('saveSettings', { values: vals }).then(function (d) { S.data.settings = d.settings; toast('Cadence saved'); load(true); }).catch(function (e) { toast(e.message); }); }
        if (a === 'forget') { if (confirm('Remove your key from this device?')) { localStorage.removeItem('ttgops.k'); location.reload(); } }
      };
    });
  }
  $('#sheet').addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeSheet(); });
  $('#katyaFab').onclick = function () { if (S.data) katya(); };
  $('#refreshBtn').onclick = function () { if (KEY && apiUrl()) load(); };
  window.addEventListener('hashchange', route);
  /* install */
  function syncInstall() { var b = $('#installBtn'); if (!window.AppInstall) return; b.hidden = !AppInstall.visible(); }
  $('#installBtn').onclick = function () { if (window.AppInstall) AppInstall.install(); };
  if (window.AppInstall) { AppInstall.onChange(syncInstall); syncInstall(); }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
  route();
  if (!KEY) gate('key'); else if (!apiUrl()) gate('api'); else load();
})();
