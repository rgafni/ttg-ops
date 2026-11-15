/* TTG Ops billing review core. Pure functions shared by the browser (fixture mode) and the Apps Script API
   (copied there as BillingCore.gs). No data, no network, no DOM, no secrets.
   Rules: a billed line is only "aligned" when one clinical note for the same student and date matches the
   provider, service, duration and (when billed in units) units. Anything else blocks sign-off.
   A missing note never proves a missed session; it only means the line cannot be verified. */
(function (root) {
  'use strict';
  var SVC = [
    [/\b(ot|occupational)\b/, 'OT'], [/\b(pt|physical)\b/, 'PT'], [/\b(speech|slp|st|language)\b/, 'Speech'],
    [/\b(aba|rbt|bcba|behavior)\b/, 'ABA'], [/\bsetss\b/, 'SETSS'], [/\b(counsel\w*|social work|lmsw|lcsw)\b/, 'Counseling'],
    [/\bpara\w*\b/, 'Para'], [/\b(feeding)\b/, 'Feeding']
  ];
  function fold(s) { s = String(s == null ? '' : s); return s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s; }
  function normName(s) {
    s = fold(s).replace(/\(.*?\)/g, ' ');
    var m = /^\s*([^,]+),\s*([^,]+)$/.exec(s); if (m) s = m[2] + ' ' + m[1];   // "Last, First" -> "First Last"
    return s.toLowerCase().replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function toks(n) { return normName(n).replace(/\./g, '').split(' ').filter(Boolean); }
  /** Same person when first tokens agree (4-char prefix) and, if both carry a surname, a surname token agrees. */
  function sameProvider(a, b) {
    var A = toks(a), B = toks(b); if (!A.length || !B.length) return false;
    if (normName(a) === normName(b)) return true;
    if (A[0].slice(0, 4) !== B[0].slice(0, 4)) {
      // allow initial + surname ("A. Brooks" vs "Avery Brooks")
      if (!(A[0].length === 1 || B[0].length === 1) || A[0][0] !== B[0][0]) return false;
    }
    if (A.length < 2 || B.length < 2) return A.length === B.length || A[0].length > 1 && B[0].length > 1;
    return A.slice(1).some(function (t) { return B.slice(1).some(function (x) { return x.slice(0, 4) === t.slice(0, 4); }); });
  }
  function normService(s) {
    var t = fold(s).toLowerCase(); if (!t.trim()) return '';
    for (var i = 0; i < SVC.length; i++) if (SVC[i][0].test(t)) return SVC[i][1];
    return t.replace(/\s+/g, ' ').trim();
  }
  /** Minutes from 45, "45", "45 min", "0:45", "1:30", "1.5 h", "1 hr 15 min". null when unknown. */
  function parseMinutes(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) && v > 0 ? Math.round(v) : null;
    var s = String(v).toLowerCase().trim(), m;
    if ((m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s))) return +m[1] * 60 + +m[2];
    var h = /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/.exec(s), mi = /(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)\b/.exec(s);
    if (h || mi) return Math.round((h ? +h[1] * 60 : 0) + (mi ? +mi[1] : 0)) || null;
    if (/^\d+(\.\d+)?$/.test(s)) return Math.round(+s) || null;
    return null;
  }
  /** yyyy-mm-dd from ISO or M/D/YYYY strings. '' when unknown. (Date objects are formatted by the caller.) */
  function isoDate(v) {
    var s = String(v == null ? '' : v).trim(), m;
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
    if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s))) {
      var y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
      return y + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2);
    }
    return '';
  }
  function num(v) { if (v === '' || v == null) return null; var n = +String(v).replace(/[^0-9.\-]/g, ''); return isFinite(n) && String(v).trim() !== '' ? n : null; }

  function noteSummary(n) { return n ? { id: n.id, date: n.date, provider: n.provider, service: n.service, duration_min: n.duration_min } : null; }

  /** Review one batch. lines/notes are normalized records. opts.unitMinutes is the default unit length (minutes) or null. */
  function reviewLines(lines, notes, opts) {
    opts = opts || {};
    var byCaseDate = {}, byId = {};
    (notes || []).forEach(function (n) { byId[n.id] = n; var k = n.case_id + '|' + n.date; (byCaseDate[k] = byCaseDate[k] || []).push(n); });
    var out = (lines || []).map(function (l) {
      var reasons = [], r = { line_id: l.id, state: 'aligned', reasons: reasons, note_id: '', note: null };
      function block(state, why) { if (r.state === 'aligned' || rank(state) > rank(r.state)) r.state = state; reasons.push(why); }
      if (l.case_status !== 'matched' || !l.case_id) {
        block(l.case_status === 'ambiguous' ? 'ambiguous' : 'needs_review', l.case_status === 'ambiguous'
          ? 'Student name matches more than one case; resolve before review' : 'Student is not matched to a case');
        return r;
      }
      if (!l.date) { block('needs_review', 'Billed line has no valid service date'); return r; }
      var note = null;
      if (l.note_id) {
        note = byId[l.note_id] || null;
        if (!note) { block('no_note', 'Linked note ' + l.note_id + ' was not found in the clinical notes source'); return r; }
        if (note.case_id !== l.case_id) { block('mismatch', 'Linked note belongs to a different student'); }
      } else {
        var cands = byCaseDate[l.case_id + '|' + l.date] || [];
        if (!cands.length) { block('no_note', 'No clinical note for this student on ' + l.date + ' (cannot verify; a missing note does not prove a missed session)'); return r; }
        var byProv = cands.filter(function (n) { return sameProvider(n.provider, l.provider); });
        if (!byProv.length) { block('mismatch', 'Provider mismatch: billed ' + (l.provider || '(blank)') + ', note(s) by ' + cands.map(function (n) { return n.provider || '(blank)'; }).join(', ')); return r; }
        var pick = byProv;
        if (pick.length > 1 && normService(l.service)) { var s2 = pick.filter(function (n) { return normService(n.service) === normService(l.service); }); if (s2.length) pick = s2; }
        if (pick.length > 1 && l.duration_min != null) { var d2 = pick.filter(function (n) { return n.duration_min === l.duration_min; }); if (d2.length) pick = d2; }
        if (pick.length > 1) { block('ambiguous', pick.length + ' notes could support this line; link one explicitly'); return r; }
        note = pick[0];
      }
      r.note_id = note.id; r.note = noteSummary(note);
      if (note.date !== l.date) block('mismatch', 'Date mismatch: billed ' + l.date + ', note ' + note.date);
      if (!sameProvider(note.provider, l.provider)) block('mismatch', 'Provider mismatch: billed ' + (l.provider || '(blank)') + ', note ' + (note.provider || '(blank)'));
      var ls = normService(l.service), ns = normService(note.service);
      if (!ls) block('needs_review', 'Billed line has no service');
      else if (!ns) block('needs_review', 'Service cannot be verified from the note');
      else if (ls !== ns) block('mismatch', 'Service mismatch: billed ' + ls + ', note ' + ns);
      if (l.duration_min == null) block('needs_review', 'Billed line has no duration');
      else if (note.duration_min == null) block('needs_review', 'Note has no duration');
      else if (l.duration_min !== note.duration_min) block('mismatch', 'Duration mismatch: billed ' + l.duration_min + ' min, note ' + note.duration_min + ' min');
      if (l.units != null) {
        var um = l.unit_minutes || opts.unitMinutes || null;
        if (!um) block('needs_review', 'Units billed but unit length is unknown');
        else if (note.duration_min != null && l.units !== Math.round(note.duration_min / um)) block('mismatch', 'Units mismatch: billed ' + l.units + ', note supports ' + Math.round(note.duration_min / um) + ' (' + um + '-min units)');
      }
      if (!reasons.length) reasons.push('Student, date, provider, service, duration' + (l.units != null ? ' and units' : '') + ' match note ' + note.id);
      return r;
    });
    // One note can support only one billed line.
    var used = {};
    out.forEach(function (r) { if (r.note_id) (used[r.note_id] = used[r.note_id] || []).push(r); });
    Object.keys(used).forEach(function (k) {
      if (used[k].length > 1) used[k].forEach(function (r) {
        r.state = 'duplicate';
        r.reasons.push('Note ' + k + ' is matched by ' + used[k].length + ' billed lines (possible double billing)');
      });
    });
    return out;
  }
  /** Mark lines in different batches that rely on the same note (possible double billing across invoices). */
  function markCrossBatch(batches) {
    var use = {};
    (batches || []).forEach(function (b) { (b.review || []).forEach(function (r) { if (r.note_id) (use[r.note_id] = use[r.note_id] || []).push({ b: b.id, r: r }); }); });
    Object.keys(use).forEach(function (k) {
      var ids = use[k].map(function (x) { return x.b; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
      if (ids.length > 1) use[k].forEach(function (x) {
        x.r.state = 'duplicate';
        x.r.reasons.push('Note ' + k + ' is also billed in ' + ids.filter(function (i) { return i !== x.b; }).join(', ') + ' (possible double billing)');
      });
    });
    return batches;
  }
  function rank(s) { return { aligned: 0, needs_review: 1, no_note: 2, ambiguous: 3, mismatch: 4, duplicate: 5 }[s] || 0; }

  /** Canonical string for the batch content; hash it with the caller's digest to get the version. */
  function canonical(lines) {
    return JSON.stringify((lines || []).slice().sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; }).map(function (l) {
      return [l.id, l.case_id, l.student, l.date, l.provider, normService(l.service), l.duration_min, l.units, l.unit_minutes, l.note_id || ''];
    }));
  }

  /** Replay append-only audit rows (oldest first) for one batch + version. */
  function auditState(rows, batchId, version) {
    var st = { checks: {}, flags: [], signoff: null, priorSignoff: null, history: [] };
    (rows || []).forEach(function (a) {
      if (a.batch_id !== batchId) return;
      st.history.push({ ts: a.ts, op: a.op, line_id: a.line_id, reason: a.reason, version: a.batch_version, audit_id: a.audit_id });
      if (a.batch_version !== version) { if (a.op === 'signoff') st.priorSignoff = { ts: a.ts, version: a.batch_version }; return; }
      if (a.op === 'check') st.checks[a.line_id] = { ts: a.ts };
      else if (a.op === 'uncheck') delete st.checks[a.line_id];
      else if (a.op === 'flag') st.flags.push({ ts: a.ts, line_id: a.line_id, reason: a.reason, audit_id: a.audit_id });
      else if (a.op === 'clear_flag') st.flags = [];
      else if (a.op === 'signoff') st.signoff = { ts: a.ts, audit_id: a.audit_id };
    });
    st.status = st.signoff ? 'Signed off' : st.flags.length ? 'Flagged for correction' : st.priorSignoff ? 'Changed since sign-off' : 'Needs review';
    return st;
  }

  /** Why sign-off is blocked ('' when allowed). Never derived from counts alone. */
  function signoffBlocker(review, audit) {
    if (!review.length) return 'Batch has no billed lines';
    var bad = review.filter(function (r) { return r.state !== 'aligned'; });
    if (bad.length) return bad.length + ' line(s) do not align with a clinical note';
    var unchecked = review.filter(function (r) { return !audit.checks[r.line_id]; });
    if (unchecked.length) return unchecked.length + ' line(s) not yet checked by you';
    if (audit.flags.length) return 'Open correction flag';
    if (audit.signoff) return 'Already signed off';
    return '';
  }

  /** Validate a requested decision against the CURRENT source. Returns '' when valid, else the error. */
  function validateDecision(d, batch, review, audit) {
    var ops = { check: 1, uncheck: 1, flag: 1, clear_flag: 1, signoff: 1 };
    if (!d || !ops[d.op]) return 'bad op';
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(String(d.request_id || ''))) return 'missing request id';
    if (!batch) return 'batch not found';
    if (d.batch_version !== batch.version) return 'stale: billing source changed, reload before deciding';
    var line = d.line_id ? review.filter(function (r) { return r.line_id === d.line_id; })[0] : null;
    if ((d.op === 'check' || d.op === 'uncheck') && !line) return 'line not found';
    if (d.op === 'check' && line.state !== 'aligned') return 'line does not align with a note; flag it instead';
    if (d.op === 'flag') {
      if (d.line_id && !line) return 'line not found';
      if (String(d.reason || '').trim().length < 5) return 'a correction reason is required';
    }
    if (d.op === 'clear_flag' && String(d.reason || '').trim().length < 5) return 'a reason is required to clear a flag';
    if ((d.op === 'check' || d.op === 'uncheck' || d.op === 'flag') && audit.signoff) return 'already signed off';
    if (d.op === 'signoff') {
      if (d.confirm !== true) return 'explicit confirmation required';
      var b = signoffBlocker(review, audit); if (b) return b;
    }
    return '';
  }

  var api = { fold: fold, normName: normName, sameProvider: sameProvider, normService: normService, parseMinutes: parseMinutes,
    isoDate: isoDate, num: num, reviewLines: reviewLines, markCrossBatch: markCrossBatch, canonical: canonical, auditState: auditState,
    signoffBlocker: signoffBlocker, validateDecision: validateDecision };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TTG_BILLING = api;
})(typeof window !== 'undefined' ? window : this);
