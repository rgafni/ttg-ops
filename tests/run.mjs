// TTG Ops v4 tests. Synthetic data only. No network: every fetch is a recorded stub.
import assert from 'assert';
import vm from 'vm';
import { createRequire } from 'module';
import { boot, fixtures, model, flush, clone, jsonRes, read, load } from './harness.mjs';

let passed = 0, failed = 0; const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const FX = fixtures();
const { M, BC } = model();
const KEY = 'K'.repeat(32);
const FIXTURE_NAMES = ['Avery Demo', 'Blake Sample', 'Casey Example', 'Riley Fixture', 'Jamie Fern', 'Morgan Lane', 'Taylor Brook', 'Sky Harbor', 'Robin Vale'];
const LIVE_NAMES = ['Lena Live', 'Omar Real', 'Priya True', 'Sam Actual', 'Kai North', 'Mira South', 'Theo East', 'Uma West', 'Vic Center'];
/** A bootstrap-shaped payload that is NOT the fixture: same real API shape, different (synthetic) people. */
function liveFX(mut) {
  let s = JSON.stringify(FX).split('M. Lane').join('M. South'); FIXTURE_NAMES.forEach((n, i) => { s = s.split(n).join(LIVE_NAMES[i]); });
  const o = JSON.parse(s); if (mut) mut(o); return o;
}
/** Fake server: key check + the same in-memory handlers, reached only through fetch. */
function server(data, { v4 = true, fail = null } = {}) {
  const sb = vm.createContext({ console }); sb.window = sb; load('billing-core.js', sb); load('fixtures/fake-api.js', sb);
  if (!v4) delete data.bootstrap.v4;
  const handler = sb.TTG_FAKE_API.create(data, sb.TTG_BILLING);
  const calls = [];
  const fetchImpl = (u, o) => {
    const b = JSON.parse(o.body); calls.push(b.action);
    if (fail) return fail(b);
    if (b.key !== KEY) return jsonRes({ ok: false, error: 'unauthorized' });
    if (!v4 && /clinicalNotes|billingReview|billingDecision|saveReportDraft/.test(b.action)) return jsonRes({ ok: false, error: 'unknown action' });
    return handler(b.action, b.data).then(r => { delete r.fixture; if (r.billing) { r.billing.persisted = true; (r.billing.batches || []).forEach(x => { x.persisted = true; }); } return { json: () => Promise.resolve(JSON.parse(JSON.stringify(r))) }; },
      e => jsonRes({ ok: false, error: e.message }));
  };
  return { fetchImpl, calls };
}
const ROUTES = ['#/', '#/review', '#/students', '#/students/bcba', '#/notes', '#/notes/unlinked', '#/providers', '#/providers/list', '#/providers/schedules', '#/billing', '#/reports', '#/email', '#/settings', '#/search'];
async function allRoutes(t, extra = []) {
  const out = {};
  const P = t.app.S.P;
  const dyn = [...P.students.map(s => '#/student/' + s.id), ...P.providers.map(p => '#/provider/' + p.key), ...P.queue.map(q => '#/item/' + q.id), ...P.reports.map(r => '#/report/' + r.id)];
  for (const r of [...ROUTES, ...dyn, ...extra]) { await t.go(r); await flush(); out[r] = t.html; }
  if (t.app.S.clinical && t.app.S.clinical.notes) for (const n of t.app.S.clinical.notes) { await t.go('#/note/' + n.id); out['#/note/' + n.id] = t.html; }
  if (t.app.S.billing && t.app.S.billing.batches) for (const b of t.app.S.billing.batches) { await t.go('#/billing/' + encodeURIComponent(b.id)); out['#/billing/' + b.id] = t.html; }
  return out;
}

/* ================= billing core ================= */
test('core: provider/name/service/minutes/date normalization', () => {
  assert.ok(BC.sameProvider('A. Brooks', 'Avery Brooks')); assert.ok(BC.sameProvider('Brooks, Avery', 'Avery Brooks'));
  assert.ok(!BC.sameProvider('Avery Brooks', 'Avery Stone')); assert.ok(!BC.sameProvider('B. Brooks', 'Avery Brooks'));
  assert.deepStrictEqual(['45', '0:45', '1:30', '45 min', '1 hr 15 min', '1.5 h', '', 'n/a'].map(BC.parseMinutes), [45, 45, 90, 45, 75, 90, null, null]);
  assert.deepStrictEqual(['Occupational therapy', 'SLP', 'speech', 'RBT', 'Physical Therapy', 'SETSS'].map(BC.normService), ['OT', 'Speech', 'Speech', 'ABA', 'PT', 'SETSS']);
  assert.equal(BC.isoDate('10/5/2026'), '2026-10-05'); assert.equal(BC.isoDate('2026-1-2'), '2026-01-02'); assert.equal(BC.isoDate('junk'), '');
});
const N = (id, o) => Object.assign({ id, case_id: 'C1', date: '2026-10-01', provider: 'Avery Brooks', service: 'OT', duration_min: 45 }, o);
const L = (id, o) => Object.assign({ id, case_id: 'C1', case_status: 'matched', student: 'S', date: '2026-10-01', provider: 'A. Brooks', service: 'Occupational therapy', duration_min: 45, units: null, unit_minutes: null, note_id: '' }, o);
test('core: aligned only when student, date, provider, service, duration and units all match (matched without noteId)', () => {
  const r = BC.reviewLines([L('a', { units: 3, unit_minutes: 15 })], [N('n1')]);
  assert.equal(r[0].state, 'aligned'); assert.equal(r[0].note_id, 'n1'); assert.match(r[0].reasons[0], /units/);
});
test('REGRESSION core: a note for another student never aligns (was fields_align)', () => {
  const r = BC.reviewLines([L('a', { note_id: 'nx' })], [N('nx', { case_id: 'C2' })]);
  assert.equal(r[0].state, 'mismatch'); assert.match(r[0].reasons.join(), /different student/);
  const r2 = BC.reviewLines([L('a')], [N('nx', { case_id: 'C2' })]); assert.equal(r2[0].state, 'no_note');
});
test('REGRESSION core: service and units are compared', () => {
  assert.match(BC.reviewLines([L('a', { service: 'PT' })], [N('n1')])[0].reasons.join(), /Service mismatch/);
  assert.match(BC.reviewLines([L('a', { units: 4, unit_minutes: 15 })], [N('n1')])[0].reasons.join(), /Units mismatch/);
  assert.equal(BC.reviewLines([L('a', { units: 3 })], [N('n1')])[0].state, 'needs_review');
  assert.equal(BC.reviewLines([L('a', { units: 3 })], [N('n1')], { unitMinutes: 15 })[0].state, 'aligned');
  assert.equal(BC.reviewLines([L('a', { service: '' })], [N('n1')])[0].state, 'needs_review');
  assert.equal(BC.reviewLines([L('a')], [N('n1', { service: '' })])[0].state, 'needs_review');
});
test('core: date / provider / duration mismatches, no note, ambiguous, unmatched student', () => {
  assert.equal(BC.reviewLines([L('a', { duration_min: 60 })], [N('n1')])[0].state, 'mismatch');
  assert.match(BC.reviewLines([L('a', { provider: 'Pat Rivera' })], [N('n1')])[0].reasons.join(), /Provider mismatch/);
  assert.match(BC.reviewLines([L('a', { date: '2026-10-02' })], [N('n1')])[0].reasons.join(), /does not prove a missed session/);
  assert.equal(BC.reviewLines([L('a')], [N('n1'), N('n2')])[0].state, 'ambiguous');
  assert.equal(BC.reviewLines([L('a', { case_status: 'ambiguous', case_id: '' })], [N('n1')])[0].state, 'ambiguous');
  assert.equal(BC.reviewLines([L('a', { case_status: 'unmatched', case_id: '' })], [N('n1')])[0].state, 'needs_review');
});
test('core: one note cannot back two billed lines (same batch or across batches)', () => {
  const r = BC.reviewLines([L('a'), L('b')], [N('n1')]); assert.deepStrictEqual(r.map(x => x.state), ['duplicate', 'duplicate']);
  const b = BC.markCrossBatch([{ id: 'B1', review: BC.reviewLines([L('a')], [N('n1')]) }, { id: 'B2', review: BC.reviewLines([L('b')], [N('n1')]) }]);
  assert.equal(b[1].review[0].state, 'duplicate'); assert.match(b[1].review[0].reasons.join(), /also billed in B1/);
});
test('REGRESSION core: empty batch cannot be signed off; counts/client checks never unlock sign-off', () => {
  const none = BC.auditState([], 'B', 'v1');
  assert.equal(BC.signoffBlocker([], none), 'Batch has no billed lines');
  const rv = BC.reviewLines([L('a')], [N('n1')]);
  assert.match(BC.signoffBlocker(rv, none), /not yet checked/);
  const batch = { id: 'B', version: 'v1' };
  assert.match(BC.validateDecision({ op: 'signoff', request_id: 'req_12345678', batch_version: 'v1', confirm: true, checks: ['a'] }, batch, rv, none), /not yet checked/);
  const checked = BC.auditState([{ batch_id: 'B', batch_version: 'v1', op: 'check', line_id: 'a', ts: 't' }], 'B', 'v1');
  assert.equal(BC.validateDecision({ op: 'signoff', request_id: 'req_12345678', batch_version: 'v1' }, batch, rv, checked), 'explicit confirmation required');
  assert.equal(BC.validateDecision({ op: 'signoff', request_id: 'req_12345678', batch_version: 'v1', confirm: true }, batch, rv, checked), '');
  assert.match(BC.validateDecision({ op: 'signoff', request_id: 'req_12345678', batch_version: 'v0', confirm: true }, batch, rv, checked), /stale/);
});
test('REGRESSION core: flag needs a reason; checks on non-aligned lines refused; audit replay is version-bound', () => {
  const batch = { id: 'B', version: 'v1' }, rv = BC.reviewLines([L('a', { duration_min: 30 })], [N('n1')]), a = BC.auditState([], 'B', 'v1');
  assert.match(BC.validateDecision({ op: 'flag', request_id: 'req_12345678', batch_version: 'v1', reason: 'no' }, batch, rv, a), /reason is required/);
  assert.match(BC.validateDecision({ op: 'check', request_id: 'req_12345678', batch_version: 'v1', line_id: 'a' }, batch, rv, a), /does not align/);
  const rows = [{ batch_id: 'B', batch_version: 'v0', op: 'signoff', ts: 't0' }, { batch_id: 'B', batch_version: 'v1', op: 'flag', reason: 'fix provider', ts: 't1' }];
  const st = BC.auditState(rows, 'B', 'v1'); assert.equal(st.signoff, null); assert.equal(st.status, 'Flagged for correction'); assert.ok(st.priorSignoff);
});

