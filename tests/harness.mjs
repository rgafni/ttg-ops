// Minimal browser stand-in for app.js: no network, no real DOM. Records fetch, storage, script loads and rendered HTML.
import { readFileSync } from 'fs';
import path from 'path';
import vm from 'vm';
import { webcrypto } from 'crypto';
import { fileURLToPath } from 'url';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const read = f => readFileSync(path.join(root, f), 'utf8');
export const load = (f, sb) => vm.runInContext(read(f), sb, { filename: f });
export const flush = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };
export const clone = x => JSON.parse(JSON.stringify(x));

export function fixtures() {
  const sb = vm.createContext({ console }); sb.window = sb;
  load('fixtures/v4-sample.js', sb);
  return clone(sb.TTG_V4_FIXTURES);
}
export function model() {
  const sb = vm.createContext({ console, URL }); sb.window = sb;
  load('billing-core.js', sb); load('model.js', sb);
  return { M: sb.TTG_V4_MODEL, BC: sb.TTG_BILLING };
}

/** Boot app.js. opts: { search, key, api, fetchImpl, confirm, preloadFixtures, fields } */
export function boot(opts = {}) {
  const store = {}; if (opts.key) store['ttgops.k'] = opts.key; if (opts.api) store['ttgops.api'] = opts.api;
  const fetches = [], setItems = [], scripts = [], toasts = [];
  let html = '', listeners = {}, viewListeners = {};
  const fields = opts.fields || {};
  const view = { set innerHTML(v) { html = v; }, get innerHTML() { return html; }, addEventListener: (t, f) => { viewListeners[t] = f; }, contains: () => true };
  const toastEl = { hidden: true, set textContent(v) { toasts.push(v); }, get textContent() { return toasts[toasts.length - 1]; } };
  const document = {
    querySelector: s => s === '#view' ? view : s === '#toast' ? toastEl : (s[0] === '#' && fields[s.slice(1)] !== undefined) ? { value: fields[s.slice(1)] } : null,
    querySelectorAll: () => [],
    createElement: t => { const el = { tagName: t, click() {}, set src(v) { scripts.push(v); setTimeout(() => el.onerror && el.onerror(new Error('blocked in tests')), 0); } }; return el; },
    head: { appendChild() {} }, body: { appendChild() {}, removeChild() {}, classList: { add() {}, remove() {} } }
  };
  const loc = { search: opts.search || '', pathname: '/ttg-ops/', _hash: '', get hash() { return this._hash; }, set hash(v) { this._hash = v; setTimeout(() => listeners.hashchange && listeners.hashchange(), 0); }, reload() {} };
  loc.href = 'https://rgafni.github.io/ttg-ops/' + loc.search;
  const sb = vm.createContext({
    console, URL, Blob: class {}, Uint8Array, Promise, setTimeout, clearTimeout, JSON, Math, Date, Array, Object, String, RegExp, Number,
    crypto: webcrypto, document, location: loc,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { setItems.push(k); store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    fetch: (u, o) => { fetches.push({ u, o, body: o && o.body ? JSON.parse(o.body) : null }); return opts.fetchImpl ? opts.fetchImpl(u, o) : Promise.reject(new Error('network disabled in tests')); },
    confirm: m => (opts.confirm === undefined ? true : typeof opts.confirm === 'function' ? opts.confirm(m) : opts.confirm),
    addEventListener: (t, f) => { listeners[t] = f; }, scrollTo() {}, print() {}
  });
  sb.window = sb; sb.self = sb;
  sb.TTG_CONFIG = { API_URL: opts.configApi === undefined ? 'https://script.google.com/macros/s/TESTDEPLOYMENTID/exec' : opts.configApi };
  sb.__TTG_TEST__ = {};
  load('billing-core.js', sb); load('model.js', sb);
  if (opts.preloadFixtures) { load('fixtures/v4-sample.js', sb); load('fixtures/fake-api.js', sb); }
  load('app.js', sb);
  const app = sb.__TTG_TEST__.app;
  return {
    sb, app, fetches, setItems, scripts, toasts, fields, store,
    get html() { return html; },
    async go(h) { loc._hash = h; listeners.hashchange && listeners.hashchange(); await flush(); return html; },
    async act(name, attrs = {}, extra = {}) {
      const el = Object.assign({ getAttribute: k => (k in attrs ? attrs[k] : null), value: extra.value, checked: extra.checked }, {});
      const r = app.ACT[name](el, { preventDefault() {} }); await flush(); return r;
    }
  };
}
export const jsonRes = obj => Promise.resolve({ json: () => Promise.resolve(clone(obj)) });
