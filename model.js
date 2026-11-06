/* TTG Ops v4 domain helpers. Pure functions; no DOM, no secrets, no network. */
(function (root) {
  'use strict';

  function normName(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }

  /** Deterministic student link by id/code. Ambiguous display-name matches are flagged, never silently merged. */
  function resolveStudentRef(ref, students) {
    var list = students || [];
    if (!ref) return { status: 'missing', matches: [] };
    if (typeof ref === 'object' && ref.id) {
      var byId = list.filter(function (s) { return s.id === ref.id; });
      if (byId.length === 1) return { status: 'matched', student: byId[0], matches: byId };
      if (byId.length > 1) return { status: 'ambiguous', matches: byId };
    }
    var id = typeof ref === 'string' ? ref : (ref.code || ref.name || '');
    var byExactId = list.filter(function (s) { return s.id === id || s.code === id; });
    if (byExactId.length === 1) return { status: 'matched', student: byExactId[0], matches: byExactId };
    if (byExactId.length > 1) return { status: 'ambiguous', matches: byExactId };
    var n = normName(typeof ref === 'string' ? ref : ref.name);
    var byName = list.filter(function (s) { return normName(s.name) === n; });
    if (byName.length === 1) return { status: 'matched', student: byName[0], matches: byName };
    if (byName.length > 1) return { status: 'ambiguous', matches: byName };
    return { status: 'unmatched', matches: [] };
  }

  function notesForStudent(notes, studentId) {
    return (notes || []).filter(function (n) { return n.studentId === studentId; });
  }

  function filterNotes(notes, f) {
    f = f || {};
    return (notes || []).filter(function (n) {
      if (f.studentId && n.studentId !== f.studentId) return false;
      if (f.providerId && n.providerId !== f.providerId) return false;
      if (f.q) {
        var hay = (n.text + ' ' + n.provider + ' ' + n.service).toLowerCase();
        if (hay.indexOf(String(f.q).toLowerCase()) < 0) return false;
      }
      if (f.from && n.date < f.from) return false;
      if (f.to && n.date > f.to) return false;
      return true;
    });
  }

  /** Compare one billing line to its linked note. Counts alone never prove a match. */
  function reviewBillingLine(line, notesById) {
    var note = line.noteId ? notesById[line.noteId] : null;
    if (!line.noteId || !note) {
      return { lineId: line.id, state: 'needs_review', reasons: ['No linked note for this billed line'] };
    }
    var reasons = [];
    if (note.date !== line.date) reasons.push('Date mismatch (billed ' + line.date + ' vs note ' + note.date + ')');
    var noteProv = String(note.provider || '').replace(/\s*\(fictional\)\s*/i, '').trim();
    var lineProv = String(line.provider || '').replace(/\s*\(fictional\)\s*/i, '').trim();
    if (normName(noteProv) !== normName(lineProv)) reasons.push('Provider mismatch');
    if (Number(note.durationMin) !== Number(line.durationMin)) reasons.push('Duration mismatch');
    if (reasons.length) return { lineId: line.id, state: 'mismatch', reasons: reasons, noteId: note.id };
    return { lineId: line.id, state: 'fields_align', reasons: ['Date, provider, and duration align with linked note'], noteId: note.id };
  }

  function reviewBillingBatch(batch, notes) {
    var byId = {};
    (notes || []).forEach(function (n) { byId[n.id] = n; });
    var lines = (batch.lines || []).map(function (l) { return reviewBillingLine(l, byId); });
    var allChecked = false; // caller tracks UI checks
    return {
      batchId: batch.id,
      status: 'Needs review',
      guidance: 'Check dates, provider and duration against each linked note. Session/note counts alone do not prove billing correctness.',
      lines: lines,
      canSignOff: function (checkedIds) {
        var set = {};
        (checkedIds || []).forEach(function (id) { set[id] = true; });
        if (lines.some(function (l) { return l.state === 'mismatch' || l.state === 'needs_review'; })) return false;
        return lines.every(function (l) { return set[l.lineId]; });
      }
    };
  }

  /** Deterministic parent/school/internal draft from notes + goals. Not generative AI. */
  function buildReportDraft(student, notes, opts) {
    opts = opts || {};
    var audience = opts.audience || 'Parent';
    var period = opts.period || 'Sep–Oct 2026';
    var sn = notesForStudent(notes, student.id).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var grip = (student.goals || []).filter(function (g) { return /grip|grasp/i.test(g.name); })[0];
    var utter = (student.goals || []).filter(function (g) { return /utterance/i.test(g.name); })[0];
    var parts = [];
    if (grip && grip.values && grip.values.length >= 2) {
      var a = grip.values[0], b = grip.values[grip.values.length - 1];
      parts.push('Pencil grasp endurance moved from ' + a.value + ' to ' + b.value + ' ' + (grip.unit || 'minutes') + ' across sample OT notes in this period.');
    }
    if (utter && utter.values && utter.values.length) {
      parts.push('Utterance length was recorded at ' + utter.values[0].value + ' ' + (utter.unit || 'words') + ' (sample).');
    }
    if (!parts.length && sn.length) {
      parts.push('This period includes ' + sn.length + ' sample clinical note' + (sn.length === 1 ? '' : 's') + '. Open sources for wording.');
    }
    if (!parts.length) {
      parts.push('Not enough sourced notes or measures in this period to draft progress language.');
    }
    var tone = audience === 'School' ? 'For school team review. ' : audience === 'Internal' ? 'Internal oversight draft. ' : '';
    return {
      title: audience + ' progress update',
      student: student.name,
      period: period,
      audience: audience,
      body: tone + parts.join(' '),
      sources: sn.map(function (n) { return { id: n.id, label: n.service + ' note · ' + n.date, source: n.source }; }),
      limits: 'Deterministic draft from linked notes and goal measures only. Not a clinical conclusion. Not AI-generated. Review before any export or share. Nothing sends automatically.',
      missing: sn.length ? null : 'No notes in period for this student.'
    };
  }

  function searchAll(q, data) {
    q = String(q || '').trim().toLowerCase();
    if (!q) return [];
    var out = [];
    (data.students || []).forEach(function (s) {
      if ((s.name + ' ' + s.code + ' ' + (s.services || []).join(' ')).toLowerCase().indexOf(q) >= 0) {
        out.push({ type: 'student', id: s.id, title: s.name, sub: (s.services || []).join(' · ') });
      }
    });
    (data.notes || []).forEach(function (n) {
      if ((n.text + ' ' + n.provider + ' ' + n.service).toLowerCase().indexOf(q) >= 0) {
        out.push({ type: 'note', id: n.id, title: n.service + ' · ' + n.date, sub: n.text.slice(0, 80), studentId: n.studentId });
      }
    });
    (data.emailItems || []).forEach(function (e) {
      if ((e.title + ' ' + e.linkName).toLowerCase().indexOf(q) >= 0) {
        out.push({ type: 'email', id: e.id, title: e.title, sub: e.linkName + ' · ' + e.date });
      }
    });
    return out;
  }

  function reviewCount(data) {
    var n = 0;
    (data.billingBatches || []).forEach(function (b) { if (/need/i.test(b.status)) n++; });
    (data.emailItems || []).forEach(function (e) { if (/pending/i.test(e.status)) n++; });
    (data.schedules || []).forEach(function (s) { if (/gap|open/i.test(s.status)) n++; });
    return n;
  }

  /** Map live bootstrap cases into lightweight student cards when fixtures are not the source. */
  function studentsFromBootstrap(bootstrap) {
    return (bootstrap && bootstrap.cases || []).map(function (c) {
      return {
        id: c.id,
        code: c.code || c.id,
        name: c.student || c.name || c.id,
        status: c.status || 'Active',
        services: (c.team || []).filter(function (t) { return t.role && t.role !== 'Parent' && t.role !== 'BCBA'; }).map(function (t) { return t.role; }),
        providers: (c.team || []).map(function (t) { return { name: t.name, role: t.role }; }),
        history: [],
        documents: [],
        goals: [],
        emailRefs: [],
        source: 'bootstrap',
        _raw: c
      };
    });
  }

  var api = {
    normName: normName,
    resolveStudentRef: resolveStudentRef,
    notesForStudent: notesForStudent,
    filterNotes: filterNotes,
    reviewBillingLine: reviewBillingLine,
    reviewBillingBatch: reviewBillingBatch,
    buildReportDraft: buildReportDraft,
    searchAll: searchAll,
    reviewCount: reviewCount,
    studentsFromBootstrap: studentsFromBootstrap
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TTG_V4_MODEL = api;
})(typeof window !== 'undefined' ? window : global);
