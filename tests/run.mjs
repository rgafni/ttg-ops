// TTG Ops v4 tests. Synthetic data only. No network: every fetch is a recorded stub.
import assert from 'assert';
import vm from 'vm';
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
const ROUTES = ['#/', '#/review', '#/students', '#/notes', '#/providers', '#/providers/schedules', '#/billing', '#/reports', '#/email', '#/settings', '#/search'];
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
  assert.match(t.html, /Live data could not be loaded/); assert.match(t.html, /Failed to fetch/); assert.match(t.html, /No sample data/);
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
  await ev('https://rgafni.github.io/ttg-ops/app.js?v=9');
  await ev('https://rgafni.github.io/ttg-ops/app.js');
  await ev('https://rgafni.github.io/ttg-ops/private-notes.json');
  assert.equal(ev('https://script.google.com/macros/s/X/exec', 'POST'), null);
  await flush();
  assert.ok(!puts.some(p => /\?|SECRET/.test(p)), 'cached a query URL: ' + puts);
  assert.deepStrictEqual(puts, ['https://rgafni.github.io/ttg-ops/app.js']);
  assert.match(read('sw.js'), /ttgops-v9/);
  assert.ok(read('app.js').includes("navigator.serviceWorker.register('sw.js')"), 'app must register the new worker so old caches are purged');
});
test('public files contain only fictional data: no staff full names, real ids, keys or private links', () => {
  for (const f of ['fixtures/v4-sample.js', 'fixtures/fake-api.js', 'model.js', 'billing-core.js', 'app.js', 'sw.js', 'index.html', 'docs/DEPLOY_PREREQUISITES.md', 'README.md']) {
    const s = read(f);
    const banned = ['Nina' + ' Fisher', 'El' + 'lie', 'rgafni' + '84@', 'togethertheygrow' + '\\.com', 'AKfy' + 'cb', 'AI' + 'za', 'sk-[A-Za-z0-9]{10}', 'spreadsheets' + '\\/d\\/', '1[A-Za-z0-9_-]{43}'];
    assert.ok(!new RegExp(banned.join('|')).test(s), f);
  }
  assert.match(read('fixtures/v4-sample.js'), /FICTIONAL/);
});

for (const [name, fn] of tests) {
  try { await fn(); passed++; console.log('ok', name); }
  catch (e) { failed++; console.log('FAIL', name, '\n   ', e.message.split('\n').slice(0, 6).join('\n    ')); }
}
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
