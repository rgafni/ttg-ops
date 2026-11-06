import { readFileSync } from 'fs';
import path from 'path';
import vm from 'vm';
import assert from 'assert';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadBrowserScript(file, sandbox) {
  const code = readFileSync(path.join(root, file), 'utf8');
  vm.runInNewContext(code, sandbox, { filename: file });
  return sandbox;
}

const sandbox = { console, module: { exports: {} }, exports: {} };
sandbox.global = sandbox;
sandbox.window = sandbox;
loadBrowserScript('model.js', sandbox);
loadBrowserScript('fixtures/v4-sample.js', sandbox);
const M = sandbox.TTG_V4_MODEL;
const FX = sandbox.TTG_V4_FIXTURES;

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok', name); }
  catch (e) { console.error('FAIL', name, e.message); process.exitCode = 1; }
}

test('fixtures present with Jordan Lee', () => {
  assert.equal(FX.students[0].name, 'Jordan Lee');
  assert.ok(FX.notes.length >= 4);
});

test('identity: exact id match', () => {
  const r = M.resolveStudentRef('STU-DEMO-001', FX.students);
  assert.equal(r.status, 'matched');
  assert.equal(r.student.name, 'Jordan Lee');
});

test('identity: ambiguous name not silently merged', () => {
  const all = FX.students.concat(FX.ambiguousNames);
  const r = M.resolveStudentRef('Sam Ortiz', all);
  assert.equal(r.status, 'ambiguous');
  assert.equal(r.matches.length, 2);
});

test('notes filter by student', () => {
  const n = M.filterNotes(FX.notes, { studentId: 'STU-DEMO-001' });
  assert.ok(n.length >= 4);
  assert.ok(n.every(x => x.studentId === 'STU-DEMO-001'));
});

test('notes filter empty studentId returns all', () => {
  const n = M.filterNotes(FX.notes, {});
  assert.equal(n.length, FX.notes.length);
});

test('session without note is explicit', () => {
  assert.ok(FX.sessionsWithoutNotes.some(s => !s.noteId));
});

test('billing: counts alone do not unlock sign-off', () => {
  const batch = FX.billingBatches[0];
  const rev = M.reviewBillingBatch(batch, FX.notes);
  assert.equal(rev.status, 'Needs review');
  assert.equal(rev.canSignOff([]), false);
  assert.equal(rev.canSignOff(batch.lines.map(l => l.id)), true);
});

test('billing: mismatched duration fails fields_align', () => {
  const bad = { id: 'x', date: '2026-10-20', provider: 'A. Brooks', durationMin: 99, noteId: 'NOTE-DEMO-001' };
  const r = M.reviewBillingLine(bad, Object.fromEntries(FX.notes.map(n => [n.id, n])));
  assert.equal(r.state, 'mismatch');
});

test('report draft is deterministic and sourced', () => {
  const d = M.buildReportDraft(FX.students[0], FX.notes, { audience: 'Parent', period: 'Sep–Oct 2026' });
  assert.ok(d.sources.length >= 1);
  assert.ok(/not ai-generated/i.test(d.limits));
});

test('search finds student and note', () => {
  const hits = M.searchAll('grip', FX);
  assert.ok(hits.some(h => h.type === 'note'));
});

test('review count > 0 for fixtures', () => {
  assert.ok(M.reviewCount(FX) >= 1);
});

test('no send/auto-signoff on model API surface', () => {
  assert.equal(typeof M.sendEmail, 'undefined');
  assert.equal(typeof M.autoSignOff, 'undefined');
});

test('app.js has no outgoing mail/SMS send paths', () => {
  const src = readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.ok(!/mailto:|sendEmail|sms:|fetch\(.*mail/i.test(src));
  assert.ok(/Draft only\. Nothing sends/.test(src));
  assert.ok(/unauthorized/.test(src));
});

test('auth: api helper rejects without key (source contract)', () => {
  const src = readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.ok(/if \(!KEY\) return Promise\.reject\(new Error\('unauthorized'\)\)/.test(src));
  assert.ok(/method: 'POST'/.test(src));
});

test('fixtures contain only DEMO ids', () => {
  const raw = readFileSync(path.join(root, 'fixtures/v4-sample.js'), 'utf8');
  assert.ok(!/Nina|rgafni84@|password|AIza|sk-[A-Za-z0-9]/i.test(raw));
  assert.ok(/STU-DEMO-001/.test(raw));
  assert.ok(/FICTIONAL/i.test(raw));
  assert.ok(/Jordan Lee/.test(raw));
});

test('six portal routes present in app.js', () => {
  const src = readFileSync(path.join(root, 'app.js'), 'utf8');
  for (const r of ['students', 'notes', 'providers', 'billing', 'reports', 'email']) {
    assert.ok(new RegExp(r + ':').test(src) || new RegExp("'" + r + "'").test(src), r);
  }
});

console.log(passed + ' tests passed');
