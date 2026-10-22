/* TTG platform front-end. LIVE reads the private TTG Ops API with the key already on this device (read only, bootstrap call only).
   DEMO uses fictional data from demo-data.js and never calls the API. No data is stored by this page. */
(function () {
  'use strict';
  var MODE = window.TTG_MODE === 'demo' ? 'demo' : 'live';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var S = { role: localStorage.getItem('ttgplat.role') || 'admin', pid: localStorage.getItem('ttgplat.pid') || '', month: '', m: null, tab: {}, f: {} };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var P = { home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>', bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5 6.5-5s5.7 1.5 6.5 5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20c-.5-2.6-2-4.1-4-4.7"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', plus: '<path d="M12 5v14M5 12h14"/>', cal: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c2 2 10 2 12 0v-5"/>', userplus: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5 6.5-5s5.7 1.5 6.5 5M19 8v6M16 11h6"/>', file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    sheet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>', folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
    id: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2.5"/><path d="M14 10h4M14 14h4"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 12l2 2 4-4"/>', pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>', chart: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
    coins: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>', grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    chev: '<path d="m9 6 6 6-6 6"/>', chevl: '<path d="m15 6-6 6 6 6"/>', ok: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>', no: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>', panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    updown: '<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>', warn: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>', send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>', dl: '<path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/>' };
  function ic(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (P[n] || '') + '</svg>'; }
  var LOGO = '<svg viewBox="0 0 32 32"><rect x="14.6" y="17" width="2.8" height="11" rx="1" fill="#7a5230"/><circle cx="16" cy="12" r="7.5" fill="#4d8b3a"/><circle cx="10.5" cy="15.5" r="4.5" fill="#6aa84f"/><circle cx="21.5" cy="15.5" r="4.5" fill="#3f7a2f"/><path d="M7 28h18" stroke="#7a5230" stroke-width="1.6" stroke-linecap="round"/></svg>';
  /* ---------- formatting ---------- */
  var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function mname(mo) { return MON[+mo.slice(5) - 1] + ' ' + mo.slice(0, 4); }
  function addM(mo, n) { var y = +mo.slice(0, 4), m = +mo.slice(5) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + String(m + 1).padStart(2, '0'); }
  function sd(ds) { if (!ds || !/^\d{4}-\d{2}-\d{2}/.test(ds)) return esc(ds || ''); return MON[+ds.slice(5, 7) - 1].slice(0, 3) + ' ' + +ds.slice(8, 10) + (ds.slice(0, 4) !== S.m.today.slice(0, 4) ? ', ' + ds.slice(0, 4) : ''); }
  function money(n) { return n == null || isNaN(n) ? '' : '$' + Math.round(n).toLocaleString('en-US'); }
  function num(n) { return (Math.round(n * 100) / 100).toLocaleString('en-US'); }
  function days(a, b) { return Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 864e5); }
  function inits(n) { return String(n || '?').replace(/^Dr\.\s*/, '').split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase(); }
  var AVC = ['#b45309', '#9a3412', '#c2410c', '#a16207', '#7c2d12', '#ea580c'];
  function av(n) { var h = 0; String(n).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) % 997; }); return '<span class="av" style="background:' + AVC[h % AVC.length] + '">' + esc(inits(n)) + '</span>'; }
  var PC = { 'Sent to DOE': 'green', 'Ready to send': 'blue', 'Waiting for signatures': 'yellow', 'Blocked': 'red', 'Held': 'yellow', 'In progress': 'acc', 'Received': 'green', 'Partial': 'yellow', 'Received, incomplete': 'yellow', 'Not received': 'red', 'Active': 'green', 'Pending AI': 'yellow', 'Needs provider': 'red', 'On file': 'green', 'Missing': 'red', 'Pending': 'yellow', 'draft': 'acc', 'reviewed': 'green', 'Completed': 'green', 'Scheduled': 'blue', 'Cancelled': 'red', 'Signed': 'green', 'Unsigned': 'red', 'Yes': 'green', 'No': 'red', 'Submitted': 'green', 'Left': '' };
  function pill(t, c) { if (!t) return ''; return '<span class="pill ' + (c || PC[t] || '') + '"><i></i>' + esc(t) + '</span>'; }
  function dots(h) { h = h || {}; return '<span class="dots" title="Relationship, service, clinical, billing">' + ['relationship', 'service', 'clinical', 'billing'].map(function (k) { return '<i class="' + esc(h[k] || '') + '"></i>'; }).join('') + '</span>'; }
  function bar(pct, color) { pct = Math.max(0, Math.min(100, pct || 0)); return '<div class="bar"><i style="width:' + pct + '%;background:' + (color || (pct > 85 ? '#dc3c3c' : pct > 70 ? '#e8a317' : '#c2500a')) + '"></i></div>'; }
  function toast(t) { var el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 2200); }
  function iso(v) { if (!v) return ''; if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10); var m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(v); if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0'); var d = new Date(v); return isNaN(d) ? '' : d.toISOString().slice(0, 10); }
  /* ---------- schedules (live: parsed from assignment schedule text) ---------- */
  var DW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  function parseSched(t) {
    t = String(t || '').toLowerCase().replace(/\bm\s*-\s*f\b/g, 'mon-fri'); if (!t) return null;
    var out = [];
    t.split(/;|\n/).forEach(function (seg) {
      var ds = [], rg = /\b(sun|mon|tue|wed|thu|fri|sat)\w*\s*-\s*(sun|mon|tue|wed|thu|fri|sat)/.exec(seg);
      if (rg) { for (var i = DW.indexOf(rg[1]), g = 0; g < 7; i = (i + 1) % 7, g++) { ds.push(i); if (i === DW.indexOf(rg[2])) break; } }
      else (seg.match(/\b(sun|mon|tue|wed|thu|fri|sat)/g) || []).forEach(function (d) { if (ds.indexOf(DW.indexOf(d)) < 0) ds.push(DW.indexOf(d)); });
      var tm = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/.exec(seg);
      if (!ds.length || !tm) return;
      var a2 = tm[6] || (+tm[4] < 7 || +tm[4] === 12 ? 'pm' : 'am'), a1 = tm[3] || ((+tm[1] % 12) <= (+tm[4] % 12) ? a2 : 'am');
      var h = function (hh, mm, ap) { hh = +hh % 12 + (ap === 'pm' ? 12 : 0); return String(hh).padStart(2, '0') + ':' + (mm || '00'); };
      out.push({ days: ds, start: h(tm[1], tm[2], a1), end: h(tm[4], tm[5], a2) });
    });
    return out.length ? out : null;
  }
  function mins(t) { var a = t.split(':'); return +a[0] * 60 + +a[1]; }
  function expand(sch, mo) {
    if (!sch) return []; var y = +mo.slice(0, 4), m = +mo.slice(5), dim = new Date(y, m, 0).getDate(), L = [];
    (Array.isArray(sch) ? sch : [sch]).forEach(function (s) {
      for (var d = 1; d <= dim; d++) { var ds = mo + '-' + String(d).padStart(2, '0'); if (s.days.indexOf(new Date(y, m - 1, d).getDay()) >= 0) { var mn = mins(s.end) - mins(s.start); if (mn <= 0) mn += 720; L.push({ date: ds, start: s.start, end: s.end, mins: mn, n: null, state: 'Scheduled', note: '' }); } }
    });
    return L.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  /* ---------- live adapter: TTG Ops bootstrap -> platform model ---------- */
  function slug(n) { return String(n || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, ''); }
  function fromLive(d) {
    var today = iso(d.today) || new Date().toISOString().slice(0, 10), mo = today.slice(0, 7), PV = {};
    function prov(name, role, id) {
      if (!name || /^(tbd|open)$/i.test(name)) return null; var k = slug(name); if (!k) return null;
      var p = PV[k] || (PV[k] = { id: id || ('PV-' + k), name: name, role: role || '', email: '', phone: '', status: 'Active', students: [], intake: null, docs: [] });
      if (id && /^PV-/.test(p.id)) p.id = id; if (!p.role && role) p.role = role; return p;
    }
    var students = (d.cases || []).map(function (c) {
      var lines = [], f = c.fields || {};
      (c.assignments || []).forEach(function (a) {
        var p = prov(a.provider, a.role, a.provider_id);
        lines.push({ tag: '', ai: '', label: a.role || 'Service', setting: a.setting || c.setting || '', type: a.mandate ? 'Weekly ' + a.mandate + ' hrs/wk' : '', funding: '', max: null, len: null, rate: null, start: '', end: iso(a.auth_expiry), used: null, pid: p ? p.id : '', provider: a.provider, schedule: a.schedule, sched: parseSched(a.schedule), status: 'Active' });
      });
      (c.team || []).forEach(function (t) {
        if (t.role === 'Parent') return; var p = prov(t.name, t.role, t.provider_id);
        if (p && !lines.some(function (l) { return l.pid === p.id; }) && t.role !== 'Related service') lines.push({ tag: '', ai: '', label: t.role, setting: c.setting || '', type: '', funding: '', max: null, len: null, rate: null, end: '', used: null, pid: p.id, provider: t.name, sched: null, status: 'Active' });
      });
      (c.gaps || []).forEach(function (g) { lines.push({ tag: '', ai: '', label: g.role, setting: c.setting || '', type: '', funding: '', max: null, pid: '', provider: '', status: 'Needs provider' }); });
      var b = c.bank || {};
      if (b.total) lines.unshift({ tag: 'Hour bank', ai: '', label: 'Hour bank', setting: c.setting || '', type: 'Bank', funding: '', max: b.total, len: 60, rate: null, end: iso(b.expiry), used: b.used || 0, pid: '', provider: '', status: 'Active', isBank: true });
      var s = { id: c.id, code: '', name: c.student, status: 'Active', setting: c.setting || '', bcba: c.bcba || '', team: (c.team || []).filter(function (t) { return t.role !== 'Parent'; }),
        profile: { guardian: f['Parent contact'] || '', osis: '', address: '' }, health: c.health || {}, why: c.why || '', gaps: c.gaps || [], notes: c.notes || [], fields: f, departed: c.departed || [],
        intake: c.intake ? { status: c.intake.status, received: c.intake.received, missing: c.intake.missing, last: c.intake.last, links: c.intake.links || [], who: c.intake.who } : null,
        ensora: c.ensora, docs: [], hearing: null, cases: [{ num: '', basis: '', status: 'Active', funding: '', window: '', docs: [], lines: lines }] };
      lines.forEach(function (l) { var p = l.pid && PV[slug(l.provider)]; if (p && p.students.indexOf(s.id) < 0) p.students.push(s.id); });
      return s;
    });
    (d.intake || []).forEach(function (x) { if (x.kind !== 'Provider') return; var p = prov(x.name, x.role); if (p) p.intake = { status: x.status, received: x.received, missing: x.missing, links: x.links || [] }; });
    var providers = Object.keys(PV).map(function (k) { return PV[k]; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var invoices = [];
    students.forEach(function (s) {
      s.cases[0].lines.forEach(function (l, i) {
        if (l.isBank || !l.pid || l.status === 'Needs provider') return;
        invoices.push({ id: 'LV-' + s.id + '-' + i, num: '', month: mo, studentId: s.id, student: s.name, caseNum: '', ai: '', tag: '', label: l.label, setting: l.setting, funding: '', provider: l.provider, pid: l.pid, len: null, rate: null, payRate: null,
          sessions: expand(l.sched, mo), billed: 0, submittedHrs: null, total: null, cost: null, signer: /school/i.test(l.setting) ? 'Principal' : 'Parent', sig: { provider: false, other: false }, status: 'Blocked', reason: 'Missing case #, AI #, OSIS, address, rate', sheet: s.fields['Invoice submitted'] || '', version: 1 });
      });
    });
    return { mode: 'live', today: today, agency: { name: 'Together They Grow', tin: '', address: '', email: '', phone: '' }, students: students, providers: providers, invoices: invoices,
      intake: d.intake || [], reports: d.reports || [], triggers: d.triggers || [], admins: [{ name: 'Roni', role: 'Admin', status: 'Active' }, { name: 'Nina', role: 'Admin', status: 'Active' }], queue: d.queue || [], today_items: d.today_items || [], unstaffed: d.unstaffed || [], sync: d.sync };
  }
  /* ---------- model helpers ---------- */
  function M() { return S.m; }
  function stu(id) { return M().students.filter(function (s) { return s.id === id; })[0]; }
  function prv(id) { return M().providers.filter(function (p) { return p.id === id; })[0]; }
  function lines(s) { var L = []; s.cases.forEach(function (c) { c.lines.forEach(function (l) { l._case = c; L.push(l); }); }); return L; }
  function activeStudents() { return M().students.filter(function (s) { return s.status !== 'Closed'; }); }
  function scopeStudents() { var A = activeStudents(); if (S.role !== 'provider') return A; var p = prv(S.pid); return p ? A.filter(function (s) { return p.students.indexOf(s.id) >= 0; }) : []; }
  function scopeInv() { var I = M().invoices; return S.role === 'provider' ? I.filter(function (i) { return i.pid === S.pid; }) : I; }
  function tables(mo, pid, sid) {
    var T;
    if (M().mode === 'demo') T = M().invoices.filter(function (i) { return i.month === mo; });
    else { T = []; activeStudents().forEach(function (s) { lines(s).forEach(function (l, i) { if (l.sched && l.pid) T.push({ id: 'TT-' + s.id + '-' + i, month: mo, studentId: s.id, student: s.name, label: l.label, setting: l.setting, provider: l.provider, pid: l.pid, sessions: expand(l.sched, mo), status: 'Scheduled' }); }); }); }
    return T.filter(function (t) { return (!pid || t.pid === pid) && (!sid || t.studentId === sid); });
  }
  function byDay(T) { var o = {}; T.forEach(function (t) { t.sessions.forEach(function (x) { if (x.state !== 'Cancelled') o[x.date] = (o[x.date] || 0) + 1; }); }); return o; }
  function lineOf(inv) { var s = stu(inv.studentId), L = null; if (s && inv.tag) lines(s).forEach(function (x) { if (x.tag === inv.tag) L = x; }); return L; }
  function checks(inv) {
    var s = stu(inv.studentId) || { profile: {} }, a = M().agency, l = lineOf(inv);
    var unsigned = inv.sessions.filter(function (x) { return x.state === 'Completed' && x.note === 'Unsigned'; }).length;
    return [['Case number', !!inv.caseNum], ['Authorization (AI #) received', !!inv.ai && !inv.aiPending], ['Service type from authorization', !!inv.caseNum && !!inv.label], ['OSIS #', !!s.profile.osis], ['Home address', !!s.profile.address],
      ['Agency TIN', !!a.tin], ['Rate per session', !!inv.rate], ['Session length', !!inv.len], ['Within max sessions', !!(l && l.max && l.used <= l.max)], ['Session notes signed', inv.sessions.length > 0 && unsigned === 0 && inv.billed > 0],
      ['Provider signature', inv.sig.provider], [inv.signer + ' signature', inv.sig.other]];
  }
  function alerts() {
    var A = [], m = M(), t = m.today;
    activeStudents().forEach(function (s) {
      lines(s).forEach(function (l) {
        if (/Ended|Exhausted|Complete/.test(l.status)) return;
        if (l.max && l.used != null) { var left = l.max - l.used, pct = Math.round(100 * left / l.max); if (pct <= 15) A.push({ k: 'Hours', lv: pct <= 5 ? 'red' : 'yellow', t: (l.isBank ? 'Hour bank' : l.label) + ' at ' + pct + '% left', s: s, d: num(left) + ' of ' + num(l.max) + (l.isBank ? ' hrs' : ' sessions') + ' remaining' }); }
        if (l.end && days(t, l.end) >= 0 && days(t, l.end) <= 45) A.push({ k: 'Authorization', lv: days(t, l.end) <= 14 ? 'red' : 'yellow', t: (l.isBank ? 'Hour bank' : l.label) + ' ends ' + sd(l.end), s: s, d: days(t, l.end) + ' days' });
        if (l.aiPending) A.push({ k: 'Authorization', lv: 'yellow', t: 'AI ' + l.ai + ' pending: ' + l.label, s: s, d: 'Sessions tracked, invoice held' });
        if (l.status === 'Needs provider') A.push({ k: 'Staffing', lv: 'red', t: 'Needs ' + l.label + ' provider', s: s, d: '' });
      });
      if (s.hearing && s.hearing.disclosure) { var dd = days(t, s.hearing.disclosure); if (dd >= 0 && dd <= 42) A.push({ k: 'Hearing', lv: dd <= 21 ? 'red' : 'yellow', t: 'Disclosure ' + sd(s.hearing.disclosure), s: s, d: 'Hearing ' + sd(s.hearing.date) + ', packet due' }); }
      if (s.intake && /^not received/i.test(s.intake.status)) A.push({ k: 'Intake', lv: 'yellow', t: 'Intake papers not received', s: s, d: s.intake.missing || '' });
    });
    if (m.mode === 'demo') m.invoices.forEach(function (i) {
      var s = stu(i.studentId); if (!s) return;
      if (i.status === 'Blocked') A.push({ k: 'Billing', lv: 'red', t: 'Invoice blocked: ' + i.reason, s: s, d: i.label + ', ' + i.provider + ', ' + mname(i.month), inv: i.id });
      if (i.status === 'Held') A.push({ k: 'Billing', lv: 'yellow', t: 'Invoice held: ' + i.reason, s: s, d: i.label + ', ' + mname(i.month), inv: i.id });
      var u = i.sessions.filter(function (x) { return x.note === 'Unsigned'; }).length; if (u) A.push({ k: 'Notes', lv: 'yellow', t: u + ' unsigned session note' + (u > 1 ? 's' : ''), s: s, d: i.provider + ', ' + i.label, inv: i.id });
    });
    (m.today_items || []).forEach(function (x) { var td = (m.triggers || []).filter(function (y) { return y.id === x.trigger; })[0]; A.push({ k: 'Trigger ' + x.trigger, lv: 'blue', t: x.note || (td ? td.name : x.trigger), s: stu(x.case_id) || { name: x.student, id: x.case_id }, d: x.recipient ? 'To ' + x.recipient : '' }); });
    var rank = { red: 0, yellow: 1, blue: 2 };
    if (S.role === 'provider') { var ids = scopeStudents().map(function (s) { return s.id; }); A = A.filter(function (a) { if (a.inv) { var iv = m.invoices.filter(function (i) { return i.id === a.inv; })[0]; return iv && iv.pid === S.pid; } return ids.indexOf(a.s.id) >= 0; }); }
    return A.sort(function (a, b) { return rank[a.lv] - rank[b.lv]; });
  }
  function hoursTotals(list) {
    var auth = 0, used = 0, n = 0; (list || activeStudents()).forEach(function (s) { lines(s).forEach(function (l) { if (l.max && l.used != null && (M().mode === 'live' ? l.isBank : !/Ended|Complete/.test(l.status))) { var h = (l.len || 60) / 60; auth += l.max * h; used += l.used * h; n++; } }); });
    return { auth: auth, used: used, n: n };
  }
  /* ---------- navigation ---------- */
  var NAV = {
    admin: [['Overview', [['home', 'Home', 'home'], ['notifications', 'Notifications', 'bell']]], ['People', [['users', 'Users', 'users']]], ['Care', [['assignments', 'Assignments', 'link'], ['assignments/new', 'New assignment', 'plus'], ['sessions', 'Tutoring Sessions', 'cal']]],
      ['Students', [['students', 'Students', 'cap'], ['students/new', 'Add student', 'userplus']]], ['Billing', [['invoices', 'Service invoices', 'file'], ['invoices/new', 'New service invoice', 'plus'], ['builder', 'Billing sheet builder', 'sheet']]],
      ['Signing', [['access', 'Issue access link', 'pen']]], ['Compliance', [['documents', 'Documents', 'folder']]], ['Ops', [['hours', 'Hours and authorizations', 'clock'], ['alerts', 'Alerts', 'zap'], ['intake', 'Intake status', 'clip'], ['ensora', 'Ensora', 'pulse'], ['reports', 'Reports', 'chart']]]],
    provider: [['Overview', [['home', 'Home', 'home'], ['notifications', 'Notifications', 'bell'], ['profile', 'Profile', 'id']]], ['Care', [['assignments', 'Assignments', 'link'], ['sessions', 'Tutoring Sessions', 'cal']]], ['Students', [['students', 'Students', 'cap']]], ['Billing', [['invoices', 'Service invoices', 'file'], ['invoices/new', 'New service invoice', 'plus']]]],
    owner: [['Overview', [['owner', 'Home', 'home'], ['notifications', 'Notifications', 'bell']]], ['Billing', [['workspace', 'Billing workspace', 'grid'], ['invoices', 'Service invoices', 'file'], ['money', 'Revenue and margin', 'coins']]], ['Hours', [['hours', 'Hours and authorizations', 'clock'], ['alerts', 'Alerts', 'zap']]], ['Students', [['students', 'Students', 'cap']]], ['Ops', [['intake', 'Intake status', 'clip'], ['reports', 'Reports', 'chart']]]]
  };
  function route() { var h = (location.hash || '').replace(/^#\/?/, ''); return h || (S.role === 'owner' ? 'owner' : 'home'); }
  function meName() { if (S.role === 'provider') { var p = prv(S.pid); return p ? p.name : 'Provider'; } return S.role === 'owner' ? (M().mode === 'demo' ? 'Owner (demo)' : 'Owner') : (M().mode === 'demo' ? 'Roni (demo)' : 'Roni'); }
  function shell() {
    var r = route(), base = r.split('/')[0], al = alerts().filter(function (a) { return a.lv === 'red'; }).length;
    var exact = NAV[S.role].some(function (g2) { return g2[1].some(function (x) { return x[0] === r; }); });
    var nav = NAV[S.role].map(function (g) { return '<h6>' + g[0] + '</h6>' + g[1].map(function (n) { var on = r === n[0] || (!exact && base === n[0]); return '<a href="#/' + n[0] + '" class="' + (on ? 'on' : '') + '">' + ic(n[2]) + '<span>' + n[1] + '</span>' + (n[0] === 'notifications' && al ? '<em>' + al + '</em>' : '') + '</a>'; }).join(''); }).join('');
    var roleL = { admin: 'Admin', provider: 'Provider', owner: 'Owner' }[S.role];
    $('#side').innerHTML = '<div class="logo">' + LOGO + '<div><b>TOGETHER</b><small>THEY GROW</small></div></div><nav class="nav">' + nav + '</nav>' +
      '<div class="me" id="me">' + av(meName()) + '<div class="grow"><b>' + esc(meName()) + '</b><small>' + roleL + '</small></div>' + ic('updown').replace('<svg', '<svg style="width:14px;height:14px;color:#8a847d"') + '</div>';
    var crumbs = { home: 'Home', owner: 'Home', notifications: 'Notifications', users: 'Users', assignments: 'Assignments', sessions: 'Tutoring Sessions', students: 'Students', invoices: 'Service invoices', builder: 'Billing sheet builder', access: 'Issue access link', documents: 'Documents', hours: 'Hours and authorizations', alerts: 'Alerts', intake: 'Intake status', ensora: 'Ensora', reports: 'Reports', workspace: 'Billing workspace', money: 'Revenue and margin', profile: 'Profile' };
    var sub = r.split('/')[1], c = crumbs[base] || 'Home';
    if (sub === 'new') c = '<b>' + ({ assignments: 'New assignment', students: 'Add student', invoices: 'New service invoice' }[base] || c) + '</b>';
    else if (sub && base === 'students') { var s = stu(decodeURIComponent(sub)); c = '<a href="#/students">Students</a> / <b>' + esc(s ? s.name : '') + '</b>'; }
    else if (sub && base === 'invoices') c = '<a href="#/invoices">Service invoices</a> / <b>Invoice</b>';
    else c = '<b>' + c + '</b>';
    $('#crumb').innerHTML = c;
  }
  function openMenu() {
    var el = $('#me'); if ($('.menu', el)) { $('.menu', el).remove(); return; }
    var P0 = M().providers.filter(function (p) { return p.status !== 'Left' && p.students.length; });
    var h = '<div class="menu"><div class="muted" style="padding:4px 8px">View as</div>' + ['admin', 'owner', 'provider'].map(function (r) { return '<button data-role="' + r + '" class="' + (S.role === r ? 'on' : '') + '">' + { admin: 'Admin', owner: 'Owner', provider: 'Provider' }[r] + '</button>'; }).join('') +
      (S.role === 'provider' ? '<hr><div style="padding:4px 8px"><select class="sel" id="pidSel" style="width:100%">' + P0.map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === S.pid ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select></div>' : '') +
      '<hr>' + (MODE === 'demo' ? '<button data-go="./">Live data</button>' : '<button data-go="demo.html">Demo data</button><button data-go="../">TTG Ops</button>') + '</div>';
    el.insertAdjacentHTML('beforeend', h);
  }
  /* ---------- shared components ---------- */
  function ph(t, sub, act) { return '<div class="ph"><div><h1>' + t + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (act || '') + '</div>'; }
  function monthSw() { return '<div class="monthsw"><button class="ib" data-mo="-1">' + ic('chevl') + '</button><span>' + mname(S.month) + '</span><button class="ib" data-mo="1">' + ic('chev') + '</button></div>'; }
  function stat(t, v, f, icon, href) { return '<a class="card stat" href="' + (href || '#') + '"><div class="h"><span>' + t + '</span>' + ic(icon) + '</div><div class="v">' + v + '</div><div class="f"><span>' + f + '</span>' + ic('chev') + '</div></a>'; }
  function calendar(T, title, opts) {
    opts = opts || {}; var mo = S.month, y = +mo.slice(0, 4), m = +mo.slice(5), first = new Date(y, m - 1, 1).getDay(), dim = new Date(y, m, 0).getDate(), D = byDay(T), h = '';
    h += '<div class="card cal">' + (title ? '<div class="hd"><b style="font-weight:500">' + title + '</b>' + (opts.filter || '') + '</div>' : '') + '<div class="mh"><button class="ib" data-mo="-1">' + ic('chevl') + '</button><span>' + mname(mo) + '</span><button class="ib" data-mo="1">' + ic('chev') + '</button></div><div class="grid">';
    h += ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(function (d) { return '<div class="dw">' + d + '</div>'; }).join('');
    for (var i = 0; i < first; i++) h += '<div></div>';
    for (var d = 1; d <= dim; d++) { var ds = mo + '-' + String(d).padStart(2, '0'), n = D[ds] || 0, c = n >= (opts.hi || 12) ? 'h3' : n >= (opts.mid || 5) ? 'h2' : n ? 'h1' : ''; h += '<div class="d ' + c + (ds === M().today ? ' today' : '') + (S.f.day === ds ? ' sel' : '') + '" data-day="' + ds + '">' + d + (n ? '<span>' + n + '</span>' : '') + '</div>'; }
    h += '</div><div class="lg">Sessions a day: <span><i style="background:#fbeadc"></i>1+</span><span><i style="background:#f5c9a6"></i>' + (opts.mid || 5) + '+</span><span><i style="background:#e9955f"></i>' + (opts.hi || 12) + '+</span></div></div>';
    return h;
  }
  function provOpts(sel, list) { return (list || M().providers.filter(function (p) { return p.students.length; })).map(function (p) { return '<option value="' + esc(p.id) + '"' + (sel === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join(''); }
  function invRow(i) {
    return '<tr class="click" data-href="#/invoices/' + esc(i.id) + '"><td><b>' + esc(i.student) + '</b><div class="muted">' + esc(i.caseNum || 'No case #') + (i.ai ? ' · AI ' + esc(i.ai) : '') + '</div></td><td>' + esc(i.label) + '<div class="muted">' + esc(i.setting) + '</div></td><td>' + esc(i.provider) + '</td><td>' + mname(i.month).replace(/ \d+$/, '') + '</td>' +
      '<td class="n">' + (i.billed ? num(i.billed) : '<span class="muted">' + i.sessions.length + ' sched</span>') + '</td><td class="n">' + (i.total ? money(i.total) : '<span class="muted">No rate</span>') + '</td><td>' + pill(i.status) + (i.reason ? '<div class="muted" style="margin-top:3px">' + esc(i.reason) + '</div>' : '') + '</td></tr>';
  }
  function invTable(L) { return L.length ? '<div class="card tw"><table><thead><tr><th>Student / case</th><th>Service</th><th>Provider</th><th>Month</th><th class="n">Sessions</th><th class="n">Total</th><th>Status</th></tr></thead><tbody>' + L.map(invRow).join('') + '</tbody></table></div>' : '<div class="card empty">No service invoices</div>'; }
  function alertList(A, max) {
    if (!A.length) return '<div class="card empty">Nothing needs attention</div>';
    return '<div class="card">' + A.slice(0, max || 999).map(function (a) {
      return '<a class="alert" href="' + (a.inv ? '#/invoices/' + esc(a.inv) : '#/students/' + encodeURIComponent(a.s.id || '')) + '"><span class="ic ' + a.lv + '">' + ic(a.lv === 'blue' ? 'bell' : a.k === 'Billing' ? 'file' : a.k === 'Hours' ? 'clock' : 'warn') + '</span><div class="grow"><b style="font-weight:500">' + esc(a.t) + '</b><div class="muted">' + esc(a.s.name || '') + (a.d ? ' · ' + esc(a.d) : '') + '</div></div><span class="tag">' + esc(a.k) + '</span></a>';
    }).join('') + '</div>';
  }
  function invCounts(mo) { var o = {}; M().invoices.filter(function (i) { return i.month === mo; }).forEach(function (i) { o[i.status] = (o[i.status] || 0) + 1; }); return o; }
  function intakeCounts(kind) { var o = {}; M().intake.filter(function (x) { return x.kind === kind; }).forEach(function (x) { o[x.status || 'Unknown'] = (o[x.status || 'Unknown'] || 0) + 1; }); return o; }
  function stackBar(o, colors) { var tot = 0; Object.keys(o).forEach(function (k) { tot += o[k]; }); if (!tot) return '<div class="muted">No data</div>'; return '<div class="bar" style="height:10px">' + Object.keys(o).map(function (k) { return '<i style="width:' + (100 * o[k] / tot) + '%;background:' + (colors[k] || '#d6d3d1') + '" title="' + esc(k) + '"></i>'; }).join('') + '</div><div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:9px">' + Object.keys(o).map(function (k) { return '<span class="muted"><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + (colors[k] || '#d6d3d1') + ';margin-right:5px"></i>' + esc(k) + ' <b style="color:#1c1917">' + o[k] + '</b></span>'; }).join('') + '</div>'; }
  var ICOL = { 'Received': '#22a35a', 'Partial': '#e8a317', 'Received, incomplete': '#f0c36a', 'Not received': '#dc3c3c', 'Closed': '#a8a29e' };
  var BCOL = { 'Sent to DOE': '#22a35a', 'Ready to send': '#3b6ff5', 'Waiting for signatures': '#e8a317', 'Held': '#f0c36a', 'Blocked': '#dc3c3c', 'In progress': '#e9955f' };
  function kv(pairs) { return '<dl class="kv">' + pairs.map(function (p) { return '<dt>' + p[0] + '</dt><dd>' + (p[1] ? esc(p[1]) : p[2] ? '<span class="miss">Missing</span>' : '<span class="muted">Not on file</span>') + '</dd>'; }).join('') + '</dl>'; }
  function schedTxt(s) { return (Array.isArray(s) ? s : [s]).map(function (x) { return x.days.map(function (d) { return DW[d][0].toUpperCase() + DW[d].slice(1); }).join(' ') + ' ' + x.start + '-' + x.end; }).join('; '); }
  function sigBox(who, name, ok) { return '<div class="sig ' + (ok ? 'ok' : 'no') + '"><small class="muted">' + who + '</small><div class="s">' + (ok ? esc(name) : '&nbsp;') + '</div><div class="muted">' + (ok ? 'Signed' : 'Not signed') + '</div></div>'; }
  var V = {};
  /* ---------- views: their sections ---------- */
  V.home = function () {
    if (S.role === 'owner') return V.owner();
    var prov = S.role === 'provider', SS = scopeStudents(), mo = S.month, I = scopeInv().filter(function (i) { return i.month === mo; }), T = tables(mo, prov ? S.pid : S.f.hp || '');
    var signed = I.filter(function (i) { return i.sig.provider && i.sig.other; }).length, wait = I.length - signed;
    var comp = 0, sch = 0; T.forEach(function (t) { t.sessions.forEach(function (x) { if (x.state === 'Completed') comp++; else if (x.state === 'Scheduled') sch++; }); });
    var P0 = M().providers.filter(function (p) { return p.status !== 'Left'; });
    var h = '<div class="page">' + ph('Welcome, ' + esc(meName().split(' ')[0].replace(/^Dr\.$/, meName())), '', monthSw());
    h += '<div class="stats' + (prov ? ' s3' : '') + '">' + stat(prov ? 'Your students' : 'Students', SS.length, SS.filter(function (s) { return lines(s).some(function (l) { return l.pid && !/Ended|Complete|Exhausted/.test(l.status); }); }).length + ' with an active assignment', 'cap', '#/students') +
      (prov ? '' : stat('Providers', P0.length, P0.filter(function (p) { return p.intake && /^received$/i.test(p.intake.status); }).length + ' onboarded', 'link', '#/users')) +
      stat('Invoices signed', signed, wait + ' waiting for signatures', 'file', '#/invoices') + stat('Sessions this month', comp + sch, comp + ' completed · ' + sch + ' scheduled', 'cal', '#/sessions') + '</div>';
    var filt = prov ? '' : '<select class="sel" data-f="hp"><option value="">All providers</option>' + provOpts(S.f.hp) + '</select>';
    h += '<div class="g2"><div>' + calendar(T, 'Sessions by day', { filter: filt, mid: prov ? 2 : 15, hi: prov ? 3 : 30 }) + '</div><div>';
    if (prov) {
      var up = []; T.forEach(function (t) { t.sessions.forEach(function (x) { if (x.date >= M().today && x.state === 'Scheduled') up.push({ x: x, t: t }); }); }); up.sort(function (a, b) { return a.x.date + a.x.start < b.x.date + b.x.start ? -1 : 1; });
      h += '<h3 style="margin:2px 0 10px">Next up</h3>' + (up.length ? '<div class="card">' + up.slice(0, 7).map(function (u) { return '<div class="row"><div class="grow"><b>' + esc(u.t.student) + '</b><div class="muted">' + esc(u.t.label) + ' · ' + esc(u.t.setting) + '</div></div><div style="text-align:right"><b>' + sd(u.x.date) + '</b><div class="muted">' + u.x.start + ' to ' + u.x.end + '</div></div></div>'; }).join('') + '</div>' : '<div class="card empty">Nothing scheduled ahead</div>');
    } else {
      var byP = {}; T.forEach(function (t) { var o = byP[t.pid] || (byP[t.pid] = { name: t.provider, n: 0, inv: 0, st: {} }); o.n += t.sessions.filter(function (x) { return x.state !== 'Cancelled'; }).length; });
      I.forEach(function (i) { var o = byP[i.pid]; if (o) { o.inv++; o.st[i.status] = 1; } });
      var PL = Object.keys(byP).map(function (k) { byP[k].id = k; return byP[k]; }).sort(function (a, b) { return b.n - a.n; });
      h += '<h3 style="margin:2px 0 10px">Providers in ' + mname(mo) + '</h3>' + (PL.length ? '<div class="card" style="max-height:398px;overflow:auto">' + PL.map(function (p) { return '<a class="row" href="#/profile/' + esc(p.id) + '">' + av(p.name) + '<div class="grow"><b class="t">' + esc(p.name) + '</b><div class="muted">' + p.n + ' sessions · ' + p.inv + ' invoice' + (p.inv === 1 ? '' : 's') + '</div></div>' + (p.st.Blocked ? pill('Blocked') : p.st.Held ? pill('Held') : '') + '</a>'; }).join('') + '</div>' : '<div class="card empty">No sessions or invoices this month</div>');
    }
    h += '</div></div>';
    var A = alerts(), ht = hoursTotals(SS);
    h += '<div class="g2e" style="margin-top:8px"><div><div class="sec"><h2>Hours used vs authorized</h2><a class="muted" href="#/' + (prov ? 'students' : 'hours') + '">All</a></div><div class="card pad"><div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap"><span style="font-size:24px;font-weight:600">' + num(Math.round(ht.used)) + '</span><span class="muted">of ' + num(Math.round(ht.auth)) + ' hrs authorized · ' + ht.n + ' line' + (ht.n === 1 ? '' : 's') + '</span></div><div style="margin-top:10px">' + bar(ht.auth ? 100 * ht.used / ht.auth : 0) + '</div></div>';
    if (!prov) {
      h += '<div class="sec"><h2>Intake papers</h2><a class="muted" href="#/intake">All</a></div><div class="card pad"><h3>Students</h3>' + stackBar(intakeCounts('Student'), ICOL) + '<h3 style="margin-top:14px">Providers</h3>' + stackBar(intakeCounts('Provider'), ICOL) + '</div>';
      var bm = M().mode === 'demo' ? addM(M().today.slice(0, 7), -1) : M().today.slice(0, 7);
      h += '<div class="sec"><h2>Billing, ' + mname(bm) + '</h2><a class="muted" href="#/invoices">All</a></div><div class="card pad">' + stackBar(invCounts(bm), BCOL) + '</div>';
    }
    h += '</div><div><div class="sec"><h2>Alerts</h2><a class="muted" href="#/notifications">All ' + A.length + '</a></div>' + alertList(A, prov ? 6 : 10) + '</div></div>';
    return h + '</div>';
  };
  V.notifications = function () {
    var A = alerts(), k = S.f.ak || '', kinds = {}; A.forEach(function (a) { kinds[a.k] = (kinds[a.k] || 0) + 1; });
    var h = '<div class="page">' + ph('Notifications', A.length + ' open') + '<div class="filters"><select class="sel" data-f="ak"><option value="">All types (' + A.length + ')</option>' + Object.keys(kinds).sort().map(function (x) { return '<option value="' + esc(x) + '"' + (x === k ? ' selected' : '') + '>' + esc(x) + ' (' + kinds[x] + ')</option>'; }).join('') + '</select></div>';
    return h + alertList(A.filter(function (a) { return !k || a.k === k; })) + '</div>';
  };
  V.users = function () {
    var q = (S.f.uq || '').toLowerCase(), rf = S.f.ur || '';
    var U = M().admins.map(function (a) { return { name: a.name, sub: a.email || a.role, role: a.role, st: a.status }; }).concat(M().providers.map(function (p) { return { name: p.name, sub: (p.role || 'Provider') + (p.email ? ' · ' + p.email : ''), role: 'Provider', st: p.status === 'Left' ? 'Left' : p.intake ? p.intake.status : '', pid: p.id, n: p.students.length }; }));
    var L = U.filter(function (u) { return (!rf || u.role === rf) && (!q || u.name.toLowerCase().indexOf(q) >= 0); });
    var h = '<div class="page">' + ph('Users', '', '<button class="btn" data-demo>' + ic('userplus') + 'Invite user</button>');
    h += '<div class="filters"><select class="sel" data-f="ur"><option value="">All roles (' + U.length + ')</option>' + ['Admin', 'Owner', 'Provider'].map(function (r) { return '<option' + (rf === r ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select><input class="inp" placeholder="Search by name" data-f="uq" value="' + esc(S.f.uq || '') + '"><span class="muted" style="margin-left:auto;align-self:center">' + L.length + ' users</span></div>';
    return h + '<div class="card">' + L.map(function (u) { return '<div class="row' + (u.pid ? ' click" data-href="#/profile/' + esc(u.pid) : '') + '">' + av(u.name) + '<div class="grow"><b>' + esc(u.name) + '</b><div class="muted">' + esc(u.sub) + '</div><div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap"><span class="tag">' + esc(u.role) + '</span>' + (u.st ? pill(u.st) : '') + '</div></div>' + (u.n ? '<span class="muted">' + u.n + ' student' + (u.n > 1 ? 's' : '') + '</span>' : '') + '</div>'; }).join('') + '</div></div>';
  };
  V.assignments = function (sub) {
    if (sub === 'new') return V.newAssignment();
    var g = S.f.ag || 'student', sv = S.f.as || '', pf = S.f.apf || '', showRate = S.f.rate, R = [];
    scopeStudents().forEach(function (s) { lines(s).forEach(function (l) { if (l.isBank) return; if (S.role === 'provider' && l.pid !== S.pid) return; R.push({ s: s, l: l }); }); });
    var svcs = {}; R.forEach(function (r) { svcs[r.l.label] = 1; });
    var L = R.filter(function (r) { return (!sv || r.l.label === sv) && (!pf || r.l.pid === pf); });
    var h = '<div class="page wide">' + ph('Assignments', '', S.role === 'admin' ? '<a class="btn" href="#/assignments/new">' + ic('plus') + 'New assignment</a>' : '');
    h += '<div class="filters"><select class="sel" data-f="ag"><option value="student"' + (g === 'student' ? ' selected' : '') + '>Group by student</option><option value="provider"' + (g === 'provider' ? ' selected' : '') + '>Group by provider</option></select><span class="sel" style="display:inline-flex;align-items:center">All assignments (' + R.length + ')</span>' +
      '<select class="sel" data-f="as"><option value="">All services</option>' + Object.keys(svcs).sort().map(function (x) { return '<option' + (x === sv ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>' + (S.role === 'provider' ? '' : '<select class="sel" data-f="apf"><option value="">All providers</option>' + provOpts(pf) + '</select>') +
      (S.role !== 'provider' && M().mode === 'demo' ? '<button class="btn ghost" data-act="rate">' + (showRate ? 'Hide rates' : 'Show rates') + '</button>' : '') + '</div>';
    if (!L.length) return h + '<div class="card empty">No assignments</div></div>';
    var G = {}; L.forEach(function (r) { var k = g === 'student' ? r.s.name : (r.l.provider || 'Needs provider'); (G[k] = G[k] || []).push(r); });
    Object.keys(G).sort().forEach(function (k) {
      h += '<div class="sec" style="margin-top:18px"><h2 style="display:flex;gap:8px;align-items:center">' + av(k) + esc(k) + '</h2><span class="muted">' + G[k].length + '</span></div><div class="card tw"><table><thead><tr><th>' + (g === 'student' ? 'Provider' : 'Student') + '</th><th>Service</th><th>Setting</th><th>Schedule</th><th>Authorization</th>' + (showRate ? '<th class="n">DOE rate</th><th class="n">Pay rate</th>' : '') + '<th>Status</th></tr></thead><tbody>' +
        G[k].map(function (r) { var l = r.l, p = prv(l.pid); return '<tr class="click" data-href="#/students/' + encodeURIComponent(r.s.id) + '"><td><b>' + esc(g === 'student' ? (l.provider || 'Open') : r.s.name) + '</b>' + (p && g === 'student' ? '<div class="muted">' + esc(p.role) + '</div>' : '') + '</td><td>' + esc(l.label) + (l.tag ? '<div class="muted">' + esc(l.tag) + '</div>' : '') + '</td><td>' + esc(l.setting) + '</td><td>' + esc(l.schedule || (l.sched ? schedTxt(l.sched) : '') || l.type || '') + '</td><td>' + (l.ai ? 'AI ' + esc(l.ai) + (l.aiPending ? ' pending' : '') + '<div class="muted">' + esc(l._case.num) + '</div>' : '<span class="muted">' + (l.end ? 'to ' + sd(l.end) : 'Not on file') + '</span>') + '</td>' + (showRate ? '<td class="n">' + money(l.rate) + '</td><td class="n">' + (p && p.payRate ? money(p.payRate) + '/hr' : '') + '</td>' : '') + '<td>' + pill(l.status) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    });
    return h + '</div>';
  };
  V.newAssignment = function () {
    var SS = activeStudents();
    var h = '<div class="page" style="max-width:760px">' + ph('New assignment') + '<div class="card pad"><div class="form">';
    h += '<label>Student<select>' + SS.map(function (s) { return '<option>' + esc(s.name) + '</option>'; }).join('') + '</select></label><label>Case number<select>' + (SS[0] ? SS[0].cases.map(function (c) { return '<option>' + esc(c.num || 'No case # on file') + '</option>'; }).join('') : '') + '</select></label>';
    h += '<label>Provider<select>' + provOpts('') + '</select></label><label>Service (DOE wording)<select>' + ['ABA', 'BCBA Supervision', 'Speech Therapy', 'Occupational Therapy', 'Physical Therapy', 'Counseling', 'SETSS', 'Parent Counseling and Training', 'Assistive Technology Training', 'Home Instruction', 'Tutoring'].map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select></label>';
    h += '<label>AI #<input placeholder="1"></label><label>Funding<select><option>IHO</option><option>Pendency</option><option>RSA</option><option>DOE</option></select></label><label>Line type<select><option>Weekly</option><option>Bank</option><option>Compensatory</option><option>Flat fee</option></select></label><label>Setting<select><option>School</option><option>Home</option><option>Community</option><option>Remote</option></select></label>';
    h += '<label>Max sessions<input type="number" placeholder="600"></label><label>Session length (min)<input type="number" placeholder="60"></label><label>DOE rate per session<input placeholder="$"></label><label>Provider pay rate<input placeholder="$ per hour"></label>';
    h += '<label>Authorized from<input type="date"></label><label>Authorized to<input type="date"></label><label class="full">Weekly schedule<input placeholder="Mon-Fri 8:00-11:00"></label>';
    return h + '</div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><a class="btn ghost" href="#/assignments">Cancel</a><button class="btn" data-demo>Create assignment</button></div></div></div>';
  };
  V.sessions = function () {
    var prov = S.role === 'provider', pf = prov ? S.pid : S.f.tp || '', sf = S.f.ts || '', T = tables(S.month, pf, sf);
    var h = '<div class="page wide">' + ph('Tutoring Sessions') + '<div class="sesgrid"><div><h3>Upcoming tutoring sessions</h3>' + calendar(T, '', { mid: prov ? 2 : 15, hi: prov ? 3 : 30 });
    var day = S.f.day && S.f.day.slice(0, 7) === S.month ? S.f.day : '', up = [];
    T.forEach(function (t) { t.sessions.forEach(function (x) { if (day ? x.date === day : (x.date >= M().today && x.state === 'Scheduled')) up.push({ x: x, t: t }); }); }); up.sort(function (a, b) { return a.x.date + a.x.start < b.x.date + b.x.start ? -1 : 1; });
    h += '<h3 style="margin-top:16px">' + (day ? sd(day) : 'Next up') + '</h3>' + (up.length ? '<div class="card">' + up.slice(0, 10).map(function (u) { return '<div class="row"><div class="grow"><b>' + esc(u.t.student) + '</b><div class="muted">' + esc(u.t.label) + ' · ' + esc(u.t.provider) + '</div></div><div style="text-align:right"><b>' + u.x.start + '</b><div>' + pill(u.x.state) + '</div></div></div>'; }).join('') + '</div>' : '<div class="card empty">No sessions</div>') + '</div>';
    h += '<div><div class="sec" style="margin-top:0"><h3 style="margin:0">Time Table</h3><button class="btn" data-demo>' + ic('plus') + 'Create New</button></div><div class="filters">' + monthSw() + (prov ? '' : '<select class="sel" data-f="tp"><option value="">All providers</option>' + provOpts(pf) + '</select>') + '<select class="sel" data-f="ts"><option value="">All students</option>' + scopeStudents().map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === sf ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></div>';
    if (!T.length) h += '<div class="card empty">No time tables for this selection</div>';
    else h += '<div class="card">' + T.slice(0, S.f.ttall ? 999 : 25).map(function (t) {
      var c = t.sessions.filter(function (x) { return x.state === 'Completed'; }).length, sc = t.sessions.filter(function (x) { return x.state === 'Scheduled'; }).length, un = t.sessions.filter(function (x) { return x.note === 'Unsigned'; }).length, open = S.f.tt === t.id;
      return '<div class="row click" data-tt="' + esc(t.id) + '"><div class="grow"><b>' + esc(t.student) + '</b> <span class="muted">' + esc(t.label) + '</span><div class="muted">' + esc(t.provider) + ' · ' + esc(t.setting) + '</div></div><div style="text-align:right;min-width:120px"><b>' + t.sessions.length + '</b> <span class="muted">sessions</span><div class="muted">' + c + ' done · ' + sc + ' sched' + (un ? ' · <span class="no">' + un + ' unsigned</span>' : '') + '</div></div></div>' +
        (open ? '<div class="tw" style="border-top:1px solid #f2f0ed;background:#fcfbfa"><table><thead><tr><th>Date</th><th>Time</th><th class="n">Hours</th><th>Status</th><th>Note</th></tr></thead><tbody>' + t.sessions.map(function (x) { return '<tr><td>' + sd(x.date) + '</td><td>' + x.start + ' to ' + x.end + '</td><td class="n">' + num(x.mins / 60) + '</td><td>' + pill(x.state) + '</td><td>' + pill(x.note) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '');
    }).join('') + (T.length > 25 && !S.f.ttall ? '<div class="row click" data-act="ttall"><span class="muted">Show all ' + T.length + '</span></div>' : '') + '</div>';
    return h + '</div></div></div>';
  };
  V.students = function (sub) {
    if (sub === 'new') return V.addStudent();
    if (sub) return V.student(decodeURIComponent(sub));
    var q = (S.f.sq || '').toLowerCase(), L = scopeStudents().filter(function (s) { return !q || s.name.toLowerCase().indexOf(q) >= 0; });
    var h = '<div class="page wide">' + ph('Students', '', S.role === 'admin' ? '<a class="btn" href="#/students/new">' + ic('plus') + 'Add student</a>' : '') + '<div class="filters"><input class="inp" placeholder="Search students" data-f="sq" value="' + esc(S.f.sq || '') + '"><span class="muted" style="margin-left:auto;align-self:center">' + L.length + ' students</span></div>';
    return h + '<div class="card">' + (L.length ? L.map(function (s) {
      var b = hoursTotals([s]), team = lines(s).filter(function (l) { return l.provider && !/Ended|Complete|Exhausted/.test(l.status); }).map(function (l) { return l.provider; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
      return '<a class="row" href="#/students/' + encodeURIComponent(s.id) + '">' + av(s.name) + '<div class="grow"><b>' + esc(s.name) + '</b><div class="muted t">' + esc(s.setting) + (team.length ? ' · ' + esc(team.slice(0, 3).join(', ')) + (team.length > 3 ? ' +' + (team.length - 3) : '') : '') + '</div></div>' +
        '<div class="hide-m" style="width:150px">' + (b.auth ? '<div class="muted" style="font-size:11px;margin-bottom:4px">' + num(Math.round(b.used)) + ' / ' + num(Math.round(b.auth)) + ' hrs</div>' + bar(100 * b.used / b.auth) : '<span class="muted">No hours on file</span>') + '</div>' +
        '<div class="hide-m" style="width:110px;text-align:right">' + (s.intake ? pill(s.intake.status) : '') + '</div>' + (S.role === 'provider' ? '' : dots(s.health)) + '</a>';
    }).join('') : '<div class="empty">No students</div>') + '</div></div>';
  };
  V.student = function (id) {
    var s = stu(id); if (!s || (S.role === 'provider' && scopeStudents().indexOf(s) < 0)) return '<div class="page"><div class="card empty">Student not found</div></div>';
    var tab = S.tab.st || 'overview', pr = s.profile || {}, prov = S.role === 'provider';
    var TABS = [['overview', 'Overview'], ['cases', 'Cases and services'], ['hours', 'Hours'], ['documents', 'Documents'], ['intake', 'Intake and Ensora'], ['billing', 'Billing']].concat(prov ? [] : [['notes', 'Notes']]);
    var nc = s.cases.filter(function (c) { return c.num; }).length;
    var h = '<div class="page wide"><div class="ph"><div style="display:flex;gap:12px;align-items:center">' + av(s.name).replace('class="av"', 'class="av" style="width:42px;height:42px;font-size:14px"') + '<div><h1>' + esc(s.name) + '</h1><p>' + esc([s.code, s.setting, nc ? nc + ' case number' + (nc === 1 ? '' : 's') : ''].filter(String).join(' · ')) + '</p></div></div><div style="display:flex;gap:8px;align-items:center">' + pill(s.status) + (prov ? '' : dots(s.health)) + '</div></div>';
    h += '<div class="tabs" style="overflow-x:auto">' + TABS.map(function (t) { return '<a data-tab="st:' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '" style="white-space:nowrap">' + t[1] + '</a>'; }).join('') + '</div>';
    if (tab === 'overview') {
      var A = alerts().filter(function (a) { return a.s.id === s.id; });
      h += '<div class="g2e"><div class="card pad"><h3>Profile</h3>' + kv([['OSIS #', pr.osis, 1], ['Home address', prov ? (pr.address ? 'On file' : '') : pr.address, 1], ['Date of birth', pr.dob], ['Guardian', pr.guardian, 1], ['Phone / email', [pr.phone, pr.email].filter(Boolean).join(' · ')], ['Language', pr.language], ['School', pr.school], ['School contact', pr.schoolContact], ['Referring lawyer', pr.lawyer], ['Classification', pr.classification]]) + '</div><div>';
      h += '<div class="card pad"><h3>Team</h3>' + ((s.team || []).length ? s.team.map(function (t) { return '<div style="display:flex;gap:9px;align-items:center;padding:5px 0">' + av(t.name) + '<div class="grow"><b style="font-weight:500">' + esc(t.name) + '</b><div class="muted">' + esc(t.role) + '</div></div></div>'; }).join('') : '<div class="muted">No team on file</div>') + ((s.gaps || []).length ? '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' + s.gaps.map(function (g) { return pill('Needs ' + g.role + (g.days ? ', ' + g.days + 'd' : ''), 'red'); }).join('') + '</div>' : '') + '</div>';
      if (s.hearing) h += '<div class="card pad" style="margin-top:12px"><h3>Hearing</h3><dl class="kv"><dt>Hearing</dt><dd>' + sd(s.hearing.date) + '</dd><dt>Disclosure</dt><dd>' + sd(s.hearing.disclosure) + '</dd><dt>Packet</dt><dd>Due by disclosure</dd></dl></div>';
      if (!prov && s.why) h += '<div class="card pad" style="margin-top:12px"><h3>Why</h3><div>' + esc(s.why) + '</div></div>';
      h += '</div></div><div class="sec"><h2>Alerts</h2></div>' + alertList(A);
    }
    if (tab === 'cases') s.cases.forEach(function (c) {
      var CL = prov ? c.lines.filter(function (l) { return l.pid === S.pid; }) : c.lines; if (!CL.length) return;
      h += '<div class="card" style="margin-bottom:14px"><div class="pad" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;border-bottom:1px solid #f2f0ed"><div><b style="font-size:14px">' + esc(c.num || 'Case number not on file') + '</b><div class="muted">' + esc([c.basis, c.year ? 'SY ' + c.year : '', c.window].filter(Boolean).join(' · ')) + '</div></div><div style="display:flex;gap:6px;align-items:center">' + (c.funding ? '<span class="tag">' + esc(c.funding) + '</span>' : '') + pill(c.status) + '</div></div>';
      h += '<div class="tw"><table><thead><tr><th>Line</th><th>AI #</th><th>Setting</th><th>Type</th><th class="n">Max</th><th class="n">Length</th>' + (prov ? '' : '<th class="n">Rate</th>') + '<th>Used</th><th>Provider</th><th>Status</th></tr></thead><tbody>' + CL.map(function (l) {
        var pct = l.max && l.used != null ? 100 * l.used / l.max : null;
        return '<tr><td><b>' + esc(l.label) + '</b>' + (l.tag ? '<div class="muted">' + esc(l.tag) + '</div>' : '') + '</td><td>' + esc(l.ai || '') + (l.aiPending ? ' ' + pill('Pending') : '') + '</td><td>' + esc(l.setting) + '</td><td>' + esc(l.type || '') + '</td><td class="n">' + (l.max != null ? num(l.max) : '') + '</td><td class="n">' + (l.len && !l.isBank ? l.len + ' min' : '') + '</td>' + (prov ? '' : '<td class="n">' + (l.rate ? money(l.rate) : '') + '</td>') + '<td style="min-width:110px">' + (pct != null ? '<div class="muted" style="font-size:11px;margin-bottom:3px">' + num(l.used) + ' / ' + num(l.max) + '</div>' + bar(pct) : '') + '</td><td>' + esc(l.provider || '') + (l.history ? '<div class="muted">' + esc(l.history) + '</div>' : '') + '</td><td>' + pill(l.status) + '</td></tr>';
      }).join('') + '</tbody></table></div>' + (c.docs && c.docs.length && !prov ? '<div class="pad" style="border-top:1px solid #f2f0ed;display:flex;flex-wrap:wrap;gap:8px">' + c.docs.map(function (d) { return '<span class="tag" style="display:inline-flex;gap:6px;align-items:center;padding:3px 8px">' + esc(d.name) + ' ' + pill(d.status) + '</span>'; }).join('') + '</div>' : '') + '</div>';
    });
    if (tab === 'hours') h += hoursTable([s], true);
    if (tab === 'documents') {
      var D = (s.docs || []).map(function (d) { return ['Student', d.name, d.date, d.status]; });
      s.cases.forEach(function (c) { (c.docs || []).forEach(function (d) { D.push(['Case ' + (c.num || ''), d.name, '', d.status]); }); });
      if (s.intake) D.push(['Student', 'Intake papers', s.intake.last, s.intake.status]);
      h += D.length ? '<div class="card tw"><table><thead><tr><th>Level</th><th>Document</th><th>Date</th><th>Status</th></tr></thead><tbody>' + D.map(function (d) { return '<tr><td>' + esc(d[0]) + '</td><td>' + esc(d[1]) + '</td><td>' + sd(d[2]) + '</td><td>' + pill(d[3]) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="card empty">No documents on file</div>';
      if (!prov && s.intake && s.intake.links && s.intake.links.length) h += '<div class="card pad" style="margin-top:12px"><h3>Intake sources</h3>' + s.intake.links.map(function (u, i) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer" style="color:#c2500a;margin-right:12px">Source ' + (i + 1) + '</a>'; }).join('') + '</div>';
    }
    if (tab === 'intake') {
      var I = s.intake, E = s.ensora;
      h += '<div class="g2e"><div class="card pad"><h3>Intake papers</h3>' + (I ? '<div style="margin-bottom:10px">' + pill(I.status) + '</div>' + kv([['Team', I.who], ['Received', I.received], ['Missing', (I.missing || '').replace(/^Forms from: /, '')], ['Last received', I.last]]) : '<div class="muted">No intake record</div>') + '</div>';
      h += '<div class="card pad"><h3>Ensora</h3>' + (E ? '<div style="margin-bottom:10px">' + pill('Uses Ensora: ' + (E.use || 'Unknown'), PC[E.use] || 'yellow') + '</div>' + kv([['Data on file', E.data], ['Last capture', E.last], ['Source', E.source], ['Missing', E.missing]]) : '<div class="muted">No Ensora record</div>') + '</div></div>';
    }
    if (tab === 'billing') {
      var IV = scopeInv().filter(function (i) { return i.studentId === s.id; });
      if (M().mode === 'live' && s.fields && !prov) h += '<div class="card pad" style="margin-bottom:12px"><h3>Case board</h3>' + kv([['Sessions logged (mo)', s.fields['Sessions logged (mo)']], ['Notes submitted', s.fields['Notes submitted']], ['Invoice submitted', s.fields['Invoice submitted']], ['Billing gap', s.fields['Billing gap']], ['Sched vs delivered', s.fields['Sched vs delivered (month)']]]) + '</div>';
      h += invTable(IV);
    }
    if (tab === 'notes') h += (s.notes || []).length ? '<div class="card">' + s.notes.map(function (n) { return '<div class="row" style="align-items:flex-start"><div class="grow"><div>' + esc(n.text) + '</div><div class="muted">' + esc(n.author) + ' · ' + esc(n.type) + ' · ' + esc(String(n.ts).slice(0, 16).replace('T', ' ')) + '</div></div></div>'; }).join('') + '</div>' : '<div class="card empty">No notes</div>';
    return h + '</div>';
  };
  V.addStudent = function () {
    var f = function (l, p, full) { return '<label' + (full ? ' class="full"' : '') + '>' + l + '<input placeholder="' + (p || '') + '"></label>'; };
    return '<div class="page" style="max-width:760px">' + ph('Add student') + '<div class="card pad"><h3>Student</h3><div class="form">' + f('Full name') + f('Student code', 'ZX') + f('OSIS #', '000-000-000') + '<label>Date of birth<input type="date"></label>' + f('Home address', '', 1) + f('Classification') + f('Language at home') + '</div>' +
      '<h3 style="margin-top:18px">Guardian</h3><div class="form">' + f('Guardian name') + f('Relationship') + f('Phone') + f('Email') + '</div><h3 style="margin-top:18px">School</h3><div class="form">' + f('School') + f('School contact') + f('Referring lawyer', '', 1) + '</div>' +
      '<h3 style="margin-top:18px">Required to go active</h3><div class="chk">' + ['OSIS #', 'Home address', 'Guardian contact', 'Signed consents', 'Current IEP'].map(function (x) { return '<div class="no">' + ic('no') + '<span style="color:#1c1917">' + x + '</span></div>'; }).join('') + '</div>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><a class="btn ghost" href="#/students">Cancel</a><button class="btn" data-demo>Add student</button></div></div></div>';
  };
  V.invoices = function (sub) {
    if (sub === 'new') return V.newInvoice();
    if (sub) return V.invoice(decodeURIComponent(sub));
    var prov = S.role === 'provider', tab = prov ? 'current' : (S.tab.iv || 'current'), st = S.f.is || '', cur = M().today.slice(0, 7);
    var I = scopeInv(), L = tab === 'billable' ? I.filter(function (i) { return i.status === 'Ready to send'; }) : tab === 'current' ? I.filter(function (i) { return i.month === cur || i.status !== 'Sent to DOE'; }) : I.slice();
    var stats = {}; L.forEach(function (i) { stats[i.status] = (stats[i.status] || 0) + 1; });
    L = L.filter(function (i) { return !st || i.status === st; }).sort(function (a, b) { return a.month < b.month ? 1 : a.month > b.month ? -1 : a.student.localeCompare(b.student); });
    var h = '<div class="page wide">' + ph('Service invoices', '', '<a class="btn" href="#/invoices/new">' + ic('plus') + 'New invoice</a>');
    h += '<div class="tabs">' + (prov ? [['current', 'Current']] : [['current', 'Current'], ['billable', 'Billable'], ['all', 'All versions']]).map(function (t) { return '<a data-tab="iv:' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</a>'; }).join('') + '</div>';
    h += '<div class="filters"><select class="sel" data-f="is"><option value="">All statuses (' + Object.keys(stats).reduce(function (a, k) { return a + stats[k]; }, 0) + ')</option>' + Object.keys(stats).map(function (k) { return '<option value="' + esc(k) + '"' + (k === st ? ' selected' : '') + '>' + esc(k) + ' (' + stats[k] + ')</option>'; }).join('') + '</select></div>';
    return h + invTable(L.slice(0, 200)) + '</div>';
  };
  V.invoice = function (id) {
    var i = scopeInv().filter(function (x) { return x.id === id; })[0]; if (!i) return '<div class="page"><div class="card empty">Invoice not found</div></div>';
    var s = stu(i.studentId) || { profile: {} }, a = M().agency, C = checks(i), bad = C.filter(function (c) { return !c[1]; }), prov = S.role === 'provider';
    var fld = function (l, v, need) { return '<div class="fld"><small>' + l + '</small><div>' + (v ? esc(v) : need ? '<span class="miss">Missing</span>' : '<span class="muted">n/a</span>') + '</div></div>'; };
    var done = i.sessions.filter(function (x) { return x.state === 'Completed'; }), shown = done.length ? done : i.sessions;
    var h = '<div class="page wide">' + ph('Invoice', mname(i.month) + ' · ' + esc(i.student) + ' · ' + esc(i.label), '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' + pill(i.status) + '<a class="btn ghost" href="#/builder" data-bld="' + esc(i.id) + '">' + ic('sheet') + 'Session log</a>' + (prov ? '' : '<button class="btn" data-demo ' + (bad.length || i.status === 'Sent to DOE' ? 'disabled' : '') + '>' + ic('send') + (i.status === 'Sent to DOE' ? 'Sent' : 'Send to DOE') + '</button>') + '</div>');
    h += '<div class="invgrid"><div class="card inv"><div class="ihd"><div><small class="muted">NYC DOE</small><br><b>Vendor Monthly Service Invoice</b></div><div style="text-align:right"><small class="muted">Invoice #</small><div><b>' + esc(i.num || 'Not assigned') + '</b></div>' + (i.version > 1 ? '<span class="tag">v' + i.version + '</span>' : '') + '</div></div>';
    h += '<div class="blk"><h4>Case</h4>' + fld('Case number', i.caseNum, 1) + fld('Service type', i.caseNum ? i.label : '', 1) + fld('AI #', i.ai ? i.ai + (i.aiPending ? ' (pending)' : '') : '', 1) + fld('Service period', mname(i.month)) + fld('Service location', i.setting, 1) + fld('Date', M().today) + '</div>';
    h += '<div class="blk"><h4>Student</h4>' + fld('Name', i.student, 1) + fld('OSIS #', s.profile.osis, 1) + fld('Home address', prov ? (s.profile.address ? 'On file' : '') : s.profile.address, 1) + '</div>';
    h += '<div class="blk"><h4>Agency</h4>' + fld('Agency', a.name, 1) + fld('TIN', a.tin, 1) + fld('Address', a.address, 1) + fld('Email', a.email, 1) + fld('Phone', a.phone, 1) + fld('Provider', i.provider, 1) + '</div>';
    h += '<div class="tw" style="border-bottom:1px solid #f2f0ed"><table><thead><tr><th>Date of service</th><th>Start</th><th>End</th><th class="n">Sessions</th><th>Note</th></tr></thead><tbody>' + (shown.length ? shown.map(function (x) { return '<tr><td>' + sd(x.date) + '</td><td>' + x.start + '</td><td>' + x.end + '</td><td class="n">' + (x.n != null ? num(x.n) : '') + '</td><td>' + (x.note ? pill(x.note) : pill(x.state)) + '</td></tr>'; }).join('') : '<tr><td colspan="5" class="muted">No sessions</td></tr>') + '</tbody></table></div>';
    h += '<div class="blk"><h4>Totals</h4>' + fld('Session length', i.len ? i.len + ' min' : '', 1) + fld('Total sessions', i.billed ? num(i.billed) : '', 1) + (prov ? fld('Submitted hours', i.submittedHrs != null ? num(i.submittedHrs) : '') : fld('Rate per session', i.rate ? money(i.rate) : '', 1) + fld('Total due', i.total ? money(i.total) : '', 1) + fld('Provider submitted', i.submittedHrs != null ? num(i.submittedHrs) + ' hrs' : '')) + '</div>';
    h += '<div class="sigs">' + sigBox('Provider certification', i.provider, i.sig.provider) + sigBox(i.signer + ' signature', i.signer === 'Parent' ? (s.profile.guardian || '').replace(/\s*\(.*\)/, '') : 'School principal', i.sig.other) + '</div></div>';
    h += '<div><div class="card pad"><h3>Ready to send</h3><div class="chk">' + C.map(function (c) { return '<div class="' + (c[1] ? 'ok' : 'no') + '">' + ic(c[1] ? 'ok' : 'no') + '<span style="color:#1c1917">' + c[0] + '</span></div>'; }).join('') + '</div>' + (i.reason ? '<div style="margin-top:12px">' + pill(i.reason, 'red') + '</div>' : '') + '</div>';
    if (!prov && M().mode === 'demo') h += '<div class="card pad" style="margin-top:12px"><h3>Billed vs submitted</h3>' + kv([['Submitted', num(i.submittedHrs) + ' hrs'], ['Billed', num(i.billed) + ' x ' + i.len + ' min'], ['Provider pay', money(i.cost)], ['Margin', money(i.total - i.cost)]]) + '</div>';
    if (M().mode === 'live' && i.sheet && !prov) h += '<div class="card pad" style="margin-top:12px"><h3>Case board</h3>' + kv([['Invoice submitted', i.sheet]]) + '</div>';
    return h + '</div></div></div>';
  };
  V.newInvoice = function () {
    var cur = M().today.slice(0, 7), T = scopeInv().filter(function (i) { return i.month === cur; });
    var h = '<div class="page" style="max-width:820px">' + ph('New service invoice', mname(cur));
    if (!T.length) return h + '<div class="card empty">No time tables waiting for an invoice</div></div>';
    return h + '<div class="card">' + T.slice(0, 80).map(function (t) { var c = t.sessions.filter(function (x) { return x.state === 'Completed'; }).length; return '<a class="row" href="#/invoices/' + esc(t.id) + '"><div class="grow"><b>' + esc(t.student) + '</b> <span class="muted">' + esc(t.label) + '</span><div class="muted">' + esc(t.provider) + ' · ' + esc(t.caseNum || 'No case #') + '</div></div><span class="muted">' + c + ' of ' + t.sessions.length + ' sessions</span>' + ic('chev').replace('<svg', '<svg style="width:14px;color:#8a847d"') + '</a>'; }).join('') + '</div></div>';
  };
  V.builder = function () {
    var I = scopeInv(), sel = I.filter(function (i) { return i.id === S.f.bi; })[0] || I.filter(function (i) { return i.month === addM(M().today.slice(0, 7), M().mode === 'demo' ? -1 : 0) && i.sessions.length > 6; })[0] || I[0];
    var h = '<div class="page wide">' + ph('Billing sheet builder');
    if (!sel) return h + '<div class="card empty">No invoices yet</div></div>';
    var sameS = I.filter(function (i) { return i.studentId === sel.studentId; });
    var opt = function (L, val, key, lab) { var seen = {}; return L.filter(function (x) { if (seen[x[key]]) return false; seen[x[key]] = 1; return true; }).map(function (x) { return '<option value="' + esc(x.id) + '"' + (x[key] === val ? ' selected' : '') + '>' + esc(lab(x)) + '</option>'; }).join(''); };
    sameS.forEach(function (x) { x._lk = x.label + '|' + x.caseNum; });
    h += '<div class="bgrid"><div class="card pad form" style="grid-template-columns:1fr;align-content:start">';
    h += '<label>Student<select data-bi>' + opt(I, sel.studentId, 'studentId', function (x) { return x.student; }) + '</select></label><label>Provider<select data-bi>' + opt(sameS, sel.pid, 'pid', function (x) { return x.provider; }) + '</select></label>';
    h += '<label>Service<select data-bi>' + opt(sameS.filter(function (x) { return x.pid === sel.pid; }), sel._lk, '_lk', function (x) { return x.label + (x.caseNum ? ' · ' + x.caseNum : ''); }) + '</select></label><label>Setting<input value="' + esc(sel.setting) + '" disabled></label>';
    h += '<label>Invoice<select data-bi>' + sameS.filter(function (x) { return x.pid === sel.pid && x._lk === sel._lk; }).map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === sel.id ? ' selected' : '') + '>' + mname(x.month) + ' · ' + esc(x.status) + '</option>'; }).join('') + '</select></label></div>';
    var done = sel.sessions.filter(function (x) { return x.state === 'Completed'; }), rows = done.length ? done : sel.sessions, tot = rows.reduce(function (a, x) { return a + x.mins; }, 0) / 60;
    h += '<div class="card inv"><div class="ihd"><div><small class="muted">Together They Grow</small><br><b>Provider Session Verification Log</b></div><div style="text-align:right">' + pill(sel.status) + '</div></div><div class="blk">' +
      [['Student', sel.student], ['Provider', sel.provider], ['Service', sel.label], ['Case #', sel.caseNum || ''], ['Month', mname(sel.month)], ['Setting', sel.setting]].map(function (f) { return '<div class="fld"><small>' + f[0] + '</small><div>' + (f[1] ? esc(f[1]) : '<span class="miss">Missing</span>') + '</div></div>'; }).join('') + '</div>';
    h += '<div class="tw"><table><thead><tr><th>Date</th><th>Day</th><th>Time in</th><th>Time out</th><th class="n">Hours</th><th>Notes</th></tr></thead><tbody>' + rows.map(function (x) { return '<tr><td>' + sd(x.date) + '</td><td>' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(x.date + 'T12:00:00').getDay()] + '</td><td>' + x.start + '</td><td>' + x.end + '</td><td class="n">' + num(x.mins / 60) + '</td><td>' + (x.state !== 'Completed' ? '<span class="muted">' + x.state + '</span>' : '') + '</td></tr>'; }).join('') + '<tr><td colspan="4"><b>Total</b></td><td class="n"><b>' + num(tot) + '</b></td><td></td></tr></tbody></table></div>';
    var s = stu(sel.studentId) || { profile: {} };
    h += '<div class="sigs">' + sigBox('Provider', sel.provider, sel.sig.provider) + sigBox(sel.signer === 'Principal' ? 'School representative' : 'Parent / guardian', sel.signer === 'Parent' ? (s.profile.guardian || '').replace(/\s*\(.*\)/, '') : 'School representative', sel.sig.other) + '</div>';
    return h + '<div class="pad" style="display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #f2f0ed"><button class="btn ghost" data-demo>' + ic('dl') + 'PDF</button><a class="btn" href="#/invoices/' + esc(sel.id) + '">Open invoice</a></div></div></div></div>';
  };
  V.access = function () {
    var P0 = M().invoices.filter(function (i) { return !(i.sig.provider && i.sig.other) && i.status !== 'In progress' && (M().mode === 'demo'); });
    var h = '<div class="page wide">' + ph('Issue access link', P0.length + ' waiting');
    if (!P0.length) return h + '<div class="card empty">' + (M().mode === 'live' ? 'No signature data in TTG Ops' : 'No signatures waiting') + '</div></div>';
    return h + '<div class="card tw"><table><thead><tr><th>Student</th><th>Document</th><th>Signer</th><th>Month</th><th>Status</th><th></th></tr></thead><tbody>' + P0.slice(0, 120).map(function (i) {
      var who = !i.sig.provider ? 'Provider: ' + i.provider : i.signer + (i.signer === 'Parent' ? '' : ' (school)');
      return '<tr><td><b>' + esc(i.student) + '</b></td><td>' + esc(i.label) + ' log<div class="muted">' + esc(i.provider) + '</div></td><td>' + esc(who) + '</td><td>' + mname(i.month) + '</td><td>' + pill(i.status) + '</td><td><button class="btn ghost" data-demo>' + ic('link') + 'Issue link</button></td></tr>';
    }).join('') + '</tbody></table></div></div>';
  };
  V.documents = function () {
    var lv = S.f.dl || '', st = S.f.ds || '', D = [];
    activeStudents().forEach(function (s) { (s.docs || []).forEach(function (d) { D.push({ lv: 'Student', who: s.name, sid: s.id, n: d.name, d: d.date, st: d.status }); }); s.cases.forEach(function (c) { (c.docs || []).forEach(function (d) { D.push({ lv: 'Case', who: s.name + ' · ' + c.num, sid: s.id, n: d.name, d: '', st: d.status }); }); }); if (s.intake) D.push({ lv: 'Student', who: s.name, sid: s.id, n: 'Intake papers', d: s.intake.last, st: s.intake.status, miss: s.intake.missing }); });
    M().providers.forEach(function (p) { (p.docs || []).forEach(function (d) { D.push({ lv: 'Provider', who: p.name, pid: p.id, n: d.name, d: '', st: d.status }); }); if (p.intake && M().mode === 'live') D.push({ lv: 'Provider', who: p.name, pid: p.id, n: 'Intake papers', d: '', st: p.intake.status, miss: p.intake.missing }); });
    var L = D.filter(function (d) { return (!lv || d.lv === lv) && (!st || d.st === st); }), sts = {}; D.forEach(function (d) { sts[d.st] = (sts[d.st] || 0) + 1; });
    var h = '<div class="page wide">' + ph('Documents') + '<div class="filters"><select class="sel" data-f="dl"><option value="">All levels</option>' + ['Student', 'Case', 'Provider'].map(function (x) { return '<option' + (x === lv ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select><select class="sel" data-f="ds"><option value="">Any status</option>' + Object.keys(sts).map(function (x) { return '<option value="' + esc(x) + '"' + (x === st ? ' selected' : '') + '>' + esc(x) + ' (' + sts[x] + ')</option>'; }).join('') + '</select><span class="muted" style="margin-left:auto;align-self:center">' + L.length + ' documents</span></div>';
    return h + (L.length ? '<div class="card tw"><table><thead><tr><th>Document</th><th>Level</th><th>For</th><th>Date</th><th>Status</th></tr></thead><tbody>' + L.slice(0, 250).map(function (d) { return '<tr class="click" data-href="' + (d.sid ? '#/students/' + encodeURIComponent(d.sid) : '#/profile/' + esc(d.pid)) + '"><td><b style="font-weight:500">' + esc(d.n) + '</b>' + (d.miss ? '<div class="muted">Missing: ' + esc(String(d.miss).replace(/^Forms from: /, '')) + '</div>' : '') + '</td><td>' + d.lv + '</td><td>' + esc(d.who) + '</td><td>' + sd(d.d) + '</td><td>' + pill(d.st) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="card empty">No documents</div>') + '</div>';
  };
  /* ---------- views: TTG Ops additions ---------- */
  function hoursTable(SS, one) {
    var R = []; SS.forEach(function (s) { lines(s).forEach(function (l) { if (l.max && l.used != null && !/Complete/.test(l.status) && (S.role !== 'provider' || l.pid === S.pid || l.isBank)) R.push({ s: s, l: l, pct: 100 * l.used / l.max }); }); });
    R.sort(function (a, b) { return b.pct - a.pct; });
    if (!R.length) return '<div class="card empty">No authorized hours on file</div>';
    return '<div class="card tw"><table><thead><tr>' + (one ? '' : '<th>Student</th>') + '<th>Line</th><th>Case / AI</th><th style="min-width:160px">Used vs authorized</th><th class="n">Remaining</th><th>Ends</th><th>Status</th></tr></thead><tbody>' + R.map(function (r) {
      var l = r.l, left = l.max - l.used, unit = l.isBank ? ' hrs' : ' sess';
      return '<tr class="click" data-href="#/students/' + encodeURIComponent(r.s.id) + '">' + (one ? '' : '<td><b>' + esc(r.s.name) + '</b></td>') + '<td>' + esc(l.label) + '<div class="muted">' + esc(l.type || '') + '</div></td><td>' + esc(l._case.num || '') + (l.ai ? ' · AI ' + esc(l.ai) : '') + '</td><td><div class="muted" style="font-size:11px;margin-bottom:3px">' + num(l.used) + ' / ' + num(l.max) + unit + ' · ' + Math.round(r.pct) + '%</div>' + bar(r.pct) + '</td><td class="n">' + num(left) + unit + '</td><td>' + (l.end ? sd(l.end) : '<span class="muted">' + (M().mode === 'demo' ? 'Case end' : 'Not on file') + '</span>') + '</td><td>' + pill(l.status) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  V.hours = function () {
    var SS = scopeStudents(), t = hoursTotals(SS), A = alerts().filter(function (a) { return a.k === 'Hours' || a.k === 'Authorization'; });
    var h = '<div class="page wide">' + ph('Hours and authorizations');
    h += '<div class="stats">' + stat('Authorized', num(Math.round(t.auth)) + ' <small>hrs</small>', t.n + ' lines', 'clock', '#/hours') + stat('Used', num(Math.round(t.used)) + ' <small>hrs</small>', (t.auth ? Math.round(100 * t.used / t.auth) : 0) + '% of authorized', 'chart', '#/hours') + stat('Low or exhausted', A.filter(function (a) { return a.k === 'Hours'; }).length, 'under 15% left', 'warn', '#/alerts') + stat('Ending or pending', A.filter(function (a) { return a.k === 'Authorization'; }).length, 'next 45 days', 'cal', '#/alerts') + '</div>';
    return h + '<div class="sec"><h2>By line</h2></div>' + hoursTable(SS) + '</div>';
  };
  V.alerts = function () {
    var T = M().triggers || [], A = alerts(), cnt = {}; A.forEach(function (a) { cnt[a.k] = (cnt[a.k] || 0) + 1; });
    var h = '<div class="page wide">' + ph('Alerts');
    h += '<div class="stats s5">' + ['Hours', 'Authorization', 'Staffing', 'Billing', 'Hearing'].map(function (k) { return stat(k, cnt[k] || 0, 'open', { Hours: 'clock', Authorization: 'file', Staffing: 'users', Billing: 'coins', Hearing: 'cal' }[k], '#/notifications'); }).join('') + '</div>';
    if (T.length) h += '<div class="sec"><h2>Rules</h2></div><div class="card tw"><table><thead><tr><th>ID</th><th>Rule</th><th>Cadence</th>' + (M().mode === 'live' ? '<th>Who</th><th class="n">Fired</th>' : '') + '</tr></thead><tbody>' + T.map(function (t) { return '<tr><td><span class="tag">' + esc(t.id) + '</span></td><td>' + esc(t.name) + (t.missing ? '<div class="muted">Missing: ' + esc(t.missing) + '</div>' : '') + '</td><td>' + esc(t.cadence) + '</td>' + (M().mode === 'live' ? '<td>' + esc(t.who) + '</td><td class="n">' + (t.fired || 0) + '</td>' : '') + '</tr>'; }).join('') + '</tbody></table></div>';
    return h + '<div class="sec"><h2>Open</h2></div>' + alertList(A) + '</div>';
  };
  V.intake = function () {
    var k = S.tab.ik || 'Student', I = M().intake.filter(function (x) { return x.kind === k; }), st = S.f.ist || '';
    var h = '<div class="page wide">' + ph('Intake status');
    h += '<div class="g2e"><div class="card pad"><h3>Students <span class="muted">' + M().intake.filter(function (x) { return x.kind === 'Student'; }).length + '</span></h3>' + stackBar(intakeCounts('Student'), ICOL) + '</div><div class="card pad"><h3>Providers <span class="muted">' + M().intake.filter(function (x) { return x.kind === 'Provider'; }).length + '</span></h3>' + stackBar(intakeCounts('Provider'), ICOL) + '</div></div>';
    h += '<div class="tabs" style="margin-top:20px">' + ['Student', 'Provider'].map(function (x) { return '<a data-tab="ik:' + x + '" class="' + (k === x ? 'on' : '') + '">' + x + 's</a>'; }).join('') + '</div>';
    var sts = {}; I.forEach(function (x) { sts[x.status] = 1; });
    h += '<div class="filters"><select class="sel" data-f="ist"><option value="">Any status</option>' + Object.keys(sts).map(function (x) { return '<option' + (x === st ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></div>';
    I = I.filter(function (x) { return !st || x.status === st; });
    return h + '<div class="card tw"><table><thead><tr><th>Name</th><th>Status</th><th>Received</th><th>Missing</th></tr></thead><tbody>' + I.map(function (x) { var s = k === 'Student' ? stu(x.id) : null; return '<tr' + (s ? ' class="click" data-href="#/students/' + encodeURIComponent(s.id) + '"' : '') + '><td><b>' + esc(x.name) + '</b>' + (x.role ? '<div class="muted">' + esc(x.role) + '</div>' : '') + '</td><td>' + pill(x.status) + '</td><td>' + esc(x.received || '') + '</td><td>' + esc((x.missing || '').replace(/^Forms from: /, '')) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
  };
  V.ensora = function () {
    var L = activeStudents(), cnt = {}; L.forEach(function (s) { var u = (s.ensora && s.ensora.use) || 'No record'; cnt[u] = (cnt[u] || 0) + 1; });
    var h = '<div class="page wide">' + ph('Ensora') + '<div class="card pad">' + stackBar(cnt, { Yes: '#22a35a', No: '#dc3c3c', Unknown: '#e8a317', 'No record': '#d6d3d1' }) + '</div>';
    return h + '<div class="card tw" style="margin-top:16px"><table><thead><tr><th>Student</th><th>BCBA</th><th>Uses Ensora</th><th>Data on file</th><th>Last capture</th><th>Missing</th></tr></thead><tbody>' + L.map(function (s) { var e = s.ensora || {}; return '<tr class="click" data-href="#/students/' + encodeURIComponent(s.id) + '"><td><b>' + esc(s.name) + '</b></td><td>' + esc(s.bcba) + '</td><td>' + (e.use ? pill(e.use, PC[e.use] || 'yellow') : '<span class="muted">No record</span>') + '</td><td>' + esc(e.data || '') + '</td><td>' + sd(e.last) + '</td><td>' + esc(e.missing || '') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
  };
  V.reports = function () {
    var R = M().reports, K = { student: 'Student status', provider: 'Provider hours and billing', intake: 'Intake papers', month: 'Monthly case report' }, k = S.f.rk || '';
    var h = '<div class="page wide">' + ph('Reports', '', MODE === 'live' ? '<a class="btn ghost" href="../#/reports">' + ic('plus') + 'Make draft</a>' : '<button class="btn ghost" data-demo>' + ic('plus') + 'Make draft</button>');
    h += '<div class="filters"><select class="sel" data-f="rk"><option value="">All kinds</option>' + Object.keys(K).map(function (x) { return '<option value="' + x + '"' + (x === k ? ' selected' : '') + '>' + K[x] + '</option>'; }).join('') + '</select></div>';
    R = R.filter(function (r) { return !k || r.kind === k; });
    return h + (R.length ? '<div class="card">' + R.map(function (r) { var o = S.f.ro === r.id; return '<div class="row click" data-ro="' + esc(r.id) + '"><div class="grow"><b>' + esc(r.title) + '</b><div class="muted">' + esc(K[r.kind] || r.kind) + ' · ' + esc(r.month || '') + ' · ' + esc(String(r.created || '').slice(0, 10)) + '</div></div>' + pill(r.status) + '</div>' + (o ? '<div class="pad" style="white-space:pre-wrap;border-top:1px solid #f2f0ed;background:#fcfbfa;max-height:420px;overflow:auto">' + esc(r.body) + '</div>' : ''); }).join('') + '</div>' : '<div class="card empty">No reports</div>') + '</div>';
  };
  V.profile = function (sub) {
    var p = prv(sub && S.role !== 'provider' ? decodeURIComponent(sub) : S.pid); if (!p) return '<div class="page"><div class="card empty">No provider selected</div></div>';
    var h = '<div class="page">' + ph(esc(p.name), esc(p.role || 'Provider') + (/^P-/.test(p.id) ? ' · ' + esc(p.id) : ''), pill(p.status));
    h += '<div class="g2e"><div class="card pad"><h3>Details</h3>' + kv([['Email', p.email], ['Phone', p.phone], ['Role', p.role], ['Students', String(p.students.length)]]) + '</div><div class="card pad"><h3>Intake papers</h3>' + (p.intake ? '<div style="margin-bottom:10px">' + pill(p.intake.status) + '</div>' + kv([['Received', p.intake.received], ['Missing', p.intake.missing]]) : '<div class="muted">No intake record</div>') + '</div></div>';
    if (p.docs && p.docs.length) h += '<div class="sec"><h2>Documents</h2></div><div class="card">' + p.docs.map(function (d) { return '<div class="row"><span style="color:#8a847d;display:grid">' + ic('file').replace('<svg', '<svg style="width:16px;height:16px"') + '</span><div class="grow"><b>' + esc(d.name) + '</b></div>' + pill(d.status) + '</div>'; }).join('') + '</div>';
    h += '<div class="sec"><h2>Students</h2></div><div class="card">' + (p.students.length ? p.students.map(function (id) { var s = stu(id); return s ? '<a class="row" href="#/students/' + encodeURIComponent(s.id) + '">' + av(s.name) + '<div class="grow"><b>' + esc(s.name) + '</b><div class="muted">' + lines(s).filter(function (l) { return l.pid === p.id; }).map(function (l) { return esc(l.label); }).join(', ') + '</div></div></a>' : ''; }).join('') : '<div class="empty">No students</div>') + '</div>';
    return h + '</div>';
  };
  /* ---------- Owner (SOW stages 3 and 4: billing workspace, hours and alerts, owner reports) ---------- */
  V.owner = function () {
    var cur = M().today.slice(0, 7), prev = addM(cur, -1), I = M().invoices, live = M().mode === 'live', bm = live ? cur : prev;
    var sum = function (mo, f) { return I.filter(function (i) { return i.month === mo && (!f || f(i)); }).reduce(function (a, i) { return a + (i.total || 0); }, 0); };
    var sent = sum(bm, function (i) { return i.status === 'Sent to DOE'; }), held = sum(bm, function (i) { return /Blocked|Held|Waiting/.test(i.status); });
    var cost = I.filter(function (i) { return i.month === bm; }).reduce(function (a, i) { return a + (i.cost || 0); }, 0), rev = sum(bm), A = alerts(), ht = hoursTotals();
    var h = '<div class="page wide">' + ph('Welcome, Owner', '', '<span class="muted">' + mname(bm) + '</span>');
    h += '<div class="stats">' + stat('Billed', live ? '<small>No rates on file</small>' : money(rev), live ? I.length + ' invoices this month' : money(sent) + ' sent to DOE', 'coins', '#/money') + stat('Held or blocked', live ? I.filter(function (i) { return /Blocked|Held/.test(i.status); }).length : money(held), live ? 'missing invoice fields' : I.filter(function (i) { return i.month === bm && /Blocked|Held|Waiting/.test(i.status); }).length + ' invoices', 'warn', '#/invoices') +
      stat('Margin', live ? '<small>No rates on file</small>' : money(rev - cost), live ? 'rates not in TTG Ops' : (rev ? Math.round(100 * (rev - cost) / rev) : 0) + '% after provider pay', 'chart', '#/money') + stat('Hours used', num(Math.round(ht.used)), 'of ' + num(Math.round(ht.auth)) + ' authorized', 'clock', '#/hours') + '</div>';
    h += '<div class="g2e" style="margin-top:8px"><div><div class="sec"><h2>Billing status</h2><a class="muted" href="#/invoices">Invoices</a></div><div class="card pad">' + (live ? '' : '<h3>' + mname(prev) + '</h3>' + stackBar(invCounts(prev), BCOL) + '<h3 style="margin-top:14px">' + mname(cur) + '</h3>') + stackBar(invCounts(cur), BCOL) + '</div>';
    if (!live) h += '<div class="sec"><h2>By funding source</h2><a class="muted" href="#/money">All</a></div>' + fundTable(prev);
    h += '<div class="sec"><h2>Hours used vs authorized</h2><a class="muted" href="#/hours">All</a></div><div class="card pad"><div class="muted" style="margin-bottom:8px">' + num(Math.round(ht.used)) + ' of ' + num(Math.round(ht.auth)) + ' hrs</div>' + bar(ht.auth ? 100 * ht.used / ht.auth : 0) + '</div>';
    h += '</div><div><div class="sec"><h2>Alerts</h2><a class="muted" href="#/alerts">All ' + A.length + '</a></div>' + alertList(A, 9) + '</div></div>';
    return h + '</div>';
  };
  function fundTable(mo) {
    var F = {}; M().invoices.filter(function (i) { return i.month === mo; }).forEach(function (i) { var f = F[i.funding || 'Unknown'] || (F[i.funding || 'Unknown'] = { rev: 0, cost: 0, n: 0, sent: 0 }); f.rev += i.total || 0; f.cost += i.cost || 0; f.n++; if (i.status === 'Sent to DOE') f.sent += i.total || 0; });
    return '<div class="card tw"><table><thead><tr><th>Funding</th><th class="n">Invoices</th><th class="n">Billed</th><th class="n">Sent</th><th class="n">Provider pay</th><th class="n">Margin</th></tr></thead><tbody>' + Object.keys(F).sort().map(function (k) { var f = F[k]; return '<tr><td><span class="tag">' + esc(k) + '</span></td><td class="n">' + f.n + '</td><td class="n">' + money(f.rev) + '</td><td class="n">' + money(f.sent) + '</td><td class="n">' + money(f.cost) + '</td><td class="n"><b>' + money(f.rev - f.cost) + '</b></td></tr>'; }).join('') + '</tbody></table></div>';
  }
  V.money = function () {
    var live = M().mode === 'live', mo = S.month, by = S.f.mb || 'student';
    var h = '<div class="page wide">' + ph('Revenue and margin', '', monthSw());
    if (live) return h + '<div class="card empty">DOE rates and provider pay rates are not in TTG Ops</div></div>';
    h += fundTable(mo) + '<div class="sec"><h2>By ' + by + '</h2><select class="sel" data-f="mb"><option value="student"' + (by === 'student' ? ' selected' : '') + '>Student</option><option value="provider"' + (by === 'provider' ? ' selected' : '') + '>Provider</option></select></div>';
    var G = {}; M().invoices.filter(function (i) { return i.month === mo; }).forEach(function (i) { var k = by === 'student' ? i.student : i.provider, g = G[k] || (G[k] = { rev: 0, cost: 0, n: 0, s: 0 }); g.rev += i.total; g.cost += i.cost; g.n++; g.s += i.billed; });
    var K = Object.keys(G).sort(function (a, b) { return G[b].rev - G[a].rev; });
    return h + (K.length ? '<div class="card tw"><table><thead><tr><th>' + (by === 'student' ? 'Student' : 'Provider') + '</th><th class="n">Invoices</th><th class="n">Sessions</th><th class="n">Billed</th><th class="n">Provider pay</th><th class="n">Margin</th></tr></thead><tbody>' + K.map(function (k) { var g = G[k]; return '<tr><td><b>' + esc(k) + '</b></td><td class="n">' + g.n + '</td><td class="n">' + num(g.s) + '</td><td class="n">' + money(g.rev) + '</td><td class="n">' + money(g.cost) + '</td><td class="n">' + money(g.rev - g.cost) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="card empty">No invoices this month</div>') + '</div>';
  };
  V.workspace = function () {
    var I = M().invoices.filter(function (i) { return i.month === (M().mode === 'demo' ? addM(M().today.slice(0, 7), -1) : M().today.slice(0, 7)); });
    var sel = I.filter(function (i) { return i.id === S.f.wi; })[0] || I.filter(function (i) { return /School/.test(i.setting) && i.sessions.length > 6; })[0] || I[0];
    var h = '<div class="page wide">' + ph('Billing workspace');
    if (!sel) return h + '<div class="card empty">No invoices this month</div></div>';
    var s = stu(sel.studentId) || { profile: {} }, src = S.f.wsrc || 'provider', a = M().agency;
    h += '<div class="filters"><select class="sel" data-f="wi" style="max-width:100%">' + I.map(function (i) { return '<option value="' + esc(i.id) + '"' + (i.id === sel.id ? ' selected' : '') + '>' + esc(i.student + ' · ' + i.label + ' · ' + i.provider) + '</option>'; }).join('') + '</select>' + pill(sel.status) + '</div>';
    h += '<div class="card inv"><div class="blk" style="border-bottom:1px solid #ebe9e6"><h4>Header</h4>' + [['Case number', sel.caseNum], ['Service type', sel.caseNum ? sel.label : ''], ['AI #', sel.ai], ['Student', sel.student], ['OSIS #', s.profile.osis], ['Home address', s.profile.address], ['Agency TIN', a.tin], ['Provider', sel.provider], ['Period', mname(sel.month)]].map(function (f) { return '<div class="fld"><small>' + f[0] + '</small><div>' + (f[1] ? esc(f[1]) : '<span class="miss">Missing</span>') + '</div></div>'; }).join('') + '</div>';
    h += '<div class="pad" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-bottom:1px solid #f2f0ed"><span class="muted">Fill hours from</span>' + [['provider', 'Provider times'], ['preset', 'Preset schedule'], ['manual', 'Manual']].map(function (x) { return '<button class="btn ' + (src === x[0] ? '' : 'ghost') + '" data-wsrc="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var done = sel.sessions.filter(function (x) { return x.state === 'Completed'; }), rows = done.length ? done : sel.sessions, len = sel.len || 60, school = /School/.test(sel.setting);
    h += '<div class="tw"><table><thead><tr><th>Date</th><th>Time</th><th style="min-width:200px">Location split</th><th class="n">Submitted hrs</th><th class="n">Billed sessions</th></tr></thead><tbody>' + rows.map(function (x, k) {
      var hrs = x.mins / 60, split = school && k % 4 === 1 && hrs > 1 ? [['Bus', 0.5, '#a8a29e'], ['School', hrs - 1, '#c2500a'], ['Home', 0.5, '#4d8b3a']] : [[school ? 'School' : 'Home', hrs, school ? '#c2500a' : '#4d8b3a']];
      var cap = Math.round(x.mins / len * 4) / 4, sub = src === 'manual' ? '' : num(hrs), bil = src === 'manual' ? '' : src === 'preset' ? cap : (x.n != null ? x.n : cap);
      return '<tr><td>' + sd(x.date) + '</td><td>' + x.start + ' to ' + x.end + '</td><td><div class="split">' + split.map(function (p) { return '<div style="flex:' + p[1] + ';background:' + p[2] + '" title="' + p[0] + '">' + p[0] + ' ' + num(p[1]) + '</div>'; }).join('') + '</div></td><td class="n">' + sub + '</td><td class="n"><input class="sel ws" style="width:76px;text-align:right" type="number" step="0.25" min="0" data-cap="' + cap + '" value="' + bil + '"></td></tr>';
    }).join('') + '</tbody></table></div>';
    var L = lineOf(sel);
    h += '<div class="pad" style="display:flex;gap:24px;flex-wrap:wrap;align-items:center;border-top:1px solid #f2f0ed"><div><small class="muted">Billed</small><div id="wsB" style="font-weight:600;font-size:16px"></div></div><div><small class="muted">Total due</small><div id="wsM" style="font-weight:600;font-size:16px"></div></div><div class="chk" id="wsC" style="flex:1;min-width:220px"></div><button class="btn" data-demo>Save to invoice</button></div></div>';
    S._ws = { rate: sel.rate, max: L ? L.max : null, used: L ? L.used : null, month: sel.month };
    return h + '</div>';
  };
  function wsCalc() {
    var W = S._ws, ins = document.querySelectorAll('input.ws'); if (!W || !ins.length) return; var b = 0, over = false;
    ins.forEach(function (x) { var v = parseFloat(x.value) || 0, cap = parseFloat(x.dataset.cap); if (v > cap) { over = true; x.style.borderColor = '#dc3c3c'; } else x.style.borderColor = ''; b += v; });
    $('#wsB').textContent = num(b) + ' sessions'; $('#wsM').textContent = W.rate ? money(b * W.rate) : 'No rate';
    var within = W.max == null ? null : W.used <= W.max;
    $('#wsC').innerHTML = [['Billed not above submitted', !over], ['Within max sessions', within]].map(function (c) { return '<div class="' + (c[1] ? 'ok' : 'no') + '">' + ic(c[1] ? 'ok' : 'no') + '<span style="color:#1c1917">' + c[0] + (c[1] == null ? ': no max on file' : '') + '</span></div>'; }).join('');
  }
  /* ---------- render + events ---------- */
  var PROV_OK = ['home', 'notifications', 'profile', 'assignments', 'sessions', 'students', 'invoices'];
  function render() {
    if (!S.m) return; shell();
    var r = route().split('/'), v = V[r[0]] || V.home;
    if (S.role === 'provider' && PROV_OK.indexOf(r[0]) < 0) v = V.home;
    if (S.role === 'owner' && r[0] === 'home') v = V.owner;
    $('#view').innerHTML = v(r.slice(1).join('/') || '');
    $('#app').classList.remove('open'); wsCalc();
    if (!render.keep) window.scrollTo(0, 0); render.keep = false;
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-role],[data-go],[data-mo],[data-tab],[data-href],[data-day],[data-tt],[data-ro],[data-act],[data-demo],[data-wsrc],[data-bld],#me,#tg,.scrim');
    if (!e.target.closest('.menu') && !(t && t.id === 'me')) { var m0 = $('.menu'); if (m0) m0.remove(); }
    if (!t) return;
    if (t.hasAttribute('data-demo')) { e.preventDefault(); if (!t.disabled) toast(MODE === 'demo' ? 'Demo only' : 'View only'); return; }
    if (t.id === 'tg') { $('#app').classList.toggle('open'); return; }
    if (t.classList.contains('scrim')) { $('#app').classList.remove('open'); return; }
    if (t.id === 'me') { if (!e.target.closest('.menu')) openMenu(); return; }
    if (t.dataset.role) { S.role = t.dataset.role; localStorage.setItem('ttgplat.role', S.role); if (S.role === 'provider' && !prv(S.pid)) { var p = M().providers.filter(function (x) { return x.students.length; })[0]; S.pid = p ? p.id : ''; } S.f = {}; location.hash = S.role === 'owner' ? '#/owner' : '#/home'; render(); return; }
    if (t.dataset.go) { location.href = t.dataset.go; return; }
    if (t.dataset.bld) { S.f.bi = t.dataset.bld; return; }
    if (t.dataset.mo) { S.month = addM(S.month, +t.dataset.mo); render.keep = true; render(); return; }
    if (t.dataset.tab) { var a = t.dataset.tab.split(':'); S.tab[a[0]] = a[1]; render.keep = true; render(); return; }
    if (t.dataset.day) { S.f.day = S.f.day === t.dataset.day ? '' : t.dataset.day; if (route() !== 'sessions') { location.hash = '#/sessions'; return; } render.keep = true; render(); return; }
    if (t.dataset.tt) { S.f.tt = S.f.tt === t.dataset.tt ? '' : t.dataset.tt; render.keep = true; render(); return; }
    if (t.dataset.ro) { S.f.ro = S.f.ro === t.dataset.ro ? '' : t.dataset.ro; render.keep = true; render(); return; }
    if (t.dataset.wsrc) { S.f.wsrc = t.dataset.wsrc; render.keep = true; render(); return; }
    if (t.dataset.act === 'rate') { S.f.rate = !S.f.rate; render.keep = true; render(); return; }
    if (t.dataset.act === 'ttall') { S.f.ttall = 1; render.keep = true; render(); return; }
    if (t.dataset.href && !e.target.closest('a,button,input,select')) { location.hash = t.dataset.href; return; }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'pidSel') { S.pid = t.value; localStorage.setItem('ttgplat.pid', S.pid); render(); return; }
    if (t.hasAttribute('data-bi')) { S.f.bi = t.value; render.keep = true; render(); return; }
    if (t.dataset.f && t.tagName === 'SELECT') { S.f[t.dataset.f] = t.value; render.keep = true; render(); }
  });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.classList.contains('ws')) { wsCalc(); return; }
    if (t.dataset.f && t.tagName === 'INPUT') { S.f[t.dataset.f] = t.value; var pos = t.selectionStart, k = t.dataset.f; render.keep = true; render(); var n = document.querySelector('[data-f="' + k + '"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
  });
  window.addEventListener('hashchange', function () { var keepDay = route() === 'sessions'; if (!keepDay) S.f.day = ''; render(); });
  /* ---------- boot ---------- */
  function lock(msg) {
    $('#view').innerHTML = '<div class="lock card"><div style="display:grid;place-items:center;margin-bottom:10px">' + LOGO.replace('<svg', '<svg style="width:42px;height:42px"') + '</div><h1>TTG platform</h1><p>' + msg + '</p><div style="display:flex;gap:8px;justify-content:center;margin-top:16px"><a class="btn" href="../">Open TTG Ops</a><a class="btn ghost" href="demo.html">Demo data</a></div></div>';
    $('#side').innerHTML = '<div class="logo">' + LOGO + '<div><b>TOGETHER</b><small>THEY GROW</small></div></div>';
    $('#mode').className = 'mode'; $('#mode').innerHTML = '<i style="background:#a8a29e"></i>Locked';
  }
  function start(model) {
    S.m = model; S.month = model.today.slice(0, 7);
    if (S.role === 'provider' && !prv(S.pid)) { var p = model.providers.filter(function (x) { return x.students.length; })[0]; S.pid = p ? p.id : ''; }
    $('#mode').className = 'mode ' + MODE; $('#mode').innerHTML = '<i></i>' + (MODE === 'demo' ? 'Demo data' : 'Live');
    render();
  }
  function boot() {
    if (MODE === 'demo') { start(window.TTG_DEMO); return; }
    var KEY = localStorage.getItem('ttgops.k') || '';
    var url = (window.TTG_CONFIG && TTG_CONFIG.API_URL) || localStorage.getItem('ttgops.api') || '';
    var la = localStorage.getItem('ttgops.api') || '';
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /^http:\/\/(localhost|127\.0\.0\.1):\d+\/api$/.test(la)) url = la;
    if (!KEY || !url) { lock('Open TTG Ops on this device first.'); return; }
    $('#view').innerHTML = '<div class="lock"><p class="muted">Loading</p></div>';
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key: KEY, action: 'bootstrap', data: {} }), redirect: 'follow', referrerPolicy: 'no-referrer', cache: 'no-store' })
      .then(function (r) { return r.json(); }).then(function (j) { if (!j || j.ok === false || j.error) throw new Error((j && j.error) || 'Not authorized'); start(fromLive(j.data || j)); })
      .catch(function (e) { lock(/auth|key|denied|forbidden/i.test(e.message) ? 'This device is not signed in.' : 'Could not load: ' + esc(e.message)); });
  }
  boot();
})();
