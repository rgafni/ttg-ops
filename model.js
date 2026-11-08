/* TTG Ops v4 model. Pure functions: bootstrap -> portal view model, clinical notes, reports, search.
   No DOM, no network, no storage, no secrets. Missing data stays missing (never invented). */
(function (root) {
  'use strict';
  var BC = root.TTG_BILLING || (typeof require === 'function' ? require('./billing-core.js') : null);
  var normName = BC.normName, sameProvider = BC.sameProvider, normService = BC.normService;
  var EDITABLE = ['Parent contact', 'Related services (Nina)', 'Roster notes (live issues)', 'Hour bank total', 'Hours used', 'Auth expiry',
    'Sched hrs/wk', 'Delivered this wk', 'Sched vs delivered (month)', 'Last contact: parent', 'Last contact: BCBA', 'Last contact: provider(s)',
    'Last contact: Nina', 'Assessment/report due', 'Progress report due', 'Tx plan review', 'Sessions logged (mo)', 'Notes submitted',
    'Invoice submitted', 'Billing gap', 'Health: Relationship', 'Health: Service', 'Health: Clinical', 'Health: Billing', 'Why'];
  var GONE = /\b(left|inactive|closed|terminated|resigned|discharged|former|ended)\b/i;

  function str(v) { return v == null ? '' : String(v).trim(); }
  /** Source placeholders such as "[no source]" mean "not on file". */
  function val(v) { v = str(v); return /^(\[(no source|blank|none listed)\]|not on file|n\/a)$/i.test(v) ? '' : v; }
  /** Only plain https links are ever rendered. */
  function safeUrl(u) {
    u = str(u); if (!/^https:\/\/[^\s"'<>`]+$/i.test(u)) return '';
    try { var x = new URL(u); return x.protocol === 'https:' ? x.href : ''; } catch (e) { return /^https:\/\/[A-Za-z0-9.-]+(\/[^\s"'<>`]*)?$/.test(u) ? u : ''; }
  }
  /** Short opaque key (FNV-1a) so names never appear in the URL. */
  function hkey(s) { var h = 0x811c9dc5; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
  function uniq(a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }); }
  function byStr(k) { return function (a, b) { a = str(a[k]).toLowerCase(); b = str(b[k]).toLowerCase(); return a < b ? -1 : a > b ? 1 : 0; }; }

  // Optional source fields are used only when supplied; never infer case numbers or financial values.
  function maskSSN(v) {
    var d = str(v).replace(/[^0-9]/g, '');
    return /^(?:[0-9]{4}|[0-9]{9})$/.test(d) ? '***-**-' + d.slice(-4) : '';
  }
  function documents(a) {
    return (Array.isArray(a) ? a : []).map(function (d) {
      return { title: val(d.title), url: safeUrl(d.url), status: val(d.status) };
    }).filter(function (d) { return d.title || d.url; });
  }
  function caseRecords(c) {
    // service_cases is an optional structured source; the current API only exposes a case record ID.
    // Never group records by student name, and never turn assignments into invented authorizations.
    var records = Array.isArray(c.service_cases) && c.service_cases.length ? c.service_cases : [
      { record_id: c.id, service: (c.assignments || []).map(function (a) { return val(a.role); }).filter(Boolean).join(' · '), auth_end: (c.bank || {}).expiry, source: 'Case Board / roster record. Separate case numbers, rates and full authorization details are not connected.' }
    ];
    return records.map(function (r) { return {
      number: val(r.case_number), recordId: val(r.record_id), service: val(r.service), status: val(r.status), provider: val(r.provider),
      authStart: val(r.auth_start), authEnd: val(r.auth_end), hours: val(r.authorized_hours), units: val(r.authorized_units),
      frequency: val(r.frequency), rate: val(r.rate), funding: val(r.funding_source), source: val(r.source)
    }; });
  }

  /* ---------- providers ---------- */
  function providerIndex(cases, chartSync) {
    var list = [], byId = {}, byName = {};
    function get(name, id) {
      name = str(name).replace(/\s*\(.*?\)\s*/g, ' ').trim(); id = str(id);
      if (!name && !id) return null;
      var p = id && byId[id];
      if (!p && name) {
        var L = byName[normName(name)] || [];
        if (L.length === 1 && (!id || !L[0].provider_id)) p = L[0];
      }
      if (!p) {
        p = { key: id ? 'p' + hkey('id:' + id) : 'p' + hkey('n:' + normName(name)), provider_id: id, name: name || id, roles: [], phone: '', email: '', cases: [], sources: [] };
        list.push(p); (byName[normName(p.name)] = byName[normName(p.name)] || []).push(p);
      }
      if (id && !p.provider_id) p.provider_id = id;
      if (id) byId[id] = p;
      return p;
    }
    function info(p, src) {
      if (!p) return;
      ['rate', 'hours', 'credentials'].forEach(function (k) { if (!p[k]) p[k] = val(src[k]); });
      if (!p.ssn) p.ssn = maskSSN(src.ssn_last4 || src.ssn);
      if (!p.documents) p.documents = [];
      documents(src.documents).forEach(function (d) { if (!p.documents.some(function (x) { return x.url === d.url && x.title === d.title; })) p.documents.push(d); });
    }
    function link(p, c, role, extra, source) {
      if (!p) return;
      if (role && p.roles.indexOf(role) < 0) p.roles.push(role);
      if (p.sources.indexOf(source) < 0) p.sources.push(source);
      var ex = p.cases.filter(function (x) { return x.case_id === c.id && x.role === role; })[0];
      if (!ex) { ex = { case_id: c.id, student: c.student, role: role, schedule: '', mandate: '', status: '', setting: '', source: source }; p.cases.push(ex); }
      Object.keys(extra || {}).forEach(function (k) { if (extra[k] && !ex[k]) ex[k] = extra[k]; });
    }
    (cases || []).forEach(function (c) {
      (c.team || []).forEach(function (m) {
        if (/^(parent|guardian|related service)$/i.test(m.role)) return;
        var p = get(m.name, m.provider_id); if (!p) return; info(p, m);
        if (!p.phone && m.phone) p.phone = m.phone; if (!p.email && m.email) p.email = m.email;
        link(p, c, m.role, {}, 'Case roster');
      });
      (c.assignments || []).forEach(function (a) {
        if (/^(parent|guardian)$/i.test(str(a.role)) || /^(tbd|open|unassigned|vacant|none|n\/a|\?)$/i.test(str(a.provider))) return;
        var p = get(a.provider, a.provider_id);
        link(p, c, a.role, { schedule: val(a.schedule), mandate: val(a.mandate), status: val(a.status), setting: val(a.setting) }, 'Provider Hub assignments');
      });
    });
    ((chartSync && chartSync.providers) || []).forEach(function (cp) {
      if (/^(parent|guardian)$/i.test(str(cp.discipline))) return;
      var p = get(cp.name, cp.provider_id); if (!p) return; info(p, cp);
      if (!p.phone && cp.phone) p.phone = cp.phone; if (!p.email && cp.email) p.email = cp.email;
      if (cp.discipline && p.roles.indexOf(cp.discipline) < 0) p.roles.push(cp.discipline);
      if (p.sources.indexOf('Student chart') < 0) p.sources.push('Student chart');
    });
    list.sort(byStr('name'));
    return list;
  }
  function findProvider(list, name) {
    var hits = (list || []).filter(function (p) { return sameProvider(p.name, name); });
    return hits.length === 1 ? hits[0] : null;
  }

  /* ---------- bootstrap -> view model ---------- */
  function normalizeBootstrap(b) {
    b = b || {};
    var cases = Array.isArray(b.cases) ? b.cases : [];
    var providers = providerIndex(cases, b.chart_sync);
    var trig = {}; (b.triggers || []).forEach(function (t) { trig[t.id] = t.name; });
    var reports = (b.reports || []).map(function (r) { return { id: str(r.id), created: str(r.created), kind: str(r.kind), scope: str(r.scope), month: str(r.month), title: str(r.title), body: str(r.body), status: str(r.status) || 'draft', updated: str(r.updated) }; });
    var queue = (b.queue || []).map(function (q) {
      var p = findProvider(providers, q.recipient);
      return { id: str(q.id), created: str(q.created), trigger: str(q.trigger), triggerName: trig[q.trigger] || str(q.trigger), case_id: str(q.case_id), student: str(q.student),
        recipient: str(q.recipient), contact: str(q.recipient_contact), channel: str(q.channel), subject: str(q.subject), message: str(q.message),
        status: str(q.status) || 'draft', updated: str(q.updated), note: str(q.note), owner: str(q.owner) || 'Roni', open_role: str(q.open_role), providerKey: p ? p.key : '' };
    });
    var idCount = {}, nameGroups = {};
    cases.forEach(function (c) { idCount[c.id] = (idCount[c.id] || 0) + 1; var k = normName(c.student); (nameGroups[k] = nameGroups[k] || []).push(c.id); });
    var students = cases.map(function (c) {
      var team = c.team || [], f = c.fields || {};
      var direct = team.filter(function (m) { return !/^(parent|guardian|related service|bcba)$/i.test(m.role); });
      var asg = (c.assignments || []).filter(function (a) { return !/^(parent|guardian)$/i.test(str(a.role)); }).map(function (a) { return { provider: str(a.provider), provider_id: str(a.provider_id), role: str(a.role), setting: val(a.setting), schedule: val(a.schedule), mandate: val(a.mandate), auth_expiry: val(a.auth_expiry), status: val(a.status), notes: val(a.notes), open: /^(tbd|open|unassigned|vacant|none|n\/a|\?)$/i.test(str(a.provider)) }; });
      var fields = EDITABLE.filter(function (k) { return k in f; }).map(function (k) { return { k: k, v: val(f[k]) }; });
      var intake = c.intake ? { status: val(c.intake.status), received: val(c.intake.received), missing: val(c.intake.missing), last: val(c.intake.last), who: val(c.intake.who),
        links: (c.intake.links || []).map(safeUrl).filter(Boolean) } : null;
      var ensora = c.ensora ? { use: val(c.ensora.use), data: val(c.ensora.data), last: val(c.ensora.last), source: val(c.ensora.source), sourceUrl: safeUrl(c.ensora.source), missing: val(c.ensora.missing) } : null;
      var chart = c.chart ? { dob: val(c.chart.dob), age: c.chart.age, school: val(c.chart.school), attends: val(c.chart.attends_school), location: val(c.chart.service_location),
        schedule: val(c.chart.schedule), hours: val(c.chart.hours_week), address: val(c.chart.guardian_address), osis: val(c.chart.osis || c.osis), district: val(c.chart.district || c.district), provider: c.chart.provider ? { name: val(c.chart.provider.name), provider_id: val(c.chart.provider.provider_id) } : null } : null;
      return {
        id: str(c.id), name: str(c.student) || str(c.id), source: c.source === 'board' ? 'Case Board' : 'Case roster', setting: val(c.setting),
        health: c.health || {}, why: val(c.why), osis: val(c.osis), district: val(c.district), caseRecords: caseRecords(c), documents: documents(c.documents), goals: val(c.goals),
        bcba: team.filter(function (m) { return m.role === 'BCBA'; }).map(function (m) { return { name: str(m.name), key: (findProvider(providers, m.name) || {}).key || '' }; }),
        providers: direct.map(function (m) { var p = findProvider(providers, m.name); return { name: str(m.name), role: str(m.role), key: p ? p.key : '' }; }),
        family: team.filter(function (m) { return /^(parent|guardian)$/i.test(m.role); }).map(function (m) { return [val(m.name), val(m.phone), val(m.email)].filter(Boolean).join(' · '); }),
        related: team.filter(function (m) { return m.role === 'Related service'; }).map(function (m) { return str(m.name); }),
        departed: (c.departed || []).map(function (d) { return str(d.name) + (d.role ? ' (' + d.role + ')' : ''); }),
        openRoles: uniq((c.open_roles || []).map(str)), gaps: (c.gaps || []).map(function (g) { return { role: str(g.role), since: str(g.since), days: g.days }; }),
        services: uniq(direct.map(function (m) { return str(m.role); }).concat(asg.filter(function (a) { return !GONE.test(a.status); }).map(function (a) { return a.role; }))),
        assignments: asg, fields: fields, fieldMap: f, bank: c.bank || {}, chart: chart, intake: intake, ensora: ensora,
        caseLog: (c.notes || []).map(function (n) { return { ts: str(n.ts), author: str(n.author), type: str(n.type), text: str(n.text) }; }),
        duplicateId: idCount[c.id] > 1,
        sameNameIds: (nameGroups[normName(c.student)] || []).filter(function (x) { return x !== c.id; })
      };
    });
    var ambiguous = students.filter(function (s) { return s.duplicateId || s.sameNameIds.length; });
    var schedules = [];
    students.forEach(function (s) {
      s.assignments.forEach(function (a) { if (!GONE.test(a.status)) schedules.push({ case_id: s.id, student: s.name, provider: a.open ? '' : a.provider, providerKey: a.open ? '' : ((findProvider(providers, a.provider) || {}).key || ''), role: a.role, schedule: a.schedule, mandate: a.mandate, status: a.status, open: a.open, source: 'Provider Hub assignments' }); });
    });
    var gaps = (b.unstaffed || []).map(function (g) { return { case_id: str(g.case_id), student: str(g.student), role: str(g.role), since: str(g.since), days: g.days, departed: str(g.departed) }; });
    students.forEach(function (s) { s.openRoles.forEach(function (r) { if (!gaps.some(function (g) { return g.case_id === s.id && g.role.toLowerCase() === r.toLowerCase(); })) gaps.push({ case_id: s.id, student: s.name, role: r, since: '', days: null, departed: '' }); }); });
    return {
      me: str(b.me) || 'Roni', today: str(b.today), v4: b.v4 && b.v4.api === 'v4' ? b.v4 : null,
      students: students.slice().sort(byStr('name')), providers: providers, schedules: schedules, gaps: gaps, ambiguous: ambiguous,
      queue: queue, requests: (b.requests || []).map(function (r) { return { id: str(r.id), ts: str(r.timestamp), case_id: str(r.case_id), student: str(r.student), text: str(r.text), status: str(r.status), reply: str(r.reply), replied: str(r.replied_at) }; }),
      reports: reports, todayItems: (b.today_items || []).map(function (i) { return { trigger: trig[i.trigger] || str(i.trigger), student: str(i.student), case_id: str(i.case_id), recipient: str(i.recipient), note: str(i.note) }; }),
      sync: b.sync || null, chartSync: b.chart_sync ? { ok: !!b.chart_sync.ok, rows: b.chart_sync.rows, matched: b.chart_sync.matched, unmatched: (b.chart_sync.unmatched || []).length, error: str(b.chart_sync.error) } : null,
      intakeCount: (b.intake || []).length
    };
  }
  function student(P, id) { return (P.students || []).filter(function (s) { return s.id === id; })[0] || null; }
  function queueGroups(P) {
    var q = P.queue || [];
    return {
      needsYou: q.filter(function (x) { return x.status === 'draft' && /^roni$/i.test(x.owner); }),
      others: q.filter(function (x) { return x.status === 'draft' && !/^roni$/i.test(x.owner); }),
      approved: q.filter(function (x) { return /^approved/i.test(x.status); }),
      dismissed: q.filter(function (x) { return x.status === 'dismissed'; })
    };
  }

  /* ---------- clinical notes ---------- */
  function normalizeClinical(c, P) {
    if (!c || !c.available) return { available: false, reason: str(c && c.reason) || 'Clinical notes source not connected', notes: [], sessions: [], unmatched: 0 };
    var notes = (c.notes || []).map(function (n) {
      var p = findProvider(P && P.providers, n.provider);
      return { id: str(n.id), case_id: str(n.case_id), student: str(n.student), date: BC.isoDate(n.date), time: str(n.time), duration_min: n.duration_min == null ? null : +n.duration_min,
        provider: str(n.provider), providerKey: p ? p.key : 'p' + hkey('n:' + normName(n.provider)), service: str(n.service), location: str(n.location), text: str(n.text),
        signed: str(n.signed), created: str(n.created), source: str(n.source) || 'Clinical notes' };
    }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.time < b.time ? 1 : -1); });
    var ss = c.sessions_without_notes || {};
    return { available: true, reason: '', notes: notes, unmatched: c.unmatched_count || 0, ambiguous: c.ambiguous_count || 0,
      sessions: ss.available ? (ss.items || []).map(function (s) { return { case_id: str(s.case_id), student: str(s.student), date: BC.isoDate(s.date), provider: str(s.provider), service: str(s.service), source: str(s.source) }; }) : [],
      sessionsAvailable: !!ss.available, sessionsReason: str(ss.reason) };
  }
  function filterNotes(notes, f) {
    f = f || {}; var q = str(f.q).toLowerCase();
    return (notes || []).filter(function (n) {
      if (f.caseId && n.case_id !== f.caseId) return false;
      if (f.providerKey && n.providerKey !== f.providerKey) return false;
      if (f.from && n.date < f.from) return false;
      if (f.to && n.date > f.to) return false;
      if (q && (n.text + ' ' + n.provider + ' ' + n.service + ' ' + n.student).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function noteProviders(notes) {
    var seen = {}, out = [];
    (notes || []).forEach(function (n) { if (!seen[n.providerKey]) { seen[n.providerKey] = 1; out.push({ key: n.providerKey, name: n.provider || '(no provider)' }); } });
    return out.sort(byStr('name'));
  }

  /* ---------- notes-grounded report draft ---------- */
  function excerpt(t, n) { t = str(t).replace(/\s+/g, ' '); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; }
  function buildReportDraft(stu, clinical, opts) {
    opts = opts || {};
    var aud = /^(Parent|School|Internal)$/.test(opts.audience) ? opts.audience : 'Parent';
    var from = BC.isoDate(opts.from), to = BC.isoDate(opts.to);
    var notes = filterNotes((clinical && clinical.notes) || [], { caseId: stu.id, from: from, to: to }).slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time < b.time ? -1 : 1); });
    var sessions = filterNotes((clinical && clinical.sessions) || [], { caseId: stu.id, from: from, to: to });
    var period = (from || 'start') + ' to ' + (to || 'today'), first = stu.name.split(' ')[0];
    var L = [], warnings = [];
    L.push(aud + ' update: ' + stu.name);
    L.push('Period: ' + period);
    L.push('');
    if (!clinical || !clinical.available) {
      warnings.push('Clinical notes source unavailable: ' + ((clinical && clinical.reason) || 'not connected'));
      L.push('Clinical notes are not available for this period, so there is nothing to summarize yet.');
    } else if (!notes.length) {
      warnings.push('No clinical notes for ' + stu.name + ' in this period.');
      L.push('No clinical notes are on file for ' + stu.name + ' between ' + period + '. Nothing to summarize.');
    } else {
      var groups = {}, order = [];
      notes.forEach(function (n) { var k = (n.service || 'Service not recorded') + ' · ' + (n.provider || 'provider not recorded'); if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(n); });
      L.push(aud === 'Parent' ? 'Here is a summary of the sessions documented for ' + first + ' in this period, based on the providers\u2019 notes.'
        : aud === 'School' ? 'For the school team: sessions documented for ' + stu.name + ' in this period, based on the providers\u2019 notes.'
        : 'Internal summary of documented sessions for ' + stu.name + '.');
      L.push('');
      L.push('Sessions documented (' + notes.length + ')');
      order.forEach(function (k) { L.push('- ' + k + ': ' + groups[k].length + ' note' + (groups[k].length === 1 ? '' : 's') + ' (' + groups[k].map(function (n) { return n.date; }).join(', ') + ')'); });
      L.push('');
      L.push('What the notes record (provider wording, oldest first)');
      notes.forEach(function (n) {
        L.push('- ' + n.date + ' · ' + (n.service || 'service n/a') + ' · ' + (n.provider || 'provider n/a') + (aud === 'Internal' && n.duration_min ? ' · ' + n.duration_min + ' min' : '') +
          (aud === 'Internal' && !n.signed ? ' · unsigned' : '') + ': \u201c' + excerpt(n.text, 280) + '\u201d');
      });
    }
    if (aud === 'Internal') {
      L.push('');
      if (clinical && clinical.sessionsAvailable) L.push(sessions.length ? 'Sessions without a note in this period: ' + sessions.map(function (s) { return s.date + ' ' + (s.service || '') + ' ' + s.provider; }).join('; ') + ' (a missing note does not mean the session was missed).' : 'Sessions without a note in this period: none listed.');
      else L.push('Sessions without notes: source not available.');
    }
    L.push('');
    L.push(aud === 'Internal' ? 'Follow-ups: (add)' : 'Next steps: (Roni to add before sharing)');
    return {
      title: aud + ' update: ' + stu.name, case_id: stu.id, student: stu.name, audience: aud, from: from, to: to, body: L.join('\n'),
      sources: notes.map(function (n) { return { id: n.id, date: n.date, label: n.date + ' · ' + (n.service || 'service n/a') + ' · ' + (n.provider || 'provider n/a'), source: n.source }; }),
      warnings: warnings,
      limits: 'Built only from the clinical notes listed under Sources, in their own words. No progress judgments are added. Review and edit before printing or sharing; nothing is sent.'
    };
  }

  /* ---------- search + review count ---------- */
  function searchAll(q, P, clinical) {
    q = str(q).toLowerCase(); if (q.length < 2) return [];
    var out = [], has = function (s) { return String(s || '').toLowerCase().indexOf(q) >= 0; };
    (P.students || []).forEach(function (s) { if (has(s.name) || has(s.id) || has(s.services.join(' '))) out.push({ type: 'Student', href: '#/student/' + s.id, title: s.name, sub: s.services.join(' · ') || s.setting }); });
    (P.providers || []).forEach(function (p) { if (has(p.name) || has(p.roles.join(' '))) out.push({ type: 'Provider', href: '#/provider/' + p.key, title: p.name, sub: p.roles.join(' · ') }); });
    ((clinical && clinical.notes) || []).forEach(function (n) { if (has(n.text) || has(n.provider) || has(n.service)) out.push({ type: 'Note', href: '#/note/' + n.id, title: n.student + ' · ' + n.date, sub: (n.service ? n.service + ' · ' : '') + excerpt(n.text, 80) }); });
    (P.queue || []).forEach(function (x) { if (has(x.subject) || has(x.student) || has(x.recipient) || has(x.message)) out.push({ type: 'Open item', href: '#/item/' + x.id, title: x.subject || x.triggerName, sub: x.recipient + ' · ' + x.status }); });
    (P.reports || []).forEach(function (r) { if (has(r.title) || has(r.scope)) out.push({ type: 'Report', href: '#/report/' + r.id, title: r.title, sub: r.status }); });
    return out.slice(0, 60);
  }
  function reviewItems(P, billing) {
    var g = queueGroups(P), out = [];
    g.needsYou.forEach(function (x) { out.push({ kind: 'Draft message', href: '#/item/' + x.id, title: x.subject || x.triggerName, sub: x.recipient }); });
    (P.reports || []).filter(function (r) { return r.status === 'draft'; }).forEach(function (r) { out.push({ kind: 'Report draft', href: '#/report/' + r.id, title: r.title, sub: r.created.slice(0, 10) }); });
    ((billing && billing.available && billing.batches) || []).filter(function (b) { return b.audit.status !== 'Signed off'; }).forEach(function (b) { out.push({ kind: 'Billing', href: '#/billing/' + encodeURIComponent(b.id), title: b.id, sub: b.audit.status }); });
    return out;
  }

  var api = { maskSSN: maskSSN, documents: documents, caseRecords: caseRecords, EDITABLE: EDITABLE, val: val, safeUrl: safeUrl, hkey: hkey, providerIndex: providerIndex, findProvider: findProvider,
    normalizeBootstrap: normalizeBootstrap, student: student, queueGroups: queueGroups, normalizeClinical: normalizeClinical,
    filterNotes: filterNotes, noteProviders: noteProviders, buildReportDraft: buildReportDraft, searchAll: searchAll, reviewItems: reviewItems,
    normName: normName, normService: normService };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TTG_V4_MODEL = api;
})(typeof window !== 'undefined' ? window : this);
