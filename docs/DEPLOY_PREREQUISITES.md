# Deploy prerequisites (v4)

Merging this PR into `main` **publishes** the front-end (GitHub Pages serves `main` `/`). Do not merge until review is done.

## 1. Front-end only (works with the current API)
The v4 front-end runs against the existing API. With the current (pre-v4) API:
- Students & Cases, Providers & Schedules, Email & Open Items, saved reports and the existing report types work with live data.
- Clinical Notes, notes-based report drafts and Billing Review show an honest "not connected / API not updated" state.

## 2. API v4 (private backend, not in this repo)
Additive, backwards-compatible actions (all behind the same server-side key check as every existing action):

| Action | Kind | Notes |
| --- | --- | --- |
| `clinicalNotes` | read | Optional `Clinical Notes` and `Sessions Without Notes` tabs. Missing tab or columns => `available:false` + reason. |
| `billingReview` | read | Optional `Billing Lines` tab, compared line by line (student, date, provider, service, duration, units) with the clinical notes. |
| `billingDecision` | append-only write | `check` / `uncheck` / `flag` / `clear_flag` / `signoff`. Server recomputes the review, requires the current batch version, a unique request id (idempotent), a reason for flags, explicit confirmation for sign-off. |
| `saveReportDraft` | append-only write | Saves an edited notes-based draft to the existing `Reports` tab. |

`bootstrap` gains one additive field, `v4` (which optional tabs exist + row counts).
Reads never create tabs. The `Billing Audit` tab is created on the first explicit billing decision after deployment.

Source tab columns:
- `Clinical Notes`: note_id, student, case_id, service_date, session_time, duration_min, provider, service, location, note_text, signature, created, site, supervisor, source
- `Sessions Without Notes`: student, case_id, service_date, session_time, provider, service, location, source
- `Billing Lines`: line_id, batch_id, received, student, case_id, service_date, provider, provider_id, service, duration_min, units, unit_minutes, note_id, source
- Optional setting `billing_unit_minutes` (default unit length when a billed line has units but no unit_minutes).

## 3. Before deploying the API
1. clasp must be signed in (by a person) as the Google account that owns the existing web-app deployment. The deploy script
   checks this with `clasp show-authorized-user` only and never logs in or switches accounts.
2. Run the private backend tests, then the deploy script's `--dry-run`, then deploy to the same deployment id (URL unchanged).
3. Optionally run `setupV4()` once from the Apps Script editor to create the empty source tabs.
4. Fill `Clinical Notes` from the private Ensora export with the private normalizer (counts only are printed; files stay private).
5. Incoming billing has no line-level source yet. The Provider Hub "Billing Submissions" tab is monthly per provider, so
   `Billing Lines` must be filled from the real incoming invoices before Billing Review can be used.

## 4. After deploying
Phone smoke test with the admin link: Home, one student, notes filters, one billing batch (check a line, then confirm it
appears in the Billing Audit tab), a notes-based draft, one open item (edit only). Never paste keys or real data into issues
or screenshots.
