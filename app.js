/* TTG Ops v4 — six-portal oversight UI.
   Case/clinical payloads stay in memory only (never localStorage / SW cache).
   No outgoing email/SMS. Billing sign-off is session-local until Apps Script gains an endpoint. */
(function () {
  'use strict';
  var M = window.TTG_V4_MODEL;
  var FX = window.TTG_V4_FIXTURES;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var view = $('#view');
  var S = {
    data: null,           // live bootstrap when keyed
    portal: null,         // fixture + adapted live data for portals
    route: 'home',
    params: {},
    billingChecks: {},    // batchId -> { lineId: true }
    billingFlags: {},
    billingSigned: {},
    reportDraft: null,
    emailDraft: null,
    busy: false,
    mode: 'live'          // live | fixture
  };

  var KEY = localStorage.getItem('ttgops.k') || '';
  function apiUrl() { return (window.TTG_CONFIG && TTG_CONFIG.API_URL) || localStorage.getItem('ttgops.api') || ''; }

  function api(action, data) {
    if (!KEY) return Promise.reject(new Error('unauthorized'));
    if (!apiUrl()) return Promise.reject(new Error('missing api'));
    return fetch(apiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ key: KEY, action: action, data: data || {} }),
      redirect: 'follow',
      referrerPolicy: 'no-referrer'
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || j.ok === false) throw new Error((j && j.error) || 'request failed');
      return j;
    });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(msg) {
    var t = $('#toast');
    t.hidden = false; t.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, 2800);
  }

  function sample() {
    if (S.mode === 'live' && S.data) return '';
    return '<span class="sample">Fictional sample data</span>';
  }

  function icons() {
    return {
      person: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5"/></svg>',
      note: '<svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
      calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="8" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="15" r="1" fill="currentColor" stroke="none"/></svg>',
      checklist: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="6" height="6" rx="1"/><path d="M4.5 7l1.5 1.5L9 5.5M12 7h8M3 14h6v6H3zM12 17h8"/></svg>',
      bars: '<svg viewBox="0 0 24 24"><path d="M4 20h16"/><rect x="5" y="11" width="3" height="7"/><rect x="10.5" y="7" width="3" height="11"/><rect x="16" y="4" width="3" height="14"/></svg>',
      envelope: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 7l9 7 9-7"/></svg>'
    };
  }

  function back(title) {
    return '<div class="back"><a href="#/">Home</a><h1>' + esc(title) + '</h1></div>' + sample();
  }

  function buildPortalData() {
    var fx = JSON.parse(JSON.stringify(FX));
    var liveStudents = M.studentsFromBootstrap(S.data);
    if (liveStudents.length) {
      S.mode = 'live+fixture';
      /* Prefer live roster for Students portal list; keep fixture Jordan for rich notes/demo portals. */
      var byName = {};
      liveStudents.forEach(function (s) { byName[M.normName(s.name)] = s; });
      fx._liveStudents = liveStudents;
      fx._liveAmbiguous = [];
      Object.keys(byName).forEach(function () {});
      /* Flag ambiguous live names */
      var groups = {};
      liveStudents.forEach(function (s) {
        var n = M.normName(s.name);
        (groups[n] = groups[n] || []).push(s);
      });
      Object.keys(groups).forEach(function (n) {
        if (groups[n].length > 1) fx._liveAmbiguous = fx._liveAmbiguous.concat(groups[n]);
      });
    } else {
      S.mode = 'fixture';
    }
    S.portal = fx;
  }

  /* ---------- routes ---------- */
  function route() {
    var h = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    S.route = h[0] || 'home';
    S.params = { id: h[1] || '', extra: h[2] || '' };
    render();
  }

  function render() {
    var map = {
      home: home,
      students: students,
      student: studentDetail,
      notes: notes,
      note: noteDetail,
      providers: providers,
      billing: billing,
      reports: reports,
      email: email,
      settings: settings,
      search: searchView
    };
    var fn = map[S.route] || home;
    view.innerHTML = fn();
    bind();
  }

  /* ---------- HOME ---------- */
  function home() {
    var ic = icons();
    var n = M.reviewCount(S.portal || FX);
    var tiles = [
      ['students', 'Students\n& Cases', ic.person],
      ['notes', 'Clinical\nNotes', ic.note],
      ['providers', 'Providers\n& Schedules', ic.calendar],
      ['billing', 'Billing\nReview', ic.checklist],
      ['reports', 'Reports\n& Updates', ic.bars],
      ['email', 'Email &\nOpen Items', ic.envelope]
    ];
    return '<div class="brand-row"><img src="icons/icon-192.png" alt=""><div><b>TTG Ops</b><small>Oversight workspace</small></div></div>' +
      sample() +
      '<form id="homeSearch"><input class="search" name="q" placeholder="Search students, notes, email…" aria-label="Search"></form>' +
      '<a class="card review-link" href="#/email"><span>Needs your review</span><span class="badge">' + n + '</span></a>' +
      '<div class="tiles">' + tiles.map(function (t) {
        return '<button type="button" class="tile" data-go="' + t[0] + '"><span class="ico">' + t[2] + '</span><b>' + esc(t[1]) + '</b></button>';
      }).join('') + '</div>' +
      '<p class="muted" style="margin-top:16px"><a href="#/settings">Settings</a> · ' +
      (S.mode === 'fixture' ? 'Showing fictional fixtures (open with your admin link for live Sheets).' : 'Live roster linked where available; portal details may use fixtures when Sheets fields are absent.') +
      '</p>';
  }

  /* ---------- Students ---------- */
  function studentList() {
    var live = (S.portal && S.portal._liveStudents) || [];
    var fx = (S.portal && S.portal.students) || [];
    /* Show fixture students plus live ones not already represented by same id */
    var ids = {};
    var out = [];
    fx.forEach(function (s) { ids[s.id] = 1; out.push(s); });
    live.forEach(function (s) { if (!ids[s.id]) out.push(s); });
    return out;
  }

  function students() {
    var list = studentList();
    var amb = ((S.portal && S.portal.ambiguousNames) || []).concat((S.portal && S.portal._liveAmbiguous) || []);
    var h = back('Students & Cases');
    if (amb.length) {
      h += '<div class="banner warn"><b>Ambiguous names flagged.</b> Same display name maps to multiple IDs — not auto-merged. Resolve by code/ID.</div>';
    }
    if (!list.length) h += '<div class="list-empty">No students on file.</div>';
    list.forEach(function (s) {
      var ini = (s.name || '?').split(/\s+/).map(function (p) { return p[0]; }).join('').slice(0, 2);
      h += '<a class="card row" href="#/student/' + encodeURIComponent(s.id) + '">' +
        '<div class="avatar">' + esc(ini) + '</div><div class="grow"><b>' + esc(s.name) + '</b>' +
        '<small>' + esc((s.services || []).join(' · ') || s.status || '') + '</small></div><span class="chev"></span></a>';
    });
    return h;
  }

  function findStudent(id) {
    var list = studentList().concat((S.portal && S.portal.ambiguousNames) || []);
    return list.filter(function (s) { return s.id === id; })[0];
  }

  function studentDetail() {
    var s = findStudent(S.params.id);
    if (!s) return back('Student') + '<div class="list-empty">Student not found.</div>';
    var notes = M.notesForStudent((S.portal && S.portal.notes) || [], s.id);
    var h = back(s.name);
    h += '<div class="card row"><div class="avatar">' + esc((s.code || s.name || '?').slice(0, 2)) + '</div>' +
      '<div class="grow"><b>' + esc(s.name) + '</b><small>' + esc(s.status || '') + ' · ID ' + esc(s.id) + '</small></div></div>';
    function sec(title, body) {
      return '<div class="card"><b>' + esc(title) + '</b><div class="muted" style="margin-top:6px">' + body + '</div></div>';
    }
    h += sec('Services', esc((s.services || []).join(' · ') || 'Not on file'));
    h += sec('Providers', (s.providers || []).length ? s.providers.map(function (p) { return esc(p.name) + ' · ' + esc(p.role); }).join('<br>') : 'Not on file');
    h += sec('History', (s.history || []).length ? s.history.map(function (x) { return esc(x.date) + ' — ' + esc(x.label); }).join('<br>') : 'Not on file');
    h += sec('Documents', (s.documents || []).length ? s.documents.map(function (d) {
      return esc(d.name) + ' <span class="src">' + esc(d.type) + ' · ' + esc(d.date) + ' · ' + esc(d.source) + '</span>';
    }).join('<br>') : 'Not on file');
    h += sec('Clinical notes', notes.length ? notes.length + ' on file · <a href="#/notes">Open notes</a>' : 'No notes linked (does not prove sessions missing)');
    h += sec('Email', (s.emailRefs || []).length ? '<a href="#/email">Open related items</a>' : 'No linked open items');
    if (s.source === 'bootstrap') {
      h += '<div class="banner">Live case record from Sheets. Rich notes/schedules/billing samples appear when fixture fields apply (Jordan Lee demo).</div>';
    }
    return h;
  }

  /* ---------- Notes ---------- */
  function notes() {
    var all = (S.portal && S.portal.notes) || [];
    var sid = S.params.id || '';
    var filtered = M.filterNotes(all, sid ? { studentId: sid } : {});
    var h = back('Clinical Notes');
    h += '<div class="chip-row">' +
      '<button type="button" class="chip' + (sid === 'STU-DEMO-001' ? ' on' : '') + '" data-note-stu="STU-DEMO-001">Jordan Lee</button>' +
      '<button type="button" class="chip' + (!sid ? ' on' : '') + '" data-note-stu="">All sample</button>' +
      '<button type="button" class="chip on">Sep–Oct</button></div>';
    var stu = findStudent(sid) || (S.portal.students || [])[0];
    if (stu && stu.goals && stu.goals.length) {
      h += '<div class="card"><div class="muted">Goals context</div><b>' +
        stu.goals.map(function (g) { return esc(g.name); }).join(' · ') + '</b></div>';
    }
    if (!filtered.length) h += '<div class="list-empty">No notes for this filter.</div>';
    filtered.forEach(function (n) {
      h += '<a class="card" href="#/note/' + encodeURIComponent(n.id) + '"><div class="row"><b>' + esc(n.date) + '</b>' +
        '<span class="pill' + (n.status === 'Partial' ? ' warn' : '') + '">' + esc(n.status) + '</span></div>' +
        '<div class="muted">' + esc(n.service) + ' · ' + esc(n.provider) + '</div>' +
        '<div class="note-body">' + esc(n.text) + '</div>' +
        '<div class="src">Source: ' + esc(n.source) + '</div></a>';
    });
    var orphan = ((S.portal && S.portal.sessionsWithoutNotes) || []).filter(function (s) { return !sid || s.studentId === sid; });
    if (orphan.length) {
      h += '<div class="banner warn"><b>Sessions without notes:</b> ' + orphan.map(function (s) {
        return esc(s.date) + ' ' + esc(s.service);
      }).join(', ') + '. Missing note does not mean missing session.</div>';
    }
    return h;
  }

  function noteDetail() {
    var n = ((S.portal && S.portal.notes) || []).filter(function (x) { return x.id === S.params.id; })[0];
    if (!n) return back('Note') + '<div class="list-empty">Note not found.</div>';
    var h = back('Note');
    h += '<div class="card"><b>' + esc(n.date) + ' · ' + esc(n.service) + '</b>' +
      '<div class="muted">' + esc(n.provider) + ' · ' + esc(n.durationMin) + ' min</div>' +
      '<div class="note-body">' + esc(n.text) + '</div>' +
      '<div class="src">Source: ' + esc(n.source) + ' · ' + esc(n.id) + '</div></div>';
    return h;
  }

  /* ---------- Providers ---------- */
  function providers() {
    var rows = (S.portal && S.portal.schedules) || [];
    var h = back('Providers & Schedules');
    h += '<div class="card"><b>Week of Oct 20–26</b><div class="muted">Sample week (fixture). Live schedule feed not connected.</div></div>';
    var gaps = rows.filter(function (r) { return /gap|open/i.test(r.status); });
    if (gaps.length) {
      h += '<div class="card"><span class="pill warn">' + gaps.length + ' coverage gap</span>' +
        '<div style="margin-top:8px">' + gaps.map(function (g) { return esc(g.service) + ' open ' + esc(g.when) + ' for ' + esc(g.student); }).join('<br>') + '</div></div>';
    }
    h += '<div class="sec">Assignments</div>';
    if (!rows.length) h += '<div class="banner warn">Schedule data not connected. Nothing invented.</div>';
    rows.forEach(function (r) {
      h += '<div class="card"><b>' + esc(r.provider) + '</b>' +
        '<div class="muted">' + esc(r.service) + ' · ' + esc(r.student) + '</div>' +
        '<div style="margin-top:8px;color:' + (/gap|open/i.test(r.status) ? 'var(--amber)' : 'var(--green-dark)') + ';font-weight:600">' + esc(r.when) +
        (/gap|open/i.test(r.status) ? ' — open' : '') + '</div></div>';
    });
    return h;
  }

  /* ---------- Billing ---------- */
  function billing() {
    var batch = ((S.portal && S.portal.billingBatches) || [])[0];
    var h = back('Billing Review');
    if (!batch) {
      return h + '<div class="banner warn">No incoming billing batch available.</div>';
    }
    var notes = (S.portal && S.portal.notes) || [];
    var rev = M.reviewBillingBatch(batch, notes);
    var checks = S.billingChecks[batch.id] || {};
    var can = rev.canSignOff(Object.keys(checks).filter(function (k) { return checks[k]; }));
    if (S.billingSigned[batch.id]) {
      h += '<div class="banner">Signed off on this device for this session only. Server audit persistence requires an Apps Script update (not deployed in this PR).</div>';
    }
    h += '<div class="sec">Incoming for sign-off</div>';
    h += '<div class="card"><b>' + esc(batch.student) + ' · ' + esc(batch.service) + ' sessions</b>' +
      '<div class="muted">' + esc(batch.period) + '</div>' +
      '<div style="margin-top:10px"><span class="pill warn">Needs review</span></div>' +
      '<div style="margin-top:10px;font-weight:600">Check dates, provider and duration</div>' +
      '<p class="muted">' + esc(rev.guidance) + '</p>';
    h += '<div class="muted" style="margin:8px 0">' + batch.lines.length + ' linked sample notes</div>';
    h += '<table class="table"><thead><tr><th>Date</th><th>Provider</th><th>Mins</th><th></th></tr></thead><tbody>';
    rev.lines.forEach(function (line, i) {
      var raw = batch.lines[i];
      var st = line.state;
      h += '<tr><td>' + esc(raw.date) + '</td><td>' + esc(raw.provider) + '</td><td>' + esc(raw.durationMin) + ' min</td>' +
        '<td><input type="checkbox" data-bill-check="' + esc(batch.id) + ':' + esc(raw.id) + '"' + (checks[raw.id] ? ' checked' : '') +
        (st === 'mismatch' ? ' disabled' : '') + ' aria-label="Checked ' + esc(raw.date) + '"></td></tr>';
      if (st === 'mismatch' || st === 'needs_review') {
        h += '<tr><td colspan="4" class="muted">' + esc(line.reasons.join('; ')) + '</td></tr>';
      } else {
        h += '<tr><td colspan="4" class="src">Fields align with ' + esc(line.noteId) + ' — still requires your check</td></tr>';
      }
    });
    h += '</tbody></table></div>';
    h += '<div class="btns"><button type="button" class="btn warn" data-bill-flag="' + esc(batch.id) + '">Flag for correction</button>' +
      '<button type="button" class="btn' + (can && !S.billingSigned[batch.id] ? '' : ' disabled') + '" data-bill-sign="' + esc(batch.id) + '"' +
      (can && !S.billingSigned[batch.id] ? '' : ' disabled') + '>Sign off</button></div>';
    h += '<p class="muted">Sign off unlocks after each aligned line is checked. No invoices, collections, or payments in this app.</p>';
    if (S.billingFlags[batch.id]) h += '<div class="banner warn">Flagged for correction (session only).</div>';
    return h;
  }

  /* ---------- Reports ---------- */
  function reports() {
    var students = (S.portal && S.portal.students) || [];
    var stu = students[0] || findStudent('STU-DEMO-001');
    var h = back('Reports & Updates');
    h += '<div class="selects">' +
      '<label>Student</label><select id="repStudent">' + students.map(function (s) {
        return '<option value="' + esc(s.id) + '"' + (stu && s.id === stu.id ? ' selected' : '') + '>' + esc(s.name) + '</option>';
      }).join('') + '</select>' +
      '<label>Period</label><select id="repPeriod"><option>Sep–Oct 2026</option><option>YTD 2026</option></select>' +
      '<label>Audience</label><select id="repAudience"><option>Parent</option><option>School</option><option>Internal</option></select></div>';
    h += '<p style="margin:14px 0"><button type="button" class="btn" id="repCreate">Create draft</button></p>';
    var draft = S.reportDraft;
    if (draft) {
      h += '<div class="sec">Draft preview</div><div class="card"><div class="draft-head"><b>' + esc(draft.title) + '</b>' +
        '<div class="muted" style="color:#b4dcb9">Awaiting review</div></div>' +
        '<b>' + esc(draft.student) + '</b><div class="muted">' + esc(draft.period) + '</div>' +
        '<p>' + esc(draft.body) + '</p>' +
        '<div class="src">Sources: ' + draft.sources.map(function (s) { return esc(s.label); }).join(' · ') + '</div>' +
        '<p class="muted" style="margin-top:10px">' + esc(draft.limits) + '</p></div>';
      h += '<button type="button" class="btn secondary" id="repPrint">Print / export preview</button>';
    }
    return h;
  }

  /* ---------- Email ---------- */
  function email() {
    var items = (S.portal && S.portal.emailItems) || [];
    var h = back('Email & Open Items');
    h += '<div class="sec">Pending</div>';
    if (!items.length) {
      h += '<div class="banner warn">Email integration not connected. No inbox invented.</div>';
    }
    items.forEach(function (e) {
      h += '<div class="card"><b>' + esc(e.title) + '</b>' +
        '<div class="muted">' + esc(e.linkName) + ' · ' + esc(e.date) + '</div>' +
        '<div class="src">Source: ' + esc(e.source) + '</div>' +
        '<p style="margin:10px 0 0"><button type="button" class="chip" data-email-draft="' + esc(e.id) + '">Open / draft reply</button></p></div>';
    });
    if (S.emailDraft) {
      h += '<div class="card"><b>Draft reply</b><div class="muted">' + esc(S.emailDraft.title) + '</div>' +
        '<textarea id="emailBody" style="width:100%;min-height:100px;margin-top:8px;border-radius:12px;border:1px solid var(--line);padding:10px" placeholder="Draft only…">' +
        esc(S.emailDraft.body || '') + '</textarea>' +
        '<p class="muted">Draft only. Nothing sends from this screen.</p></div>';
    } else {
      h += '<p class="muted">Draft only. Nothing sends from this screen.</p>';
    }
    return h;
  }

  /* ---------- Settings ---------- */
  function settings() {
    var cov = (S.portal && S.portal.coverage) || {};
    var h = back('Settings');
    h += '<div class="card"><b>Import & coverage</b><p class="muted">' + esc(cov.note || 'Live Ensora imports stay private and are not copied into this public app.') + '</p>' +
      '<dl class="kv"><dt>Fixture SOAP</dt><dd>' + esc(String(cov.soapStudentsWithNotes)) + ' / ' + esc(String(cov.soapStudentsKnown)) + ' sample students</dd>' +
      '<dt>Live sync</dt><dd>Not connected in this build</dd></dl></div>';
    h += '<div class="card"><b>Access</b><p class="muted">Admin key stays on this device only. Clinical payloads are not written to localStorage or the service worker cache.</p>' +
      '<button type="button" class="btn secondary" id="forgetKey">Forget key on this device</button></div>';
    h += '<div class="card"><b>Data mode</b><p class="muted">' + esc(S.mode) + '</p></div>';
    return h;
  }

  function searchView() {
    var q = decodeURIComponent(S.params.id || '');
    var hits = M.searchAll(q, S.portal || FX);
    var h = back('Search');
    h += '<p class="muted">Results for “' + esc(q) + '”</p>';
    if (!hits.length) h += '<div class="list-empty">No matches.</div>';
    hits.forEach(function (hit) {
      var href = hit.type === 'student' ? '#/student/' + encodeURIComponent(hit.id)
        : hit.type === 'note' ? '#/note/' + encodeURIComponent(hit.id)
        : '#/email';
      h += '<a class="card row" href="' + href + '"><div class="grow"><b>' + esc(hit.title) + '</b><small>' + esc(hit.sub || hit.type) + '</small></div><span class="chev"></span></a>';
    });
    return h;
  }

  /* ---------- bind ---------- */
  function bind() {
    document.querySelectorAll('[data-go]').forEach(function (el) {
      el.onclick = function () { location.hash = '#/' + el.getAttribute('data-go'); };
    });
    var hs = $('#homeSearch');
    if (hs) hs.onsubmit = function (e) {
      e.preventDefault();
      var q = (hs.q && hs.q.value || '').trim();
      if (q) location.hash = '#/search/' + encodeURIComponent(q);
    };
    document.querySelectorAll('[data-note-stu]').forEach(function (el) {
      el.onclick = function () {
        var v = el.getAttribute('data-note-stu');
        location.hash = v ? '#/notes/' + encodeURIComponent(v) : '#/notes';
      };
    });
    document.querySelectorAll('[data-bill-check]').forEach(function (el) {
      el.onchange = function () {
        var parts = el.getAttribute('data-bill-check').split(':');
        var bid = parts[0], lid = parts.slice(1).join(':');
        S.billingChecks[bid] = S.billingChecks[bid] || {};
        S.billingChecks[bid][lid] = !!el.checked;
        render();
      };
    });
    document.querySelectorAll('[data-bill-flag]').forEach(function (el) {
      el.onclick = function () {
        var id = el.getAttribute('data-bill-flag');
        S.billingFlags[id] = true;
        toast('Flagged for correction (this session only)');
        render();
      };
    });
    document.querySelectorAll('[data-bill-sign]').forEach(function (el) {
      el.onclick = function () {
        if (el.disabled) return;
        var id = el.getAttribute('data-bill-sign');
        S.billingSigned[id] = { at: new Date().toISOString(), localOnly: true };
        toast('Signed off on this device — not written to Sheets in this PR');
        render();
      };
    });
    var rc = $('#repCreate');
    if (rc) rc.onclick = function () {
      var sid = $('#repStudent').value;
      var stu = findStudent(sid) || ((S.portal.students || [])[0]);
      S.reportDraft = M.buildReportDraft(stu, S.portal.notes || [], {
        audience: $('#repAudience').value,
        period: $('#repPeriod').value
      });
      render();
    };
    var rp = $('#repPrint');
    if (rp) rp.onclick = function () { window.print(); };
    document.querySelectorAll('[data-email-draft]').forEach(function (el) {
      el.onclick = function () {
        var id = el.getAttribute('data-email-draft');
        var item = ((S.portal && S.portal.emailItems) || []).filter(function (e) { return e.id === id; })[0];
        S.emailDraft = { id: id, title: item ? item.title : id, body: '' };
        render();
      };
    });
    var fk = $('#forgetKey');
    if (fk) fk.onclick = function () {
      if (confirm('Remove your key from this device?')) {
        localStorage.removeItem('ttgops.k');
        location.reload();
      }
    };
  }

  function gate(kind) {
    var h = '<div class="gate"><div class="brand-row"><img src="icons/icon-192.png" alt=""><div><b>TTG Ops</b><small>Private</small></div></div>';
    if (kind === 'key') h += '<p class="muted">This app is private. Open it with your personal admin link, or paste the key once below. For UI review without Sheets, continue with sample fixtures.</p>' +
      '<input id="gateKey" type="password" autocomplete="off" placeholder="Admin key">' +
      '<button class="btn" id="gateSaveKey">Save key</button>' +
      '<button class="btn ghost" id="gateFixtures" style="margin-top:8px;width:100%">Continue with fictional fixtures</button>';
    else h += '<p class="muted">API URL missing. Paste the Apps Script web app /exec URL, or continue with fixtures.</p>' +
      '<input id="gateApi" placeholder="https://script.google.com/macros/s/…/exec">' +
      '<button class="btn" id="gateSaveApi">Save API URL</button>' +
      '<button class="btn ghost" id="gateFixtures" style="margin-top:8px;width:100%">Continue with fictional fixtures</button>';
    h += '</div>';
    view.innerHTML = h;
    var sk = $('#gateSaveKey');
    if (sk) sk.onclick = function () {
      var v = ($('#gateKey').value || '').trim();
      if (!/^[A-Za-z0-9_-]{20,128}$/.test(v)) return toast('Key looks invalid');
      localStorage.setItem('ttgops.k', v); KEY = v; start();
    };
    var sa = $('#gateSaveApi');
    if (sa) sa.onclick = function () {
      var v = ($('#gateApi').value || '').trim();
      if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(v)) return toast('URL looks invalid');
      localStorage.setItem('ttgops.api', v); start();
    };
    var gf = $('#gateFixtures');
    if (gf) gf.onclick = function () { S.data = null; buildPortalData(); route(); };
  }

  function load() {
    return api('bootstrap').then(function (d) {
      S.data = d;
      buildPortalData();
      route();
    }).catch(function (e) {
      if (/unauthorized/.test(e.message)) return gate('key');
      toast('Live API unavailable — using fixtures. ' + e.message);
      S.data = null;
      buildPortalData();
      route();
    });
  }

  function start() {
    KEY = localStorage.getItem('ttgops.k') || '';
    window.addEventListener('hashchange', route);
    if (!KEY) {
      /* Allow fixture mode without key for PR review / tests */
      if (/[?&]fixtures=1/.test(location.search) || /[?&]demo=1/.test(location.search)) {
        buildPortalData(); route(); return;
      }
      return gate('key');
    }
    if (!apiUrl()) return gate('api');
    load();
  }

  start();
})();
