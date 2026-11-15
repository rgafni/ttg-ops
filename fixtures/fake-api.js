/* In-memory stand-in for the private API, used ONLY in fixture mode (?fixtures=1). Fictional data, no network,
   nothing persisted: every change disappears when the tab closes. Mirrors the server's validation rules. */
(function (root) {
  'use strict';
  function create(FX, BC) {
    var clone = function (x) { return JSON.parse(JSON.stringify(x)); };
    var boot = clone(FX.bootstrap), clinical = clone(FX.clinical), batchesSrc = clone(FX.billingLines || []), audit = [], seq = 0;
    var EDIT = ['Parent contact', 'Related services (Nina)', 'Roster notes (live issues)', 'Hour bank total', 'Hours used', 'Auth expiry', 'Sched hrs/wk', 'Delivered this wk',
      'Sched vs delivered (month)', 'Last contact: parent', 'Last contact: BCBA', 'Last contact: provider(s)', 'Last contact: Nina', 'Assessment/report due', 'Progress report due',
      'Tx plan review', 'Sessions logged (mo)', 'Notes submitted', 'Invoice submitted', 'Billing gap', 'Health: Relationship', 'Health: Service', 'Health: Clinical', 'Health: Billing', 'Why'];
    function now() { return new Date().toISOString().slice(0, 19); }
    function id(p) { seq++; return p + '-demo' + seq; }
    function kase(cid) { var c = boot.cases.filter(function (x) { return x.id === cid; })[0]; if (!c) throw new Error('case not found'); return c; }
    function hash(s) { var h = 0x811c9dc5; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
    function review() {
      var batches = batchesSrc.map(function (b) {
        var version = 'v' + hash(BC.canonical(b.lines));
        var rv = BC.reviewLines(b.lines, clinical.notes, { unitMinutes: null });
        return { b: b, id: b.id, version: version, review: rv };
      });
      BC.markCrossBatch(batches);
      return { available: true, reason: '', notes_available: true, persisted: false, batches: batches.map(function (x) {
        var a = BC.auditState(audit, x.id, x.version);
        return { id: x.id, version: x.version, lines: clone(x.b.lines), review: x.review, persisted: false,
          audit: { checks: a.checks, flags: a.flags, signoff: a.signoff, prior_signoff: a.priorSignoff, status: a.status, history: a.history },
          blocker: BC.signoffBlocker(x.review, a) };
      }) };
    }
    var H = {
      bootstrap: function () { return clone(boot); },
      updateCase: function (d) {
        var c = kase(d.case_id); if (EDIT.indexOf(d.field) < 0) throw new Error('field not editable');
        c.fields[d.field] = String(d.value == null ? '' : d.value).slice(0, 2000);
        c.notes.unshift({ ts: now(), author: 'Roni', type: 'edit', text: d.field + ' → ' + (c.fields[d.field] || '(cleared)') });
        return { case: clone(c) };
      },
      addNote: function (d) { var c = kase(d.case_id); var t = String(d.text || '').trim(); if (!t) throw new Error('empty note'); c.notes.unshift({ ts: now(), author: 'Roni', type: d.type || 'note', text: t.slice(0, 4000) }); return { case: clone(c) }; },
      queueAction: function (d) {
        var q = boot.queue.filter(function (x) { return x.id === d.id; })[0]; if (!q) throw new Error('item not found');
        var st = { approve: 'approved – Katya to send', dismiss: 'dismissed', edit: q.status || 'draft', reopen: 'draft' }[d.op]; if (!st) throw new Error('bad op');
        if (d.op === 'edit' || d.op === 'approve') ['subject', 'message'].forEach(function (k) { if (d[k] != null) q[k] = String(d[k]).slice(0, 4000); });
        q.status = st; q.updated = now(); return { queue: clone(boot.queue) };
      },
      addRequest: function (d) {
        var t = String(d.text || '').trim(); if (!t) throw new Error('empty request');
        var c = d.case_id ? kase(d.case_id) : null, rid = id('K');
        boot.requests.push({ id: rid, timestamp: now(), case_id: c ? c.id : '', student: c ? c.student : '', kind: 'free text', text: t, status: 'new', reply: '', replied_at: '', thread_id: rid });
        return { requests: clone(boot.requests) };
      },
      makeReport: function (d) {
        var kinds = { student: 1, provider: 1, intake: 1, month: 1 }; if (!kinds[d.kind]) throw new Error('unknown report');
        var c = d.kind === 'student' ? kase(d.case_id) : null;
        var r = { id: id('R'), created: now(), kind: d.kind, scope: c ? c.student : String(d.provider || ''), month: String(d.month || '').slice(0, 7), status: 'draft', updated: now(),
          title: d.kind === 'student' ? 'Student status: ' + c.student : d.kind === 'provider' ? 'Provider hours and billing: ' + (d.provider || '') : d.kind === 'intake' ? 'Intake papers status' : 'Monthly case report',
          body: '(Fictional preview: the live API builds this report from the Sheets.)' };
        boot.reports.unshift(r); return { report: clone(r), reports: clone(boot.reports) };
      },
      reportAction: function (d) {
        var r = boot.reports.filter(function (x) { return x.id === d.id; })[0]; if (!r) throw new Error('report not found');
        var st = { done: 'reviewed', reopen: 'draft', remove: 'deleted', edit: r.status || 'draft' }[d.op]; if (!st) throw new Error('bad op');
        if (d.op === 'edit' && d.body != null) r.body = String(d.body).slice(0, 45000);
        r.status = st; r.updated = now(); boot.reports = boot.reports.filter(function (x) { return x.status !== 'deleted'; });
        return { reports: clone(boot.reports) };
      },
      saveReportDraft: function (d) {
        var c = kase(d.case_id), body = String(d.body || '').trim(); if (!body) throw new Error('empty report');
        var r = { id: id('R'), created: now(), kind: 'notes-update', scope: c.student, month: String(d.to || '').slice(0, 7), title: String(d.title || 'Update').slice(0, 200), body: body, status: 'draft', updated: now() };
        boot.reports.unshift(r); return { report: clone(r), reports: clone(boot.reports) };
      },
      clinicalNotes: function () { return { clinical: clone(clinical) }; },
      billingReview: function () { return { billing: review() }; },
      billingDecision: function (d) {
        var R = review();
        if (audit.some(function (a) { return a.request_id === d.request_id; })) return { duplicate: true, billing: R };
        var b = R.batches.filter(function (x) { return x.id === d.batch_id; })[0] || null;
        var a = b ? BC.auditState(audit, b.id, b.version) : { checks: {}, flags: [] };
        var err = BC.validateDecision({ op: d.op, request_id: d.request_id, batch_version: d.batch_version, line_id: d.line_id || '', reason: String(d.reason || ''), confirm: d.confirm === true }, b, b ? b.review : [], a);
        if (err) throw new Error(err);
        var aid = id('BA');
        audit.push({ audit_id: aid, ts: now(), actor: 'Roni', request_id: d.request_id, op: d.op, batch_id: b.id, batch_version: b.version, line_id: d.line_id || '', reason: String(d.reason || '').trim(), result: d.op });
        return { audit_id: aid, billing: review() };
      }
    };
    return function (action, data) {
      return new Promise(function (resolve, reject) {
        try {
          if (!H[action]) throw new Error('unknown action');
          var r = H[action](data || {}); r.ok = true; r.fixture = true; resolve(JSON.parse(JSON.stringify(r)));
        } catch (e) { reject(e); }
      });
    };
  }
  root.TTG_FAKE_API = { create: create };
})(typeof window !== 'undefined' ? window : this);
