/* TTG showcase v6: data adapters. Turns either the fictional demo set (data.js) or the live TTG Ops bootstrap
   (fetched at runtime with the device key, kept in memory only) into one model the screens read.
   Nothing here contains real data. Missing values stay null so screens can show "Not on file". */
(function () {
  'use strict';
  var X = window.SCM = {};
  function s(v) { return v == null ? '' : String(v).trim(); }
  function blank(v) { v = s(v); return !v || /^\[(no source|blank|none listed|.*removed)\]$/i.test(v) ? '' : v; }
  function iso(v) { v = s(v); if (!v) return ''; if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10); var m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(v); if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2); return ''; }
  function hash(t) { var h = 5381; t = String(t); for (var i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0; return h.toString(36); }
  X.iso = iso;
  /* names: display "First Last", sort by last name. Everything after the first given name counts as the surname
     (keeps double surnames together). Single names sort by that name. */
  function splitName(raw) {
    var n = s(raw).replace(/\(.*?\)/g, '').replace(/\(.*$/, '').split(',')[0].replace(/^(dr|mr|ms|mrs)\.?\s+/i, '').replace(/\s+/g, ' ').trim();
    if (/\s(and|&)\s/i.test(n)) return { first: n, last: '' };
    var t = n.split(' ');
    return t.length < 2 ? { first: n, last: '' } : { first: t[0], last: t.slice(1).join(' ') };
  }
  function nameParts(raw) {
    var p = splitName(raw), key = (p.last || p.first).normalize('NFD').replace(/[\u0300-\u036f]/g, ''), letter = (key.replace(/[^A-Za-z]/g, '')[0] || '#').toUpperCase();
    return { name: p.last ? p.first + ' ' + p.last : p.first, first: p.first, last: p.last, sortKey: (key + ' ' + p.first.normalize('NFD').replace(/[\u0300-\u036f]/g, '')).toLowerCase().replace(/[^a-z ]/g, ''), letter: letter };
  }
  X.nameParts = nameParts;
  /* services */
  var SVC = [[/^aba|rbt|behavior tech/i, 'ABA'], [/bcba|supervis/i, 'BCBA'], [/setss|seit/i, 'SETSS'], [/speech|slp|language/i, 'Speech'], [/feeding/i, 'Feeding'], [/^ot\b|occupational/i, 'OT'], [/^pt\b|physical/i, 'PT'], [/counsel|lmsw|social/i, 'Counseling'], [/music/i, 'Music therapy'], [/para/i, 'Para'], [/aac|assistive/i, 'AAC']];
  function svcName(r) { r = s(r); for (var i = 0; i < SVC.length; i++) if (SVC[i][0].test(r)) return SVC[i][1]; return r || 'Provider'; }
  X.SVC_ORDER = ['ABA', 'BCBA', 'SETSS', 'Speech', 'Feeding', 'OT', 'PT', 'Counseling', 'Music therapy', 'AAC', 'Para', 'Related service', 'Provider', 'Service'];
  function svcSort(a, b) { var i = X.SVC_ORDER.indexOf(a), j = X.SVC_ORDER.indexOf(b); return (i < 0 ? 50 : i) - (j < 0 ? 50 : j) || (a < b ? -1 : 1); }
  X.svcSort = svcSort;
  function settingOf(t) { t = s(t).toLowerCase(); var o = []; if (/school/.test(t)) o.push('School'); if (/home/.test(t)) o.push('Home'); if (/virtual|zoom|remote|tele/.test(t)) o.push('Virtual'); if (/center|clinic/.test(t)) o.push('Center'); return o; }
  /* schedules: "Mon 3:00-7:00 PM; Tue 3-5" -> [{d:'Mon', s:900, e:1140}] (minutes) */
  var DW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function parseSched(txt) {
    var t = s(txt).toLowerCase().replace(/\bm\s*-\s*f\b/g, 'mon-fri'); if (!t) return [];
    var out = [];
    t.split(/;|\n/).forEach(function (seg) {
      var ds = [], rg = /\b(sun|mon|tue|wed|thu|fri|sat)\w*\s*(?:-|to|through)\s*(sun|mon|tue|wed|thu|fri|sat)/.exec(seg);
      var low = DW.map(function (d) { return d.toLowerCase(); });
      if (rg) { for (var i = low.indexOf(rg[1]), g = 0; g < 7; i = (i + 1) % 7, g++) { ds.push(i); if (i === low.indexOf(rg[2])) break; } }
      else (seg.match(/\b(sun|mon|tue|wed|thu|fri|sat)/g) || []).forEach(function (d) { if (ds.indexOf(low.indexOf(d)) < 0) ds.push(low.indexOf(d)); });
      var tm = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/.exec(seg);
      if (!ds.length || !tm) return;
      var a2 = tm[6] || (+tm[4] < 7 || +tm[4] === 12 ? 'pm' : 'am'), a1 = tm[3] || ((+tm[1] % 12) <= (+tm[4] % 12) ? a2 : 'am');
      var m = function (hh, mm, ap) { return (+hh % 12 + (ap === 'pm' ? 12 : 0)) * 60 + (+mm || 0); };
      var st = m(tm[1], tm[2], a1), en = m(tm[4], tm[5], a2); if (en <= st) en += 720; if (en <= st) return;
      ds.forEach(function (d) { out.push({ d: DW[d], s: st, e: en }); });
    });
    return out;
  }
  X.parseSched = parseSched;
  function wkFrom(sl) { return sl.length ? Math.round(sl.reduce(function (a, x) { return a + (x.e - x.s); }, 0) / 60 * 100) / 100 : null; }
  function num(v) { var m = /^\s*(\d+(?:\.\d+)?)\s*$/.exec(s(v)); return m ? +m[1] : null; }

  /* ---------- live: TTG Ops bootstrap ---------- */
  X.fromLive = function (d) {
    var today = iso(d.today) || new Date().toISOString().slice(0, 10), PV = {}, PVI = {};
    function prov(name, role, pid, extra) {
      if (/\)/.test(name) && !/\(/.test(name)) return null; var np = nameParts(name); if (!np.name || /^(tbd|open|unassigned|vacant|none|n\/a|\?)$/i.test(np.name)) return null;
      var k = np.sortKey; var p = PV[k];
      if (!p) p = PV[k] = { id: 'P' + hash(k), hubId: '', name: np.name, first: np.first, last: np.last, sortKey: np.sortKey, letter: np.letter, roles: [], phone: '', email: '', students: [], lines: [], intake: null, notes: [], queue: [], license: null, licExp: null, pets: null, area: null, languages: null, start: null, onboarding: null, sessionNotes: null };
      if (pid && !p.hubId) p.hubId = pid;
      if (role) { var r = svcName(role); if (p.roles.indexOf(r) < 0) p.roles.push(r); }
      if (extra) { if (extra.email && !p.email) p.email = s(extra.email); if (extra.phone && !p.phone) p.phone = s(extra.phone); }
      return p;
    }
    var students = (d.cases || []).map(function (c) {
      var f = c.fields || {}, np = nameParts(c.student), lines = [], parent = null;
      (c.team || []).forEach(function (t) { if (t.role === 'Parent') { if (!parent) parent = t; } else prov(t.name, t.role === 'Related service' ? '' : t.role, t.provider_id, t); });
      (c.assignments || []).forEach(function (a) {
        var p = prov(a.provider, a.role, a.provider_id), sl = parseSched(a.schedule);
        lines.push({ svc: svcName(a.role), role: s(a.role), pid: p ? p.id : '', provider: p ? p.name : '', setting: blank(a.setting), slots: sl, schedText: blank(a.schedule), wk: wkFrom(sl), mandate: blank(a.mandate), start: '', end: iso(a.auth_expiry), status: blank(a.status) || 'Active', note: blank(a.notes), ai: '', caseNo: '' });
      });
      (c.team || []).forEach(function (t) {
        if (t.role === 'Parent') return; var p = prov(t.name, t.role === 'Related service' ? '' : t.role, t.provider_id, t);
        if (p && !lines.some(function (l) { return l.pid === p.id; })) lines.push({ svc: svcName(t.role), role: s(t.role), pid: p.id, provider: p.name, setting: '', slots: [], schedText: '', wk: null, mandate: '', start: '', end: '', status: 'Active', note: '', ai: '', caseNo: '' });
      });
      (c.gaps || []).forEach(function (g) { lines.push({ svc: svcName(g.role), role: s(g.role), pid: '', provider: '', setting: '', slots: [], schedText: '', wk: null, mandate: '', start: '', end: '', status: 'Unstaffed', since: iso(g.since), days: g.days, departed: s(g.departed), note: '', ai: '', caseNo: '' }); });
      /* Nina's student chart (read only, from bootstrap c.chart): provider phone/email fill the provider record if the hub has none,
         and the chart schedule fills that provider's line on this case if it has no schedule. */
      var ch = c.chart || null;
      if (ch && ch.provider && s(ch.provider.name)) {
        var cp = prov(ch.provider.name, '', ch.provider.provider_id, { phone: ch.provider.phone, email: ch.provider.email });
        var csch = blank(ch.schedule);
        if (cp && csch) lines.forEach(function (l) { if (l.pid === cp.id && !l.schedText && !l.slots.length) { l.schedText = csch; l.slots = parseSched(csch); l.wk = wkFrom(l.slots); } });
      }
      lines.sort(function (a, b) { return svcSort(a.svc, b.svc); });
      var pc = blank(f['Parent contact']), g = { name: '', phone: '', email: '' };
      if (pc) { var em = /[\w.+-]+@[\w.-]+\.\w+/.exec(pc), ph = /\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/.exec(pc); g = { name: s(pc.split(',')[0]).replace(/\(.*?\)/g, '').trim(), phone: ph ? ph[0] : '', email: em ? em[0] : '' }; if (/@|\d{3}/.test(g.name)) g.name = ''; }
      if (parent) g = { name: nameParts(parent.name).name || g.name, phone: s(parent.phone) || g.phone, email: s(parent.email) || g.email };
      var b = c.bank || {}, banks = b.total ? [{ svc: 'Hour bank', auth: +b.total, used: +b.used || 0, end: iso(b.expiry), caseNo: '', provider: '' }] : [];
      var hw = num(f['Sched hrs/wk']);
      var st = { id: c.id, name: np.name, first: np.first, last: np.last, sortKey: np.sortKey, letter: np.letter, source: (c.source === 'board' ? 'Case board' : 'Case roster') + (ch ? ' + Nina chart' : ''),
        dob: ch && iso(ch.dob) || null, age: ch && ch.age != null && ch.dob ? +ch.age : null, grade: null, school: ch && blank(ch.school) || null, borough: null, cls: null, dx: null, osis: null, language: null,
        attends: ch && blank(ch.attends_school) || null, address: ch && blank(ch.guardian_address) || null,
        guardian: g.name || null, guardianPhone: g.phone || null, guardianEmail: g.email || null, guardian2: null, lawyer: null,
        setting: blank(c.setting) || null, settings: settingOf(c.setting + ' ' + lines.map(function (l) { return l.setting; }).join(' ')),
        hrsWk: hw, hrsTxt: hw == null ? blank(f['Sched hrs/wk']) : '', lines: lines, banks: banks, gaps: (c.gaps || []).map(function (x) { return { role: svcName(x.role), since: iso(x.since), days: x.days }; }),
        bcba: blank(c.bcba) || null, health: c.health || {}, why: blank(f['Why'] || c.why) || null, rosterNotes: blank(f['Roster notes (live issues)']) || null, related: blank(f['Related services (Nina)']) || null,
        dates: [], caseNo: null, hearingDate: null, orderDate: null, outcome: null, intakeDate: null,
        intake: c.intake ? { status: s(c.intake.status), received: blank(c.intake.received), missing: blank(c.intake.missing), welcome: blank(c.intake.welcome), last: iso(c.intake.last), updated: iso(c.intake.updated) } : null,
        ensora: c.ensora ? { use: blank(c.ensora.use), data: blank(c.ensora.data), last: iso(c.ensora.last) || blank(c.ensora.last), source: blank(c.ensora.source), missing: blank(c.ensora.missing) } : null,
        checklist: null, docs: null, reports: null,
        notes: (c.notes || []).map(function (n) { return { date: iso(n.ts), time: s(n.ts).slice(11, 16), by: s(n.author), type: s(n.type), text: s(n.text) }; }),
        dates_: [], raw: null };
      lines.forEach(function (l) { var p = l.pid && PVbyId(l.pid); if (p) { if (p.students.indexOf(st.id) < 0) p.students.push(st.id); p.lines.push({ sid: st.id, l: l }); } });
      return st;
    });
    function PVbyId(id) { for (var k in PV) if (PV[k].id === id) return PV[k]; return null; }
    (d.intake || []).forEach(function (x) {
      if (x.kind !== 'Provider') return; var p = PV[nameParts(x.name).sortKey]; if (!p) return;
      p.intake = { status: s(x.status), received: blank(x.received), missing: blank(x.missing), welcome: blank(x.welcome), last: iso(x.last), updated: iso(x.updated) };
    });
    (d.queue || []).forEach(function (q) { var p = PV[nameParts(q.recipient).sortKey]; if (p) p.queue.push({ date: iso(q.created), subject: s(q.subject), status: s(q.status), text: s(q.message) }); });
    var providers = Object.keys(PV).map(function (k) { var p = PV[k]; if (!p.roles.length) p.lines.forEach(function (x) { if (p.roles.indexOf(x.l.svc) < 0 && x.l.svc !== 'Related service') p.roles.push(x.l.svc); }); if (!p.roles.length) p.roles.push('Provider'); p.roles.sort(svcSort); p.hrsWk = wkFrom([].concat.apply([], p.lines.map(function (x) { return x.l.slots; }))); return p; });
    var other = (d.intake || []).filter(function (x) { return x.kind === 'Other'; }).map(function (x) { var np = nameParts(x.name); return { name: np.name, first: np.first, last: np.last, letter: np.letter, sortKey: np.sortKey, status: s(x.status), received: blank(x.received), missing: blank(x.missing) }; });
    return { mode: 'live', today: today, students: students, providers: providers, other: other, sync: d.sync || null };
  };

  /* ---------- demo: fictional data.js ---------- */
  X.fromDemo = function (D) {
    var PMAP = {};
    var providers = D.providers.map(function (p) {
      var np = nameParts(p.name);
      var o = { id: p.id, hubId: '', name: np.name, first: np.first, last: np.last, sortKey: np.sortKey, letter: np.letter, roles: [p.role === 'Counselor' ? 'Counseling' : p.role === 'RBT' ? 'ABA' : p.role === 'SLP' ? 'Speech' : p.role], title: p.role === 'Counselor' ? 'LMSW' : p.role, discipline: p.discipline,
        phone: p.phone, email: p.email, students: p.students.slice(), lines: [], intake: null, notes: [], queue: [], license: p.license, cert: p.cert, licExp: p.licExp, pets: p.pets, area: p.area, languages: p.languages, start: p.start,
        onboarding: p.onboarding, sessionNotes: p.sessionNotes.map(function (n) { return { date: n.date, time: n.time, sid: n.sid, svc: n.svc, mins: n.mins, signed: n.signed, text: n.text }; }), hrsWk: p.hrsWk };
      PMAP[p.id] = o; return o;
    });
    var students = D.students.map(function (r) {
      var np = nameParts(r.name);
      var lines = r.lines.map(function (l) { return { svc: l.svc === 'BCBA supervision' ? 'BCBA' : l.svc, role: l.svc, pid: l.pid, provider: PMAP[l.pid].name, setting: l.setting, slots: l.sessions.map(function (x) { return { d: x.d, s: x.s, e: x.e }; }), schedText: '', wk: l.wk, mandate: l.sessions.length + ' x ' + l.len + ' min per week', start: l.start, end: l.end, status: 'Active', note: '', ai: l.ai, caseNo: l.caseNo }; });
      lines.sort(function (a, b) { return svcSort(a.svc, b.svc); });
      var banks = []; r.cases.forEach(function (c) { c.banks.forEach(function (b) { banks.push({ svc: b.svc, auth: b.auth, used: b.used, end: '', caseNo: c.num, provider: PMAP[b.pid] ? PMAP[b.pid].name : '' }); }); });
      var st = { id: r.id, name: np.name, first: np.first, last: np.last, sortKey: np.sortKey, letter: np.letter, source: 'Demo',
        dob: r.dob, age: r.age, grade: r.grade, school: r.school, borough: r.borough, cls: r.cls, dx: r.dx, osis: null, language: r.parent.lang, attends: 'Yes', address: null,
        guardian: r.parent.name + ' (' + r.parent.rel.toLowerCase() + ')', guardianPhone: r.parent.phone, guardianEmail: r.parent.email, guardian2: r.parent2 ? r.parent2.name + ' (' + r.parent2.rel.toLowerCase() + '), ' + r.parent2.phone : null,
        lawyer: r.lawyer, setting: lines.map(function (l) { return l.setting; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' + '), settings: settingOf(lines.map(function (l) { return l.setting; }).join(' ')),
        hrsWk: r.hrsWk, hrsTxt: '', lines: lines, banks: banks, gaps: [], bcba: lines.filter(function (l) { return l.svc === 'BCBA'; }).map(function (l) { return l.provider; }).join(', ') || null,
        health: null, why: null, rosterNotes: null, related: null,
        dates: r.hearings.map(function (h) { return { date: h.date, what: h.what, status: h.status, detail: h.detail }; }), caseNo: r.caseNo, hearingDate: r.hearingDate, orderDate: r.orderDate, outcome: r.outcome, intakeDate: r.intakeDate,
        intake: null, ensora: null, checklist: r.checklist, docs: r.docs, reports: r.reports,
        notes: r.notes.map(function (n) { return { date: n.date, time: '', by: n.by, type: '', text: n.text }; }), raw: r };
      return st;
    });
    students.forEach(function (st) { st.lines.forEach(function (l) { var p = PMAP[l.pid]; if (p) p.lines.push({ sid: st.id, l: l }); }); });
    return { mode: 'demo', today: D.today, students: students, providers: providers, other: [], sync: null };
  };
})();
