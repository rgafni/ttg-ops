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

  // Optional source fields are used only when supplied; never infer financial values. Case numbers are never shown (Roni, Nov 15: billing staff need them, this app does not).
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
      { record_id: c.id, service: (c.assignments || []).map(function (a) { return val(a.role); }).filter(Boolean).join(' · '), auth_end: (c.bank || {}).expiry, source: 'Case Board / roster record. Rates and full authorization details are not connected.' }
    ];
    return records.map(function (r) { return {
      recordId: val(r.record_id), service: val(r.service), status: val(r.status), provider: val(r.provider),
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

  /** What an open item is about. A subject that is only a rule code ("T5 – Name") is replaced by the start of the item's own message. */
  function itemTitle(q, trig) {
    var sub = str(q.subject), code = str(q.trigger), msg = str(q.message).replace(/^\[[^\]]*\]\s*/, '').replace(/\s+/g, ' ');
    var bare = !sub || (code && !trig[code] && (sub === code || sub.indexOf(code + ' ') === 0));
    if (!bare) return sub;
    var m1 = msg.match(/^.*?[.!?](?=\s|$)/), first = m1 ? m1[0] : msg;
    var who = str(q.recipient), stu = str(q.student);
    return excerpt(first, 70) || excerpt(str(q.note), 70) || (who ? 'Draft to ' + who + (stu && who.indexOf(stu.split(' ')[0]) < 0 ? ' about ' + stu : '') : '') || 'Open item';
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
        status: str(q.status) || 'draft', updated: str(q.updated), note: str(q.note), owner: str(q.owner) || 'Roni', open_role: str(q.open_role), providerKey: p ? p.key : '',
        title: itemTitle(q, trig) };
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
    if (!c || !c.available) return { available: false, reason: str(c && c.reason) || 'Clinical notes source not connected', notes: [], unlinked: [], sessions: [], unmatched: 0 };
    var notes = (c.notes || []).map(function (n) {
      var p = findProvider(P && P.providers, n.provider);
      return { id: str(n.id), case_id: str(n.case_id), student: str(n.student), date: BC.isoDate(n.date), time: str(n.time), duration_min: n.duration_min == null ? null : +n.duration_min,
        provider: str(n.provider), providerKey: p ? p.key : 'p' + hkey('n:' + normName(n.provider)), service: str(n.service), location: str(n.location), text: str(n.text),
        signed: str(n.signed), created: str(n.created), source: str(n.source) || 'Clinical notes' };
    }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.time < b.time ? 1 : -1); });
    // Notes the API could not attach to exactly one student. Kept apart, never linked by guesswork; shown with the name as written.
    var unlinked = (c.unlinked_notes || []).map(function (n) {
      var p = findProvider(P && P.providers, n.provider);
      return { id: str(n.id), case_id: '', student: str(n.student), date: BC.isoDate(n.date), time: str(n.time), duration_min: n.duration_min == null ? null : +n.duration_min,
        provider: str(n.provider), providerKey: p ? p.key : 'p' + hkey('n:' + normName(n.provider)), service: str(n.service), location: str(n.location), text: str(n.text),
        signed: str(n.signed), created: str(n.created), source: str(n.source) || 'Clinical notes', unlinked: true, reason: str(n.reason) };
    }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    var ss = c.sessions_without_notes || {};
    return { available: true, reason: '', notes: notes, unlinked: unlinked, unmatched: c.unmatched_count || 0, ambiguous: c.ambiguous_count || 0,
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

  /* ---------- schedules -> calendar ----------
     Schedules are the free-text strings already on the assignments ("Mon-Fri 3:00-5:00 PM; Sat 10:00 AM-12:00 PM (virtual sup.)").
     They are parsed strictly. Anything that does not parse is reported back as text, never guessed onto the calendar.
     A scheduled slot is a plan, not proof of a session; a missing note is never treated as a missed session. */
  var DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function dayIndex(t) { t = str(t).toLowerCase().slice(0, 3); var i = DAYS.indexOf(t); return i; }
  function parseDays(spec) {
    // "Mon", "Mon-Fri", "Mon/Wed", "Tue & Thu", "Mon, Wed"
    var out = [], parts = str(spec).split(/\s*(?:\/|,|&|\band\b)\s*/i).filter(Boolean);
    for (var i = 0; i < parts.length; i++) {
      var r = parts[i].match(/^([A-Za-z]{3,9})\s*(?:-|–|to)\s*([A-Za-z]{3,9})$/);
      if (r) {
        var a = dayIndex(r[1]), b = dayIndex(r[2]); if (a < 0 || b < 0) return null;
        for (var d = a, n = 0; n < 7; d = (d + 1) % 7, n++) { out.push(d); if (d === b) break; }
      } else { var x = dayIndex(parts[i]); if (x < 0 || !/^[A-Za-z]{3,9}\.?$/.test(parts[i])) return null; out.push(x); }
    }
    return out.length ? out : null;
  }
  function clock(h, m, ap) { h = +h; m = +(m || 0); if (h > 23 || m > 59) return null; if (ap) { ap = ap.toLowerCase(); if (h === 12) h = 0; if (ap === 'pm') h += 12; } return h * 60 + m; }
  function parseRange(t) {
    var m = str(t).match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (!m) return null;
    var end = clock(m[4], m[5], m[6]), start;
    if (m[3]) start = clock(m[1], m[2], m[3]);
    else {
      start = clock(m[1], m[2], m[6]);
      // "11:00-1:00 PM" crosses noon. Only a 7 to 11 morning start is read that way; anything else stays unparsed.
      if (start != null && end != null && start > end) start = m[6].toLowerCase() === 'pm' && +m[1] >= 7 && +m[1] <= 11 ? clock(m[1], m[2], 'am') : null;
    }
    if (start == null || end == null || end <= start) return null;
    return { start: start, end: end };
  }
  function parseSchedule(text) {
    var slots = [], unparsed = [];
    str(text).split(/\s*;\s*/).filter(Boolean).forEach(function (seg) {
      var note = '', s = seg.replace(/\(([^)]*)\)/g, function (_, n) { note += (note ? '; ' : '') + n.trim(); return ' '; }).replace(/\s+/g, ' ').trim();
      var m = s.match(/^([A-Za-z]{3,9}\.?(?:\s*(?:-|–|\/|,|&|to|and)\s*[A-Za-z]{3,9}\.?)*)\s+(\d.*)$/i);
      var days = m && parseDays(m[1].replace(/\./g, ''));
      if (!days) { unparsed.push(seg); return; }
      // several ranges on one day, each with its own note: "8:00 AM-2:15 PM (school), 2:30-5:30 PM (home)"
      var pieces = seg.slice(seg.search(/\d/)).split(/\s*,\s*/), ok = [];
      for (var i = 0; i < pieces.length; i++) {
        var pn = ''; var body = pieces[i].replace(/\(([^)]*)\)/g, function (_, n) { pn += (pn ? '; ' : '') + n.trim(); return ' '; }).replace(/\s+/g, ' ').trim();
        var r = parseRange(body); if (!r) { ok = null; break; }
        ok.push({ start: r.start, end: r.end, note: pn });
      }
      if (!ok) { unparsed.push(seg); return; }
      days.forEach(function (d) { ok.forEach(function (r) { slots.push({ day: d, start: r.start, end: r.end, note: r.note }); }); });
    });
    return { slots: slots, unparsed: unparsed };
  }
  function slotMinutes(slots) { return (slots || []).reduce(function (a, s) { return a + (s.end - s.start); }, 0); }
  function hhmm(min) { var h = Math.floor(min / 60), m = min % 60, ap = h >= 12 ? 'PM' : 'AM', h12 = h % 12 || 12; return h12 + (m ? ':' + ('0' + m).slice(-2) : '') + ' ' + ap; }
  function timeRange(s) { var a = hhmm(s.start), b = hhmm(s.end); if (a.slice(-2) === b.slice(-2)) a = a.slice(0, -3); return a + '–' + b; }
  function fmtHours(min) { if (min > 0 && min < 60) return Math.round(min) + ' min'; var h = Math.round(min / 6) / 10; return (h % 1 ? h.toFixed(1) : String(h)) + ' h'; }
  function mandateMinutes(m) { var x = str(m).match(/^(\d+(?:\.\d+)?)\s*(?:h|hrs?|hours?)?(?:\s*\/\s*(?:wk|week))?$/i); return x ? Math.round(parseFloat(x[1]) * 60) : null; }
  var SUPERVISE = /\b(bcba|supervis|sup\.?|joint|parent training)\b/i;
  /** Weekly plan for every active assignment, with scheduled vs mandate per assignment. */
  // Cached per schedules array (a new bootstrap makes a new array), so taps on the calendar do not re-parse every schedule.
  var _wpCache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function weekPlan(P) {
    var src = P.schedules || [];
    if (_wpCache && _wpCache.has(src)) return _wpCache.get(src);
    var out = weekPlanRaw(src); if (_wpCache) _wpCache.set(src, out); return out;
  }
  function weekPlanRaw(rows) {
    return rows.map(function (r) {
      var ps = parseSchedule(r.schedule), mins = slotMinutes(ps.slots), man = mandateMinutes(r.mandate);
      return { case_id: r.case_id, student: r.student, provider: r.provider, providerKey: r.providerKey, role: r.role, open: r.open, schedule: r.schedule,
        slots: ps.slots, unparsed: ps.unparsed, minutes: mins, mandateMin: man,
        vsMandate: man == null || !ps.slots.length || ps.unparsed.length ? '' : mins < man - 5 ? 'under' : mins > man + 5 ? 'over' : 'match' };
    });
  }
  function isoOf(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parseIso(s) { var m = str(s).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null; }
  /** Monday of the week containing iso date. */
  function weekStart(iso) { var d = parseIso(iso) || new Date(); d.setHours(12); var back = (d.getDay() + 6) % 7; d.setDate(d.getDate() - back); return isoOf(d); }
  function addDays(iso, n) { var d = parseIso(iso); d.setDate(d.getDate() + n); return isoOf(d); }
  /** Sessions planned for the 7 days from monday, with overlap flags and notes on file. opts: { monday, today, providerKey, caseId } */
  function calendarWeek(P, clinical, opts) {
    opts = opts || {};
    var monday = weekStart(opts.monday || opts.today), today = opts.today || isoOf(new Date());
    var plan = weekPlan(P), days = [];
    var notes = clinical && clinical.available ? clinical.notes : null;
    for (var i = 0; i < 7; i++) {
      var date = addDays(monday, i), dow = (i + 1) % 7, ev = [];
      plan.forEach(function (a) {
        a.slots.forEach(function (s) {
          if (s.day !== dow) return;
          ev.push({ date: date, start: s.start, end: s.end, note: s.note, case_id: a.case_id, student: a.student, provider: a.provider, providerKey: a.providerKey,
            role: a.role, open: a.open, overlaps: [], noteState: '' });
        });
      });
      ev.forEach(function (e, j) {
        ev.forEach(function (o, k) {
          if (k === j || o.start >= e.end || e.start >= o.end) return;
          var sup = SUPERVISE.test(e.role + ' ' + e.note) || SUPERVISE.test(o.role + ' ' + o.note);
          if (e.providerKey && e.providerKey === o.providerKey && o.case_id !== e.case_id && !sup) e.overlaps.push({ kind: 'provider', with: o.student, time: timeRange(o) });
          else if (o.case_id === e.case_id && !sup && !e.open && !o.open && e.providerKey !== o.providerKey) e.overlaps.push({ kind: 'student', with: o.provider + ' (' + o.role + ')', time: timeRange(o) });
        });
        if (notes && date < today && !e.open) {
          var hit = notes.some(function (n) { return n.case_id === e.case_id && n.date === date && (!e.providerKey || n.providerKey === e.providerKey); });
          e.noteState = hit ? 'on_file' : 'none';
        }
      });
      var shown = ev.filter(function (e) { return (!opts.providerKey || e.providerKey === opts.providerKey) && (!opts.caseId || e.case_id === opts.caseId); })
        .sort(function (a, b) { return a.start - b.start || (a.student < b.student ? -1 : 1); });
      days.push({ date: date, dow: dow, label: DAY_LABEL[dow], isToday: date === today, isPast: date < today, events: shown });
    }
    var scope = plan.filter(function (a) { return (!opts.providerKey || a.providerKey === opts.providerKey) && (!opts.caseId || a.case_id === opts.caseId); });
    return { monday: monday, sunday: addDays(monday, 6), days: days,
      offCalendar: scope.filter(function (a) { return a.unparsed.length || !a.slots.length; }).map(function (a) { return { case_id: a.case_id, student: a.student, provider: a.provider, providerKey: a.providerKey, role: a.role, open: a.open, text: a.unparsed.join('; ') || a.schedule }; }),
      mandate: scope.filter(function (a) { return a.vsMandate === 'under' || a.vsMandate === 'over'; }),
      // each clash is counted once, not once per side
      overlapCount: days.reduce(function (n, d) { return n + d.events.reduce(function (m, e) { return m + e.overlaps.length; }, 0) / 2; }, 0),
      notesAvailable: !!notes };
  }
  /** TTG bookings per provider (hours/week and which days). This is not their outside availability, which no source records. */
  var _plCache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function providerLoad(P) {
    var src = P.schedules || [];
    if (_plCache && _plCache.has(src)) return _plCache.get(src);
    var out = providerLoadRaw(P); if (_plCache) _plCache.set(src, out); return out;
  }
  function providerLoadRaw(P) {
    var plan = weekPlan(P), out = {};
    plan.forEach(function (a) {
      if (!a.providerKey) return;
      var o = out[a.providerKey] = out[a.providerKey] || { key: a.providerKey, name: a.provider, minutes: 0, days: {}, students: [] };
      o.minutes += a.minutes; a.slots.forEach(function (s) { o.days[s.day] = 1; }); if (o.students.indexOf(a.student) < 0) o.students.push(a.student);
    });
    return out;
  }

  /* ---------- search + review count ---------- */
  function searchAll(q, P, clinical) {
    q = str(q).toLowerCase(); if (q.length < 2) return [];
    var out = [], has = function (s) { return String(s || '').toLowerCase().indexOf(q) >= 0; };
    (P.students || []).forEach(function (s) { if (has(s.name) || has(s.id) || has(s.services.join(' '))) out.push({ type: 'Student', href: '#/student/' + s.id, title: s.name, sub: s.services.join(' · ') || s.setting }); });
    (P.providers || []).forEach(function (p) { if (has(p.name) || has(p.roles.join(' '))) out.push({ type: 'Provider', href: '#/provider/' + p.key, title: p.name, sub: p.roles.join(' · ') }); });
    ((clinical && clinical.notes) || []).concat((clinical && clinical.unlinked) || []).forEach(function (n) { if (has(n.text) || has(n.provider) || has(n.service) || (n.unlinked && has(n.student))) out.push({ type: n.unlinked ? 'Note (not linked)' : 'Note', href: '#/note/' + n.id, title: n.student + ' · ' + n.date, sub: (n.service ? n.service + ' · ' : '') + excerpt(n.text, 80) }); });
    (P.queue || []).forEach(function (x) { if (has(x.subject) || has(x.student) || has(x.recipient) || has(x.message)) out.push({ type: 'Open item', href: '#/item/' + x.id, title: x.title, sub: x.recipient + ' · ' + x.status }); });
    (P.reports || []).forEach(function (r) { if (has(r.title) || has(r.scope)) out.push({ type: 'Report', href: '#/report/' + r.id, title: r.title, sub: r.status }); });
    return out.slice(0, 60);
  }
  function reviewItems(P, billing) {
    var g = queueGroups(P), out = [];
    g.needsYou.forEach(function (x) { out.push({ kind: 'Draft message', href: '#/item/' + x.id, title: x.title, sub: x.recipient && x.title.indexOf(x.recipient) < 0 ? x.recipient : x.student }); });
    (P.reports || []).filter(function (r) { return r.status === 'draft'; }).forEach(function (r) { out.push({ kind: 'Report draft', href: '#/report/' + r.id, title: r.title, sub: r.created.slice(0, 10) }); });
    ((billing && billing.available && billing.batches) || []).filter(function (b) { return b.audit.status !== 'Signed off'; }).forEach(function (b) { out.push({ kind: 'Billing', href: '#/billing/' + encodeURIComponent(b.id), title: b.id, sub: b.audit.status }); });
    return out;
  }

  var api = { maskSSN: maskSSN, documents: documents, caseRecords: caseRecords, EDITABLE: EDITABLE, val: val, safeUrl: safeUrl, hkey: hkey, providerIndex: providerIndex, findProvider: findProvider,
    normalizeBootstrap: normalizeBootstrap, student: student, queueGroups: queueGroups, normalizeClinical: normalizeClinical,
    filterNotes: filterNotes, noteProviders: noteProviders, buildReportDraft: buildReportDraft, searchAll: searchAll, reviewItems: reviewItems,
    normName: normName, normService: normService,
    parseSchedule: parseSchedule, weekPlan: weekPlan, calendarWeek: calendarWeek, providerLoad: providerLoad, weekStart: weekStart, addDays: addDays,
    timeRange: timeRange, fmtHours: fmtHours, mandateMinutes: mandateMinutes, slotMinutes: slotMinutes, DAY_LABEL: DAY_LABEL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TTG_V4_MODEL = api;
})(typeof window !== 'undefined' ? window : this);
