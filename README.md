# TTG Ops

Private clinical oversight front-end for Together They Grow.

**v4 UI:** six portals from Home (Students & Cases, Clinical Notes, Providers & Schedules, Billing Review, Reports & Updates, Email & Open Items). Phone-first.

Front-end only in this public repo. Live case data is served by a private, key-protected Apps Script API. No admin keys, clinical exports, or Ensora files belong here.

- Open with your personal admin link (stores the key on-device, strips it from the URL).
- Or append `?fixtures=1` to review the UI with fictional sample data only.
- `fixtures/v4-sample.js` is synthetic. `model.js` holds pure domain helpers covered by `tests/run.mjs`.

See `docs/DEPLOY_PREREQUISITES.md` before deploying.
