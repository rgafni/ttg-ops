/* Edge-case variants of the FICTIONAL sample, for layout and logic tests: long names, a crowded day, and no data at all.
   Fictional only. Used by tests/edge.test.js and the screenshot audit (served in place of fixtures/v4-sample.js). */
'use strict';
function load() {
  var w = {}; var src = require('fs').readFileSync(require('path').join(__dirname, '..', 'fixtures', 'v4-sample.js'), 'utf8');
  new Function('window', src)(w); return JSON.parse(JSON.stringify(w.TTG_V4_FIXTURES));
}
var LONG_S = 'Maximiliana Alexandra Featherstonehaugh-Worthington';
var LONG_P = 'Bartholomew Christopherson-Vanderbilt';
function rename(o, from, to) { return JSON.parse(JSON.stringify(o).split(from).join(to)); }
function stress() {
  var F = load();
  F = rename(F, 'Avery Demo', LONG_S); F = rename(F, 'Jamie Fern', LONG_P);
  var c = F.bootstrap.cases[0];
  // A crowded Monday: eight more short sessions with several providers (fictional).
  var provs = ['Sky Harbor', 'Morgan Lane', 'Taylor Brook', 'Robin Vale', LONG_P];
  for (var i = 0; i < 8; i++) {
    var h = 8 + i, p = provs[i % provs.length];
    c.assignments.push({ student: c.student, provider_id: '', provider: p, role: ['SETSS', 'OT', 'Speech', 'BCBA', 'ABA'][i % 5], setting: 'Home',
      schedule: 'Mon ' + h + ':00-' + h + ':30 ' + (h < 12 ? 'AM' : 'PM'), mandate: '', auth_expiry: '', status: 'Active', notes: i === 3 ? 'Parent asked to keep this slot through the end of the school year if possible' : '' });
  }
  c.why = 'Authorization renewal pending with the agency and the parent asked for a different weekday for speech starting next month';
  F.clinical.notes.forEach(function (n, i) { if (i === 0) n.text = Array(30).join('Long note text that keeps going without a break. '); });
  F.bootstrap.queue.forEach(function (q, i) { if (i === 0) q.subject = 'Follow up about the updated session schedule and the missing intake documents for next month'; });
  return F;
}
function empty() {
  var F = load(), b = F.bootstrap;
  b.cases = []; b.reports = []; b.unstaffed = []; b.queue = []; b.requests = []; b.today_items = []; b.intake = [];
  F.clinical.notes = []; F.clinical.unlinked_notes = []; F.clinical.sessions_without_notes = []; F.clinical.unmatched = 0; F.clinical.unmatched_count = 0;
  F.billingLines = [];
  return F;
}
function asScript(F) { return '/* FICTIONAL edge-case fixture */\nwindow.TTG_V4_FIXTURES = ' + JSON.stringify(F) + ';\n'; }
module.exports = { load: load, stress: stress, empty: empty, asScript: asScript, LONG_S: LONG_S, LONG_P: LONG_P };
if (require.main === module) {
  var fs = require('fs'), out = process.argv[2] || '/tmp';
  fs.writeFileSync(out + '/fx-stress.js', asScript(stress())); fs.writeFileSync(out + '/fx-empty.js', asScript(empty())); console.log('wrote', out);
}