/* ================= model ================= */
test('model: maps the REAL bootstrap shape (generated from Code.gs) — chart, intake, Ensora, fields, bank, case log, assignments', () => {
  const P = M.normalizeBootstrap(FX.bootstrap), a = P.students.find(s => s.name === 'Avery Demo');
  assert.ok(a.chart && a.chart.schedule && a.chart.attends); assert.equal(a.intake.status, 'Partial'); assert.equal(a.intake.links.length, 1);
  assert.equal(a.ensora.use, 'SOAP notes'); assert.ok(a.fields.find(f => f.k === 'Progress report due').v); assert.equal(a.bank.total, 200);
  assert.ok(a.caseLog.length >= 1); assert.equal(a.assignments.length, 3); assert.ok(a.assignments.every(x => x.schedule));
  assert.deepStrictEqual(a.services.slice().sort(), ['ABA', 'OT', 'Speech']);
  assert.ok(P.queue.length >= 1 && P.reports.length >= 1 && P.requests.length >= 1 && P.todayItems.length >= 1);
  assert.ok(P.v4 && P.v4.api === 'v4');
});
test('REGRESSION model: parents are family contacts, never providers', () => {
  const P = M.normalizeBootstrap(FX.bootstrap);
  for (const s of P.students) assert.ok(!s.providers.some(p => /parent/i.test(p.name) || p.role === 'Parent'), s.name);
  assert.ok(!P.providers.some(p => /parent/i.test(p.name)));
  assert.ok(P.students.find(s => s.name === 'Avery Demo').family[0]);
});
test('REGRESSION model: open roles / unstaffed gaps and schedules are surfaced', () => {
  const P = M.normalizeBootstrap(FX.bootstrap);
  assert.ok(P.gaps.some(g => g.student === 'Casey Example' && g.role === 'Para'));
  assert.ok(P.schedules.some(r => r.student === 'Avery Demo' && r.role === 'OT' && /Mon\/Wed/.test(r.schedule)));
  assert.ok(P.schedules.some(r => r.open));
});
test('model: provider index merges by provider_id, keys are opaque (no names in URLs)', () => {
  const P = M.normalizeBootstrap(FX.bootstrap), jf = P.providers.filter(p => p.name === 'Jamie Fern');
  assert.equal(jf.length, 1); assert.equal(jf[0].cases.length, 2);
  assert.ok(P.providers.every(p => /^p[0-9a-f]{8}$/.test(p.key)));
});
test('model: duplicate ids and same-name records are flagged, never merged; unsafe links dropped; placeholders = not on file', () => {
  const b = clone(FX.bootstrap); const c0 = b.cases[0];
  b.cases.push(Object.assign(clone(c0), { id: 'CZZZZZZ' }));                       // same name, different id
  b.cases.push(Object.assign(clone(b.cases[1]), {}));                               // duplicate id
  c0.intake.links = ['javascript:alert(1)', 'http://plain.example', 'data:text/html,x', 'https://ok.example/x"onmouseover=1', 'https://ok.example/doc'];
  c0.fields['Tx plan review'] = '[no source]';
  const P = M.normalizeBootstrap(b);
  assert.equal(P.students.length, b.cases.length);
  assert.ok(P.ambiguous.length >= 3);
  const a = P.students.find(s => s.id === c0.id);
  assert.deepStrictEqual(a.intake.links, ['https://ok.example/doc']); assert.equal(a.fields.find(f => f.k === 'Tx plan review').v, '');
  assert.ok(a.sameNameIds.includes('CZZZZZZ'));
  assert.doesNotThrow(() => M.normalizeBootstrap({ cases: [{ id: 'C1', student: 'X' }] }));
  assert.doesNotThrow(() => M.normalizeBootstrap({}));
});
test('REGRESSION model: real student / provider / date / text note filters (no hard-coded sample student)', () => {
  const P = M.normalizeBootstrap(FX.bootstrap), C = M.normalizeClinical(FX.clinical, P), avery = P.students.find(s => s.name === 'Avery Demo');
  assert.equal(M.filterNotes(C.notes, { caseId: avery.id }).length, 4);
  const ml = P.providers.find(p => p.name === 'Morgan Lane');
  assert.equal(M.filterNotes(C.notes, { providerKey: ml.key }).length, 3);
  const d = C.notes.map(n => n.date).sort();
  assert.equal(M.filterNotes(C.notes, { from: d[1], to: d[3] }).length, 3);
  assert.equal(M.filterNotes(C.notes, { q: 'two-word' }).length, 1);
  assert.deepStrictEqual(C.notes.map(n => n.date), d.slice().reverse());
  assert.equal(M.noteProviders(C.notes).length, 3);
  assert.ok(!/STU-DEMO|Jordan Lee/.test(read('app.js')));
});
test('REGRESSION model: report draft uses the chosen interval, sorted timeline, provider wording, no invented progress', () => {
  const P = M.normalizeBootstrap(FX.bootstrap), C = M.normalizeClinical(FX.clinical, P), avery = P.students.find(s => s.name === 'Avery Demo');
  const dates = M.filterNotes(C.notes, { caseId: avery.id }).map(n => n.date).sort();
  const all = M.buildReportDraft(avery, C, { from: dates[0], to: dates[3], audience: 'Parent' });
  const part = M.buildReportDraft(avery, C, { from: dates[1], to: dates[2], audience: 'Parent' });
  assert.equal(all.sources.length, 4); assert.equal(part.sources.length, 2);
  assert.deepStrictEqual(all.sources.map(s => s.date), dates);
  const added = all.body.replace(/\u201c[^\u201d]*\u201d/g, '');   // remove the providers' own quoted wording
  assert.ok(!/sample|grip|grasp|utterance|improv|progress(ed|ing)?\b|moved from|regress|gain|declin/i.test(added), added);
  assert.ok(all.body.includes('Worked on pencil grasp with adapted grip; tolerated 4 min.'));
  const internal = M.buildReportDraft(avery, C, { from: dates[0], to: dates[3], audience: 'Internal' });
  assert.match(internal.body, /Sessions without a note/); assert.ok(!/Sessions without a note/.test(all.body));
  const empty = M.buildReportDraft(avery, C, { from: '2020-01-01', to: '2020-02-01' });
  assert.equal(empty.sources.length, 0); assert.match(empty.body, /No clinical notes are on file/);
  const none = M.buildReportDraft(avery, M.normalizeClinical(null), {}); assert.match(none.body, /not available/);
  const generic = M.buildReportDraft({ id: 'C1', name: 'Z Kid' }, { available: true, notes: [{ id: 'n', case_id: 'C1', date: '2026-10-01', provider: 'P', service: 'Feeding', text: 'Accepted three new textures.', time: '' }], sessions: [] }, { from: '2026-09-01', to: '2026-10-31' });
  assert.match(generic.body, /Feeding · P: 1 note/); assert.match(generic.body, /Accepted three new textures/);
});
test('model: search and review items cover students, providers, notes, items, reports', () => {
  const P = M.normalizeBootstrap(FX.bootstrap), C = M.normalizeClinical(FX.clinical, P);
  assert.equal(M.searchAll('a', P, C).length, 0);
  const t2 = new Set([...M.searchAll('avery', P, C), ...M.searchAll('morgan', P, C), ...M.searchAll('status', P, C), ...M.searchAll('T5', P, C)].map(x => x.type));
  ['Student', 'Provider', 'Note', 'Report', 'Open item'].forEach(t => assert.ok(t2.has(t), t));
  assert.ok(M.reviewItems(P, null).some(x => x.kind === 'Draft message'));
  assert.ok(M.searchAll('avery', P, C).every(x => /^#\/(student|provider|note|item|report)\/[A-Za-z0-9-]+$/.test(x.href)));
});

/* ================= app: modes and auth contract ================= */
test('REGRESSION app: fixture mode overrides a stored key and API: zero network across every route and action', async () => {
  const t = boot({ search: '?fixtures=1', key: KEY, api: 'https://script.google.com/macros/s/OTHER/exec', preloadFixtures: true, fields: { caseNote: 'x note', reqText: 'please', qSubject: 's', qMessage: 'm', srBody: 'b', flagReason: 'wrong provider', flagLine: '', clearReason: 'fixed now', editField: 'Why', editValue: 'v', mrStudent: '', mrMonth: '2026-10', mrProvider: 'Morgan Lane' } });
  await flush();
  const pages = await allRoutes(t);
  const P = t.app.S.P, a = P.students[0];
  await t.act('case-note', { 'data-id': a.id }); await t.act('case-edit', { 'data-id': a.id }); await t.act('req-add', { 'data-case': '' });
  await t.act('q', { 'data-op': 'approve', 'data-id': P.queue[0].id });
  await t.act('rep-create'); await t.act('rep-save');
  const b = t.app.S.billing.batches[0]; await t.act('bill-flag', { 'data-batch': b.id });
  assert.equal(t.fetches.length, 0, 'fixture mode made a network call');
  assert.deepStrictEqual(t.scripts, []);
  for (const [r, h] of Object.entries(pages)) assert.ok(h.includes('Fictional sample data'), 'no fictional banner on ' + r);
  assert.deepStrictEqual([...new Set(t.setItems)], []);
});
test('app: fixture mode loads only the fixture files (no fetch) when they are not preloaded', async () => {
  const t = boot({ search: '?fixtures=1', key: KEY }); await flush();
  assert.deepStrictEqual(t.scripts, ['fixtures/v4-sample.js', 'fixtures/fake-api.js'].slice(0, 1)); // second waits for first
  assert.equal(t.fetches.length, 0);
});
test('app: live mode never loads fixture files and shows only live records', async () => {
  const s = server(liveFX()); const t = boot({ key: KEY, fetchImpl: s.fetchImpl }); await flush();
  const pages = await allRoutes(t);
  assert.deepStrictEqual(t.scripts, []);
  assert.ok(t.sb.TTG_V4_FIXTURES === undefined && t.sb.TTG_FAKE_API === undefined);
  const all = Object.values(pages).join('\n');
  for (const n of FIXTURE_NAMES) assert.ok(!all.includes(n), 'fixture record in live mode: ' + n);
  assert.ok(all.includes('Lena Live'));
  assert.ok(!all.includes('Fictional sample data'));
  assert.equal(t.fetches[0].body.action, 'bootstrap'); assert.equal(t.fetches[0].body.key, KEY); assert.equal(t.fetches[0].o.method, 'POST');
  assert.ok(t.fetches.every(f => f.u === 'https://script.google.com/macros/s/TESTDEPLOYMENTID/exec' && f.o.credentials === 'omit' && f.o.cache === 'no-store'));
});
test('REGRESSION app: live network failure shows a real error, never fixtures', async () => {
  const t = boot({ key: KEY, fetchImpl: () => Promise.reject(new Error('Failed to fetch')) }); await flush();
  assert.match(t.html, /Live data could not be loaded/); assert.match(t.html, /Could not reach the TTG Ops server/); assert.doesNotMatch(t.html, /Failed to fetch/); assert.match(t.html, /No sample data/);
  for (const n of FIXTURE_NAMES) assert.ok(!t.html.includes(n));
  assert.equal(t.app.S.P, null); assert.deepStrictEqual(t.scripts, []);
});
test('app auth contract: server "unauthorized" -> key gate; response without ok:true fails closed; no key -> no request', async () => {
  const s = server(liveFX());
  const bad = boot({ key: 'W'.repeat(32), fetchImpl: s.fetchImpl }); await flush();
  assert.match(bad.html, /Admin key/); assert.match(bad.html, /not accepted/); assert.equal(bad.app.S.P, null);
  const weird = boot({ key: KEY, fetchImpl: () => jsonRes({ cases: liveFX().bootstrap.cases }) }); await flush();
  assert.match(weird.html, /could not be loaded/); assert.equal(weird.app.S.P, null);
  const nokey = boot({ fetchImpl: s.fetchImpl }); await flush();
  assert.match(nokey.html, /Admin key/); assert.equal(nokey.fetches.length, 0);
  const badApi = boot({ key: KEY, configApi: '', api: 'https://evil.example/exec', fetchImpl: s.fetchImpl }); await flush();
  assert.match(badApi.html, /API address missing/); assert.equal(badApi.fetches.length, 0);
});
test('app: live API without the v4 update shows honest "not deployed" states and makes no v4 calls', async () => {
  const s = server(liveFX(), { v4: false }); const t = boot({ key: KEY, fetchImpl: s.fetchImpl }); await flush();
  const notes = await t.go('#/notes'); assert.match(notes, /not connected/); assert.match(notes, /v4 backend not deployed/);
  const bill = await t.go('#/billing'); assert.match(bill, /Incoming billing is not connected/);
  await t.go('#/reports'); await t.act('rep-create'); assert.match(t.html, /Clinical notes are not available/); assert.match(t.html, /data-act="rep-save" disabled/);
  assert.deepStrictEqual([...new Set(s.calls)], ['bootstrap']);
});

/* ================= app: portals and actions (live, through the fake server) ================= */
test('app: billing review is server-driven: version + request id sent, only aligned lines checkable, sign-off gated and labelled persisted', async () => {
  const s = server(liveFX()); const t = boot({ key: KEY, fetchImpl: s.fetchImpl, fields: { flagReason: 'Provider initials differ', flagLine: '' } }); await flush();
  await t.go('#/billing'); const b = t.app.S.billing.batches.find(x => x.review.every(r => r.state === 'aligned'));
  const other = t.app.S.billing.batches.find(x => x !== b);
  let h = await t.go('#/billing/' + encodeURIComponent(other.id));
  assert.ok(!/data-change="bill-check"/.test(h)); assert.match(h, /Mismatch|No note|Duplicate/); assert.match(h, /data-act="bill-sign"[^>]*disabled/);
  h = await t.go('#/billing/' + encodeURIComponent(b.id));
  assert.match(h, /saved to the Billing Audit log/); assert.match(h, /data-act="bill-sign"[^>]*disabled/);
  for (const l of b.lines) await t.act('bill-check', { 'data-batch': b.id, 'data-line': l.id }, { checked: true });
  const dec = t.fetches.filter(f => f.body.action === 'billingDecision');
  assert.equal(dec.length, b.lines.length);
  assert.ok(dec.every(f => f.body.data.batch_version === b.version && /^r[0-9a-f]{24}$/.test(f.body.data.request_id)));
  assert.equal(new Set(dec.map(f => f.body.data.request_id)).size, dec.length);
  h = t.html; assert.ok(!/data-act="bill-sign"[^>]*disabled/.test(h), 'sign-off still disabled after checks');
  const noConfirm = boot({ key: KEY, fetchImpl: s.fetchImpl, confirm: false }); await flush(); await noConfirm.go('#/billing/' + encodeURIComponent(b.id));
  await noConfirm.act('bill-sign', { 'data-batch': b.id }); assert.ok(!noConfirm.fetches.some(f => f.body.data && f.body.data.op === 'signoff'));
  await t.act('bill-sign', { 'data-batch': b.id });
  const so = t.fetches.find(f => f.body.data && f.body.data.op === 'signoff'); assert.equal(so.body.data.confirm, true);
  assert.match(t.html, /Signed off/); assert.match(t.html, /saved in the Billing Audit log/);
  assert.ok(t.toasts.some(x => /saved to audit log/.test(x)));
});
test('REGRESSION app: billing flag requires a reason; server errors show "Not saved", never a fake success', async () => {
  const s = server(liveFX()); const t = boot({ key: KEY, fetchImpl: s.fetchImpl, fields: { flagReason: 'no', flagLine: '' } }); await flush();
  await t.go('#/billing'); const b = t.app.S.billing.batches[0]; await t.go('#/billing/' + encodeURIComponent(b.id));
  const n0 = t.fetches.length; await t.act('bill-flag', { 'data-batch': b.id }); assert.equal(t.fetches.length, n0); assert.match(t.toasts.at(-1), /Say what needs correcting/);
  t.app.S.billing.batches[0].version = 'vSTALE';
  t.fields.flagReason = 'Wrong service code'; await t.act('bill-flag', { 'data-batch': b.id });
  assert.match(t.toasts.at(-1), /Not saved: stale/);
});
test('app: fixture billing is labelled preview-only, never "saved"', async () => {
  const t = boot({ search: '?fixtures=1', preloadFixtures: true }); await flush();
  await t.go('#/billing'); const b = t.app.S.billing.batches.find(x => x.review.every(r => r.state === 'aligned'));
  const h = await t.go('#/billing/' + encodeURIComponent(b.id)); assert.match(h, /NOT saved/); assert.ok(!/saved to the Billing Audit log/.test(h));
  for (const l of b.lines) await t.act('bill-check', { 'data-batch': b.id, 'data-line': l.id }, { checked: true });
  await t.act('bill-sign', { 'data-batch': b.id });
  assert.match(t.html, /preview only, not saved/); assert.ok(t.toasts.every(x => !/audit log/.test(x)));
});
test('app: case note, case field edit, requests use the existing API actions; non-editable fields refused', async () => {
  const s = server(liveFX()); const t = boot({ key: KEY, fetchImpl: s.fetchImpl, fields: { caseNote: 'Called the school', editField: 'Progress report due', editValue: '12/1/2026', reqText: 'Pull last month notes' } }); await flush();
  const a = t.app.S.P.students.find(x => x.name === 'Lena Live');
  await t.go('#/student/' + a.id);
  await t.act('case-note', { 'data-id': a.id }); await t.act('case-edit', { 'data-id': a.id }); await t.act('req-add', { 'data-case': a.id });
  const acts = t.fetches.map(f => f.body.action);
  assert.ok(acts.includes('addNote') && acts.includes('updateCase') && acts.includes('addRequest'));
  assert.deepStrictEqual(t.fetches.find(f => f.body.action === 'updateCase').body.data, { case_id: a.id, field: 'Progress report due', value: '12/1/2026' });
  await t.go('#/student/' + a.id); assert.match(t.html, /Called the school/);
  t.fields.editField = 'Student'; const n = t.fetches.length; await t.act('case-edit', { 'data-id': a.id }); assert.equal(t.fetches.length, n);
});
test('app: open items — edit/approve/dismiss/reopen go through queueAction; approve needs confirmation and never sends', async () => {
  const s = server(liveFX()); let ok = false;
  const t = boot({ key: KEY, fetchImpl: s.fetchImpl, confirm: () => ok, fields: { qSubject: 'New subject', qMessage: 'Edited text' } }); await flush();
  const q = M.queueGroups(t.app.S.P).needsYou[0]; const h = await t.go('#/item/' + q.id);
  assert.match(h, /Approve for Katya/); assert.match(h, /does not send anything/);
  await t.act('q', { 'data-op': 'approve', 'data-id': q.id }); assert.ok(!t.fetches.some(f => f.body.action === 'queueAction'));
  ok = true; await t.act('q', { 'data-op': 'edit', 'data-id': q.id }); await t.act('q', { 'data-op': 'approve', 'data-id': q.id });
  const qa = t.fetches.filter(f => f.body.action === 'queueAction').map(f => f.body.data);
  assert.deepStrictEqual(qa.map(d => d.op), ['edit', 'approve']); assert.equal(qa[1].message, 'Edited text');
  const after = t.app.S.P.queue.find(x => x.id === q.id); assert.match(after.status, /^approved/);
  await t.act('q', { 'data-op': 'reopen', 'data-id': q.id }); assert.equal(t.app.S.P.queue.find(x => x.id === q.id).status, 'draft');
});
test('app: reports — draft from notes for any live student and interval, editable, saved via saveReportDraft; saved reports edit/review', async () => {
  const s = server(liveFX()); const t = boot({ key: KEY, fetchImpl: s.fetchImpl, fields: { srBody: 'Edited saved report', mrStudent: '', mrMonth: '2026-10' } }); await flush();
  await t.go('#/reports');
  const stu = t.app.S.P.students.find(x => x.name === 'Lena Live');
  t.app.S.rep = { caseId: stu.id, from: '2026-10-01', to: '2026-11-06', audience: 'School' };
  await t.act('rep-create'); assert.match(t.html, /School update: Lena Live/); assert.match(t.html, /textarea id="repBody"/);
  await t.act('rep-body', {}, { value: 'My edited wording' });
  await t.act('rep-save');
  const sv = t.fetches.find(f => f.body.action === 'saveReportDraft'); assert.ok(sv); assert.match(sv.body.data.body, /^My edited wording/); assert.match(sv.body.data.body, /Sources: /);
  assert.equal(sv.body.data.case_id, stu.id); assert.equal(sv.body.data.audience, 'School');
  const saved = t.app.S.P.reports.find(r => r.kind === 'notes-update'); assert.ok(saved);
  await t.go('#/report/' + saved.id); await t.act('sr', { 'data-op': 'edit', 'data-id': saved.id }); await t.act('sr', { 'data-op': 'done', 'data-id': saved.id });
  const ra = t.fetches.filter(f => f.body.action === 'reportAction').map(f => f.body.data); assert.deepStrictEqual(ra.map(x => x.op), ['edit', 'done']); assert.equal(ra[0].body, 'Edited saved report');
  t.fields.mrStudent = stu.id; await t.act('mr-create', { 'data-kind': 'student' }); assert.ok(t.fetches.some(f => f.body.action === 'makeReport' && f.body.data.kind === 'student'));
});
test('app: notes portal filters by real student/provider/date in the UI', async () => {
  const s = server(liveFX()); const t = boot({ key: KEY, fetchImpl: s.fetchImpl }); await flush();
  const stu = t.app.S.P.students.find(x => x.name === 'Lena Live');
  let h = await t.go('#/notes'); assert.match(h, /5 of 5 notes/);
  h = await t.go('#/notes/' + stu.id); assert.match(h, /4 of 5 notes/);
  const pk = t.app.S.P.providers.find(p => p.name === 'Mira South').key;
  await t.act('note-filter', { 'data-k': 'providerKey' }, { value: pk }); assert.match(t.html, /3 of 5 notes/);
  await t.act('note-filter', { 'data-k': 'from' }, { value: '2026-10-15' }); assert.match(t.html, /2 of 5 notes/);
  assert.match(t.html, /Sessions without a note/); assert.match(t.html, /does not mean a missed session/);
});

/* ================= security: XSS, URLs, storage, no-send, SW ================= */
test('XSS: hostile text in every live field renders inert on every route', async () => {
  const X = '<img src=x onerror=alert(1)>', Q = '"><script>alert(2)</script>', U = "javascript:alert(3)";
  const data = liveFX(o => {
    const b = o.bootstrap, c = b.cases[0];
    c.student = X + 'Lena' + Q; c.setting = X; c.why = Q; c.team.forEach(m => { m.name = X + m.name; m.role = Q; });
    c.assignments.forEach(a => { a.schedule = X; a.provider = Q + a.provider; a.role = X; });
    c.fields['Progress report due'] = X; c.notes.push({ ts: '2026-11-01T00:00:00', author: X, type: Q, text: X });
    c.intake.links = [U, 'https://ok.example/' + Q]; c.intake.missing = X; c.ensora.source = U; c.chart.school = X;
    b.queue.forEach(q => { q.subject = X; q.message = Q; q.recipient = X; });
    b.reports.forEach(r => { r.title = X; r.body = Q; }); b.requests.forEach(r => { r.text = X; r.reply = Q; });
    b.unstaffed.forEach(g => { g.student = X; g.role = Q; });
    o.clinical.notes.forEach(n => { n.text = X + Q; n.provider = X; n.service = Q; n.location = X; });
    o.billingLines.forEach(bb => bb.lines.forEach(l => { l.provider = X + l.provider; l.student = Q; }));
  });
  const s = server(data); const t = boot({ key: KEY, fetchImpl: s.fetchImpl }); await flush();
  t.app.S.q = X; const pages = await allRoutes(t);
  for (const [r, h] of Object.entries(pages)) {
    const bad = h.match(/.{0,60}(<img src=x|<script|<svg on|href="javascript:).{0,40}/i);
    assert.ok(!bad, 'unescaped markup on ' + r + ': ' + (bad && bad[0]));
    assert.equal((h.match(/<img /g) || []).length, (h.match(/<img src="icons\/icon-192\.png" alt="">/g) || []).length, 'unexpected <img> on ' + r);
    assert.ok(!/href="https:\/\/ok\.example\/"/.test(h), 'quote broke out of a URL on ' + r);
  }
});
test('privacy: hash links carry only opaque ids (no student or provider names); only key/API are ever stored', async () => {
  const s = server(liveFX()); const t = boot({ key: KEY, fetchImpl: s.fetchImpl, fields: { homeQ: 'Lena' } }); await flush();
  const pages = await allRoutes(t); await t.act('home-search');
  const hrefs = Object.values(pages).join('\n').match(/href="#[^"]*"/g) || [];
  for (const n of LIVE_NAMES) for (const part of n.split(' ')) assert.ok(!hrefs.some(h => h.includes(part)), 'name in URL: ' + part);
  assert.equal(t.sb.location.hash, '#/search');
  assert.deepStrictEqual([...new Set(t.setItems)].filter(k => k !== 'ttgops.k' && k !== 'ttgops.api'), []);
  assert.ok(!/localStorage\.setItem\((?!'ttgops\.(k|api)')/.test(read('app.js')));
  assert.ok(!/sessionStorage|indexedDB/.test(read('app.js')));
});
test('no-send: no mail/sms/tel links or send calls anywhere; every API action used is in the known set', async () => {
  for (const f of ['app.js', 'model.js', 'billing-core.js', 'fixtures/fake-api.js']) assert.ok(!/mailto:|sms:|tel:|sendEmail|MailApp|GmailApp|UrlFetchApp/i.test(read(f)), f);
  const used = [...read('app.js').matchAll(/(?:run|api)\('([a-zA-Z]+)'/g)].map(m => m[1]);
  const allowed = ['bootstrap', 'clinicalNotes', 'billingReview', 'billingDecision', 'addNote', 'updateCase', 'queueAction', 'addRequest', 'saveReportDraft', 'reportAction', 'makeReport'];
  assert.deepStrictEqual([...new Set(used)].filter(a => !allowed.includes(a)), []);
});
test('REGRESSION SW: requests with a query (e.g. ?k=) are never cached; shell cached by clean path; API untouched', async () => {
  const puts = [], handlers = {};
  const cache = { put: (k) => { puts.push(String(k)); return Promise.resolve(); }, addAll: () => Promise.resolve() };
  const sb = vm.createContext({ URL, Promise, console,
    location: { origin: 'https://rgafni.github.io' }, registration: { scope: 'https://rgafni.github.io/ttg-ops/' },
    caches: { open: () => Promise.resolve(cache), keys: () => Promise.resolve([]), match: () => Promise.resolve(null), delete: () => Promise.resolve(true) },
    fetch: () => Promise.resolve({ ok: true, type: 'basic', clone() { return this; } }) });
  sb.self = sb; sb.addEventListener = (t, f) => { handlers[t] = f; }; sb.skipWaiting = () => {}; sb.clients = { claim() {} };
  vm.runInContext(read('sw.js'), sb);
  const ev = (url, method = 'GET', mode) => { let p = null; handlers.fetch({ request: { url, method, mode }, respondWith: x => { p = x; } }); return p; };
  await ev('https://rgafni.github.io/ttg-ops/?k=SECRETKEYSECRETKEYSECRET');
  await ev('https://rgafni.github.io/ttg-ops/index.html?k=SECRETKEYSECRETKEYSECRET');
  await ev('https://rgafni.github.io/ttg-ops/app.js?v=10');
  await ev('https://rgafni.github.io/ttg-ops/app.js');
  await ev('https://rgafni.github.io/ttg-ops/private-notes.json');
  assert.equal(ev('https://script.google.com/macros/s/X/exec', 'POST'), null);
  await flush();
  assert.ok(!puts.some(p => /\?|SECRET/.test(p)), 'cached a query URL: ' + puts);
  assert.deepStrictEqual(puts, ['https://rgafni.github.io/ttg-ops/app.js']);
  assert.match(read('sw.js'), /ttgops-v13/);
  assert.ok(read('app.js').includes("navigator.serviceWorker.register('sw.js')"), 'app must register the new worker so old caches are purged');
});
/* Student/provider record redesign. Optional fields (OSIS, case numbers, rates, SSN) are NOT sent by the live API today, so the
   public fixture no longer carries them (it must match the real API shape). These tests add them, synthetic only. */
function richFX() {
  const o = clone(FX), c = o.bootstrap.cases.find(x => x.student === 'Avery Demo');
  c.osis = 'DEMO-OSIS-0001'; c.district = 'Fictional District'; c.goals = 'Fictional goal: practice requesting help during activities.';
  c.service_cases = [
    { case_number: 'DEMO-CASE-OT-01', service: 'OT', auth_start: '2026-09-01', auth_end: '2027-01-05', authorized_hours: '30', frequency: '2 sessions/week', rate: '$50/hour (fictional)', funding_source: 'Sample funding', provider: 'Morgan Lane', status: 'Active', source: 'Fictional authorization example' },
    { case_number: 'DEMO-CASE-SLP-02', service: 'Speech', auth_start: '2026-09-01', auth_end: '2027-01-05', authorized_units: '24', frequency: '1 session/week', rate: '$20/unit (fictional)', funding_source: 'Sample funding', provider: 'Taylor Brook', status: 'Active', source: 'Fictional authorization example' }];
  const j = c.team.find(m => m.name === 'Jamie Fern');
  Object.assign(j, { ssn: '000-00-0042', rate: '$40/hour (fictional)', hours: '10/week (fictional)', credentials: 'Sample ABA credential', documents: [{ title: 'Fictional credential record', url: 'https://example.com/sample-credential' }] });
  return o;
}
function bootRich() { const s = server(richFX()); return boot({ key: KEY, fetchImpl: s.fetchImpl }); }
const sectionNames = h => [...h.matchAll(/data-section="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&'));
test('records: student has exactly seven requested sections in order, no field dumps or empty rows', async () => {
  const t = bootRich(); await flush();
  const a = t.app.S.P.students.find(x => x.name === 'Avery Demo'); await t.go('#/student/' + a.id); await flush();
  assert.deepStrictEqual(sectionNames(t.html), ['Child info', 'Cases', 'Providers', 'Schedule', 'Billing', 'Documents', 'Clinical Data']);
  assert.doesNotMatch(t.html.replace(/<details[\s\S]*?<\/details>/g, ''), /Hours &amp; key dates|Hours & key dates|Not on file|Last contact:|Sched vs delivered|Notes submitted|Assessment\/report due/);
  assert.match(t.html, /2019-03-04/); assert.match(t.html, /DEMO-OSIS-0001/); assert.match(t.html, /Sample School/); assert.match(t.html, /Fictional District/);
  assert.match(t.html, /Parent of Avery/); assert.match(t.html, /id="caseNote"/); assert.match(t.html, /data-act="case-edit"/);
});
test('records: one card per case record, case numbers never shown even when supplied, units and hours are never conflated', async () => {
  const t = bootRich(); await flush();
  const a = t.app.S.P.students.find(x => x.name === 'Avery Demo'); await t.go('#/student/' + a.id);
  assert.equal(a.caseRecords.length, 2);
  const html = t.html.split('data-section="Cases"')[1].split('</section>')[0];
  assert.doesNotMatch(t.html, /DEMO-CASE|Case #|Case number/); assert.ok(!('number' in a.caseRecords[0]));
  assert.match(html, /Authorized hours<\/dt><dd>30/); assert.match(html, /Authorized units<\/dt><dd>24/);
  assert.match(html, /\$50\/hour \(fictional\)/); assert.match(html, /Sample funding/);
  assert.match(html, /2026-09-01/); assert.match(html, /2027-01-05/);
  assert.equal((html.match(/<h3>/g) || []).length, 2);
});
test('records: absent live fields stay absent; no invented OSIS, case numbers, rates, hours or SSN', async () => {
  const data = liveFX(o => o.bootstrap.cases.forEach(c => { delete c.service_cases; delete c.osis; delete c.district; (c.team || []).forEach(p => { delete p.ssn; delete p.rate; delete p.hours; }); }));
  const s = server(data), t = boot({ key: KEY, fetchImpl: s.fetchImpl }); await flush();
  const a = t.app.S.P.students[0]; await t.go('#/student/' + a.id); await flush();
  const html = t.html;
  assert.doesNotMatch(html, /DEMO-CASE|Case #|<dt>Rate<|<dt>OSIS<|Not on file/);
  assert.match(html, /Case record/); assert.match(html, /Record ID/);
  for (const p of t.app.S.P.providers) { await t.go('#/provider/' + p.key); assert.doesNotMatch(t.html, /SSN \(last 4|<dt>Rate<|<dt>Hours<|Not on file/); }
});
test('records: provider has five requested sections, scoped roster/billing/notes, masked SSN, no decisions', async () => {
  const t = bootRich(); await flush();
  const p = t.app.S.P.providers.find(x => x.name === 'Jamie Fern'); await t.go('#/provider/' + p.key); await flush();
  assert.deepStrictEqual(sectionNames(t.html), ['Provider info', 'Case roster & schedule', 'Billing sheets', 'Documents', 'Clinical data']);
  assert.match(t.html, /\*\*\*-\*\*-0042/); assert.doesNotMatch(t.html, /000-00-0042|000000042/);
  assert.match(t.html, /\$40\/hour \(fictional\)/); assert.match(t.html, /Sample ABA credential/);
  assert.match(t.html, /Fictional credential record/); assert.doesNotMatch(t.html, /Not on file|data-act="bill-|data-change="bill-check"/);
  const ml = t.app.S.P.providers.find(x => x.name === 'Morgan Lane'); await t.go('#/provider/' + ml.key); await flush();
  assert.match(t.html, /INV-DEMO-OCT/); assert.match(t.html, /Read-only analysis/);
  const a = t.app.S.P.students.find(x => x.name === 'Avery Demo'); await t.go('#/student/' + a.id);
  assert.match(t.html, /INV-DEMO-OCT/); assert.doesNotMatch(t.html, /INV-DEMO-ABA|data-act="bill-|data-change="bill-check"/);
  assert.deepStrictEqual(t.setItems.filter(k => k !== 'ttgops.k'), []);
});
test('records: SSN masking retains only last four digits in normalized provider, never put in URLs or storage', async () => {
  assert.equal(M.maskSSN('000-00-0042'), '***-**-0042'); assert.equal(M.maskSSN('0042'), '***-**-0042'); assert.equal(M.maskSSN('not available'), '');
  const P = M.normalizeBootstrap(richFX().bootstrap), p = P.providers.find(x => x.name === 'Jamie Fern');
  assert.equal(p.ssn, '***-**-0042'); assert.doesNotMatch(JSON.stringify(P), /000-00-0042|000000042/);
  const t = bootRich(); await flush(); await t.go('#/provider/' + p.key);
  const links = [...t.html.matchAll(/href="([^"]+)"/g)].map(x => x[1]); assert.ok(links.every(u => !/0042|ssn/i.test(u)));
  assert.deepStrictEqual(t.setItems.filter(k => k !== 'ttgops.k'), []);
});
test('records: parents and guardians in team or assignments never become providers', () => {
  const b = clone(FX.bootstrap); b.cases[0].team.push({name:'Family Demo',role:'Guardian',phone:'555-0199'});
  b.cases[0].assignments.push({provider:'Family Demo',role:'Parent'});
  const p = M.normalizeBootstrap(b); assert.ok(!p.providers.some(x => x.name === 'Family Demo')); assert.ok(!p.students[0].assignments.some(x => x.role === 'Parent'));
});
test('records: empty and hostile optional record fields are hidden/escaped and unsafe document URLs rejected', async () => {
  const X = '<img src=x onerror=alert(1)>', data = liveFX(o => {
    const c = o.bootstrap.cases[0]; c.osis=X; c.goals=X; c.district=X;
    c.service_cases=[{case_number:X,auth_start:X,auth_end:X,rate:X,provider:X,funding_source:X}];
    c.documents=[{title:X,url:'javascript:alert(1)'}]; c.team[0].credentials=X; c.team[0].documents=[{title:X,url:'javascript:alert(1)'}];
  });
  const s = server(data), t = boot({key:KEY,fetchImpl:s.fetchImpl}); await flush();
  const a = t.app.S.P.students.find(x => x.name === 'Lena Live'); await t.go('#/student/' + a.id); await flush();
  assert.match(t.html,/&lt;img/); assert.doesNotMatch(t.html, /<img src=x|href="javascript:/);
  const p = t.app.S.P.providers.find(x => x.name === 'Kai North'); await t.go('#/provider/' + p.key); assert.doesNotMatch(t.html, /<img src=x|href="javascript:/);
});

/* ---------- overnight Nov 15: calendar, records, review, notes ---------- */
test('calendar: schedule parser reads real-world formats strictly and leaves anything else as text', () => {
  const P = s => M.parseSchedule(s), L = r => r.slots.map(x => M.DAY_LABEL[x.day] + ' ' + M.timeRange(x) + (x.note ? ' [' + x.note + ']' : '')).join(' | ');
  assert.equal(L(P('Mon-Fri 3:30-5:30 PM')), 'Mon 3:30–5:30 PM | Tue 3:30–5:30 PM | Wed 3:30–5:30 PM | Thu 3:30–5:30 PM | Fri 3:30–5:30 PM');
  assert.equal(L(P('Mon/Wed 10:00-10:45 AM')), 'Mon 10–10:45 AM | Wed 10–10:45 AM');
  assert.equal(L(P('Tue 8:00 AM-2:15 PM (school), 2:30-5:30 PM (home)')), 'Tue 8 AM–2:15 PM [school] | Tue 2:30–5:30 PM [home]');
  assert.equal(L(P('Sat 7:00-11:00 AM; Sun 9:30 AM-1:30 PM')), 'Sat 7–11 AM | Sun 9:30 AM–1:30 PM');
  assert.equal(L(P('Mon-Thu 11:00-1:00 PM')), 'Mon 11 AM–1 PM | Tue 11 AM–1 PM | Wed 11 AM–1 PM | Thu 11 AM–1 PM');
  assert.equal(L(P('Fri-Mon 9:00-10:00 AM')), 'Fri 9–10 AM | Sat 9–10 AM | Sun 9–10 AM | Mon 9–10 AM');
  for (const t of ['Zoom', 'Tue in-school (TBD)', 'Monthly oversight of the data', 'Mon 7:00-5:00', 'Mon 25:00-26:00 PM', 'Someday 3-5 PM', 'Mon 5:00-3:00 PM']) {
    const r = P(t); assert.equal(r.slots.length, 0, t); assert.equal(r.unparsed.length, 1, t);
  }
  assert.equal(M.slotMinutes(P('Mon-Fri 3:00-5:00 PM').slots), 600);
  assert.equal(M.mandateMinutes('1.5'), 90); assert.equal(M.mandateMinutes('10 h/wk'), 600); assert.equal(M.mandateMinutes('about ten'), null);
});
test('calendar: week view flags provider double-booking, skips supervision, compares to mandate, and never calls a missing note a missed session', async () => {
  const P = M.normalizeBootstrap(FX.bootstrap);
  const W = M.calendarWeek(P, null, { monday: '2026-11-02', today: '2026-11-15' });
  assert.equal(W.monday, '2026-11-02'); assert.equal(W.sunday, '2026-11-08'); assert.equal(W.days.length, 7);
  const mon = W.days[0]; assert.equal(mon.label, 'Mon');
  const jam = mon.events.filter(e => e.provider === 'Jamie Fern'); assert.equal(jam.length, 2);
  jam.forEach(e => assert.equal(e.overlaps.length, 1));
  assert.equal(W.overlapCount, 2, 'each clash counted once: Mon and Wed');
  const wed = W.days[2]; const sup = wed.events.find(e => e.role === 'BCBA'); assert.ok(sup); assert.equal(sup.overlaps.length, 0);
  assert.ok(W.mandate.some(a => a.student === 'Riley Fixture' && a.minutes === 180 && a.mandateMin === 240));
  assert.ok(!W.mandate.some(a => a.student === 'Avery Demo'));
  // notes overlay: only past days, and only "on file" or "none", never "missed"
  const C = M.normalizeClinical(FX.clinical, P);
  const W2 = M.calendarWeek(P, C, { monday: '2026-11-02', today: '2026-11-05' });
  const ot = W2.days[2].events.find(e => e.role === 'OT'); assert.equal(ot.noteState, 'on_file');
  assert.ok(W2.days[4].events.every(e => e.noteState === ''), 'future days have no note state');
  const t = boot({ search: '?fixtures=1', preloadFixtures: true }); await flush();
  t.app.S.cal = { monday: '2026-11-02', day: '2026-11-02' }; await t.go('#/providers');
  assert.match(t.html, /Overlaps Riley Fixture/); assert.match(t.html, /No note on file|Nothing scheduled/); assert.doesNotMatch(t.html, /missed session(?!\.)/i);
  assert.match(t.html, /scheduled 3 h a week, mandate 4 h/); assert.match(t.html, /a day with no note is not a missed session/i);
  await t.act('cal-week', { 'data-d': '1' }); assert.equal(t.app.S.cal.monday, '2026-11-09');
  await t.act('cal-who', {}, { value: 's:' + P.students.find(s => s.name === 'Blake Sample').id });
  assert.doesNotMatch(t.html.split('class="agenda"')[1].split('Needs attention')[0], /Avery Demo/);
  assert.equal(t.fetches.length, 0); assert.deepStrictEqual(t.setItems, []);
});
test('records: sections open only when tapped, each with a one-line summary; schedule shows the week and a calendar link', async () => {
  const t = boot({ search: '?fixtures=1', preloadFixtures: true }); await flush();
  const a = t.app.S.P.students.find(x => x.name === 'Avery Demo'); await t.go('#/student/' + a.id); await flush();
  const secs = [...t.html.matchAll(/<details class="card record-section"[^>]*>/g)].map(m => m[0]);
  assert.equal(secs.length, 7); assert.ok(secs.every(x => !/ open/.test(x)), 'all collapsed');
  assert.match(t.html, /12 h a week scheduled/); assert.match(t.html, /class="mini-week"/); assert.match(t.html, /data-act="cal-open"/);
  assert.match(t.html, /4 notes · latest 2026-11-04/); assert.match(t.html, /BCBA Robin Vale/);
});
test('students: no unexplained color pills; reasons in words; By BCBA groups students under each BCBA', async () => {
  const t = boot({ search: '?fixtures=1', preloadFixtures: true }); await flush();
  await t.go('#/students');
  assert.doesNotMatch(t.html, /<span class="pill (warn|bad)">(service|billing|clinical|relationship)<\/span>/);
  assert.match(t.html, /Speech slot open Thursdays/); assert.match(t.html, /Para unstaffed/); assert.doesNotMatch(t.html, /Para unstaffed · Unstaffed: Para/);
  await t.go('#/students/bcba');
  assert.match(t.html, /Robin Vale<\/a> <span class="muted">\d+ students?<\/span>/); assert.match(t.html, /No BCBA on file/);
});
test('review: separate sections for messages, reports, billing, gaps and schedule problems; item titles are never bare rule codes', async () => {
  const t = boot({ search: '?fixtures=1', preloadFixtures: true }); await flush(); await t.go('#/review'); await flush();
  for (const sec of ['Messages to approve', 'Reports to review', 'Billing to sign off', 'Coverage gaps', 'Schedule problems']) assert.match(t.html, new RegExp(sec), sec);
  assert.doesNotMatch(t.html, /<b>T\d+( –[^<]*)?<\/b>/);
  await t.go('#/email'); assert.doesNotMatch(t.html, /<b>T\d+( –[^<]*)?<\/b>/); assert.match(t.html, /Draft to Parent of Blake/);
  const q = M.normalizeBootstrap({ queue: [{ id: 'q1', trigger: 'T9', subject: 'T9 – X', message: '[Internal] Parent has not replied in 30 days. Please check.' }], triggers: [] }).queue[0];
  assert.equal(q.title, 'Parent has not replied in 30 days.');
  assert.equal(M.normalizeBootstrap({ queue: [{ id: 'q2', trigger: 'T3', subject: 'BCBA check-in – X' }], triggers: [{ id: 'T3', name: 'BCBA check-in' }] }).queue[0].title, 'BCBA check-in – X');
});
test('notes: not-linked notes are shown apart with the name as written, never attached to a student, never in reports', async () => {
  const P = M.normalizeBootstrap(FX.bootstrap), C = M.normalizeClinical(FX.clinical, P);
  assert.equal(C.unlinked.length, 2); assert.ok(C.unlinked.every(n => n.case_id === '' && n.unlinked));
  assert.ok(!C.notes.some(n => /Fixture, Riley/.test(n.student)));
  const riley = P.students.find(s => s.name === 'Riley Fixture');
  const d = M.buildReportDraft(riley, C, { from: '2026-10-01', to: '2026-11-30', audience: 'Internal' }); assert.doesNotMatch(d.body, /Manding/);
  const t = boot({ search: '?fixtures=1', preloadFixtures: true }); await flush();
  await t.go('#/notes'); await flush(); assert.match(t.html, /Not linked \(2\)/); assert.doesNotMatch(t.html, /Fixture, Riley R\./);
  await t.go('#/notes/unlinked'); assert.match(t.html, /Fixture, Riley R\./); assert.match(t.html, /exactly as the source wrote it/);
  await t.go('#/student/' + riley.id); assert.doesNotMatch(t.html, /Manding/);
  t.app.S.q = 'manding'; await t.go('#/search'); assert.match(t.html, /Note \(not linked\)/);
});
test('no case numbers on any screen: main app and showcase never render them (data untouched)', () => {
  for (const f of ['app.js', 'showcase/app.js', 'showcase/demo-docs.js']) assert.doesNotMatch(read(f), /Case number|Case #|caseNo\)|'Case ' \+ s\.caseNo/, f);
  assert.doesNotMatch(read('model.js'), /number: val\(r\.case_number\)/);
});
test('public fixture carries no field the live API does not send (OSIS, case numbers, rates, SSN)', () => {
  const c = FX.bootstrap.cases; assert.ok(c.every(x => !('osis' in x) && !('service_cases' in x) && !('district' in x) && !('goals' in x)));
  assert.ok(c.every(x => (x.team || []).every(m => !('ssn' in m) && !('rate' in m) && !('hours' in m))));
});
test('billing: each line shows schedule context in words (on the schedule that day, over the weekly mandate); sign-off rules unchanged', async () => {
  const t = boot({ search: '?fixtures=1', preloadFixtures: true }); await flush(); await t.go('#/billing/INV-DEMO-SPEECH'); await flush();
  assert.match(t.html, /No Friday session on the schedule/); assert.match(t.html, /Billed 45 min that week, mandate 30 min/);
  assert.match(t.html, /data-act="bill-sign"[^>]*disabled/);
  assert.doesNotMatch(read('billing-core.js'), /schedule/i);
});
test('public files contain only fictional data: no staff full names, real ids, keys or private links', () => {
  for (const f of ['fixtures/v4-sample.js', 'fixtures/fake-api.js', 'model.js', 'billing-core.js', 'app.js', 'sw.js', 'index.html', 'docs/DEPLOY_PREREQUISITES.md', 'README.md']) {
    const s = read(f);
    const banned = ['Nina' + ' Fisher', 'El' + 'lie', 'rgafni' + '84@', 'togethertheygrow' + '\\.com', 'AKfy' + 'cb', 'AI' + 'za', 'sk-[A-Za-z0-9]{10}', 'spreadsheets' + '\\/d\\/', '1[A-Za-z0-9_-]{43}'];
    assert.ok(!new RegExp(banned.join('|')).test(s), f);
  }
  assert.match(read('fixtures/v4-sample.js'), /FICTIONAL/);
});

/* ================= pass 2 (Nov 15): edge cases, plain copy, errors, accessibility ================= */
const EDGE = createRequire(import.meta.url)('./stress-fixtures.js');
async function bootWith(data) { const srv = server(data); const t = boot({ key: KEY, fetchImpl: srv.fetchImpl }); await flush(10); return t; }
test('edge: long names and a crowded day render on every route without breaking', async () => {
  const t = await bootWith(EDGE.stress()); const out = await allRoutes(t);
  for (const [r, h] of Object.entries(out)) { assert.ok(h.length > 50, r); assert.doesNotMatch(h, /undefined|NaN|\[object Object\]/, r); }
  const st = t.app.S.P.students.find(s => s.name === EDGE.LONG_S); assert.ok(st);
  assert.match(out['#/student/' + st.id], new RegExp(EDGE.LONG_S));
  t.app.S.cal.who = 's:' + st.id; t.app.S.cal.monday = '2026-11-09'; t.app.S.cal.day = '2026-11-09'; await t.go('#/providers'); await t.go('#/providers');
  const agenda = t.html.split('class="agenda"')[1].split('class="week-grid"')[0];
  assert.ok((agenda.match(/class="ev[ "]/g) || []).length >= 10, 'crowded Monday lists every session');
});
test('edge: student overview never repeats BCBA or the unstaffed reason', async () => {
  const t = await bootWith(EDGE.stress()); const out = await allRoutes(t);
  for (const [r, h] of Object.entries(out)) { if (!r.startsWith('#/student/')) continue; const ov = (h.split('class="card overview"')[1] || '').split('</div></div>')[0];
    assert.doesNotMatch(ov, /BCBA · BCBA/, r); assert.doesNotMatch(ov, /unstaffed<\/div><div class="ov-why">Unstaffed/i, r); }
});
test('edge: no data at all gives one plain sentence per screen, a calm zero badge and no dead buttons', async () => {
  const t = await bootWith(EDGE.empty()); const out = await allRoutes(t);
  for (const [r, h] of Object.entries(out)) assert.doesNotMatch(h, /undefined|NaN|0 of 0/, r);
  assert.match(out['#/'], /class="badge zero"/);
  assert.match(out['#/students'], /No students on file/);
  assert.match(out['#/notes'], /No clinical notes are linked to a student yet/);
  assert.match(out['#/reports'], /No students on file, so there is nothing to report on yet/); assert.doesNotMatch(out['#/reports'], /data-act="rep-create"/);
  assert.match(out['#/billing'], /No incoming billing/);
  assert.match(out['#/providers'], /Nothing scheduled this week/);
  assert.match(out['#/review'], /Nothing waiting for you/);
  assert.match(out['#/search'], /Type a name, a service or a word from a note/);
});
test('errors: offline, timeouts and unreadable replies are explained in plain words, never raw browser text', async () => {
  const later = err => () => new Promise((_, rej) => setTimeout(() => rej(err), 5));
  let t = boot({ key: KEY, fetchImpl: later(new Error('Failed to fetch')) }); t.sb.navigator = { onLine: false }; await flush(10);
  assert.match(t.html, /This device is offline/); assert.match(t.html, /Try again/); assert.doesNotMatch(t.html, /Failed to fetch/);
  const ab = new Error('The operation was aborted.'); ab.name = 'AbortError';
  t = boot({ key: KEY, fetchImpl: later(ab) }); await flush(10); assert.match(t.html, /took too long/);
  t = boot({ key: KEY, fetchImpl: () => Promise.resolve({ json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON')) }) }); await flush(10);
  assert.match(t.html, /could not read/); assert.doesNotMatch(t.html, /Unexpected token/);
  assert.match(read('app.js'), /AbortController/, 'requests time out instead of hanging');
});
test('billing screen: no internal note ids or "(s)" in what Roni reads; billing-core wording and rules unchanged', async () => {
  const msgs = []; const t = boot({ search: '?fixtures=1', preloadFixtures: true, confirm: m => { msgs.push(m); return true; } }); await flush();
  await t.go('#/billing'); await flush(); const out = await allRoutes(t);
  for (const b of t.app.S.billing.batches) {
    const h = out['#/billing/' + b.id];
    const reasons = h.split('<div class="muted">').slice(1).map(x => x.split('</div>')[0]).join(' ');
    assert.doesNotMatch(reasons, /match note N[0-9a-f]{6,}/, b.id); assert.doesNotMatch(h, /line\(s\)/, b.id);
  }
  const oct = t.app.S.billing.batches.find(b => b.id === 'INV-DEMO-OCT');
  assert.ok(oct.review.some(r => / match note N[0-9a-f]+$/.test(r.reasons[0])), 'core reasons still carry the note id for the audit');
  assert.match(BC.signoffBlocker([{ state: 'aligned' }], { checks: {} }) || '', /line\(s\)/, 'billing-core text untouched');
  for (const l of oct.lines) await t.act('bill-check', { 'data-batch': oct.id, 'data-line': l.id }, { checked: true });
  await t.act('bill-sign', { 'data-batch': oct.id });
  assert.ok(msgs.some(m => /All 2 lines match their notes/.test(m)), msgs.join('|'));
  const av = t.app.S.P.students.find(s => s.name === 'Avery Demo'); await t.go('#/student/' + av.id);
  assert.doesNotMatch(t.html, /match note N[0-9a-f]{6,}/, 'record billing rows are plain too'); assert.match(t.html, /INV-DEMO-OCT<\/a> · /);
});
test('calendar: other weeks say they show today\u2019s schedule; this week does not', async () => {
  const t = boot({ search: '?fixtures=1', preloadFixtures: true }); await flush();
  await t.go('#/providers'); assert.doesNotMatch(t.html, /today\u2019s schedule on a/); assert.match(t.html, /Needs attention this week/);
  await t.act('cal-week', { 'data-d': '-1' }); assert.match(t.html, /today\u2019s schedule on a past week/); assert.doesNotMatch(t.html, /Needs attention this week/);
  await t.act('cal-week', { 'data-d': '0' }); await t.act('cal-week', { 'data-d': '1' }); assert.match(t.html, /today\u2019s schedule on a future week/);
});
test('accessibility: screen reader labels, one live region for messages, focus moves to the page title', async () => {
  const idx = read('index.html'); assert.match(idx, /<main id="view"><\/main>/); assert.match(idx, /id="toast"[^>]*role="status"/);
  const t = boot({ search: '?fixtures=1', preloadFixtures: true }); await flush();
  await t.go('#/providers'); assert.match(t.html, /<span class="sr">Mon [A-Z][a-z]{2} \d+, (\d+ sessions?|no sessions)<\/span>/);
  assert.match(read('app.js'), /h1\.focus\(/);
  const css = read('app.css'); assert.match(css, /:focus-visible/); assert.match(css, /prefers-reduced-motion/); assert.match(css, /--amber: #8a5a14/);
  const c = t.app.S.P.students.find(s => s.name === 'Casey Example'); await t.go('#/student/' + c.id);
  assert.match(t.html, /<div class="card record-section empty" data-section="Billing">/); assert.doesNotMatch(t.html, /data-act="cal-open"/, 'no calendar link when nothing is on the calendar');
});
test('plain copy: open items never show a bare rule code; lists do not repeat the recipient; students filter by provider', async () => {
  const t = boot({ search: '?fixtures=1', preloadFixtures: true }); await flush();
  for (const q of t.app.S.P.queue) { await t.go('#/item/' + q.id); assert.doesNotMatch(t.html, /<dd>T\d+<\/dd>/, q.id); }
  await t.go('#/email'); assert.doesNotMatch(t.html, /Draft to Parent of Blake \(demo\)<\/b><small>Parent of Blake/);
  t.app.S.stuQ = 'fern'; await t.go('#/students'); await t.go('#/students/'); assert.match(t.html, /Avery Demo/); assert.match(t.html, /Riley Fixture/);
  await t.go('#/settings'); assert.doesNotMatch(t.html, /(?<!of )\b1 rows\b/); assert.match(t.html, /Not started/);
});

test('performance: schedules are parsed once per bootstrap, not on every calendar tap', () => {
  const P = M.normalizeBootstrap(FX.bootstrap); assert.strictEqual(M.weekPlan(P), M.weekPlan(P)); assert.strictEqual(M.providerLoad(P), M.providerLoad(P));
  const P2 = M.normalizeBootstrap(FX.bootstrap); assert.notStrictEqual(M.weekPlan(P2), M.weekPlan(P)); assert.deepStrictEqual(M.weekPlan(P2), M.weekPlan(P));
});

for (const [name, fn] of tests) {
  try { await fn(); passed++; console.log('ok', name); }
  catch (e) { failed++; console.log('FAIL', name, '\n   ', e.message.split('\n').slice(0, 6).join('\n    ')); }
}
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
